---
id: ADR-07100
title: External Integrations & Anti-Corruption Layers (ACL)
status: accepted
date: 2026-01-21
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-07100 – External Integrations & Anti-Corruption Layers (ACL)

## Entscheidungstreiber
- Schutz der Domain vor externen Modellen und Semantiken
- Austauschbarkeit und Entkopplung von externen Systemen
- Resilienz bei instabilen Abhängigkeiten
- Multi-Tenancy-fähige Integrationen (tenant-spezifische Konfiguration)
- Einheitliche Observability (Telemetry/Logging) und Fehlerbehandlung
- Agenten- und CI-fähige Governance

## Kontext
Das System integriert sich mit externen Systemen über:
- REST/HTTP APIs
- Messaging (Events/Queues)
- Datei-/Batch-Import/Export
- Identity/Directory (z. B. SCIM/Directory Integrations)

Integrationen können synchron und asynchron sein.
Ohne klare Architekturprinzipien drohen:
- Leaking externer Modelle in Domain/Application
- instabile, schwer testbare Implementierungen
- inkonsistentes Error- und Retry-Verhalten
- Cross-Tenant-Konfigurationsprobleme

## Entscheidung

---

### 1) Integrationsarten & Kommunikationsformen
Dieses ADR gilt für alle Integrationsarten:

- HTTP/REST
- Messaging
- Datei-/Batch
- Identity/Directory

Integrationen können:
- synchron (Request/Response)
- asynchron (Events/Queues)
sein und werden klar getrennt implementiert.

---

### 2) Anti-Corruption Layer (ACL) ist verpflichtend
Zwischen externen Systemen und der internen Domain existiert **immer** eine ACL.

Ziele der ACL:
- Übersetzung externer Semantik in interne Modelle
- Stabilisierung gegenüber externen Änderungen
- Isolierung von externen SDKs/Contracts

---

### 3) Platzierung der ACL (Mischmodell)
Die ACL wird nach einem Mischmodell umgesetzt:

- **Application** definiert Ports und Integrationsgrenzen (Contracts nach innen)
- **Infrastructure** implementiert Clients/Adapter und hält externe SDKs
- Mapping/Übersetzung findet in/nahe der Infrastructure statt, gesteuert über klare Application Ports

Regel:
- Domain kennt weder externe Systeme noch deren Modelle/SDKs.

---

### 4) Externe Contracts & Modelle
Externe Contracts werden strikt getrennt modelliert:

- Externe DTOs/Models liegen in `Infrastructure.External.*` (oder äquivalent)
- Keine Wiederverwendung von Presentation Models oder Application DTOs

Mapping-Regel (verpflichtend):
- **Extern → ACL Model → Domain/Application**

Direktes Mapping extern → Domain ist verboten.

---

### 5) Inbound vs. Outbound

#### Inbound (wir konsumieren Daten)
Validierung erfolgt zweistufig:
- ACL: Schema-/Format-/Contract-Validierung (z. B. Pflichtfelder, Typen)
- Application: Business-Validierung (Regeln, Invarianten, Use-Case-Checks)

#### Outbound (wir senden Daten)
Outbound-Format wird bestimmt durch:
- Domain Events → Integration Events (ACL) → externes Contract Model

Keine direkte Kopplung von Domain/Application an externe Payload-Formate.

---

### 6) Resilience & Timeouts (Policy pro Integration)
Resilienz wird **pro Integration** über Policies definiert:

- Timeouts
- Retries
- Circuit Breaker
- ggf. Rate Limits / Bulkheads (falls erforderlich)

Retries gelten nur für **transiente Fehler**.

Externe Calls sollen idempotent gestaltet werden, wo möglich:
- Upserts
- Idempotency Keys
- deduplizierende Endpunkte

---

### 7) Konsistenz & Outbox
Outbound-Integrationen folgen einem Mischmodell:

- bei Bedarf direkte Calls (synchron)
- bei Bedarf **Outbox Pattern** (eventual consistency)

