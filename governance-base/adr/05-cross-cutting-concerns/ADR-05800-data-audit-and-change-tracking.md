---
id: ADR-05800
title: Daten-Audit und Änderungsprotokollierung
status: accepted
date: 2026-02-24
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-05800 – Daten-Audit und Änderungsprotokollierung

## Entscheidungstreiber
- Vollständige Nachvollziehbarkeit fachlicher Datenänderungen (Fragebogen §7.1)
- GoBD-Konformität: unveränderbare Protokollierung aller Änderungen (ADR-50000)
- Abgrenzung zum Security-Audit (ADR-03400), das nur Autorisierungsentscheidungen erfasst
- Vorher/Nachher-Werte für Compliance, Support und Fehleranalyse
- Multi-Tenant-Isolation der Audit-Daten (ADR-06000)
- Append-only-Speicherung: einmal geschriebene Audit-Einträge dürfen nicht verändert werden
- ERP-Anforderung: Kunden und Prüfer müssen Änderungshistorien einsehen können

## Kontext
ADR-03400 definiert das **Security-Audit** – es erfasst Autorisierungsentscheidungen (Allowed/Denied) für Commands. Es beantwortet die Frage: *„Wer durfte was tun?"*

Was fehlt, ist ein **Daten-Audit**, das die tatsächlichen Datenänderungen protokolliert und beantwortet: *„Was hat sich konkret geändert?"* – mit Vorher/Nachher-Werten auf Feld-Ebene.

Der Fragebogen (§7.1) entscheidet sich für ein **vollständiges Audit-Log** mit **Append-only-Tabellen**. Temporal Tables und Event Sourcing wurden explizit abgewählt.

### Abgrenzung

| Aspekt | Security-Audit (ADR-03400) | Daten-Audit (dieser ADR) |
|--------|---------------------------|--------------------------|
| **Frage** | Wer durfte was? | Was hat sich geändert? |
| **Inhalt** | Permission, Result, UserId | Vorher/Nachher-Werte, Feldnamen |
| **Scope** | Nur Commands (Allowed/Denied) | Alle persistierten Änderungen (Create/Update/Delete) |
| **PII** | Strikt verboten | Erlaubt (Daten-Audit muss die echten Werte enthalten) |
| **Speicherung** | Log-System (Application Insights) | Append-only-Tabellen in Tenant-DB |
| **Zweck** | Compliance, Incident Analysis | Revisionssicherheit, Support, Fehleranalyse |

## Entscheidung

### 1) Scope: Vollständiges Daten-Audit

Jede persistierte Datenänderung wird protokolliert:

| Operation | Erfasst | Inhalt |
|-----------|---------|--------|
| **Create** | Ja | Alle initialen Feldwerte |
| **Update** | Ja | Nur geänderte Felder (Vorher/Nachher) |
| **Delete** | Ja | Alle Feldwerte vor Löschung |
| **Soft Delete** | Ja | Wie Update (IsDeleted: false → true) |

**Regeln:**
- Audit gilt für **alle Entities**, die über Commands verändert werden.
- Read-Only-Queries erzeugen keine Audit-Einträge.
- Bulk-Operationen erzeugen individuelle Audit-Einträge pro Entität.
- Technische Metadaten (z. B. `RowVersion`, `ConcurrencyToken`) werden **nicht** auditiert.

### 2) Audit-Entry-Schema

Jeder Audit-Eintrag enthält folgende Pflichtfelder:

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `Id` | `Guid` | Eindeutige ID des Audit-Eintrags |
| `TenantId` | `Guid` | Tenant-Zuordnung (aus Request Context, ADR-05300) |
| `CompanyId` | `Guid?` | Company-Zuordnung (falls entity `ICompanyScoped`, ADR-06300) |
| `UserId` | `string` | Ausführender User (Claim `oid`) |
| `Timestamp` | `DateTimeOffset` | Zeitpunkt der Änderung (UTC) |
| `EntityType` | `string` | Vollqualifizierter Typ der Entität (z. B. `Finance.Invoice`) |
| `EntityId` | `string` | Primärschlüssel der Entität (serialisiert) |
| `Operation` | `enum` | `Create`, `Update`, `Delete` |
| `Changes` | `json` | Array von `{ Field, OldValue, NewValue }` |
| `CommandName` | `string` | Name des auslösenden Commands (z. B. `UpdateCustomerCommand`) |
| `CorrelationId` | `string` | Correlation ID aus Request Context (ADR-05300, ADR-04000) |

