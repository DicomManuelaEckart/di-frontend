# Architecture Decision Records (ADR)

Dieses Dokument listet alle Architecture Decision Records (ADRs) des Projekts.
ADRs dokumentieren *konkrete* Architekturentscheidungen inklusive Kontext, Alternativen und Konsequenzen.
Jede Story soll – wo relevant – auf die passenden ADRs referenzieren.
Die Nummerierung ist blockweise aufgebaut und spiegelt thematische Verantwortlichkeiten wider.

## Status-Legende
- **Proposed**: Vorschlag, noch nicht final entschieden
- **Accepted**: Gültige Entscheidung, umzusetzen und einzuhalten
- **Superseded**: Ersetzt durch ein neueres ADR
- **Deprecated**: Nicht mehr verwenden (ohne direkten Ersatz)

---

## 00000–00999 – Grundlagen & Governance

- ADR-00000 - Architecture Decision Review Process
- ADR-00001 – Clean Architecture (Layering, Verantwortlichkeiten)
- ADR-00002 – Architektur-Gates / ArchTests (Durchsetzung der Abhängigkeitsregeln)
- ADR-00003 – CQRS (Commands/Queries, Minimalansatz)
- ADR-00004 – Persistence: EF Core + SQL + Migrations
- ADR-00005 – Validierung & Fehlerbehandlung (Boundary vs Domain)
- ADR-00006 – Outbox Pattern (Integration Reliability)
- ADR-00007 – Agent Governance (Was Agenten dürfen / nicht dürfen)
- ADR-00008 – Plattform-Entscheidung (Reines Cloud-SaaS, EU-only, Skalierung)

---

## 01000–01999 – Clean Architecture & Domain-Driven Design

- ADR-01000 – Domain-Driven Design (Grundlagen)
- ADR-01100 – Aggregates, Entities & Value Objects
- ADR-01200 – Domain Events (interne Handler erlaubt)
- ADR-01300 – Ubiquitous Language & Modellkonsistenz
- ADR-01400 – Bounded Contexts & Modulgrenzen
- ADR-01500 – Domain Errors (DDD-konform)
- ADR-01600 – Bounded-Context-Katalog und BC-Kommunikation
- ADR-01700 – ID-Strategie: Hybrid GUID + fachliche ID und Belegnummernkreise

---

## 02000–02999 – Testing & Quality Gates

- ADR-02000 – Testing Strategy
- ADR-02100 – Test Projects, Naming & Struktur
- ADR-02200 – Coverage Measurement & CI Enforcement

---

## 03000–03999 – Security

- ADR-03000 – Authentifizierung (Entra ID, OIDC, JWT)
- ADR-03100 – Autorisierung (Permissions, Application-enforced, Tenant-aware)
- ADR-03200 – Permission-Katalog & Claim-Schema
- ADR-03300 – Dev Authentication (Fake User & Safety Rails)
- ADR-03400 – Security Audit & Authorization Logging
- ADR-03500 – DSGVO, Datenschutz und Datenresidenz (PII-Klassifikation, Betroffenenrechte, Privacy by Design, Aufbewahrungsfristen, AVV, Datenpannen-Management)

---

## 04000–04999 – Logging & Observability

- ADR-04000 – Logging Strategy & Guidelines
- ADR-04100 – Telemetry & Observability (Tracing, Metrics, Health)

---

## 05000–05999 – Application Cross-Cutting Concerns

- ADR-05000 – Localization / Internationalization (i18n)
- ADR-05100 – Validation Strategy (Domain + Application)
- ADR-05200 – Error Handling & API Error Model
- ADR-05300 – Request Context (User, Tenant, Culture, Correlation)
- ADR-05400 – Idempotency & Request Deduplication
- ADR-05500 – Background Jobs & Application Boundaries
- ADR-05600 - Scheduled Jobs / Recurring Tasks (Cron-ähnliche Scheduling-Mechanismen, Hangfire/Quartz oder Azure Functions Timer, Tenant-übergreifende vs. tenant-spezifische Jobs) *geplant*
- ADR-05700 – Feature Flags & Toggles (Azure App Configuration, Tenant-basiert, Entitlement)
- ADR-05800 – Daten-Audit und Änderungsprotokollierung (Vorher/Nachher, Append-only, EF Core Interceptor)

---

## 06000–06999 – Multi-Tenancy

- ADR-06000 – Multi-Tenancy (Tenant Isolation & Data Scoping)
- ADR-06100 – Tenant-aware Migrations & Seed Data
- ADR-06200 – Tenant Lifecycle Management (Onboarding, Deaktivierung, Löschung)
- ADR-06300 – Multi-Company / Organisationsstruktur (Tenant → Company, ICompanyScoped, Daten-Sharing)