Regeln:
- Use Cases entscheiden bewusst, ob strong consistency oder eventual consistency nötig ist
- Outbox ist bevorzugt für Integrationen mit höherer Latenz/Instabilität

---

### 8) Multi-Tenancy
Integrationen sind tenant-fähig nach Mischmodell:

- tenant-spezifische Credentials/Endpoints möglich
- global konfigurierte Integrationen ebenfalls möglich

Tenant Kontext wird über:
- Request Context (ADR-05300)
- tenant-aware Client Factory / Resolver

übergeben.

Kein „TenantId als Parameter überall“ als primäres Muster.

---

### 9) Observability & Logging
- Externe Calls sind als **Dependencies** in Telemetry sichtbar (ADR-04100)
- Logging folgt ADR-04000:
  - Payload Logging ist nur in Debug/Trace erlaubt
  - PII ist zu vermeiden, Metadaten sind bevorzugt

---

### 10) Fehlerbehandlung & Mapping
Externe Fehler werden über ACL stabilisiert:

- Externe Fehler → stabile Use-Case-/Domain-nahe Errors
- Keine ungefilterte Weitergabe externer Fehlerdetails an Clients

Ausfallstrategie ist eine Kombination:
- Fail fast bei nicht-recoverable Fehlern
- Queue/Retry später (asynchron) wo sinnvoll
- degrade gracefully (Fallbacks) wo fachlich möglich und explizit definiert

---

### 11) Tests
Es wird kombiniert getestet:

- Contract Tests gegen Stubs/Mocks
- Integration Tests gegen Sandbox/Test-Umgebungen (wo verfügbar)

Ziel:
- Stabilität der Übersetzung (ACL)
- robuste Resilienz-Policies
- keine Leaks externer Modelle

---

### 12) Governance & ArchTests
ArchTests erzwingen:

1) Domain kennt keine externen SDKs/Contracts
2) Externe Models verbleiben in Infrastructure (`Infrastructure.External.*`)
3) Mapping/Übersetzung erfolgt über ACL (kein extern → Domain)
4) Application definiert Ports; Infrastructure implementiert Adapter/Clients

CI schlägt fehl, wenn Regeln verletzt werden.

---

## Begründung
- ACL schützt Domain-Integrität und reduziert Kopplung
- Mischmodell hält Ports stabil und Implementierungen austauschbar
- Policy-basierte Resilienz verhindert globale Einheitslösungen
- Tenant-aware Integrationen sind notwendig für getrennte Kundenlandschaften
- Einheitliche Observability erleichtert Betrieb und Debugging
- ArchTests verhindern schleichende Architekturverletzungen

## Konsequenzen

### Positiv
- Hohe Robustheit gegenüber externen Änderungen
- Klar definierte Integrationsgrenzen
- Gute Testbarkeit (Contract + Sandbox)
- Multi-Tenancy-fähig ohne Parameter-Spam
- Gute Observability über Dependencies

### Negativ / Trade-offs
- Mehr initialer Code (Adapter, Mapper, Models)
- Pflegeaufwand für Policies und Contract Tests
- Disziplin nötig, um keine Abkürzungen (Leakage) zu nehmen

## Umsetzungshinweise
- Externe Clients ausschließlich in Infrastructure
- Pro Integration ein klarer Adapter + Mapper
- Policies pro Client konfigurieren (Timeout/Retry/Breaker)
- Idempotency sicherstellen (Keys/Upsert/Dedup)
- Telemetry Dependency Spans aktivieren
- Fehler stets in interne Fehlercodes/Errors übersetzen
- Tenant-aware Resolver für Credentials/Endpoints nutzen

## Verweise
- ADR-05300 (Request Context)
- ADR-05400 (Idempotency)
- ADR-06000 (Multi-Tenancy)
- ADR-08100 (Outbox Pattern & Integration Events)
- ADR-04000 (Logging)
- ADR-04100 (Telemetry & Observability)
- ADR-05200 (Error Handling & API Error Model)
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests / Gates)