**Beispiel `Changes`-Spalte (JSON):**
```json
[
  { "Field": "Name", "OldValue": "Müller GmbH", "NewValue": "Müller AG" },
  { "Field": "VatId", "OldValue": "DE123456789", "NewValue": "DE987654321" }
]
```

**Regeln:**
- Bei `Create`: `OldValue` ist immer `null`.
- Bei `Delete`: `NewValue` ist immer `null`.
- Bei `Update`: Nur geänderte Felder werden erfasst (kein Full Snapshot).
- Value Objects werden flach serialisiert (z. B. `Address.Street`, `Address.City`).
- Collection-Änderungen werden als Add/Remove pro Element erfasst.

### 3) Append-only-Speicherung

Audit-Einträge werden in **Append-only-Tabellen** in der jeweiligen **Tenant-DB** gespeichert.

| Aspekt | Entscheidung |
|--------|-------------|
| **Speicherort** | Tenant-DB (gleiche Datenbank wie die fachlichen Daten) |
| **Tabelle** | `AuditEntries` (eine zentrale Tabelle pro Tenant-DB) |
| **Schreibschutz** | Nur INSERT erlaubt – kein UPDATE, kein DELETE |
| **Durchsetzung** | DB-Trigger oder EF Core Interceptor verhindert Mutation |
| **Partitionierung** | Timestamp-basiert (monatlich), ermöglicht effiziente Archivierung |
| **Indexierung** | Composite-Index auf `(EntityType, EntityId, Timestamp)` |

**Regeln:**
- Die `AuditEntries`-Tabelle erhält **keinen Soft-Delete-Filter** (kein `ISoftDeletable`).
- Audit-Daten werden **in derselben Transaktion** wie die fachliche Änderung geschrieben (atomare Konsistenz).
- Kein nachträgliches Ändern oder Löschen von Audit-Einträgen – auch nicht durch Admins.
- Archivierung (z. B. nach 10 Jahren, GoBD) erfolgt über separate Ops-Prozesse.

### 4) Technische Implementierung

#### 4a) EF Core SaveChanges Interceptor

Die Audit-Erfassung erfolgt **automatisch** über einen EF Core `SaveChangesInterceptor`:

```
SaveChanges() aufgerufen
  → Interceptor liest ChangeTracker
  → Für jede geänderte Entity: Vorher/Nachher ermitteln
  → AuditEntry-Objekte erzeugen
  → AuditEntries in gleicher Transaktion persistieren
  → SaveChanges() fortsetzen
```

**Regeln:**
- Der Interceptor sitzt im **Infrastructure Layer** (ADR-00001).
- Er greift auf den `ChangeTracker` zu, um `EntityState.Added/Modified/Deleted` zu erkennen.
- `OriginalValues` liefern die Vorher-Werte, `CurrentValues` die Nachher-Werte.
- Der Request Context (ADR-05300) liefert `UserId`, `TenantId`, `CompanyId`, `CorrelationId`.
- Für Background Jobs (ADR-05500) wird der Kontext explizit gesetzt.

#### 4b) Opt-out für technische Entities

Bestimmte technische Entities können vom Audit **ausgenommen** werden:

| Ausnahme | Begründung |
|----------|-----------|
| Outbox-Einträge (`OutboxMessage`) | Infrastruktur, kein fachlicher State |
| Idempotency-Keys (`IdempotencyRecord`) | Technisch, kurzlebig |
| Audit-Einträge selbst (`AuditEntry`) | Vermeidung von Rekursion |

**Implementierung:** Marker-Interface `[ExcludeFromAudit]` oder Attribut auf Entity-Klasse.

**Regeln:**
- Opt-out muss **explizit** erfolgen (Default = auditiert).
- Jedes Opt-out muss per Code-Review begründet werden.
- ArchTest prüft, dass keine fachlichen Entities ausgenommen sind.

