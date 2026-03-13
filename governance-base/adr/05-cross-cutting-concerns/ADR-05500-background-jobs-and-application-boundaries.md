---
id: ADR-05500
title: Background Jobs & Application Boundaries
status: accepted
date: 2026-01-21
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-05500 – Background Jobs & Application Boundaries

## Entscheidungstreiber
- Zuverlässige Verarbeitung außerhalb von HTTP Requests
- Klare Architekturgrenzen (Application vs Infrastructure)
- Unterstützung fachlicher und technischer Hintergrundaufgaben
- Konsistenz mit Request Context, Idempotency, Error Handling, Logging und Telemetry
- Agenten- und CI-fähige Governance

## Kontext
Das System benötigt Background Jobs für:
- technische Aufgaben (Cleanup, Reprocessing, Maintenance)
- fachliche Aufgaben (nachgelagerte Verarbeitung, Statuswechsel)
- Integrationsaufgaben (E-Mails, Webhooks, Notifications)

Background Jobs dürfen nicht zu einer zweiten, unregulierten “Nebenarchitektur” werden.
Sie müssen denselben Qualitäts- und Architekturregeln folgen wie HTTP-basierte Use Cases.

## Entscheidung

---

### 1) Ziel & Scope
Background Jobs decken ab:

- technische Tasks
- fachliche Prozesse
- Integrationsaufgaben

Background Jobs sind Teil der Systemarchitektur und werden als regulärer Bestandteil
der Verarbeitung betrachtet.

---

### 2) Zugehörigkeit zur Application
Background Jobs gehören zur **Application**:

- Sie sind Use Cases ohne HTTP
- Sie nutzen dieselben Ports/Abstraktionen wie andere Use Cases
- Sie unterliegen denselben Qualitätsgates (Tests, ArchTests, Logging/Telemetry)

---

### 3) Architekturbehandlung (Mischmodell)
Background Jobs werden nach einem **Mischmodell** behandelt:

- **Fachliche Jobs** werden wie normale Application Use Cases (Commands) umgesetzt
- **Technische Jobs** dürfen in der Infrastructure liegen, aber ohne Business-Logik

Regel:
- fachliche Logik bleibt in Domain/Application
- Infrastructure Jobs sind rein technisch (Maintenance, Cleanup, Rebuilds)

---

### 4) Domain-Logik
Background Jobs dürfen Domain-Logik ausführen, jedoch ausschließlich:

- über Application Use Cases
- nicht als direkte Domain-Manipulation in Infrastructure

---

### 5) Request Context & Security
Background Jobs nutzen einen **expliziten System-Context**:

- User (System Account)
- TenantId (explizit)
- CorrelationId (pro Job-Ausführung)

Es gibt keine Hintergrundverarbeitung ohne Context.

---

### 6) System Accounts
System Accounts sind **verpflichtend** für alle Jobs.

- eindeutig identifizierbar
- auditierbar
- keine PII

---

### 7) Idempotency & Retries
- Background Jobs sind **immer idempotent**
- Retries sind **erlaubt und erwartet**

Idempotency-Mechanismen sind kompatibel zu ADR-05400:
- Deduplication / Idempotency Keys
- tenant-spezifischer Scope
- transaktionale Einbindung (wo relevant)

---

### 8) Fehlerbehandlung
Fehlerbehandlung ist eine Kombination aus:

- Retry (für transient errors)
- Failed State / Dead Letter (für persistente Fehler)
- Manuelle Re-Execution (kontrolliert)

Fehlerklassifizierung (transient vs persistent) wird standardisiert.

---

### 9) Sichtbarkeit von Job-Fehlern
Job-Fehler sind sichtbar über:

- Logging (ADR-04000)
- Telemetry (ADR-04100)

Zusätzlich ist Audit möglich/erwünscht bei:
- sicherheitsrelevanten oder autorisierungsnahen Jobs (ADR-03400)

---

### 10) Infrastructure-Zugriff
Infrastructure-Zugriff ist erlaubt für **technische Jobs**.

Regel:
- technische Jobs dürfen direkt Infrastruktur nutzen (z. B. DB Cleanup)
- fachliche Jobs dürfen Infrastruktur nur über Application Ports nutzen

---

### 11) Job-Orchestrierung
Jobs dürfen andere Jobs **nur über Events** auslösen.

- keine direkte Job-zu-Job Kopplung
- Orchestrierung erfolgt ereignisgetrieben
- verhindert enge Kopplung und zyklische Abhängigkeiten

---

### 12) Tests
Job-Handler werden wie normale Use Cases getestet:

- Unit Tests für Application Job Commands/Handler
- Integration Tests optional für Infrastruktur-nahe technische Jobs
- Idempotency- und Retry-Verhalten wird explizit getestet

---

### 13) Governance & ArchTests
ArchTests erzwingen:

