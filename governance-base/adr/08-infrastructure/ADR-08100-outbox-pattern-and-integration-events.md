---
id: ADR-08100
title: Outbox Pattern & Integration Events
status: accepted
date: 2026-01-21
scope: backend
enforced_by: code-review
affects:
  - backend
---

# ADR-08100 – Outbox Pattern & Integration Events

## Entscheidungstreiber
- Zuverlässige externe Integrationen ohne doppelte Nebenwirkungen
- Transaktionale Konsistenz zwischen fachlichem Zustand und ausgehenden Events
- Klare Trennung von Domain Events (intern) und Integration Events (extern)
- Enterprise-ready Message Broker mit Topics, Subscriptions und Dead-Letter
- Standardisiertes Event-Schema für Interoperabilität (CloudEvents)
- Zentrale Schema-Verwaltung für Event-Versionierung
- Tenant-sichere Event-Verarbeitung (Multi-Tenancy)
- Resilienz, Observability und Auditierbarkeit
- Agenten- und CI-fähige Governance

## Kontext
Das System nutzt:
- Persistence mit EF Core Writes + Dapper Reads (ADR-08000)
- Separate DB pro Tenant (ADR-06000)
- Tenant-aware Migrations/Seeds (ADR-06100)
- External Integrations via Anti-Corruption Layer (ADR-07100)
- Idempotency und Background Jobs (ADR-05400, ADR-05500)

Externe Integrationen sind inhärent unzuverlässig. Ohne Outbox entstehen:
- verlorene Events (DB commit ok, Publish failed)
- doppelte Publishes (Retries)
- inkonsistente Zustände

## Entscheidung

---

### 1) Ziel & Scope
Das Outbox Pattern wird eingesetzt **nur für externe Integrationen**.

Ziel:
- sichere, wiederholbare Event-Ausleitung an externe Systeme
- Entkopplung von Request-Flow und externem Versand

---

### 2) Event-Typen & Abgrenzung
Es existieren zwei klar getrennte Event-Typen:

- **Domain Events** (intern)
- **Integration Events** (extern)

Domain Events sind rein intern und werden nicht direkt nach außen publiziert.
Integration Events sind die einzige Event-Form, die nach außen geht.

---

### 3) Erzeugung von Integration Events
Integration Events werden in der **Application** erzeugt:

- nach erfolgreicher Ausführung eines Use Cases
- als explizite Entscheidung des Use Cases

Integration Events werden **nicht** in der Domain erzeugt.

---

### 4) Transaktionen & Konsistenz
Fachliche Änderungen und Outbox-Einträge werden in **derselben DB-Transaktion**
persistiert:

- Aggregate State Change
- Outbox Insert

Bei Commit-Fehlern gilt:
- es wird **nichts** persistiert (atomar)

---

### 5) Outbox Storage
Die Outbox liegt:

- in derselben Datenbank wie das Aggregate (pro Tenant DB **und** in der Admin-DB)

Damit gilt das Outbox Pattern für **zwei DB-Typen**:

| DB-Typ | Aggregates (Beispiele) | Events (Beispiele) |
|--------|----------------------|-------------------|
| **Tenant-DB** | Kunden, Rechnungen, Buchungen | `InvoiceFinalized`, `OrderPlaced` |
| **Admin-DB** | Tenants, Feature Flags, Lizenzen | `TenantCreated`, `TenantSuspended`, `FeatureFlagChanged`, `LicensePlanUpdated` |

In beiden Fällen wird der Outbox-Eintrag innerhalb derselben Transaktion wie der State Change geschrieben. Die Outbox-Tabelle in der Admin-DB hat dasselbe Schema wie in den Tenant-DBs (§6).

---

### 6) Outbox-Struktur
Outbox wird als generische Tabelle umgesetzt, z. B. mit:

- `EventId`
- `EventType`
- `OccurredAtUtc`
- `TenantId`
- `Payload` (serialized)
- `Metadata` (CorrelationId, Version, etc.)
- `Status` (Pending/Processing/Published/Failed)
- Retry-/Fehlerfelder (Attempts, LastError, NextAttemptAtUtc)

---

### 7) Verarbeitung & Dispatch
Outbox Events werden durch einen **Background Job / Worker** verarbeitet.

Dispatch-Garantie:
- **At-least-once**

Exactly-once wird nicht garantiert; Idempotency ist erforderlich.

---

### 7b) Message Broker: Azure Service Bus

Als konkreter Message Broker wird **Azure Service Bus** (Premium Tier) eingesetzt:

| Aspekt | Entscheidung |
|--------|-------------|
| **Produkt** | Azure Service Bus (Premium für Produktion, Standard für Dev/Test) |
| **Messaging-Modell** | Topics + Subscriptions für Pub/Sub; Queues für Point-to-Point |
| **Dead-Letter Queue** | Automatisch für fehlgeschlagene Nachrichten |
| **Sessions** | Für geordnete Verarbeitung pro Aggregate (Session ID = Aggregate ID) |
| **Max Delivery Count** | 10 (konfigurierbar), danach Dead-Letter |
| **TTL** | 14 Tage Default, konfigurierbar pro Topic |

