---
id: ADR-06200
title: Tenant Lifecycle Management (Onboarding, Deaktivierung, Löschung)
status: accepted
date: 2026-02-24
scope: backend
enforced_by: code-review
affects:
  - backend
  - operations
---

# ADR-06200 – Tenant Lifecycle Management

## Entscheidungstreiber
- Admin-gesteuertes Onboarding (kein Self-Service) als bewusste SaaS-Entscheidung (Fragebogen §1.4)
- DSGVO-Anforderungen: Recht auf Löschung / Datenportabilität erfordern definierten Offboarding-Prozess
- Database-per-Tenant (ADR-06000) macht Provisioning und Deprovisioning von Datenbanken zum Kernprozess
- Erwartete Skalierung: 500–600 Tenants in 5 Jahren (ADR-00008) erfordert automatisierte Abläufe
- Multi-Company (ADR-06300): Onboarding muss auch die initiale Company-Struktur berücksichtigen
- Revisionssicherheit: Deaktivierung und Löschung müssen nachvollziehbar und auditiert sein

## Kontext
ADR-06000 definiert das Database-per-Tenant-Modell und benennt den Tenant Lifecycle (Onboarding, Deaktivieren, Löschen) als offenen Punkt. ADR-06100 beschreibt Migrations und Seeds, die beim Onboarding ausgeführt werden. Dieses ADR konkretisiert den gesamten Lifecycle eines Tenants von der Erstellung bis zur endgültigen Löschung.

## Entscheidung

### 1) Tenant-Status-Modell

Jeder Tenant durchläuft einen definierten Lebenszyklus:

| Status | Bedeutung | Zugriff möglich? |
|--------|-----------|-----------------|
| **Provisioning** | Tenant wird gerade erstellt (DB, Seeds, Konfiguration) | Nein |
| **Active** | Normaler Betrieb | Ja |
| **Suspended** | Temporär gesperrt (z.B. Zahlungsverzug, Wartung) | Nein (Daten bleiben erhalten) |
| **Deactivated** | Dauerhaft deaktiviert, Vorstufe zur Löschung | Nein (Daten bleiben erhalten) |
| **PendingDeletion** | Daten werden gelöscht / anonymisiert | Nein |
| **Deleted** | Tenant vollständig entfernt | Nein (Metadaten für Audit bleiben) |

**Erlaubte Übergänge:**

| Von | Nach | Auslöser |
|-----|------|----------|
| – | Provisioning | Admin erstellt neuen Tenant |
| Provisioning | Active | Provisioning erfolgreich abgeschlossen |
| Provisioning | Deleted | Provisioning fehlgeschlagen (Cleanup) |
| Active | Suspended | Admin sperrt Tenant (manuell oder automatisiert) |
| Suspended | Active | Admin hebt Sperrung auf |
| Active / Suspended | Deactivated | Admin deaktiviert Tenant |
| Deactivated | PendingDeletion | Admin leitet Löschung ein (nach Karenzzeit) |
| PendingDeletion | Deleted | Löschung / Anonymisierung abgeschlossen |

**Regeln:**
- Statusübergänge werden als Domain Events publiziert (z. B. `TenantActivated`, `TenantSuspended`, `TenantDeactivated`). Diese Events leben in der **Admin-DB** und nutzen dasselbe Outbox Pattern wie Tenant-DB-Events (ADR-08100 §5, §9).
- Ein Tenant im Status `Suspended` oder `Deactivated` kann sich **nicht** anmelden – der Auth-Middleware prüft den Tenant-Status.
- Rückweg von `Deactivated` → `Active` ist **nicht** vorgesehen (bewusste Einschränkung, verhindert Zombie-Tenants).
- Rückweg von `Suspended` → `Active` ist erlaubt (temporäre Sperrung).

### 2) Onboarding-Prozess

Das Onboarding ist **admin-gesteuert** – kein Self-Service. Ein interner Admin erstellt den Tenant über ein internes Admin-Portal oder API.

**Ablauf:**

