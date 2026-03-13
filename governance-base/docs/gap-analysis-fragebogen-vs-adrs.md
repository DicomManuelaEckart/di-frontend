# Gap-Analyse: ERP-Fragebogen vs. bestehende ADRs

> **Erstellt:** 24. Februar 2026
> **Zweck:** Systematischer Abgleich aller Entscheidungen aus dem ERP-Grundsatzentscheidungen-Fragebogen gegen die vorhandenen ADRs. Identifikation von Lücken, Ergänzungsbedarf und ggf. neuen ADRs.

---

## Legende

| Symbol | Bedeutung |
|--------|-----------|
| ✅ | Vollständig durch ADR abgedeckt |
| ⚠️ | Teilweise abgedeckt – Ergänzung empfohlen |
| ❌ | Nicht abgedeckt – neuer ADR oder Ergänzung nötig |
| 📝 | ADR README listet dies bereits als *geplant* |

---

## Zusammenfassung

| Kategorie | Gesamt | ✅ | ⚠️ | ❌ |
|-----------|--------|-----|------|------|
| 1. Multi-Tenancy | 5 | 3 | 1 | 1 |
| 2. Domain-Schnitt / DDD | 6 | 3 | 2 | 1 |
| 3. Authentifizierung | 5 | 2 | 3 | 0 |
| 4. Autorisierung | 4 | 2 | 2 | 0 |
| 5. API-Kontrakte | 7 | 4 | 2 | 1 |
| 6. Events / Messaging | 5 | 3 | 2 | 0 |
| 7. Revisionssicherheit | 5 | 1 | 1 | 3 |
| 8. Internationalisierung | 7 | 6 | 1 | 0 |
| 9. Persistenz | 6 | 5 | 1 | 0 |
| 10. Architektur / Clean Arch | 5 | 5 | 0 | 0 |
| 11. Hosting / Deployment | 5 | 3 | 0 | 2 |
| 12. Logging / Observability | 6 | 6 | 0 | 0 |
| 13. Caching / Performance | 5 | 2 | 1 | 2 |
| 14. Dokumentenmanagement | 5 | 0 | 0 | 5 |
| 15. Organisationsstruktur | 4 | 1 | 1 | 2 |
| 16. Finanzwesen | 6 | 0 | 0 | 6 |
| 17. Workflows | 4 | 0 | 0 | 4 |
| 18. Reporting / BI | 5 | 0 | 0 | 5 |
| 19. Recht / Compliance | 5 | 5 | 0 | 0 |
| 20. Customizing | 7 | 7 | 0 | 0 |
| 21. Lizenzierung | 5 | 5 | 0 | 0 |
| 22. Agenten-Entwicklung | 5 | 5 | 0 | 0 |
| 23. UX / Frontend | 6 | 5 | 0 | 1 |
| 24. Migration / Go-Live | 4 | 4 | 0 | 0 |
| 25. Support / Betrieb | 5 | 1 | 1 | 3 |

---

## Detailanalyse pro Fragebogen-Abschnitt

---

### 1. Multi-Tenancy-Modell (Fragebogen §1)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 1.1 Database-per-Tenant | ✅ | ADR-06000 | Exakt so dokumentiert |
| 1.2 JWT Token-Claim für Tenant Resolution | ✅ | ADR-06000, ADR-03000 | Abgedeckt |
| 1.3 EF Core Global Query Filter | ✅ | ADR-06000 | Global Query Filter + explizite Guards |
| 1.4 Admin-gesteuertes Onboarding | ✅ | ADR-06200 (Tenant Lifecycle Management) | Admin-gesteuertes Onboarding, kein Self-Service, 6-Phasen-Statusmodell, DSGVO-konforme Löschung/Anonymisierung |
| 1.5 SaaS-only, 500-600 Tenants, Europa, reines Cloudprodukt | ❌ | – | Nirgendwo als ADR festgehalten |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| M1.1 | Tenant Lifecycle ADR erstellen (war bereits geplant als ADR-06200) mit: Admin-gesteuertes Onboarding, kein Self-Service, SaaS-Modell | **ADR-06200** (neu) | Neuer ADR |
| M1.2 | Grundsätzliche Plattform-Entscheidung dokumentieren: reines Cloud-SaaS, Zielregion Europa, erwartete Mandantenzahl 500-600 in 5 Jahren | **ADR-00008** (neu, in `00-general/`) | Neuer ADR |

---

### 2. Domain-Schnitt und Bounded Contexts (Fragebogen §2)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 2.1 Initiale BCs (Identity, MasterData, Organization, Finance, Sales, Purchasing, Inventory, DocMgmt, Audit, Reporting) | ❌ | – | Kein ADR definiert die konkreten Bounded Contexts / Module des ERP-Systems |
| 2.2 Hybrid-Kommunikation (Queries synchron, Commands asynchron) | ⚠️ | ADR-01200, ADR-08100 | Domain Events + Integration Events sind dokumentiert, aber die explizite Regel „Queries synchron, Commands asynchron" fehlt |
| 2.3 Domain Events + Integration Events (kein Event Sourcing) | ✅ | ADR-01200, ADR-08100 | Vollständig abgedeckt |
| 2.4 Hybrid-ID (GUID als PK + fachliche ID) | ❌ | – | Nicht dokumentiert – weder in ADR-01300 (Aggregates) noch anderswo |
| 2.5 Referenzen: GUID für FK, fachliche ID für Domain | ⚠️ | ADR-01300 | ADR-01300 sagt „nur via ID", aber die Hybrid-Strategie (technische GUID für DB-FK, fachliche Value-Object-ID in Domain) fehlt |
| 2.6 Ubiquitous Language | ✅ | ADR-01100 | DomainTerm-Attribute, Glossar-Mechanismus dokumentiert |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M2.1~~ | ~~✅ Erstellt: ADR-01600 Bounded-Context-Katalog und BC-Kommunikation~~ | ~~ADR-01600~~ | ~~Erledigt~~ |
| ~~M2.2~~ | ~~✅ Erstellt: ADR-01700 ID-Strategie (Hybrid GUID + fachliche ID, Belegnummernkreise)~~ | ~~ADR-01700~~ | ~~Erledigt~~ |
| ~~M2.3~~ | ~~✅ Erledigt: ADR-01300 ergänzt um Hybrid-ID-Referenzierung (GUID für FK, Value Object für Domain)~~ | ~~ADR-01300~~ | ~~Erledigt~~ |

---