---

## 07000–07999 – API & Integration

- ADR-07000 – API Contracts & Versioning
- ADR-07100 – External Integrations & Anti-Corruption Layers
- ADR-07200 – HTTP & API Boundary Isolation
- ADR-07300 – Pagination, Filtering & Sorting
- ADR-07400 - Rate Limiting / Throttling (API-Abuse, Tenant-übergreifende Fair-Use-Policies, DoS-Prävention) *geplant*
- ADR-07500 - API Gateway / BFF Pattern (Direkter API-Zugriff oder Gateway davor?, Backend-for-Frontend für SPA?, API Management (Azure APIM)?) *geplant*
- ADR-07600 - Data Export / Reporting (Bulk Data Export, Reporting Database / Data Warehouse, GDPR Data Portability) *geplant*

---

## 08000–08999 – Infrastructure & Deployment

- ADR-08000 – Persistence (EF Core, SQL, Migrations)
- ADR-08100 – Outbox Pattern & Integration Events
- ADR-08200 – Infrastructure as Code (Terraform)
- ADR-08300 – CI/CD Pipelines & Environment Strategy
- ADR-08400 – Caching-Strategie (Redis Premium + In-Memory Hybrid, Tenant-isoliert, Event-basierte Invalidierung)
- ADR-08500 – File Storage und Dokumentenmanagement (Azure Blob Storage, Tenant-isoliert, Hybrid-Zugriff)
- ADR-08600 - Secrets Rotation (Automatische Rotation, Zero-Downtime Secret Updates, Tenant-spezifische Secrets Lifecycle) *geplant*

---

## 09000–09999 – Operations & Platform

- ADR-09000 – Health Checks & Readiness Probes
- ADR-09100 – SLOs, Alerts & Operational Monitoring
- ADR-09200 - Disaster Recovery / Backup (RTO/RPO-Ziele, Cross-Region Backup, Tenant-spezifische Restore-Fähigkeit) *geplant*

---

## 10000–10999 – Frontend

- ADR-10000 – Frontend-Architektur (SPA, Grundstruktur)
- ADR-10100 – UI-Layout & Komponentenstruktur (Header, Footer, Menü, Content)
- ADR-10200 – State Management (Service-basiert, reaktiv)
- ADR-10300 – REST-API-Kommunikation & HTTP-Client
- ADR-10400 – Routing & Navigation (Lazy Loading, Guards)
- ADR-10500 – Formulare, Validierung & CRUD-Operationen
- ADR-10600 – Authentifizierung & Autorisierung im Frontend (OIDC, Permissions)
- ADR-10700 – Fehlerbehandlung & Benutzer-Feedback
- ADR-10800 – Lokalisierung & Internationalisierung im Frontend
- ADR-10900 – Frontend-Testing-Strategie

---

## 50000–50999 – ERP-Core

- ADR-50000 – Finanzwesen, Buchungslogik und GoBD-Konformität (Kontenrahmen, Doppelte Buchführung, Periodenabschlüsse, Steuerverwaltung)
- ADR-50100 – Zahlungsverkehr und externe Finanzschnittstellen (SEPA, CAMT, DATEV, E-Rechnung)
- ADR-50200 – Workflows und Genehmigungen (State Machine, mehrstufige Freigaben, Stellvertreter, Eskalationen, Feature-Flag-Deaktivierbarkeit)
- ADR-50300 – Reporting-Strategie (Phasen-Ansatz OLTP → Read Replica → DW, Custom Dashboards, Standard-Reports)
- ADR-50400 – Customizing und Erweiterbarkeit (Custom Fields via JSON-Spalten, regelbasierte Validations, Webhooks, explizite Grenzen)
- ADR-50500 – Lizenzierung und Abrechnung (Hybrid Named User + Module + Pay-per-Use, User-Typen, Metering, SaaS-Modelle)
- ADR-50600 – Migrations- und Go-Live-Strategie (Pilot+Phased, Test-Company → Prod-Company, Legacy-Automatisierung, Verdichtung)
- ADR-50700 – Mehrwährungsstrategie (Drei-Währungsebenen TC/LC/GC, Money Value Object, Wechselkurs-Management, Kursdifferenzen, Konzernkonsolidierung)

---

## Hinweise

- Jeder ADR ist **nummeriert**, **stabil referenzierbar** und **thematisch eindeutig**.
- Änderungen an bestehenden ADRs erfolgen nur über:
  - neue ADRs oder
  - explizite Revisionen mit Referenz.
- Dieses Index-Dokument ist die **zentrale Navigationsquelle** für Architekturentscheidungen.