1. Admin erstellt Tenant-Anfrage (Name, Kontaktdaten, gewählte Module/Lizenzen, initiale Company-Daten)
2. System setzt Tenant-Status auf `Provisioning`
3. **Azure SQL Database erstellen** (Elastic Pool, ADR-06000)
4. **Schema-Migrationen ausführen** (ADR-06100, Forward-only)
5. **Technische Seeds** ausführen (System-Konfiguration, ADR-06100 §6)
6. **Fachliche Seeds** ausführen (Default-Rollen, Kontenrahmen-Template, Steuersätze, ADR-06100 §7)
7. **Initiale Company anlegen** (ADR-06300) mit Basis-Konfiguration
8. **Admin-User im Identity Provider (Entra ID) verknüpfen** (ADR-03000)
9. Status auf `Active` setzen, `TenantActivated`-Event publizieren
10. Bestätigungs-E-Mail an Tenant-Admin senden

**Fehlerbehandlung:**
- Bei Fehler in Schritt 3–8: automatisches Rollback (DB löschen falls erstellt, Status → `Deleted`).
- Fehler werden im Audit-Log protokolliert.
- Retry ist möglich (idempotentes Provisioning, ADR-06100 §8).

**Zeitrahmen:** Provisioning soll innerhalb von **< 5 Minuten** abgeschlossen sein (SLO).

### 3) Tenant-Suspension (temporäre Sperrung)

| Aspekt | Entscheidung |
|--------|-------------|
| **Auslöser** | Admin-Aktion (manuell) oder automatisiert (z.B. Zahlungsverzug via Billing-Event) |
| **Wirkung** | Alle API-Requests für diesen Tenant werden mit `403 Forbidden` + Fehlerdetail abgelehnt |
| **Daten** | Bleiben vollständig erhalten, keine Änderung an der Datenbank |
| **Background Jobs** | Werden für den suspendierten Tenant pausiert (keine Mahnläufe, CAMT-Imports etc.) |
| **Aufhebung** | Admin setzt Status zurück auf `Active`, sofort wirksam |

**Implementierung:**
- Auth-Middleware prüft Tenant-Status aus einem gecachten Tenant-Registry (Redis oder In-Memory).
- Bei `Suspended`: sofortige Ablehnung, bevor der Request den Application Layer erreicht.
- Cache-Invalidierung erfolgt event-basiert (`TenantSuspended`, `TenantReactivated`).

### 4) Deaktivierung

| Aspekt | Entscheidung |
|--------|-------------|
| **Auslöser** | Admin-Aktion (bewusste Entscheidung, z.B. Vertragskündigung) |
| **Wirkung** | Wie Suspension + Tenant erscheint nicht mehr in Admin-Listen (Soft-Deaktivierung) |
| **Karenzzeit** | 90 Tage zwischen Deaktivierung und Löschbarkeit (konfigurierbar) |
| **Datenexport** | Vor der Deaktivierung kann ein vollständiger Datenexport angefordert werden (DSGVO Datenportabilität) |
| **Rückweg** | Nicht vorgesehen – bei irrtümlicher Deaktivierung muss ein neuer Tenant erstellt werden |

**Regeln:**
- Admin muss die Deaktivierung explizit bestätigen (zweistufig: Anfrage → Bestätigung).
- Während der Karenzzeit bleiben alle Daten erhalten (für mögliche Datenexport-Anfragen).
- Nach Ablauf der Karenzzeit kann der Admin die endgültige Löschung einleiten.

### 5) Löschung und Anonymisierung

| Aspekt | Entscheidung |
|--------|-------------|
| **Auslöser** | Admin-Aktion nach Ablauf der Karenzzeit (90 Tage nach Deaktivierung) |
| **Strategie** | Vollständige Löschung der Tenant-Datenbank (Database-per-Tenant macht dies einfach) |
| **Personenbezogene Daten** | Werden gelöscht oder anonymisiert (DSGVO Art. 17) |
| **Aufbewahrungspflichtige Daten** | GoBD-relevante Daten (Buchungen, Belege) müssen ggf. **10 Jahre** aufbewahrt werden (§147 AO) |
| **Audit-Metadaten** | Tenant-Metadaten (Name, Erstellungsdatum, Löschungsdatum) bleiben in der zentralen Admin-DB für Audit-Zwecke |

**Ablauf:**