### 3. Authentifizierung und Identity-Modell (Fragebogen §3)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 3.1 Azure Entra ID (B2B) | ✅ | ADR-03000 | Exakt so dokumentiert |
| 3.2 Claims: sub, tenant_id, company_id, roles, user_type | ✅ | ADR-03000 | Ergänzt: `company_id` und `user_type` als Token-Claims |
| 3.3 Token-Strategie: 15-30 Min, Sliding Refresh | ✅ | ADR-03000 | Ergänzt: Token-Lifetime 15–30 Min, Sliding Refresh, Absolute Lifetime 24h |
| 3.4 Multi-Tenant-User mit Tenant-Wechsel | ✅ | ADR-03000 | Ergänzt: Multi-Tenant-User, Tenant-Picker, Tenant-Wechsel via Token-Refresh |
| 3.5 API-Auth: OIDC + Client Credentials + API Keys | ✅ | ADR-03000 | Ergänzt: Client Credentials Flow (§7), API Keys (§8) |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M3.1~~ | ~~✅ Erledigt: ADR-03000 ergänzt um `company_id`, `user_type`, Token-Lifetime, Sliding Refresh, Multi-Tenant-User, Tenant-Wechsel~~ | ~~ADR-03000~~ | ~~Erledigt~~ |
| ~~M3.2~~ | ~~✅ Erledigt: ADR-03000 ergänzt um Client Credentials Flow (§7) und API Keys (§8)~~ | ~~ADR-03000~~ | ~~Erledigt~~ |

---

### 4. Autorisierungsmodell (Fragebogen §4)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 4.1 Hybrid RBAC + Permission-Based + feldbasiert | ✅ | ADR-03100, ADR-03200 | Rollen → Permissions gut dokumentiert |
| 4.2 Granularität: Feature + Entity + Field + Row-Level | ✅ | ADR-03100 | Ergänzt: §4c Field-Level Security, §4d Row-Level Security, Granularitätstabelle |
| 4.3 Hybrid-Speicherung: Rollen im Token, Permissions per DB (gecacht) | ✅ | ADR-03200 | Claim-Schema + DB-Lookup dokumentiert |
| 4.4 Berechtigungsvererbung Tenant → Company (Top-Down) | ✅ | ADR-03100 | Ergänzt: §4b Berechtigungshierarchie Tenant→Company, Top-Down-Vererbung, Effective Permissions |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M4.1~~ | ~~✅ Erledigt: ADR-03100 ergänzt um Field-Level Security (§4c) und Row-Level Security (§4d)~~ | ~~ADR-03100~~ | ~~Erledigt~~ |
| ~~M4.2~~ | ~~✅ Erledigt: ADR-03100 ergänzt um Berechtigungshierarchie Tenant→Company (§4b), Top-Down-Vererbung~~ | ~~ADR-03100~~ | ~~Erledigt~~ |

---

### 5. API-Kontraktstrategie (Fragebogen §5)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 5.1 URL-Pfad-Versionierung | ✅ | ADR-07000 | Exakt dokumentiert |
| 5.2 RFC 7807 Problem Details | ✅ | ADR-05200 | Vollständig |
| 5.3 Cursor-based Pagination | ✅ | ADR-07300 | Fragebogen auf Offset-based angeglichen (W1 geklärt) |
| 5.4 OData für Filtering/Sorting | ✅ | ADR-07300 | Fragebogen auf eigene Konventionen angeglichen (W2 geklärt) |
| 5.5 Idempotency-Key Header | ✅ | ADR-05400 | Vollständig dokumentiert |
| 5.6 Kein HATEOAS | ✅ | ADR-07000 | Nicht erwähnt = bestätigt kein HATEOAS |
| 5.7 OpenAPI auto-generiert | ❌ | – | ADR-07000 erwähnt OpenAPI als Pflicht, aber die Strategie „auto-generiert aus Code" (nicht manuell) ist nicht explizit festgehalten |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M5.1~~ | ~~✅ Erledigt: Fragebogen auf Offset-based geändert~~ | ADR-07300 | ~~Erledigt~~ |
| ~~M5.2~~ | ~~✅ Erledigt: Fragebogen auf eigene Konventionen geändert~~ | ADR-07300 | ~~Erledigt~~ |
| M5.3 | OpenAPI-Generierungsstrategie (Code-First) explizit dokumentieren | ADR-07000 | Kleine Ergänzung |

---

### 6. Event-Kontrakte und Messaging (Fragebogen §6)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 6.1 Azure Service Bus | ✅ | ADR-08100 | Ergänzt: §7b Azure Service Bus (Premium), Topics/Subscriptions, Dead-Letter |
| 6.2 CloudEvents Standard | ✅ | ADR-08100 | Ergänzt: §7c CloudEvents v1.0 mit vollständigem Schema-Beispiel |
| 6.3 Schema Registry | ✅ | ADR-08100 | Ergänzt: §7d Schema Registry (Git-basiert, JSON Schema, CI-Validierung) |
| 6.4 At-least-once | ✅ | ADR-08100 | Explizit dokumentiert |
| 6.5 Outbox + Background Service Dispatcher | ✅ | ADR-00006, ADR-08100 | Vollständig |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M6.1~~ | ~~✅ Erledigt: ADR-08100 ergänzt um Azure Service Bus (§7b) und CloudEvents (§7c)~~ | ~~ADR-08100~~ | ~~Erledigt~~ |
| ~~M6.2~~ | ~~✅ Erledigt: ADR-08100 ergänzt um Schema Registry (§7d, Git-basiert, JSON Schema, CI-Validierung)~~ | ~~ADR-08100~~ | ~~Erledigt~~ |

---