**Regeln:**
- Der Outbox-Dispatcher publiziert Integration Events auf Azure Service Bus Topics.
- Pro Event-Typ existiert ein eigenes **Topic** (z. B. `invoice-finalized`, `order-created`).
- Consuming Bounded Contexts registrieren **Subscriptions** mit Filtern.
- Kein direkter Broker-Zugriff aus Application oder Domain – nur über Infrastructure (Outbox-Dispatcher).
- Connection Strings werden über **Azure Key Vault** bezogen, nicht in der Konfiguration.
- Für lokale Entwicklung: Azure Service Bus Emulator oder Testcontainers.

---

### 7c) Event-Schema: CloudEvents Standard

Alle Integration Events folgen dem **CloudEvents v1.0 Standard** (CNCF):

```json
{
  "specversion": "1.0",
  "id": "evt-a1b2c3d4-...",
  "source": "/tenants/{tenantId}/modules/sales",
  "type": "di.erp.sales.invoice-finalized.v1",
  "time": "2026-02-24T14:30:00Z",
  "datacontenttype": "application/json",
  "subject": "RE-2026-00001",
  "data": {
    "invoiceNumber": "RE-2026-00001",
    "companyId": "...",
    "totalAmount": 1500.00,
    "currency": "EUR"
  },
  "tenantid": "...",
  "correlationid": "..."
}
```

**Regeln:**
- `specversion`, `id`, `source`, `type`, `time` sind Pflichtfelder (CloudEvents Core).
- `type` folgt dem Schema: `di.erp.{module}.{event-name}.v{version}` (z. B. `di.erp.sales.invoice-finalized.v1`).
- `source` enthält Tenant-ID und Modul-Herkunft.
- `tenantid` und `correlationid` als Extension Attributes.
- `data` enthält den fachlichen Payload (keine PII, vgl. §13).
- Serialisierung: JSON (Content Mode: Structured).

---

### 7d) Schema Registry

Integration Event Schemas werden in einer **zentralen Schema Registry** verwaltet:

| Aspekt | Entscheidung |
|--------|-------------|
| **Speicherort** | Git-Repository (Ordner `schemas/events/`) – versioniert mit dem Code |
| **Format** | JSON Schema (Draft 2020-12) |
| **Validierung** | CI-Pipeline validiert Events gegen Schema |
| **Versionierung** | Schema-Version im Event-Type (`v1`, `v2`) |
| **Kompatibilitätsregel** | Backward Compatible – nur additive Änderungen innerhalb einer Version |
| **Breaking Changes** | Neue Version (v1 → v2), alte Version wird für Übergangszeit parallel bedient |

**Regeln:**
- Jeder Integration Event Typ **muss** ein JSON Schema in `schemas/events/{module}/{event-type}.v{n}.json` haben.
- CI prüft: Event-Klasse im Code muss zum Schema passen (Schema-Validierungs-Test).
- Neue Events oder Schema-Änderungen erfordern ein Review (Schema Owner = besitzender BC).
- Breaking Changes müssen als neuer ADR oder Story dokumentiert werden.

---

### 8) Idempotency & Ordering
Idempotency wird beidseitig unterstützt:

- Producer-seitig: stabile `EventId`
- Consumer-seitig: Dedupe/Idempotency Handling

Ordering:
- Reihenfolge wird **pro Aggregate** garantiert (sofern technisch möglich)
- keine globale Reihenfolgegarantie

---

### 9) Multi-Tenancy & Admin-DB
- Outbox in Tenant-DBs ist **tenant-spezifisch** und folgt der Tenant Isolation
- `TenantId` ist **immer** Teil des Integration Events (Payload oder Metadata)
- Outbox in der **Admin-DB** ist **plattformweit** (nicht tenant-spezifisch)
  - Admin-DB-Events enthalten `TenantId` nur wenn fachlich relevant (z. B. `TenantSuspended` enthält die betroffene Tenant-ID)
  - Plattformweite Events (z. B. globale Feature-Flag-Änderung) haben kein `TenantId`
- Der Outbox-Dispatcher verarbeitet beide DB-Typen:
  - Tenant-DB-Dispatcher: iteriert über alle Tenant-DBs (bestehender Mechanismus)
  - Admin-DB-Dispatcher: verarbeitet die zentrale Admin-DB-Outbox (eigener Worker oder gemeinsamer Worker mit DB-Typ-Erkennung)

Dies ermöglicht:
- tenant-sichere Verarbeitung für Tenant-Events
- zuverlässige Lifecycle- und Konfigurations-Events aus der Admin-DB
- Routing / Credentials Auswahl im Dispatcher

---

### 10) Fehler & Retry
Bei Dispatch-Fehlern gilt ein kombiniertes Modell:

- Retry mit Backoff
- Failed State / Dead Letter
- manuelle Re-Execution (kontrolliert)