1. Admin leitet Löschung ein → Status `PendingDeletion`
2. System prüft Aufbewahrungsfristen:
   - Falls GoBD-pflichtige Daten vorhanden und Frist nicht abgelaufen: **Anonymisierung** statt Löschung (personenbezogene Daten entfernen, Buchungen behalten)
   - Falls keine Aufbewahrungspflicht oder Frist abgelaufen: **vollständige DB-Löschung**
3. Azure SQL Database löschen (oder archivieren bei Aufbewahrungspflicht)
4. Blob Storage Container für Tenant löschen (ADR-08500)
5. Cache-Einträge invalidieren
6. Entra ID: Tenant-Zuordnungen der Benutzer entfernen
7. Status → `Deleted`, `TenantDeleted`-Event publizieren
8. Audit-Eintrag: Löschung dokumentiert (wer, wann, Methode)

**Konflikt GoBD vs. DSGVO:**
- GoBD fordert 10 Jahre Aufbewahrung für steuerrelevante Unterlagen.
- DSGVO fordert Löschung personenbezogener Daten.
- **Lösung:** Anonymisierung – personenbezogene Felder (Namen, Adressen, E-Mails) werden durch Platzhalter ersetzt, Buchungsdaten und Beträge bleiben für die Aufbewahrungsfrist erhalten.
- Anonymisierte Datenbank wird in einen separaten Azure SQL-Pool verschoben (Cold Storage, minimale Kosten).

### 6) Tenant-Konfiguration

Jeder Tenant hat eine Konfiguration, die beim Onboarding initial gesetzt und danach anpassbar ist:

| Konfiguration | Speicherort | Standardwert |
|---------------|-------------|-------------|
| Lizenzierte Module | Zentrale Admin-DB | Gemäß Vertrag |
| Max. Benutzeranzahl | Zentrale Admin-DB | Gemäß Vertrag |
| Feature Flags | Azure App Configuration (ADR-05700) | Default-Profil |
| Kontenrahmen-Template | Tenant-DB (Seeds) | SKR03 |
| Default-Sprache | Tenant-DB | de-DE |
| Mahnfristen, Zahlungsziele | Tenant-DB (Company-Konfiguration) | Branchen-Standard |

**Regeln:**
- Vertragliche Konfiguration (Lizenzen, Limits) wird in der **zentralen Admin-DB** gespeichert (nicht in der Tenant-DB).
- Fachliche Konfiguration wird in der **Tenant-DB** gespeichert (pro Company, ADR-06300).
- Feature Flags werden über Azure App Configuration gesteuert, Tenant-spezifisch filterbar (ADR-05700).

## Begründung
- **Admin-gesteuertes Onboarding** passt zum B2B-SaaS-Modell – Qualitätskontrolle bei der Tenant-Erstellung, kein unkontrolliertes Wachstum.
- **Database-per-Tenant** macht Provisioning und Deprovisioning technisch sauber – eine DB erstellen oder löschen ist eine atomare Operation.
- **Statusmodell mit 6 Zuständen** deckt alle realen Szenarien ab (Provisioning-Fehler, temporäre Sperrung, geplantes Offboarding).
- **90 Tage Karenzzeit** gibt ausreichend Zeit für Datenexport und Irrtums-Korrektur.
- **Anonymisierung statt Löschung** löst den GoBD/DSGVO-Konflikt pragmatisch.
- **Event-basierte Statusänderungen** ermöglichen entkoppelte Reaktionen (Cache-Invalidierung, Benachrichtigungen, Billing).

## Alternativen
1) **Self-Service-Onboarding**
   - Vorteile: geringerer Admin-Aufwand, schnellerer Zugang
   - Nachteile: unkontrolliertes Wachstum, höheres Risiko für Missbrauch, komplexere Validierung
   - Entscheidung: nicht gewählt (B2B-Modell)

2) **Soft Delete statt DB-Löschung**
   - Vorteile: einfacheres „Undo", kein physischer Datenverlust
   - Nachteile: Datenbank bleibt bestehen (Kosten), DSGVO-Compliance fraglich
   - Entscheidung: nicht gewählt – DB-Löschung ist sauberer bei Database-per-Tenant