#### 4c) Sensible Daten und PII

Im Gegensatz zum Security-Audit (ADR-03400) **darf** das Daten-Audit PII enthalten – es muss die echten Vorher/Nachher-Werte speichern.

| Aspekt | Regel |
|--------|-------|
| **PII erlaubt** | Ja – Audit muss originale Werte enthalten |
| **Verschlüsselung** | Audit-Tabelle wird über Azure SQL TDE (Transparent Data Encryption) geschützt |
| **Zugriffskontrolle** | Leserecht auf Audit-Daten ist eine eigene Permission (`Audit.Read`, ADR-03200) |
| **DSGVO-Löschung** | Anonymisierung statt Löschung (PII-Felder werden maskiert, Audit-Struktur bleibt) |
| **Datenresidenz** | In der Tenant-DB → EU-only (ADR-00008) |

### 5) Abfrage und Darstellung

Audit-Daten werden über dedizierte **Read-Queries** (CQRS, ADR-00003) bereitgestellt:

| Query | Beschreibung |
|-------|-------------|
| `GetAuditTrail(EntityType, EntityId)` | Chronologische Änderungshistorie einer Entität |
| `GetAuditTrail(EntityType, DateRange)` | Änderungen eines Typs in einem Zeitraum |
| `GetAuditTrail(UserId, DateRange)` | Alle Änderungen eines Users |

**Regeln:**
- Audit-Queries nutzen **Dapper** (Read-Seite, ADR-08000 §10).
- Zugriff erfordert die Permission `Audit.Read` (ADR-03200).
- Pagination über Cursor-based Pagination (ADR-07300).
- Responses enthalten **keine** Audit-Daten anderer Tenants (Tenant-Filter ist Pflicht).

### 6) Retention und Archivierung

| Aspekt | Entscheidung |
|--------|-------------|
| **Standard-Retention** | 10 Jahre (GoBD-Konformität für Buchungsbelege) |
| **Konfigurierbar** | Ja, pro Tenant einstellbar (Minimum: gesetzliche Pflicht) |
| **Archivierungsstrategie** | Partitions-basiert: alte Partitionen werden in Cold Storage verschoben |
| **Cold Storage** | Azure Blob Storage (Archive Tier), Tenant-isoliert (ADR-08500) |
| **Löschung** | Erst nach Ablauf der Retention + explizitem Ops-Freigabeschritt |

### 7) Tests

| Testart | Prüfung |
|---------|---------|
| **Unit Tests** | Interceptor erkennt Änderungen korrekt (Added/Modified/Deleted) |
| **Unit Tests** | Vorher/Nachher-Werte werden korrekt extrahiert |
| **Unit Tests** | `[ExcludeFromAudit]` Entities werden übersprungen |
| **Integration Tests** | Audit-Einträge werden in derselben Transaktion geschrieben |
| **Integration Tests** | Append-only: UPDATE/DELETE auf `AuditEntries` schlägt fehl |
| **Integration Tests** | Tenant-Isolation: kein Cross-Tenant-Zugriff auf Audit-Daten |
| **ArchTests** | Keine fachlichen Entities mit `[ExcludeFromAudit]` |

### 8) Governance & ArchTests

ArchTests erzwingen:

1. Alle Entities (außer explizit ausgenommene) erzeugen Audit-Einträge bei Änderungen.
2. `AuditEntry` hat keinen `ISoftDeletable`-Marker.
3. Kein direkter Schreibzugriff auf `AuditEntries` außerhalb des Interceptors.
4. Fachliche Entities dürfen nicht `[ExcludeFromAudit]` tragen (nur Infrastruktur-Entities).
5. Audit-Queries prüfen immer den Tenant-Filter.

CI schlägt fehl, wenn eine dieser Regeln verletzt wird.

