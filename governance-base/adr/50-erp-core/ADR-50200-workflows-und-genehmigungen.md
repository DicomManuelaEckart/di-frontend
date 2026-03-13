---
id: ADR-50200
title: Workflows und Genehmigungen – State Machine, mehrstufige Freigaben, Tenant-Konfiguration
status: accepted
date: 2026-02-24
scope: fullstack
enforced_by: code-review
affects:
  - backend
  - frontend
---

# ADR-50200 – Workflows und Genehmigungen

## Entscheidungstreiber
- Geschäftsprozesse im ERP (Bestellungen, Rechnungen, Zahlungen) erfordern kontrollierte Freigaben (Fragebogen §17)
- Unterschiedliche Mandantengrößen: kleine Mandanten brauchen keine Workflows, große benötigen mehrstufige Genehmigungen
- Rechtliche Anforderungen: Vier-Augen-Prinzip, Wertgrenzen, Prüfbarkeit (GoBD, ADR-50000)
- Integration mit bestehendem Feature-Flag-System (ADR-05700) für Aktivierung/Deaktivierung pro Tenant
- Domain Events (ADR-01200) als Trigger für Workflows und Benachrichtigungen
- Multi-Company: Workflows können pro Company unterschiedlich konfiguriert sein (ADR-06300)

## Kontext
Das ERP-System bedient 500–600 Tenants unterschiedlicher Größe (ADR-00008). Kleine Mandanten benötigen keine Genehmigungsprozesse – Belege werden direkt freigegeben. Große Mandanten benötigen mehrstufige Freigaben mit Wertgrenzen, Stellvertretern und Eskalationen. Der Fragebogen entscheidet sich für eine **eigene State-Machine-Implementierung** (kein externes Workflow-Tool), die **pro Tenant konfigurierbar** und **per Feature Flag deaktivierbar** ist.

Workflows betreffen primär den Bounded Context „Workflow/Approval" (ADR-01600), der als zentrale Cross-Cutting-Domäne die Genehmigungslogik für alle fachlichen BCs bereitstellt. Die Workflow-Engine wird nicht in jeden BC einzeln implementiert, sondern als eigenständiger Service genutzt.

## Entscheidung

### 1) State Machine Pattern (eigene Implementierung)

| Aspekt | Entscheidung |
|--------|-------------|
| **Engine** | Eigene State-Machine-Implementierung im Domain Layer |
| **Bibliothek** | `Stateless` (NuGet: `Stateless`) als leichtgewichtige State-Machine-Bibliothek |
| **Workflow-Definition** | Konfigurationsbasiert in der Tenant-DB (nicht hartkodiert) |
| **Verworfene Alternativen** | Azure Logic Apps (zu teuer pro Tenant, Vendor Lock-in), Elsa Workflows (zu komplex, eigene DB), Camunda (Java-Ökosystem, Overhead) |

**Grundkonzept:**

Jeder workflow-fähige Beleg (z.B. Bestellung, Rechnung, Zahlungsvorschlag) durchläuft eine State Machine mit definierten Zuständen und Übergängen:

```
Draft → Submitted → [Approval Step 1] → [Approval Step 2] → ... → Approved → Posted/Executed
                  ↘ Rejected (→ Draft)
```

**Regeln:**
- Die State Machine lebt im **Domain Layer** als Teil des Aggregates (z.B. `PurchaseOrder.Status`).
- Zustandsübergänge werden durch Domain-Methoden ausgelöst (z.B. `Submit()`, `Approve()`, `Reject()`).
- Jeder Zustandsübergang erzeugt ein **Domain Event** (ADR-01200), z.B. `PurchaseOrderSubmitted`, `ApprovalStepCompleted`.
- Die State Machine validiert, ob ein Übergang erlaubt ist (Guard Conditions).
- Ungültige Übergänge werden als `DomainError` zurückgegeben (ADR-01500).

### 2) Workflow-Definition (Konfigurationsmodell)

Workflows werden als **konfigurierbare Definitionen** in der Tenant-DB gespeichert, nicht hartkodiert.

**WorkflowDefinition (Aggregate Root):**