### 7. Revisionssicherheit und Datenintegrität (Fragebogen §7)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 7.1 Vollständiges Audit-Log (Wer/Wann/Was/Vorher-Nachher), Append-only | ✅ | ADR-03400, ADR-05800 | Security-Audit (ADR-03400) + Daten-Audit (ADR-05800): Append-only-Tabellen, Vorher/Nachher via EF Core Interceptor, Tenant-isoliert |
| 7.2 GoBD-Konformität: keine Überschreibung, Periodenabschlüsse, unveränderbare Speicherung | ✅ | ADR-50000 | §4 GoBD-Konformität (immutable JournalEntry, Storno statt Korrektur, Aufbewahrungsfristen) |
| 7.3 Stammdaten: keine Historisierung, Denormalisierung in Belege | ✅ | ADR-50000 | §5 Stammdaten-Denormalisierung (Preise, Texte, Adressen bei Belegstellung kopiert) |
| 7.4 Soft Delete (IsDeleted + DeletedAt) | ✅ | ADR-08000 | EF Core Global Query Filter für Soft Deletes erwähnt |
| 7.5 Belegnummernkreise (pro Company, pro Belegart, lückenlos) | ✅ | ADR-01700 | Vollständig dokumentiert (§4 Belegnummernkreise) |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M7.1~~ | ~~✅ Erstellt: ADR-05800 Daten-Audit und Änderungsprotokollierung (Vorher/Nachher, Append-only, EF Core Interceptor, Abgrenzung zu Security-Audit ADR-03400)~~ | ~~ADR-05800~~ | ~~Erledigt~~ |
| ~~M7.2~~ | ~~✅ Erledigt: GoBD-Konformität in ADR-50000 §4 (immutable JournalEntry, Storno statt Korrektur, Aufbewahrungsfristen 10/6 Jahre, EF Core Insert-Only Interceptor)~~ | ~~ADR-50000~~ | ~~Erledigt~~ |
| ~~M7.3~~ | ~~✅ Erledigt: Stammdaten-Denormalisierung in ADR-50000 §5 (Preise, Texte, Adressen bei Belegstellung kopiert)~~ | ~~ADR-50000~~ | ~~Erledigt~~ |

---

### 8. Internationalisierung und Lokalisierung (Fragebogen §8)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 8.1 Architektur für Global, Rollout phasenweise | ✅ | ADR-05000 | Scope Global impliziert |
| 8.2 JSON-Ressourcen, Fallback Deutsch, DE+EN | ✅ | ADR-05000, ADR-10800 | Vollständig (JSON, de-DE Fallback, de-DE + en-US) |
| 8.3 DB-Lokalisierung: JSON-Spalten für mehrsprachige Stammdaten | ✅ | ADR-05000 §13 | JSON-Spalten `Dictionary<string,string>`, ILocalizedFieldResolver, Fallback-Chain, EF Core Value Converter |
| 8.4 Benutzer-Locale: Datum, Zahl, Zeitzone, Sprache pro User | ✅ | ADR-05000 §14 | UserLocalePreference-Entity (Language, DateFormat, NumberFormat, TimeZone, FirstDayOfWeek), Culture-Resolution-Chain mit Fallback |
| 8.5 Mehrwährungsfähigkeit (Company-Leitwährung, Konzern-Berichtswährung, Transaktionswährung, Wechselkurs-Management) | ✅ | ADR-50700 | Drei-Währungsebenen (TC/LC/GC), Money Value Object, ExchangeRate-Management, Kursdifferenzen, Konzernkonsolidierung |
| 8.6 UTC-Speicherung, lokale Darstellung | ✅ | ADR-05000 | Implizit durch „culture-neutral values in API" |
| 8.7 Culture-aware String-Vergleiche und Date/Time Parsing | ⚠️ | ADR-05000 | Teilweise impliziert, nicht explizit als Regel |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M8.1~~ | ~~✅ Erledigt: ADR-05000 §13 ergänzt – Mehrsprachige Stammdaten via JSON-Spalten (ILocalizedFieldResolver, EF Core Value Converter, Fallback-Chain)~~ | ~~ADR-05000~~ | ~~Erledigt~~ |
| ~~M8.2~~ | ~~✅ Erstellt: ADR-50700 Mehrwährungsstrategie (Drei-Währungsebenen TC/LC/GC, Money Value Object, ExchangeRate-Management, Kursdifferenzen, Konzernkonsolidierung, EF Core Mapping)~~ | ~~ADR-50700~~ | ~~Erledigt~~ |
| ~~M8.3~~ | ~~✅ Erledigt: ADR-05000 §14 ergänzt – User-Locale-Preferences (UserLocalePreference-Entity, Culture-Resolution-Chain, L1-Cache)~~ | ~~ADR-05000~~ | ~~Erledigt~~ |

---

### 9. Persistenz und Datenbankstrategie (Fragebogen §9)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 9.1 Azure SQL Database | ✅ | ADR-08000 | Dokumentiert |
| 9.2 Hybrid EF Core + Dapper | ✅ | ADR-08000 | EF Core für Writes, Dapper für Reads |
| 9.3 Code-First, pro Tenant, Zero-Downtime | ✅ | ADR-08000, ADR-06100 | Expand/Contract implizit via Forward-only |
| 9.4 Soft Deletes via Global Query Filter | ✅ | ADR-08000 | Dokumentiert |
| 9.5 Optimistic Concurrency (RowVersion) | ✅ | ADR-08000 | Dokumentiert |
| 9.6 Keine Read Replicas (initial) | ⚠️ | – | Nicht explizit dokumentiert, aber auch kein Widerspruch |

**Maßnahmen:** Keine zwingenden Maßnahmen. §9 ist gut abgedeckt.

---

### 10. Architekturschichten und Clean Architecture (Fragebogen §10)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 10.1 Modularer Monolith | ✅ | ADR-00001 | Ergänzt: „Modularer Monolith" explizit als Deployment-Modell dokumentiert (§Deployment-Modell) |
| 10.2 4-Schichten-Trennung | ✅ | ADR-00001 | Exakt so dokumentiert |
| 10.3 CQRS, Shared Model | ✅ | ADR-00003 | Exakt so dokumentiert |
| 10.4 MediatR | ✅ | ADR-00003 | Impliziert durch Handler-Pattern |
| 10.5 ArchTests mit CI-Gate | ✅ | ADR-00002 | Build bricht bei Verletzung |

**Maßnahmen:** Keine. §10 ist vollständig abgedeckt.

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M10.1~~ | ~~✅ Erledigt: „Modularer Monolith" explizit in ADR-00001 ergänzt (Deployment-Modell, Abgrenzung Monolith/Microservices, Evolutionspfad)~~ | ~~ADR-00001~~ | ~~Erledigt~~ |

---