Retry-Strategie ist **konfigurierbar**
(z. B. Max Attempts, Backoff, Retry Window).

---

### 11) Observability & Audit
Telemetry und Logging erfolgen gemäß ADR-04000 / ADR-04100:

- Dispatch ist als Dependency sichtbar
- Errors werden geloggt
- zusätzlich werden erfolgreiche Publishes erfasst (Telemetry + Logs)

Audit:
- versendete Integration Events werden auditiert
  (mindestens: EventId, EventType, TenantId, Timestamp, Outcome)

Keine PII in Event Payloads oder Audit.

---

### 12) Tests
Es werden kombiniert getestet:

- Unit Tests (Outbox Writer, Mapper)
- Integration Tests (DB + Dispatcher + Retry/Failed State)

Tests prüfen:
- transaktionale Persistenz (State + Outbox)
- At-least-once Verhalten
- Idempotency/Dedupe
- Tenant Isolation
- Ordering pro Aggregate (wo zugesichert)

---

### 13) Governance & ArchTests
ArchTests erzwingen:

1) Domain erzeugt keine Integration Events
2) Outbox Storage und Dispatcher liegen in Infrastructure
3) Application hat keinen direkten Broker-Zugriff
4) Integration Events enthalten TenantId
5) Event Payloads enthalten keine PII (nach definierten Regeln)

CI schlägt fehl, wenn Regeln verletzt werden.

---

## Begründung
- Outbox löst das Dual-Write-Problem (DB + Broker)
- At-least-once ist realistisch und bewährt; Idempotency ergänzt dies sauber
- Trennung Domain/Integration Events schützt Domain und Integrationsverträge
- **Azure Service Bus** ist enterprise-ready, bietet Topics/Subscriptions, Dead-Letter, Sessions und hat erstklassige Azure-Integration
- **CloudEvents** ist ein CNCF-Standard und sorgt für Interoperabilität – Consumer können unabhängig entwickelt werden
- **Schema Registry im Git** ermöglicht Code-Review, Versionierung und CI-Validierung ohne zusätzliche Infrastruktur
- Tenant-spezifische Outbox passt zu harter Tenant Isolation
- Worker-basierter Dispatch passt zu Background Job ADR

## Konsequenzen

### Positiv
- Zuverlässige externe Integrationen
- Atomare Konsistenz zwischen State und Event
- Gute Observability und Auditierbarkeit
- Saubere Multi-Tenant-Unterstützung
- Standardisiertes Event-Format (CloudEvents) erleichtert Consumer-Entwicklung
- Zentrale Schema Registry verhindert Schema-Drift und erzwingt Kompatibilität

### Negativ / Trade-offs
- Zusätzliche Infrastruktur (Dispatcher/Worker, Azure Service Bus)
- Eventual Consistency für externe Systeme
- Mehr Komplexität (Retries, Failed State, Cleanup)
- CloudEvents-Overhead (zusätzliche Metadaten pro Event)
- Schema Registry erfordert Disziplin bei Schema-Pflege
- Azure Service Bus Premium ist kostenpflichtig (ca. €670/Monat pro Messaging Unit)

## Umsetzungshinweise
- Outbox Insert im selben DbContext/Transaction wie Aggregate-Write
- Dispatcher als Background Job mit Lease/Locking (gegen Parallelverarbeitung)
- Backoff + Max Attempts konfigurierbar
- Failed Events sichtbar machen (Ops Dashboard/Endpoint optional)
- Cleanup-Job für alte Outbox-Einträge (Retention Policy)
- Integration Event Schema versionieren (kompatibel mit ADR-07000)
- Azure Service Bus:
  - Connection via Managed Identity (nicht Connection Strings) in Produktion
  - Topic-Naming: `{module}.{event-name}` (z. B. `sales.invoice-finalized`)
  - Subscription-Naming: `{consumer-module}` (z. B. `finance`)
  - Dead-Letter Queue-Monitoring via Azure Monitor Alerts (ADR-09100)
- CloudEvents:
  - NuGet Package `CloudNative.CloudEvents` für Serialisierung
  - Extension Attributes (`tenantid`, `correlationid`) als Custom Extensions registrieren
- Schema Registry:
  - Verzeichnisstruktur: `schemas/events/{module}/{event-type}.v{n}.json`
  - CI-Step: `dotnet test` validiert Event-Klassen gegen JSON Schemas
  - Schema Änderungen erfordern PR-Review durch Schema Owner

## Verweise
- ADR-07100 (External Integrations & ACL)
- ADR-08000 (Persistence)
- ADR-06000 (Multi-Tenancy)
- ADR-06100 (Tenant-aware Migrations & Seed Data)
- ADR-05400 (Idempotency)
- ADR-05500 (Background Jobs)
- ADR-04000 (Logging)
- ADR-04100 (Telemetry & Observability)
- ADR-03400 (Security Audit)
- ADR-07000 (API Contracts & Versioning)
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests / Gates)
- Fragebogen §6.1–§6.3