| Eigenschaft | Beschreibung |
|-------------|-------------|
| `Id` | Guid (technische ID) |
| `TenantId` | Tenant-Zugehörigkeit (ADR-06000) |
| `CompanyId` | Optional – Company-spezifische Überschreibung (ADR-06300) |
| `DocumentType` | Belegtyp, für den der Workflow gilt (z.B. `PurchaseOrder`, `SalesInvoice`) |
| `Name` | Bezeichnung (z.B. „Einkaufsbestellung Freigabe") |
| `IsActive` | Aktiviert/Deaktiviert (unabhängig vom Feature Flag) |
| `Steps` | Geordnete Liste von `ApprovalStep` (Value Objects) |
| `Version` | Versionsnummer für Änderungsnachvollziehbarkeit |

**ApprovalStep (Value Object):**

| Eigenschaft | Beschreibung |
|-------------|-------------|
| `StepOrder` | Reihenfolge (1, 2, 3, ...) |
| `Name` | Bezeichnung (z.B. „Abteilungsleitung", „Geschäftsführung") |
| `ApprovalType` | `SingleApprover` \| `AllApprovers` \| `AnyApprover` |
| `ApproverRoleOrPermission` | Berechtigung, die der Genehmiger benötigt (ADR-03100) |
| `ThresholdAmount` | Optional – Wertgrenze (nur wenn Belegbetrag ≥ Schwelle) |
| `ThresholdCurrency` | Währung der Wertgrenze |
| `EscalationTimeout` | Zeitspanne bis zur Eskalation (z.B. `48:00:00`) |
| `EscalationTarget` | Rolle/Permission für Eskalation |

**Regeln:**
- Workflow-Definitionen werden **pro Tenant UND pro DocumentType** gespeichert.
- Eine Company kann eine Tenant-weite Definition **überschreiben** (Override-Pattern analog ADR-06300).
- Existiert keine aktive Definition für einen DocumentType → Beleg wird **direkt freigegeben** (kein Workflow).
- Workflow-Definitionen sind **versioniert** – laufende Genehmigungen nutzen die Version, die bei `Submit` galt (Snapshot-Prinzip).
- Änderungen an Workflow-Definitionen werden im Daten-Audit protokolliert (ADR-05800).

### 3) Genehmigungs-Instanz (Laufzeit-Modell)

Wenn ein Beleg zur Genehmigung eingereicht wird, entsteht eine **ApprovalInstance**:

**ApprovalInstance (Aggregate Root):**

| Eigenschaft | Beschreibung |
|-------------|-------------|
| `Id` | Guid |
| `TenantId` | Tenant-Zugehörigkeit |
| `CompanyId` | Company-Zugehörigkeit |
| `DocumentType` | Belegtyp |
| `DocumentId` | Referenz auf den Beleg (Guid) |
| `WorkflowDefinitionId` | Referenz auf die verwendete Workflow-Definition |
| `WorkflowDefinitionVersion` | Snapshot der Version bei Einreichung |
| `CurrentStepOrder` | Aktueller Genehmigungsschritt |
| `Status` | `Pending` \| `Approved` \| `Rejected` \| `Cancelled` \| `Escalated` |
| `SubmittedBy` | User-ID des Einreichers |
| `SubmittedAt` | Zeitpunkt der Einreichung (UTC) |
| `CompletedAt` | Zeitpunkt des Abschlusses (UTC, nullable) |
| `Decisions` | Liste von `ApprovalDecision` |

**ApprovalDecision (Entity):**

| Eigenschaft | Beschreibung |
|-------------|-------------|
| `Id` | Guid |
| `StepOrder` | Zugehöriger Schritt |
| `DecidedBy` | User-ID des Genehmigers |
| `Decision` | `Approved` \| `Rejected` |
| `Comment` | Optionaler Kommentar |
| `DecidedAt` | Zeitpunkt (UTC) |
| `IsEscalation` | Ob durch Eskalation entschieden |
| `IsDelegate` | Ob durch Stellvertreter entschieden |

**Regeln:**
- Pro Beleg existiert maximal **eine aktive** ApprovalInstance (Status `Pending` oder `Escalated`).
- Bei `Rejected` kann der Einreicher den Beleg überarbeiten und erneut einreichen → neue ApprovalInstance.
- Alle Entscheidungen werden **append-only** gespeichert (revisionssicher, ADR-05800).
- ApprovalInstance + Decisions bilden den vollständigen Prüfpfad für Compliance.

### 4) Mehrstufige Freigaben und Wertgrenzen

**Mehrstufige Logik:**

| Szenario | Verhalten |
|----------|----------|
| Betrag < Stufe-1-Schwelle | Direkte Freigabe (kein Approval nötig) |
| Betrag ≥ Stufe-1-Schwelle, < Stufe-2 | Nur Stufe 1 erforderlich |
| Betrag ≥ Stufe-2-Schwelle | Stufe 1 + Stufe 2 erforderlich |
| Kein Workflow definiert | Direkte Freigabe |

**Beispiel: Einkaufsbestellung**

| Schritt | Schwelle | Genehmiger | Eskalation |
|---------|----------|------------|------------|
| 1 – Teamleitung | ≥ 500 € | `Permission: PurchaseOrder.Approve.L1` | 24h → Abteilungsleitung |
| 2 – Abteilungsleitung | ≥ 5.000 € | `Permission: PurchaseOrder.Approve.L2` | 48h → Geschäftsführung |
| 3 – Geschäftsführung | ≥ 50.000 € | `Permission: PurchaseOrder.Approve.L3` | 72h → Admin-Notification |

**Regeln:**
- Wertgrenzen werden gegen den **Nettobetrag** des Belegs in der **Company-Leitwährung** geprüft.
- Stufen werden sequenziell durchlaufen – Stufe 2 wird erst aktiv, wenn Stufe 1 genehmigt ist.
- Der Einreicher darf seinen eigenen Beleg **nicht** genehmigen (Vier-Augen-Prinzip).
- Permissions für Genehmigungsstufen werden im Permission Catalog (ADR-03200) registriert.

### 5) Stellvertreterregelungen

| Aspekt | Entscheidung |
|--------|-------------|
| **Modell** | Explizite Delegation – ein Benutzer delegiert seine Genehmigungsrechte an einen Stellvertreter |
| **Scope** | Pro User, zeitlich begrenzt (Von/Bis), optional auf DocumentType einschränkbar |
| **Speicherung** | `DelegationRule` in der Tenant-DB |
| **Auflösung** | Bei Genehmigungs-Lookup: prüfe zuerst Originalgenehmiger, dann aktive Delegationen |

**DelegationRule (Entity):**

| Eigenschaft | Beschreibung |
|-------------|-------------|
| `DelegatorUserId` | User, der delegiert |
| `DelegateUserId` | Stellvertreter |
| `ValidFrom` | Beginn (UTC) |
| `ValidUntil` | Ende (UTC) |
| `DocumentType` | Optional – nur für bestimmte Belegtypen |
| `IsActive` | Aktiv/Inaktiv |

**Regeln:**
- Stellvertreter-Entscheidungen werden in der ApprovalDecision als `IsDelegate = true` markiert.
- Ein User kann maximal **einen aktiven Stellvertreter pro DocumentType** haben.
- Delegationen werden im Daten-Audit (ADR-05800) protokolliert.

### 6) Eskalationen

| Aspekt | Entscheidung |
|--------|-------------|
| **Trigger** | Zeitbasiert – wenn ein Genehmigungsschritt nach `EscalationTimeout` nicht entschieden ist |
| **Prüfung** | Background Job (ADR-05500) prüft regelmäßig offene ApprovalInstances |
| **Intervall** | Alle 15 Minuten (konfigurierbar) |
| **Aktion** | (1) Benachrichtigung an Eskalationsziel, (2) Status → `Escalated`, (3) Eskalationsziel darf entscheiden |

**Regeln:**
- Eskalation ersetzt den Originalgenehmiger **nicht** – beide können noch entscheiden.
- Nach Eskalation wird der `EscalationTarget` als zusätzlich berechtigter Genehmiger hinzugefügt.
- Eskalation erzeugt ein Domain Event `ApprovalStepEscalated` (für Benachrichtigungen + Audit).
- Zweite Eskalation (Eskalation der Eskalation) wird **nicht** unterstützt – stattdessen manuelle Admin-Intervention.

### 7) Feature-Flag-Integration (Deaktivierbarkeit)

| Aspekt | Entscheidung |
|--------|-------------|
| **Feature Flag** | `Entitlement.Workflow.Enabled` (ADR-05700, Typ: Entitlement Toggle) |
| **Granularität** | Pro Tenant (über Tenant-Targeting, ADR-05700 §3) |
| **Deaktiviertes Verhalten** | Workflow-Middleware wird übersprungen, Belegstatus springt direkt `Draft → Approved` |
| **Zusätzlicher Flag** | `Entitlement.Workflow.{DocumentType}` – pro Belegtyp steuerbar |

**Logik im Application Layer:**

```
if (!featureManager.IsEnabled("Entitlement.Workflow.Enabled"))
    → Direkte Freigabe (Skip Workflow)

if (!featureManager.IsEnabled($"Entitlement.Workflow.{documentType}"))
    → Direkte Freigabe für diesen Belegtyp

if (keine aktive WorkflowDefinition für DocumentType + Company)
    → Direkte Freigabe

else
    → Workflow starten (ApprovalInstance anlegen)
```

**Regeln:**
- Feature Flags werden im **Application Layer** geprüft, nicht im Domain Layer (ADR-05700 §5).
- Wenn Workflows deaktiviert sind, werden keine ApprovalInstances angelegt – der Beleg geht direkt in den Zielstatus.
- Der Übergang `Draft → Approved` (bei deaktiviertem Workflow) erzeugt trotzdem ein Domain Event `DocumentAutoApproved` für Audit-Zwecke.

### 8) Benachrichtigungen

| Kanal | Zweck | Technologie |
|-------|-------|-------------|
| **In-App Notification** | Genehmigungsanfrage, Erinnerung, Eskalation, Entscheidung | Notification-Tabelle in Tenant-DB + SignalR Push |
| **E-Mail** | Genehmigungsanfrage, Eskalation | Background Job (ADR-05500), E-Mail-Templates (ADR-05000 Lokalisierung) |

**Notification-Modell:**

| Eigenschaft | Beschreibung |
|-------------|-------------|
| `Id` | Guid |
| `RecipientUserId` | Empfänger |
| `Type` | `ApprovalRequested` \| `ApprovalEscalated` \| `ApprovalDecided` \| `ApprovalReminder` |
| `DocumentType` | Belegtyp |
| `DocumentId` | Referenz auf den Beleg |
| `ApprovalInstanceId` | Referenz auf die Genehmigungsinstanz |
| `Title` | Lokalisierter Titel (ADR-05000) |
| `Body` | Lokalisierter Text |
| `IsRead` | Gelesen-Status |
| `CreatedAt` | Erstellzeitpunkt (UTC) |

**Regeln:**
- Benachrichtigungen werden durch **Domain Events** ausgelöst (z.B. `ApprovalStepCompleted` → Notification an Einreicher).
- E-Mails werden über einen **Background Job** (ADR-05500) versendet – nicht synchron im Request.
- In-App Notifications werden per **SignalR** an verbundene Clients gepusht (Real-Time).
- E-Mail-Templates sind lokalisiert (ADR-05000): Sprache des Empfängers, nicht des Einreichers.
- Benachrichtigungen an Stellvertreter werden ebenfalls erzeugt, sofern eine aktive Delegation besteht.
- Notification-Retention: 90 Tage, danach Cleanup per Background Job.

### 9) API-Endpunkte

| Endpunkt | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/v1/{documentType}/{id}/submit` | POST | Beleg zur Genehmigung einreichen |
| `/api/v1/{documentType}/{id}/approve` | POST | Aktuellen Schritt genehmigen |
| `/api/v1/{documentType}/{id}/reject` | POST | Aktuellen Schritt ablehnen |
| `/api/v1/approvals/pending` | GET | Eigene offene Genehmigungen (Inbox) |
| `/api/v1/approvals/{id}` | GET | Detail einer Genehmigungsinstanz |
| `/api/v1/approvals/{id}/history` | GET | Entscheidungshistorie |
| `/api/v1/workflow-definitions` | GET/POST/PUT | Workflow-Definitionen verwalten (Admin) |
| `/api/v1/delegations` | GET/POST/DELETE | Stellvertreterregelungen verwalten |
| `/api/v1/notifications` | GET | Eigene Benachrichtigungen (paginiert) |
| `/api/v1/notifications/{id}/read` | POST | Als gelesen markieren |

**Permissions (ADR-03200):**

| Permission | Beschreibung |
|-----------|-------------|
| `Workflow.Submit` | Belege zur Genehmigung einreichen |
| `Workflow.Approve.L1` | Genehmigung Stufe 1 |
| `Workflow.Approve.L2` | Genehmigung Stufe 2 |
| `Workflow.Approve.L3` | Genehmigung Stufe 3 |
| `Workflow.Admin` | Workflow-Definitionen verwalten |
| `Workflow.Delegation.Manage` | Stellvertreter verwalten |
| `Notification.Read` | Eigene Benachrichtigungen lesen |

## Begründung
- **Eigene State Machine** statt externer Engine: volle Kontrolle, kein externer Zustand, keine Lizenzkosten, Integration in DDD-Modell (Domain-Methoden statt externe Orchestrierung).
- **`Stateless`-Bibliothek**: leichtgewichtig, kein eigener Persistenz-Layer, gut testbar, .NET-nativ.
- **Konfigurationsbasiert**: unterschiedliche Kundengrößen erfordern flexible Workflows – nicht jeder Mandant braucht dieselben Stufen.
- **Feature-Flag-Deaktivierbarkeit**: kleine Mandanten sollen nicht durch unnötige Genehmigungsschritte belastet werden.
- **Append-only Decisions**: vollständiger Prüfpfad für Compliance und GoBD.
- **SignalR für In-App Push**: sofortige Benachrichtigung ohne Polling, bessere UX.
- **E-Mail als Background Job**: kein Blocking des Request-Threads, Retry bei Fehler.

## Alternativen

1) **Azure Logic Apps**
   - Vorteile: Low-Code, visuelle Designer, Microsoft-Integration
   - Nachteile: Kosten pro Ausführung (500–600 Tenants × n Workflows), Vendor Lock-in, externer State, schwer testbar, kein DDD-Integration

2) **Elsa Workflows (.NET)**
   - Vorteile: .NET-nativ, visueller Designer, Persistenz integriert
   - Nachteile: eigene DB, eigene Runtime, Komplexität für einfache Approval-Workflows zu hoch, schwer in Clean Architecture integrierbar

3) **Camunda / Temporal**
   - Vorteile: Enterprise-Features, BPMN-Standard
   - Nachteile: Java-Ökosystem (Camunda), Self-Hosting-Aufwand, Overhead für ERP-Genehmigungen

4) **Hartkodierte Workflows im Code**
   - Vorteile: einfach, kein Konfigurationsmodell nötig
   - Nachteile: keine Mandanten-Flexibilität, Änderungen erfordern Deployment, skaliert nicht

## Konsequenzen

### Positiv
- Vollständige Kontrolle über Workflow-Logik ohne externe Abhängigkeiten
- Flexible Tenant-/Company-spezifische Konfiguration ohne Code-Änderungen
- Kleine Mandanten können Workflows komplett deaktivieren → einfachere UX
- Lückenloser Prüfpfad (Compliance, GoBD) durch append-only Decisions
- Integration in bestehende Architecture (DDD, Domain Events, Feature Flags, Permissions)

### Negativ / Trade-offs
- Eigene Implementierung erfordert Entwicklungsaufwand für State Machine + Konfiguration
- Kein visueller Workflow-Designer (v1) – Konfiguration über Admin-UI (Formulare)
- Workflow-Komplexität ist begrenzt (sequenzielle Stufen, keine parallelen Branches in v1)
- Eskalation nur einstufig – keine Eskalationsketten
- SignalR erfordert zusätzliche Infrastruktur (Azure SignalR Service)

### Umsetzungshinweise

#### A) Domain-Modell
- `WorkflowDefinition` und `ApprovalInstance` sind eigenständige Aggregates im Bounded Context „Workflow" (ADR-01600).
- Fachliche Aggregates (z.B. `PurchaseOrder`) halten nur ihren `Status` – die Workflow-Logik liegt im Workflow-BC.
- Kommunikation zwischen Fach-BC und Workflow-BC über **Integration Events** (ADR-01200, ADR-00006):
  - Fach-BC published `PurchaseOrderSubmitted` → Workflow-BC erstellt ApprovalInstance
  - Workflow-BC published `ApprovalCompleted` → Fach-BC setzt Status auf `Approved`

#### B) Persistenz
- WorkflowDefinition, ApprovalInstance, ApprovalDecision, DelegationRule, Notification werden in der **Tenant-DB** gespeichert (ADR-08000).
- Indizes: `IX_ApprovalInstance_DocumentType_DocumentId`, `IX_ApprovalInstance_Status`, `IX_Notification_RecipientUserId_IsRead`.
- ApprovalDecisions sind **append-only** – kein Update, kein Delete (analog Audit-Log, ADR-05800).

#### C) Background Jobs
- **Eskalations-Job**: prüft alle 15 Minuten offene ApprovalInstances auf Timeout (ADR-05500).
- **Notification-Cleanup-Job**: löscht Notifications älter als 90 Tage.
- **E-Mail-Versand-Job**: verarbeitet E-Mail-Queue (Outbox-Pattern, ADR-00006).
- Alle Jobs laufen tenant-aware (ADR-05500 Tenant-Kontext).

#### D) Frontend
- **Approval Inbox**: Liste offener Genehmigungsanfragen mit Filtermöglichkeiten.
- **Bell-Icon**: Ungelesene Notifications als Badge, Dropdown mit letzten Benachrichtigungen.
- **SignalR-Connection**: Pro User-Session, erhält Push-Events für neue Notifications.
- **Workflow-Admin**: Formularbasierte Verwaltung von Workflow-Definitionen (nur für `Workflow.Admin`).

#### E) Caching
- Workflow-Definitionen werden im **L1/L2-Cache** gehalten (ADR-08400, TTL: 10 Minuten, Cache-Region: `WorkflowDefinition`).
- Invalidierung bei Änderung über Domain Event `WorkflowDefinitionUpdated` (Event-basierte Cache-Invalidierung).

#### F) Testing
- State-Machine-Übergänge: **Unit Tests** (Domain Layer, keine Infrastruktur).
- Approval-Flows: **Integration Tests** (Application Layer, mit In-Memory-DB).
- Eskalation: **Integration Tests** mit simulierter Zeitverschiebung.
- E2E: Approval-Inbox → Genehmigen → Status prüfen.

## Verweise
- ADR-00006 (Outbox Pattern – Integration Events)
- ADR-01200 (Domain Events – Trigger für Workflows)
- ADR-01300 (Aggregate Boundaries – Saga/Process Manager)
- ADR-01500 (Domain Errors – ungültige Zustandsübergänge)
- ADR-01600 (Bounded-Context-Katalog – Workflow BC)
- ADR-03100 (Authorization – Permissions für Genehmigungsstufen)
- ADR-03200 (Permission Catalog – Workflow-Permissions)
- ADR-05000 (Lokalisierung – E-Mail-Templates, Notification-Texte)
- ADR-05500 (Background Jobs – Eskalation, E-Mail-Versand, Cleanup)
- ADR-05700 (Feature Flags – Entitlement.Workflow.Enabled)
- ADR-05800 (Daten-Audit – Delegation, Definition-Änderungen)
- ADR-06000 (Multi-Tenancy – Tenant-Isolation)
- ADR-06300 (Multi-Company – Company-spezifische Workflow-Override)
- ADR-08000 (Persistenz – Tenant-DB)
- ADR-08400 (Caching – Workflow-Definitionen Cache)
- ADR-50000 (Finanzwesen – GoBD, Belegfreigaben)
- ADR-50100 (Zahlungsverkehr – Zahlungsvorschlag-Freigabe)