3) **Automatische Löschung nach Karenzzeit (ohne Admin-Bestätigung)**
   - Vorteile: weniger manueller Aufwand
   - Nachteile: Risiko versehentlicher Datenverluste, keine letzte Kontrolle
   - Entscheidung: nicht gewählt – Löschung erfordert explizite Admin-Bestätigung

## Konsequenzen

### Positiv
- Klarer, nachvollziehbarer Lebenszyklus für jeden Tenant
- DSGVO-konform durch definierten Lösch-/Anonymisierungsprozess
- GoBD-konform durch Aufbewahrung anonymisierter Buchungsdaten
- Tenant-Sperrung sofort wirksam durch Status-Check in Auth-Middleware
- Automatisiertes Provisioning ermöglicht Skalierung auf 500+ Tenants
- Event-basierte Architektur entkoppelt Lifecycle-Aktionen von der Kernlogik

### Negativ / Trade-offs
- Kein Rückweg von `Deactivated` → `Active` (bewusste Einschränkung)
- Anonymisierung ist komplex (welche Felder, welche Tabellen) und muss pro BC definiert werden
- Cold-Storage-Pool für anonymisierte DBs verursacht minimale laufende Kosten
- Provisioning < 5 Minuten erfordert optimierte DB-Erstellung und parallele Seed-Ausführung
- Zentrale Admin-DB wird zum Single Point of Truth für Tenant-Metadaten

### Umsetzungshinweise

**A) Tenant-Registry (zentrale Admin-DB):**
- Tabelle `Tenants`: Id, Name, Status, CreatedAt, SuspendedAt, DeactivatedAt, DeletedAt, LicensePlan, MaxUsers
- Tabelle `TenantStatusHistory`: TenantId, OldStatus, NewStatus, ChangedAt, ChangedBy, Reason
- Diese Tabelle lebt in einer **zentralen Admin-DB** (nicht in den Tenant-DBs)

**B) Auth-Middleware (Status-Check):**
- Bei jedem Request: Tenant-Status aus Cache (Redis) prüfen
- Nur `Active` → Request durchlassen
- `Suspended` / `Deactivated` → `403 Forbidden` mit `ProblemDetails` (Reason)
- `Provisioning` → `503 Service Unavailable`
- Cache-TTL: 1 Minute (kurz, da Statusänderungen sofort wirken sollen)
- Cache-Invalidierung zusätzlich event-basiert (ADR-08100)

**C) Provisioning-Job (ADR-05500):**
- Implementierung als Background Job mit Saga-Pattern (Schritte 3–9)
- Jeder Schritt idempotent und einzeln retrybar
- Timeout: 10 Minuten, danach automatischer Cleanup
- Telemetrie: Dauer pro Schritt tracken (ADR-04100)

**D) Lösch-/Anonymisierungs-Job:**
- Jeder Bounded Context definiert seine anonymisierbaren Felder (über ein Interface `IAnonymizable`)
- Zentrale Koordination über einen `TenantDeletionOrchestrator`
- Prüfung der Aufbewahrungsfristen vor jeder Feld-Anonymisierung

**E) Permissions:**
- `Admin.Tenant.Create` – Neuen Tenant erstellen
- `Admin.Tenant.Suspend` – Tenant temporär sperren
- `Admin.Tenant.Deactivate` – Tenant deaktivieren
- `Admin.Tenant.Delete` – Tenant endgültig löschen
- `Admin.Tenant.Export` – Tenant-Daten exportieren (DSGVO)

## Verweise
- ADR-06000 – Multi-Tenancy (Database-per-Tenant, Isolation)
- ADR-06100 – Tenant-aware Migrations & Seed Data (Onboarding-Seeds)
- ADR-06300 – Multi-Company / Organisationsstruktur
- ADR-00008 – Plattform-Entscheidung (SaaS, 500–600 Tenants)
- ADR-03000 – Authentifizierung (Entra ID, Tenant im Token)
- ADR-05300 – Request Context (Tenant Context)
- ADR-08100 – Integration Events (Lifecycle-Events)
- ADR-50000 – Finanzwesen / GoBD (Aufbewahrungsfristen)
- Fragebogen §1.4 (Tenant-Onboarding), §1.5 (SaaS-Modell)