### 11. Hosting und Deployment (Fragebogen §11)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 11.1 Azure App Service / Container Apps | ✅ | ADR-08300 | Container Apps + App Service erwähnt |
| 11.2 Blue/Green Deployment | ✅ | ADR-08300 §11 | Blue/Green via Azure Deployment Slots, Zero-Downtime Swap, sofortiger Rollback, Expand/Contract für DB-Migrationen |
| 11.3 Environments: Dev, Test/QA, Prod | ✅ | ADR-08300 | Trunk-based, dev→Dev, main→Prod |
| 11.4 Terraform | ✅ | ADR-08200 | Vollständig |
| 11.5 Feature Flags (Azure App Configuration, tenant-basiert) | ✅ | ADR-05700 | Azure App Configuration, 4 Flag-Typen (Release/Ops/Entitlement/Experiment), Tenant-basierte Auflösung, Lifecycle-Management |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M11.1~~ | ~~✅ Erstellt: ADR-05700 Feature Flags & Toggles (Azure App Configuration, tenant-basiert, Entitlement)~~ | ~~ADR-05700~~ | ~~Erledigt~~ |
| ~~M11.2~~ | ~~✅ Erledigt: ADR-08300 §11 ergänzt – Blue/Green Deployment-Strategie (Azure Deployment Slots, Zero-Downtime Swap, Expand/Contract, Wartungsfenster)~~ | ~~ADR-08300~~ | ~~Erledigt~~ |

---

### 12. Logging, Monitoring und Observability (Fragebogen §12)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 12.1 Serilog | ✅ | ADR-04000 | Ergänzt: Serilog als Framework (§12), Azure Log Analytics als Sink (§13), Seq für Dev |
| 12.2 Azure Log Analytics | ✅ | ADR-04000, ADR-04100 | Impliziert durch Azure-Stack |
| 12.3 App Insights + OpenTelemetry | ✅ | ADR-04100 | Vollständig |
| 12.4 Correlation ID, Tenant ID, User ID | ✅ | ADR-04000, ADR-05300 | Vollständig |
| 12.5 Azure Monitor Dashboards + Alerts | ✅ | ADR-09100 | SLOs, Alerts dokumentiert |
| 12.6 Zentrale Exception Middleware + RFC 7807 | ✅ | ADR-05200 | Vollständig |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M12.1~~ | ~~✅ Erledigt: ADR-04000 ergänzt um Serilog als Framework (§12), Azure Log Analytics + Console + Seq als Sinks (§13)~~ | ~~ADR-04000~~ | ~~Erledigt~~ |

---

### 13. Caching und Performance (Fragebogen §13)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 13.1 Azure Cache for Redis + Hybrid | ✅ | ADR-08400 | Redis Premium + In-Memory Hybrid (L1/L2), Tenant-isolierte Key-Struktur |
| 13.2 Per-Tenant-Cache, TTL + Event-basierte Invalidierung | ✅ | ADR-08400 | TTL pro Cache-Region, Event-basierte Invalidierung via Outbox/Service Bus |
| 13.3 Stateless Backend | ✅ | ADR-05300 | Impliziert durch Request Context (kein Session State) |
| 13.4 Indexing-Strategie, N+1 Prevention | ⚠️ | ADR-08000 | Lazy Loading verboten (verhindert N+1), Indexing nicht explizit |
| 13.5 Azure Functions + Hosted Services für Background Jobs | ✅ | ADR-05500 | Ergänzt: Azure Functions (§14a, Service Bus/Timer/Blob Trigger), Hosted Services (§14b, Outbox Dispatcher), Zuordnungsregeln |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M13.1~~ | ~~✅ Erstellt: ADR-08400 Caching-Strategie (Redis Premium + In-Memory Hybrid, Tenant-isoliert, TTL + Event-basierte Invalidierung, Cache-Aside, ICacheService-Abstraktion)~~ | ~~ADR-08400~~ | ~~Erledigt~~ |
| ~~M13.2~~ | ~~✅ Erledigt: ADR-05500 ergänzt um Azure Functions + Hosted Services als konkrete Technologien (§14, Trigger-Typen, Zuordnungsregeln, verworfene Alternativen)~~ | ~~ADR-05500~~ | ~~Erledigt~~ |

---

### 14. Dokumenten- und Dateimanagement (Fragebogen §14)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 14.1 Azure Blob Storage | ✅ | ADR-08500 | Azure Blob Storage (StorageV2, ZRS), Private Endpoint, Managed Identity |
| 14.2 Container per Tenant | ✅ | ADR-08500 | `tenant-{TenantId}` Container, automatische Erstellung/Löschung via Tenant Lifecycle |
| 14.3 Azure Blob Versioning | ✅ | ADR-08500 | Blob Versioning + Soft Delete (14d) + Immutability Policies (GoBD WORM) |
| 14.4 Hybrid: Backend-Proxy + SAS Tokens, Managed Identity | ✅ | ADR-08500 | Upload via Proxy (Validierung, Malware-Scan), Download < 5 MB Proxy / ≥ 5 MB SAS (User Delegation) |
| 14.5 Metadaten-Pflichtfelder | ✅ | ADR-08500 | Metadaten in Tenant-DB + Blob Metadata (TenantId, CompanyId, Category, Content-Hash) |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M14.1~~ | ~~✅ Erstellt: ADR-08500 File Storage und Dokumentenmanagement (Azure Blob Storage, Container per Tenant, Versioning, Hybrid-Zugriff, Managed Identity, Immutability Policies, Metadaten-Schema)~~ | ~~ADR-08500~~ | ~~Erledigt~~ |

---

### 15. Organisationsstruktur und Mandantenhierarchie (Fragebogen §15)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 15.1 Hierarchie: Tenant → Company (2 Ebenen) | ⚠️ | ADR-06000 | Tenant dokumentiert. **Company als zweite Ebene** (Buchungskreis) und `ICompanyScoped`-Interface fehlen |
| 15.2 Multi-Company Support, Konzernkonsolidierung | ❌ | – | **Nicht dokumentiert.** Mehrere Companies pro Tenant, Company-Filter via EF Core, Konsolidierung via IgnoreQueryFilters |
| 15.3 Daten-Sharing: Stammdaten tenant-weit, Belege/Buchungen company-spezifisch, Preise mit Company-Override | ❌ | – | Komplexe Entscheidung, nirgendwo dokumentiert |
| 15.4 Rechtliche Einheiten: Steuernummer, Währung, Kontenplan pro Company | ✅ | – | Fachliche Detail-Entscheidung, gehört eher in Domain-Dokumentation |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M15.1~~ | ~~✅ Erstellt: ADR-06300 Multi-Company / Organisationsstruktur~~ | ~~ADR-06300~~ | ~~Erledigt~~ |

---

### 16. Finanz- und Rechnungswesen (Fragebogen §16)

