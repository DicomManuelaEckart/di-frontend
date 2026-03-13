---
id: ADR-06000
title: Multi-Tenancy (Tenant Isolation & Data Scoping)
status: accepted
date: 2026-01-21
scope: backend
enforced_by: archtests
affects:
  - backend
  - infrastructure
---

# ADR-06000 – Multi-Tenancy (Tenant Isolation & Data Scoping)

## Entscheidungstreiber
- Harte Tenant-Isolation als Security Boundary
- Vermeidung von Cross-Tenant Data Leaks
- Konsistenter Tenant Context über HTTP, Jobs und Messaging
- Durchsetzbare Guardrails (Scoping, Writes, Tests, ArchTests)
- Vorbereitung für Tenant Lifecycle (Onboarding/Disable/Delete)

## Kontext
Das System ist mandantenfähig. In mehreren ADRs wurde Tenant als zentraler Kontext festgelegt:
- TenantId ist Teil des Request Context (ADR-05300)
- Autorisierung ist tenant-aware (ADR-03100)
- Idempotency ist tenant-scoped (ADR-05400)
- Background Jobs nutzen System Contexts (ADR-05500)

Multi-Tenancy muss als harte Sicherheitsgrenze implementiert werden, um
Datenlecks zwischen Mandanten auszuschließen.

## Entscheidung

---

### 1) Multi-Tenancy-Modell
Wir verwenden:

- **Separate Database pro Tenant** (Model C)

Tenant-Isolation ist eine **harte Security Boundary**.

---

### 2) Tenant Context
Die TenantId stammt primär aus:

- **Claim im Access Token** (Tenant Quelle A)

Es gilt:
- genau **ein Tenant pro Request**
- kein “Multi-Tenant” Kontext in normalen Requests

---

### 3) Data Scoping
Tenant-Scoping wird über ein **kombiniertes Modell** umgesetzt:

- **Global Query Filter** (wo technisch möglich)
- **zusätzliche explizite Guards/Filter** (Guardrails)

Unscoped Queries sind grundsätzlich verboten, mit Ausnahme von:

- expliziten **System-/Admin-Use-Cases**

Diese Ausnahmen müssen klar markiert und besonders abgesichert sein.

---

### 4) Writes & Isolation
Schreibzugriffe sind tenant-sicher durch:

- TenantId wird aus dem **Context gesetzt** (nicht aus Request-DTOs)
- Validierung/Guards vor Persistenz

Änderungen über mehrere Tenants sind nicht erlaubt, außer:

- explizite **System-/Admin-Jobs**

---

### 5) Tenant in Domain & Architektur
TenantId ist Teil der Domain-Modelle nur dort, wo es fachlich sinnvoll ist:

- **nur in bestimmten Aggregates** (Tenant im Domain: C)

Die Domain darf Tenant kennen:

- **als Value Object** (Domain kennt Tenant: B)

Regeln:
- Domain enthält keine Infrastruktur-/Security-Abhängigkeiten
- TenantId ist fachlicher Kontext, nicht technisches Detail

---

### 6) Background Jobs & System Context
Jobs sind tenant-aware nach einem Mischmodell:

- Jobs können **über Tenants iterieren** (Admin/System) oder **genau einen Tenant** verarbeiten
- Beide Varianten sind erlaubt, aber klar zu trennen

Jobs ohne Tenant sind erlaubt:

- **nur Admin-/System-Jobs**
- müssen explizit gekennzeichnet und besonders abgesichert sein

---

### 7) Migrations, Seed & Lifecycle
Migrations erfolgen als Kombination:

- Schema-Versionierung ist global (Code/Migrations)
- Anwendung pro Tenant Database (ausgerollt pro Tenant)

Tenant Lifecycle ist relevant und umfasst:

- Onboarding (Create Tenant)
- Deaktivieren
- Löschen / Anonymisieren

Details werden in Folge-ADRs konkretisiert.

---

### 8) Security, Audit & Logging
- Tenant-Wechsel (z. B. Contextwechsel in Admin-Jobs) wird auditiert
- Cross-Tenant Zugriffe (Admin/System) werden explizit geloggt

Audit ist konsistent zu ADR-03400.
Logging/Telemetry konsistent zu ADR-04000/ADR-04100.

---

### 9) Tests & Governance
Tests prüfen explizit:

- Tenant-Isolation (kein Zugriff auf falschen Tenant)
- Unscoped Queries sind nur in expliziten Admin-Use-Cases möglich
- Writes setzen TenantId aus Context (nicht aus Request)

ArchTests erzwingen:

1) Kein Datenzugriff ohne Tenant-Scoping (außer markierte Admin-Use-Cases)
2) TenantId darf nicht aus Request DTOs übernommen werden
3) Tenant kommt ausschließlich aus Context-Abstraktionen (ADR-05300)
4) Domain enthält keine Tenant-Infrastruktur-Abhängigkeiten

CI schlägt fehl, wenn Regeln verletzt werden.

---

## Begründung
- Separate DB pro Tenant maximiert Isolation und reduziert Leckage-Risiko
- Claim-basierter Tenant Context ist konsistent mit AuthZ und Request Context
- Kombination aus Global Filters + Guards schützt vor Implementierungsfehlern
- Tenant im Domain nur wo fachlich sinnvoll verhindert unnötige Durchdringung
- Admin-Ausnahmen sind möglich, aber klar eingeschränkt und auditierbar
- Tests und ArchTests machen Multi-Tenancy langfristig belastbar

## Konsequenzen

### Positiv
- Sehr starke Isolation und Security Boundary
- Klare Verantwortlichkeiten und Durchsetzung
- Gute Grundlage für Compliance und Skalierung
- Saubere Unterstützung für Tenant Lifecycle

### Negativ / Trade-offs
- Höherer Betriebsaufwand (DB pro Tenant)
- Komplexeres Deployment/Migrations-Management
- Admin-/System-Use-Cases erfordern besondere Sorgfalt

## Umsetzungshinweise
- TenantId ausschließlich aus Claims/Context ableiten
- Tenant DB Resolution zentral (Tenant → Connection String)
- Für Admin-Jobs: explizite “Cross-Tenant” Markierung + Audit + Logging
- Guardrails für Unscoped Queries (opt-in und auffällig)
- Migrations orchestration pro Tenant DB
- Tests: „wrong tenant should not see data“ als Pflichttestset

## Verweise
- ADR-05300 (Request Context)
- ADR-03100 (Autorisierung, tenant-aware)
- ADR-03400 (Security Audit)
- ADR-04000 (Logging)
- ADR-04100 (Telemetry & Observability)
- ADR-05400 (Idempotency, tenant-scoped)
- ADR-05500 (Background Jobs)
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests / Gates)
- ADR-06100 (Tenant-aware Migrations & Seed Data)