## Begründung
- **Append-only-Tabellen** statt Temporal Tables: volle Kontrolle über Schema und Partitionierung, kein Vendor-Lock-in auf SQL Server Temporal Tables.
- **EF Core Interceptor** statt manuellem Audit-Code: automatisch, lückenlos, kein vergessenes Audit in einzelnen Use Cases.
- **Tenant-DB** statt zentraler Audit-DB: Datenresidenz bleibt beim Tenant, kein Cross-Tenant-Risiko, einfachere DSGVO-Löschung.
- **Vollständiges Audit** statt selektiv: Fragebogen-Entscheidung, GoBD-konform, vermeidet spätere Nacharbeit.
- **JSON-Spalte für Changes** statt separater Spalten: flexibel für unterschiedliche Entity-Strukturen, keine Schema-Migration bei neuen Feldern.

## Alternativen

1. **Temporal Tables (SQL Server)**
   - Vorteile: eingebaute SQL Server Funktion, automatisch, `AS OF`-Syntax
   - Nachteile: Vendor Lock-in, keine Kontrolle über Schema, kein Zugriff auf Änderungs-Metadaten (Wer?), schwierige Partitionierung/Archivierung

2. **Event Sourcing**
   - Vorteile: perfekte Audit-Trail, volle Rekonstruierbarkeit
   - Nachteile: extrem hohe Komplexität, Team-Know-how fehlt, nicht passend für CRUD-lastige Stammdaten

3. **Trigger-basiertes Audit (DB-Level)**
   - Vorteile: unumgehbar, funktioniert auch bei direkten DB-Zugriffen
   - Nachteile: kein Zugriff auf Application Context (UserId, CommandName), schwer testbar, Migrations-Komplexität

4. **Selektives Audit (nur kritische Entities)**
   - Vorteile: weniger Datenvolumen, einfacher
   - Nachteile: Lücken, nachträgliches Erweitern aufwändig, Fragebogen hat „vollständig" entschieden

## Konsequenzen

### Positiv
- Vollständige Änderungshistorie für alle fachlichen Daten
- GoBD-konforme, unveränderbare Protokollierung
- Automatische Erfassung ohne manuellen Code pro Use Case
- Klare Abgrenzung zum Security-Audit (ADR-03400)
- Basis für Compliance-Reports und Kundenauskunft

### Negativ / Trade-offs
- Signifikanter Speicherbedarf (vollständiges Audit aller Entities)
- Leichter Performance-Overhead bei jedem `SaveChanges()` (Interceptor-Logik)
- JSON-Spalte erfordert sorgfältige Serialisierung (Value Objects, Collections)
- PII in Audit-Tabellen erfordert besonderen Datenschutz (Zugriffskontrolle, DSGVO-Anonymisierung)
- Archivierungsstrategie muss operativ betrieben werden

### Umsetzungshinweise
- Interceptor im Infrastructure Layer implementieren (`AuditSaveChangesInterceptor`)
- `IRequestContext` (ADR-05300) für UserId, TenantId, CompanyId, CorrelationId injizieren
- `Changes`-Spalte als `nvarchar(max)` mit JSON serialisieren (EF Core Value Converter)
- DB-Trigger als zusätzliche Sicherung: `INSTEAD OF UPDATE` und `INSTEAD OF DELETE` auf `AuditEntries`
- Composite-Index: `IX_AuditEntries_EntityType_EntityId_Timestamp`
- Partitionierung nach `Timestamp` (monatlich) für effiziente Archivierung
- Permission `Audit.Read` im Permission-Katalog registrieren (ADR-03200)
- Entity `AuditEntry` im Shared Kernel / Infrastructure bereitstellen

## Verweise
- ADR-03400 (Security Audit & Authorization Logging – Abgrenzung)
- ADR-05300 (Request Context – UserId, TenantId, CorrelationId)
- ADR-08000 (Persistence / EF Core – SaveChanges, ChangeTracker)
- ADR-00006 (Outbox Pattern – transaktionale Konsistenz)
- ADR-50000 (Finanzwesen / GoBD – Aufbewahrungsfristen, Revisionssicherheit)
- ADR-06000 (Multi-Tenancy – Tenant-Isolation)
- ADR-06300 (Multi-Company – CompanyId-Scope)
- ADR-03200 (Permission-Katalog – Audit.Read Permission)
- ADR-00001 (Clean Architecture – Interceptor im Infrastructure Layer)
- ADR-00003 (CQRS – Audit-Queries auf Read-Seite)
- ADR-04000 (Logging – CorrelationId)