Dieses gesamte Thema ist jetzt durch **ADR-50000** und **ADR-50100** abgedeckt.

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 16.1 Kontenrahmen (SKR03/04 + frei definierbar) | ✅ | ADR-50000 | §1 Kontenrahmen-Modell (SKR03/04 Templates, frei definierbar, Company-Override) |
| 16.2 Doppelte Buchführung + automatische Gegenbuchungen | ✅ | ADR-50000 | §2 Buchungslogik (JournalEntry/JournalEntryLine, Soll=Haben, Auto-Gegenbuchungen) |
| 16.3 Periodenabschlüsse (Monat, Jahr, Nachbuchung) | ✅ | ADR-50000 | §3 Periodenabschlüsse (Open/Closed/Locked, Nachbuchungsperiode Monat 13) |
| 16.4 Steuerverwaltung (MwSt, länderspezifisch, automatisch) | ✅ | ADR-50000 | §6 Steuerverwaltung (TaxRate, TaxRuleEngine, länderspezifisch) |
| 16.5 Zahlungsverkehr (SEPA, CAMT, OP, Mahnwesen) | ✅ | ADR-50100 | §1-4 SEPA, CAMT, OP-Verwaltung, Mahnwesen |
| 16.6 Schnittstellen (DATEV, E-Rechnung ZUGFeRD/XRechnung) | ✅ | ADR-50100 | §5 DATEV-Export, §6 E-Rechnung (ZUGFeRD/XRechnung) |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M16.1~~ | ~~✅ Erledigt: Ordner `50-erp-core/` angelegt~~ | ~~Ordnerstruktur~~ | ~~Erledigt~~ |
| ~~M16.2~~ | ~~✅ Erstellt: ADR-50000 Finanzwesen, Buchungslogik und GoBD-Konformität~~ | ~~ADR-50000~~ | ~~Erledigt~~ |
| ~~M16.3~~ | ~~✅ Erstellt: ADR-50100 Zahlungsverkehr und externe Finanzschnittstellen~~ | ~~ADR-50100~~ | ~~Erledigt~~ |

---

### 17. Workflows und Genehmigungen (Fragebogen §17)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 17.1 Eigene State-Machine-Implementierung | ✅ | ADR-50200 | Stateless-Bibliothek, State Machine im Domain Layer, konfigurierbare Workflow-Definitionen |
| 17.2 Mehrstufige Freigaben, Stellvertreter, Eskalationen, Wertgrenzen | ✅ | ADR-50200 | Sequenzielle Stufen, Wertgrenzen pro Stufe, DelegationRule, Timeout-Eskalation via Background Job |
| 17.3 Pro Mandant konfigurierbar, deaktivierbar | ✅ | ADR-50200 | WorkflowDefinition pro Tenant/Company, Feature Flag `Entitlement.Workflow.Enabled` (ADR-05700) |
| 17.4 E-Mail + In-App Benachrichtigungen | ✅ | ADR-50200 | SignalR Push (In-App), E-Mail via Background Job (ADR-05500), lokalisierte Templates (ADR-05000) |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M17.1~~ | ~~✅ Erstellt: ADR-50200 Workflows und Genehmigungen (State Machine Pattern, mehrstufige Freigaben, Stellvertreter, Eskalationen, Wertgrenzen, pro-Tenant/Company-Konfiguration, Feature-Flag-Deaktivierbarkeit, SignalR + E-Mail Benachrichtigungen)~~ | ~~ADR-50200~~ | ~~Erledigt~~ |

---

### 18. Reporting und Business Intelligence (Fragebogen §18)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 18.1 Phasen-Ansatz: OLTP → Read Replica → DW | ✅ | ADR-50300 | 3-Phasen-Ansatz (OLTP → Read Replica → DW), pro Tenant konfigurierbar, IReportingConnectionFactory-Abstraktion |
| 18.2 Custom Dashboards (Charts.js etc.) | ✅ | ADR-50300 | In-App Custom Dashboards (Angular + Charting-Bibliothek), dedizierte Dashboard-API-Endpunkte |
| 18.3-18.4 BI-Extraktion, Mandantentrennung | ✅ | ADR-50300 | Tenant-Isolation via separate DB, Company-Scoping, Konsolidierung mit expliziter Permission |
| 18.5 Standard-Reports | ✅ | ADR-50300 | 9 Built-in Reports (OP-Liste, Umsatz, Bestand, Journal, Kontoblatt, SuSa, UStVA, DATEV, Mahnliste) |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M18.1~~ | ~~✅ Erstellt: ADR-50300 Reporting-Strategie (3-Phasen-Ansatz OLTP → Read Replica → DW, Custom Dashboards, 9 Standard-Reports, Mandantentrennung, IReportingConnectionFactory, asynchrone große Reports, QuestPDF/ClosedXML)~~ | ~~ADR-50300~~ | ~~Erledigt~~ |

---

### 19. Rechtliche & Compliance-Anforderungen (Fragebogen §19)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 19.1 DSGVO (Auskunft, Löschung, Portabilität, Privacy-by-Design) | ✅ | ADR-03500 | PII-Klassifikation, DSAR (Art. 15), Anonymisierung (Art. 17), Datenportabilität (Art. 20), Privacy by Design (Art. 25) |
| 19.2 Datenresidenz: EU-only (Amsterdam, Frankfurt) | ✅ | ADR-00008, ADR-03500 | EU-only (ADR-00008 §3), Sub-Processor-Register (ADR-03500 §8) |
| 19.3 Verschlüsselung (At Rest, In Transit TLS 1.3) | ✅ | ADR-00008 | SSE + TLS 1.3 (ADR-00008 §5) |
| 19.4-19.5 Keine speziellen Branchen-Compliance, keine Zertifizierungen | ✅ | ADR-03500 | Explizite Entscheidung (§9): keine FDA/ISO 13485/TISAX; ISO 27001/SOC 2 perspektivisch |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M19.1~~ | ~~✅ Erledigt: Ordner `12-compliance/` angelegt – nicht mehr benötigt, ADR nach `03-security/` verschoben~~ | ~~Ordnerstruktur~~ | ~~Erledigt~~ |
| ~~M19.2~~ | ~~✅ Erstellt: ADR-03500 DSGVO, Datenschutz und Datenresidenz (PII-Klassifikation, Betroffenenrechte, Privacy by Design, Aufbewahrungsfristen, AVV, Datenpannen-Management, Sub-Processor-Register)~~ | ~~ADR-03500~~ | ~~Erledigt~~ |
| ~~M19.3~~ | ~~✅ Erledigt: Datenresidenz + Verschlüsselung in ADR-00008 dokumentiert~~ | ~~ADR-00008~~ | ~~Erledigt~~ |