1) Fachliche Jobs liegen im Application Layer
2) Keine Business-Logik in Infrastructure Jobs
3) System-Context ist verpflichtend (User, Tenant, Correlation)
4) Keine direkten Domain-Manipulationen in Infrastructure Jobs
5) Job-Orchestrierung nur über Events

CI schlägt fehl, wenn Regeln verletzt werden.

---

## Begründung
- Background Jobs sind „Use Cases ohne HTTP“ und müssen denselben Regeln folgen
- Mischmodell ermöglicht technische Maintenance ohne Business-Kontamination
- System-Context sorgt für Nachvollziehbarkeit und Multi-Tenancy-Konsistenz
- Idempotency + Retries erhöhen Robustheit
- Event-getriebene Orchestrierung vermeidet enge Kopplung

## Konsequenzen

### Positiv
- Saubere Architekturgrenzen und hohe Wartbarkeit
- Konsistentes Verhalten über alle Verarbeitungspfade
- Robuste Verarbeitung bei Wiederholungen und Fehlern
- Gute Observability und Auditierbarkeit

### Negativ / Trade-offs
- Mehr initialer Struktur- und Implementierungsaufwand
- Disziplin notwendig bei Trennung fachlich/technisch
- Event-basierte Orchestrierung benötigt klare Event-Modelle

## Umsetzungshinweise
- Fachliche Jobs als Commands in Application modellieren
- Technische Jobs klar als Maintenance kennzeichnen
- System-Context beim Job-Start erzeugen
- CorrelationId pro Ausführung setzen und durchreichen
- Retry-Policy standardisieren und dokumentieren
- Failed State / DLQ Mechanismus definieren
- Events zur Job-Kopplung bevorzugen (Outbox kompatibel)

---

### 14) Technologie-Wahl: Azure Functions & Hosted Services

Die konkreten Technologien für Background Jobs sind:

#### a) Azure Functions (Serverless)
- **Einsatz für:** Event-getriebene, skalierbare Jobs mit variabler Last
- **Trigger-Typen:**
  - **Service Bus Trigger** – Verarbeitung von Integration Events (ADR-08100)
  - **Timer Trigger** – Geplante periodische Aufgaben (Cleanup, Aggregation, Metering)
  - **Blob Trigger** – Reaktion auf Datei-Upload (ADR-08500)
  - **HTTP Trigger** – Manuelle Re-Execution / Admin-APIs
- **Isolation:** .NET Isolated Worker Process (Out-of-Process)
- **Hosting:** Azure Functions Premium Plan (VNET-Integration, keine Cold-Start-Probleme)
- **Skalierung:** Event-driven Auto-Scaling, pro Function App konfigurierbar

#### b) .NET Hosted Services (IHostedService / BackgroundService)
- **Einsatz für:** Langlebige, prozessinterne Hintergrundaufgaben
- **Typische Aufgaben:**
  - **Outbox Dispatcher** – Polling der Outbox-Tabelle, Dispatch an Service Bus (ADR-00006)
  - **Cache Warm-up** – Initiale Befüllung bei App-Start
  - **Health-Check Probes** – Interne Systemprüfungen
- **Hosting:** Im selben Prozess wie die API (Azure Container Apps / App Service)
- **Lifecycle:** Starten/Stoppen mit der Host-Anwendung

#### c) Zuordnungsregeln
| Job-Art | Technologie | Begründung |
|---------|------------|------------|
| Event-Verarbeitung (Service Bus) | Azure Functions | Event-driven Scaling, isoliert |
| Periodische Aufgaben (Timer) | Azure Functions | Serverless, kein dauerhafter Prozess nötig |
| Outbox Dispatcher | Hosted Service | Muss im API-Prozess laufen (gleiche DB-Transaktion) |
| Cache Warm-up | Hosted Service | Einmalig bei App-Start |
| Datei-Verarbeitung | Azure Functions | Blob Trigger, skalierbar |
| Fachliche Batch-Verarbeitung | Azure Functions | Isoliert, skalierbar, Retry via Service Bus |

#### d) Nicht eingesetzte Alternativen
- **Hangfire:** Nicht gewählt – erfordert eigene Persistenz, weniger Cloud-nativ
- **Azure WebJobs:** Veraltet zugunsten von Azure Functions
- **Azure Durable Functions:** Nicht im initialen Scope; bei komplexen Orchestrierungen evaluierbar

## Verweise
- ADR-05300 (Request Context)
- ADR-05400 (Idempotency & Request Deduplication)
- ADR-05200 (Error Handling & API Error Model)
- ADR-00006 (Outbox Pattern)
- ADR-08100 (Integration Events & Messaging)
- ADR-08300 (CI/CD & Deployment)
- ADR-04000 (Logging)
- ADR-04100 (Telemetry & Observability)
- ADR-03400 (Security Audit)
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests / Gates)