---

### 20. Customizing und Erweiterbarkeit (Fragebogen §20)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 20.1 Custom Fields via JSON-Spalten, pro Tenant mit Company-Override, Suchbarkeit, Limits | ✅ | ADR-50400 | JSON-Spalten, Computed Columns, max 50/Entity |
| 20.2 Keine Custom Entities | ✅ | ADR-50400 | Explizite Grenze |
| 20.3 Keine Custom Workflows | ✅ | ADR-50400 | Standard-Workflows (ADR-50200) reichen |
| 20.4 Regelbasierte Custom Validations | ✅ | ADR-50400 | CustomValidationBehavior, kein Scripting |
| 20.5 REST API + Webhooks für Integration | ✅ | ADR-50400 | Outbound Webhooks, CloudEvents, HMAC |
| 20.6 Keine Plugin-Architektur | ✅ | ADR-50400 | Explizite Grenze |
| 20.7 Kein Marketplace | ✅ | ADR-50400 | Explizite Grenze |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M20.1~~ | ~~Customizing + Erweiterbarkeit ADR: Custom Fields (JSON-Spalten, Scope, Limits), keine Custom Entities, regelbasierte Validations, Webhooks, kein Plugin/Marketplace~~ | ~~**ADR-50400** ✅ erstellt~~ | ~~erledigt~~ |

---

### 21. Lizenzierung und Abrechnung (Fragebogen §21)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 21.1 Named User + Modul-basiert + Transaktionsbasiert | ✅ | ADR-50500 | Hybrid-Modell: Named User + Module + Pay-per-Use |
| 21.2 User-Typen (Full, Limited, Portal, Device) | ✅ | ADR-50500 | 4 User-Typen mit user_type Claim (ADR-03000) |
| 21.3 Feature-Entitlement via Feature Flags | ✅ | ADR-50500 | Entitlement Toggles (ADR-05700) |
| 21.4 Metering (User, Storage, API Calls, Transaktionen) | ✅ | ADR-50500 | Event-basiertes Metering, stündliche Aggregation |
| 21.5 SaaS Shared + SaaS Dedicated | ✅ | ADR-50500 | Shared (Standard) + Dedicated (Aufpreis), kein On-Premise |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M21.1~~ | ~~Lizenzierungs- und Abrechnungs-ADR: Named User + Module + Pay-per-Use, User-Typen, Feature Entitlement, Metering, SaaS-Modelle~~ | ~~**ADR-50500** ✅ erstellt~~ | ~~erledigt~~ |

---

### 22. Agenten-basierte Entwicklung (Fragebogen §22)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 22.1 Claude + Mix | ✅ | ADR-00007 | Ergänzt: Claude als primäres LLM, Mix erlaubt, Evaluationskriterien für Modellwechsel |
| 22.2 Agent-Typen (Code, Review, Test, Documentation) | ✅ | ADR-00007 | Ergänzt: 4 Agent-Typen mit Aufgaben und Einsatzbereich, perspektivische Typen (Migration, Ops) |
| 22.3 Menschliches Review + ArchTests + Security-Scan | ✅ | ADR-00007, ADR-08300 | ArchTests als Gate, CI-Security |
| 22.4 Nur via PR + Branch Protection | ✅ | ADR-08300 | Protected branches impliziert |
| 22.5 Budget pro Monat | ✅ | ADR-00007 | Ergänzt: Budget-Modell (pro Monat, Tracking, Eskalation bei 80 %/100 %) |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M22.1~~ | ~~✅ Erledigt: ADR-00007 ergänzt um Agent-Typen (Code, Review, Test, Documentation), LLM-Auswahl (Claude primär, Mix), Budget-Modell (pro Monat, Eskalation)~~ | ~~ADR-00007~~ | ~~Erledigt~~ |

---

### 23. UX und Frontend (Fragebogen §23)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 23.1 Angular | ✅ | ADR-10000 | Ergänzt: Angular als Framework-Entscheidung (§2), Vergleich Angular vs. Blazor, Angular-spezifische Regeln |
| 23.2 Infragistics Ignite UI for Angular | ✅ | ADR-10100 | Ergänzt: Infragistics Ignite UI for Angular explizit benannt (§7), Bewertungstabelle, verworfene Alternativen |
| 23.2b Desktop-first | ✅ | ADR-10100 | Responsive, Desktop-fokussiert |
| 23.3 Mandanten-Branding (Logo, Farben) | ✅ | ADR-10100 | Theming via Design Tokens dokumentiert |
| 23.4 WCAG 2.1 AA, Keyboard, Screen Reader | ✅ | ADR-10100 | A11y dokumentiert |
| 23.5 Online-only (initial) | ❌ | – | Nicht explizit als Entscheidung festgehalten |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M23.1~~ | ~~✅ Erledigt: ADR-10000 ergänzt um Angular als Framework-Entscheidung (§2), Vergleich vs. Blazor, Angular-spezifische Regeln (Standalone, Signals, OnPush)~~ | ~~ADR-10000~~ | ~~Erledigt~~ |
| ~~M23.2~~ | ~~✅ Erledigt: ADR-10100 ergänzt um Infragistics Ignite UI for Angular (§7), Bewertungstabelle, verworfene Alternativen (Angular Material, PrimeNG)~~ | ~~ADR-10100~~ | ~~Erledigt~~ |

---

### 24. Migration und Go-Live (Fragebogen §24)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 24.1 Pilot + Phased (Test-Company → Prod-Company) | ✅ | ADR-50600 | 3-Phasen-Modell: Test (4–6 Wo) → Go-Live → Hypercare (4 Wo) |
| 24.2 Standardisierte Import-Schnittstellen (CSV, Excel) | ✅ | ADR-50600 | Templates pro Entity, mehrstufige Validierung |
| 24.3 Historische Daten: 1-2 Jahre, Verdichtungsstrategie | ✅ | ADR-50600 | 3-Stufen: Aktiv (0–2J) → Archiv/Cool (3–10J) → Löschung (>10J) |
| 24.4 Automatisierte Migration für eigene Legacy-Systeme | ✅ | ADR-50600 | Ein-Klick für gesoft/terra/bsi/dicommerce, Anti-Corruption Layer |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| ~~M24.1~~ | ~~Migrations- und Go-Live-Strategie ADR: Pilot+Phased, Test-Company→Prod-Company, Import-Templates, Verdichtung/Archivierung, Legacy-Automatisierung~~ | ~~**ADR-50600** ✅ erstellt~~ | ~~erledigt~~ |

---

### 25. Support und Betrieb (Fragebogen §25)

| Entscheidung | Status | ADR | Bemerkung |
|---|---|---|---|
| 25.1 3-Level-Support | ❌ | – | Operativ, aber Architektur-relevant (Tooling, Zugriff) |
| 25.2 Business Hours | ❌ | – | |
| 25.3 SLA-Ziele (Critical 30min/4h, High 2h/1d, etc.) | ⚠️ | ADR-09100 | SLOs/Alerts dokumentiert, aber konkreter **SLA-Vertrag** (Reaktionszeiten) fehlt |
| 25.4 Zero-Downtime Updates + Wartungsfenster Sonntag | ✅ | ADR-08300 | Deployment-Strategie dokumentiert |
| 25.5 Online-Doku + Video-Tutorials | ❌ | – | |

**Maßnahmen:**

| # | Aktion | Ziel-ADR | Art |
|---|--------|----------|-----|
| M25.1 | Optional: SLA/Support-ADR oder als Teil der Plattform-Entscheidung (ADR-00008) | ADR-09100 ergänzen oder eigener ADR | Optional |

---

## Gesamtplan: Neue ADRs und Ordner

### Neue Ordner

| Ordner | Zweck |
|--------|-------|
| `adr/50-erp-core/` | ERP-Core-Architekturentscheidungen |

### Neue ADRs (Priorität nach Kritikalität)

| Prio | ID | Titel | Ordner | Fragebogen-§ |
|------|-----|-------|--------|-------------|
| ~~🔴 1~~ | ~~ADR-00008~~ | ~~✅ Erstellt: Plattform-Entscheidung (SaaS, Cloud-only, Europa, Skalierung)~~ | ~~`00-general/`~~ | ~~§1.5, §19.2~~ |
| ~~🔴 2~~ | ~~ADR-06200~~ | ~~✅ Erstellt: Tenant Lifecycle Management (Onboarding, Deaktivierung, Löschung)~~ | ~~`06-multi-tenancy/`~~ | ~~§1.4~~ |
| ~~🔴 3~~ | ~~ADR-06300~~ | ~~✅ Erstellt: Multi-Company / Organisationsstruktur (Tenant→Company, ICompanyScoped, Daten-Sharing)~~ | ~~`06-multi-tenancy/`~~ | ~~§15~~ |
| ~~🔴 4~~ | ~~ADR-01600~~ | ~~✅ Erstellt: Bounded-Context-Katalog und BC-Kommunikation~~ | ~~`01-domain-driven-design/`~~ | ~~§2.1, §2.2~~ |
| ~~🔴 5~~ | ~~ADR-01700~~ | ~~✅ Erstellt: ID-Strategie (Hybrid GUID + fachliche ID, Belegnummernkreise)~~ | ~~`01-domain-driven-design/`~~ | ~~§2.4, §2.5, §7.5~~ |
| ~~🔴 6~~ | ~~ADR-50000~~ | ~~✅ Erstellt: Finanzwesen, Buchungslogik und GoBD-Konformität~~ | ~~`50-erp-core/`~~ | ~~§7.2, §16~~ |
| ~~🔴 7~~ | ~~ADR-50100~~ | ~~✅ Erstellt: Zahlungsverkehr und externe Finanzschnittstellen~~ | ~~`50-erp-core/`~~ | ~~§16.5, §16.6~~ |
| ~~🟡 8~~ | ~~ADR-05700~~ | ~~✅ Erstellt: Feature Flags & Toggles (Azure App Configuration, Tenant-basiert)~~ | ~~`05-cross-cutting-concerns/`~~ | ~~§11.5~~ |
| ~~🟡 9~~ | ~~ADR-05800~~ | ~~✅ Erstellt: Daten-Audit und Änderungsprotokollierung (Vorher/Nachher, Append-only)~~ | ~~`05-cross-cutting-concerns/`~~ | ~~§7.1~~ |
| ~~🟡 10~~ | ~~ADR-08400~~ | ~~✅ Erstellt: Caching-Strategie (Redis, In-Memory, Tenant-isoliert)~~ | ~~`08-infrastructure/`~~ | ~~§13~~ |
| ~~🟡 11~~ | ~~ADR-08500~~ | ~~✅ Erstellt: File Storage / Dokumentenmanagement (Blob Storage, Tenant-Container, SAS)~~ | ~~`08-infrastructure/`~~ | ~~§14~~ |
| ~~🟡 12~~ | ~~ADR-50200~~ | ~~✅ Erstellt: Workflows und Genehmigungen (State Machine, mehrstufig, deaktivierbar)~~ | ~~`50-erp-core/`~~ | ~~§17~~ |
| ~~🟡 13~~ | ~~ADR-50300~~ | ~~✅ Erstellt: Reporting-Strategie (OLTP → Read Replica → DW, Custom Dashboards)~~ | ~~`50-erp-core/`~~ | ~~§18~~ |
| ~~🟡 14~~ | ~~ADR-50400~~ | ~~✅ Erstellt: Customizing und Erweiterbarkeit (Custom Fields, Webhooks, Grenzen)~~ | ~~`50-erp-core/`~~ | ~~§20~~ |
| ~~🟡 15~~ | ~~ADR-50500~~ | ~~✅ Erstellt: Lizenzierung und Abrechnung (Named User, Module, Metering)~~ | ~~`50-erp-core/`~~ | ~~§21~~ |
| ~~🟡 16~~ | ~~ADR-50600~~ | ~~✅ Erstellt: Migrations- und Go-Live-Strategie~~ | ~~`50-erp-core/`~~ | ~~§24~~ |
| ~~🟢 17~~ | ~~ADR-50700~~ | ~~✅ Erstellt: Mehrwährungsstrategie (TC/LC/GC, Money Value Object, Wechselkurse)~~ | ~~`50-erp-core/`~~ | ~~§8.5~~ |
| ~~🟢 18~~ | ~~ADR-03500~~ | ~~✅ Erstellt: DSGVO, Datenschutz und Datenresidenz~~ | ~~`03-security/`~~ | ~~§19~~ |

### Bestehende ADRs mit Ergänzungsbedarf

| Prio | ADR | Ergänzung | Fragebogen-§ |
|------|-----|-----------|-------------|
| ~~🔴~~ | ~~ADR-01300~~ | ~~✅ Erledigt: Hybrid-ID-Referenzierung (§2, ADR-01700 Verweis)~~ | ~~§2.5~~ |
| ~~🔴~~ | ~~ADR-03000~~ | ~~✅ Erledigt: company_id, user_type, Token-Lifetime, Refresh, Multi-Tenant-User, Client Credentials, API Keys~~ | ~~§3.2–3.5~~ |
| ~~🔴~~ | ~~ADR-03100~~ | ~~✅ Erledigt: Field-Level, Row-Level Security, Berechtigungshierarchie Tenant→Company~~ | ~~§4.2, §4.4~~ |
| ~~🔴~~ | ~~ADR-08100~~ | ~~✅ Erledigt: Azure Service Bus, CloudEvents, Schema Registry~~ | ~~§6~~ |
| ~~🟡~~ | ~~ADR-05000~~ | ~~✅ Erledigt: Mehrsprachige Stammdaten via JSON-Spalten, User-Locale-Preferences~~ | ~~§8.3, §8.4~~ |
| ~~🟡~~ | ~~ADR-07300~~ | ~~✅ Erledigt: Widerspruch Pagination + Filtering geklärt, Fragebogen angeglichen~~ | ~~§5.3, §5.4~~ |
| ~~🟡~~ | ~~ADR-08300~~ | ~~✅ Erledigt: Blue/Green Deployment explizit benannt~~ | ~~§11.2~~ |
| ~~🟢~~ | ~~ADR-04000~~ | ~~✅ Erledigt: Serilog als Framework, Azure Log Analytics als Sink~~ | ~~§12.1~~ |
| ~~🟢~~ | ~~ADR-05500~~ | ~~✅ Erledigt: Azure Functions + Hosted Services als Technologien~~ | ~~§13.5~~ |
| ~~🟢~~ | ~~ADR-10000~~ | ~~✅ Erledigt: Angular als Framework-Entscheidung~~ | ~~§23.1~~ |
| ~~🟢~~ | ~~ADR-10100~~ | ~~✅ Erledigt: Infragistics Ignite UI for Angular~~ | ~~§23.2~~ |
| ~~🟢~~ | ~~ADR-00007~~ | ~~✅ Erledigt: Agent-Typen, LLM-Auswahl, Budget-Modell~~ | ~~§22~~ |
| ~~🟢~~ | ~~ADR-00001~~ | ~~✅ Erledigt: „Modularer Monolith" explizit benannt~~ | ~~§10.1~~ |

---

## ~~⚠️ Zu klärende Widersprüche~~ ✅ Geklärt (24.02.2026)

Alle Widersprüche wurden entschieden und umgesetzt:

### W1: Pagination – ✅ Offset-based

- **Entscheidung:** Offset-based (page/pageSize), Fragebogen an ADR-07300 angeglichen.

### W2: Filtering – ✅ Eigene Konventionen (kein OData)

- **Entscheidung:** Kontrollierte Query-Parameter mit Whitelist (ADR-07300), Fragebogen angeglichen.

### W3: ADR-Nummern im README – ✅ Korrigiert

- ADR-07200 und ADR-07300 im README zeigen jetzt die existierenden ADRs.
- Geplante ADRs verschoben: Rate Limiting → ADR-07400, API Gateway → ADR-07500, Data Export → ADR-07600.

---

## Empfohlene Reihenfolge der Umsetzung

### Phase 1: Kritische Lücken schließen (🔴)
1. ~~Widersprüche W1, W2, W3 klären~~ ✅ Erledigt (24.02.2026)
2. ~~ADR-00008 (Plattform)~~ ✅ Erstellt (24.02.2026)
3. ~~ADR-06300 (Multi-Company)~~ ✅ Erstellt (24.02.2026)
4. ~~ADR-01600 (Bounded Contexts)~~ ✅ Erstellt (24.02.2026)
5. ~~ADR-01700 (ID-Strategie)~~ ✅ Erstellt (24.02.2026)
6. ~~Ergänzungen an ADR-03000, ADR-03100, ADR-08100, ADR-01300~~ ✅ Erledigt (24.02.2026)
7. ~~ADR-50000 + ADR-50100 (Finanzwesen + GoBD)~~ ✅ Erstellt (24.02.2026)
8. ~~ADR-06200 (Tenant Lifecycle)~~ ✅ Erstellt (24.02.2026)

### Phase 2: Wichtige Lücken schließen (🟡)
9. ~~ADR-05700 (Feature Flags)~~ ✅ Erstellt (24.02.2026)
10. ~~ADR-05800 (Daten-Audit)~~ ✅ Erstellt (24.02.2026)
11. ~~ADR-08400 (Caching)~~ ✅ Erstellt (24.02.2026)
12. ~~ADR-08500 (File Storage)~~ ✅ Erstellt (24.02.2026)
13. ~~ADR-50200 (Workflows)~~ ✅ Erstellt (24.02.2026)
14. ~~ADR-50300 (Reporting)~~ ✅ Erstellt (25.02.2026)
15. ~~ADR-50400 (Customizing)~~ ✅ Erstellt (25.02.2026)
16. ~~ADR-50500 (Lizenzierung)~~ ✅ Erstellt (25.02.2026)
17. ~~ADR-50600 (Migration)~~ ✅ Erstellt (25.02.2026)
18. ~~Ergänzungen an ADR-05000, ADR-07300, ADR-08300~~ ✅ Erledigt (25.02.2026)

### Phase 3: Ergänzungen und Nice-to-have (🟢)
19. ~~ADR-50700 (Mehrwährung)~~ ✅ Erstellt (25.02.2026)
20. ~~ADR-03500 (DSGVO/Compliance)~~ ✅ Erstellt (25.02.2026)
21. ~~Ergänzungen an ADR-04000, ADR-05500, ADR-10000, ADR-10100, ADR-00007, ADR-00001~~ ✅ Erledigt (25.02.2026)
22. ~~README-Index aktualisieren~~ ✅ Geprüft – war durchgehend aktuell (25.02.2026)

---

## Statistik

- **Bestehende ADRs:** 52
- **Neue ADRs benötigt:** 18
- **Bestehende ADRs mit Ergänzungsbedarf:** 13
- **Widersprüche zu klären:** 3
- **Neue Ordner:** 1 (`50-erp-core/`)
