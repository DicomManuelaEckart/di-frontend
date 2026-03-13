---
id: ADR-50500
title: Lizenzierung und Abrechnung – Named User, Module, Metering, SaaS-Modelle
status: accepted
date: 2026-02-25
scope: fullstack
enforced_by: code-review
affects:
  - backend
  - frontend
  - operations
---

# ADR-50500 – Lizenzierung und Abrechnung

## Entscheidungstreiber
- SaaS-ERP für 500–600 Tenants mit unterschiedlichen Größen und Funktionsbedürfnissen (ADR-00008)
- Faire Abrechnung: kleine Mandanten zahlen weniger, große proportional mehr
- Hybrid-Modell aus kalkulierbaren Fixkosten (Named User + Module) und nutzungsbasierter Abrechnung (Pay-per-Use)
- Verschiedene Nutzertypen mit unterschiedlichem Funktionsumfang und Preispunkt (Full, Limited, Portal, Device)
- Feature-Entitlement über Feature Flags als technische Basis (ADR-05700)
- Metering für transaktionsbasierte Abrechnung und Kapazitätsplanung
- Deployment-Optionen: SaaS Shared (Standard) und SaaS Dedicated (Aufpreis)

## Kontext
Das ERP-System wird als **SaaS-Plattform** betrieben (ADR-00008). Jeder Tenant hat individuelle Anforderungen an Funktionsumfang, Nutzerzahl und Transaktionsvolumen. Ein reines Flat-Fee-Modell wäre für kleine Mandanten zu teuer und für Großkunden zu günstig. Ein reines Pay-per-Use-Modell wäre schwer kalkulierbar.

Der Fragebogen entscheidet sich für ein **Hybrid-Modell**: Named User + Module als Basis (kalkulierbar) plus transaktionsbasierte Abrechnung für volumenabhängige Services (fair). Die technische Umsetzung nutzt Feature Flags (ADR-05700) für Modul-Entitlement und ein Metering-System für Usage Tracking.

Die Benutzertypen (`user_type`) sind bereits im JWT-Token definiert (ADR-03000 §4) und im Permissions-System berücksichtigt (ADR-03100). Die Tenant-Konfiguration für Lizenzen wird in der zentralen Admin-DB gespeichert (ADR-06200 §6).

## Entscheidung

### 1) Hybrid-Lizenzmodell

| Komponente | Modell | Beschreibung |
|-----------|--------|-------------|
| **Basis** | Named User | Lizenz pro benanntem Benutzer (verschiedene Typen) |
| **Module** | Add-on | Zusätzliche Module buchbar (z.B. Getränke, Grabpflege, Pfandleihhaus) |
| **Transaktionen** | Pay-per-Use | Nutzungsbasierte Abrechnung für volumenabhängige Services |

**Preisstruktur (Beispiel-Kalkulation):**

| Position | Einheit | Beispielpreis |
|----------|---------|-------------|
| Full User | Pro User/Monat | €50 |
| Limited User | Pro User/Monat | €15–30 |
| Portal User | Pro User/Monat | €0–5 |
| Device User | Pro Gerät/Monat | €20 |
| Modul Warehouse Management | Pro Monat | €200 |
| SEPA-Transaktion | Pro Stück | €0,05 |
| EDI-Dokument | Pro Stück | €0,10 |
| Externer API-Call (DATEV, E-Rechnung) | Pro Stück | variabel |
| File Storage über Inklusivkontingent | Pro GB/Monat | variabel |
| Document Services (OCR, PDF-Massengeneration) | Pro Stück | variabel |

**Regeln:**
- Named User + Module bilden den **kalkulierbaren Basispreis** – Mandanten wissen vorab, was sie mindestens zahlen.
- Transaktionsbasierte Kosten kommen **zusätzlich** – für Services mit variablem Volumen.
- Jeder Tenant hat einen **Vertrag** in der zentralen Admin-DB (ADR-06200), der die gebuchten Module, User-Limits und Inklusivkontingente definiert.
- Preise sind **nicht** im Code definiert – sie werden in der Admin-DB verwaltet und sind per Admin-Portal änderbar.
- Abrechnungszeitraum: **monatlich** (kalendermonatlich).

### 2) User-Typen

| User-Typ | `user_type` Claim | Funktionsumfang | Typische Rolle |
|----------|-------------------|-----------------|---------------|
| **Full User** | `full` | Vollzugriff auf alle lizenzierten Module | Office-Mitarbeiter, Sachbearbeiter |
| **Limited User** | `limited` | Eingeschränkter Zugriff (nur bestimmte Funktionen) | Zeiterfassung, Bestellfreigaben, Lesezugriff |
| **Portal User** | `portal` | Nur Self-Service (extern) | Lieferanten, Kunden, externe Partner |
| **Device User** | `device` | Gerätebezogene Lizenz, mehrere Personen pro Gerät | POS-Kasse, Lager-Scanner, Service-Tablet |

**Regeln:**
- Der `user_type` wird im **JWT-Token** als Claim geführt (ADR-03000 §4).
- Die Berechtigungen eines Users sind eine **Schnittmenge** aus: `user_type`-Scope + Permissions (ADR-03100) + Feature Entitlements (§3).
- **Full User** kann auf alle Module zugreifen, die für den Tenant lizenziert sind.
- **Limited User** hat eine eingeschränkte Permission-Liste, die bei der Erstellung konfiguriert wird. Beispiel-Einschränkungen:
  - Nur Lesezugriff auf bestimmte Entitäten
  - Nur Zeiterfassung und Spesenabrechnungen
  - Nur Bestellfreigaben (Approval-Workflow)
- **Portal User** hat Zugriff auf einen separaten Self-Service-Bereich (eigene Angular-Route, ADR-10000). Funktionen:
  - Bestellungen einsehen
  - Rechnungen herunterladen
  - Lieferscheine bestätigen
  - Stammdaten pflegen (eigene Adresse, Bankverbindung)
- **Device User** authentifiziert sich per **Geräte-Zertifikat oder Managed Identity** (ADR-03000 §7) + optionaler Benutzer-PIN für personenbezogene Aktionen (z.B. Kassenabschluss).
  - Ein Device User zählt als **eine Lizenz pro Gerät** – unabhängig davon, wie viele Personen das Gerät nutzen.
  - Device-spezifische Audit-Logs protokollieren Gerät + optionale PIN-Identität (ADR-05800).

### 3) Feature-Entitlement via Feature Flags

| Aspekt | Entscheidung |
|--------|-------------|
| **Mechanismus** | Entitlement Toggles in Azure App Configuration (ADR-05700 §2) |
| **Namenskonvention** | `Entitlement.{BoundedContext}.{Modul}` (ADR-05700 §4) |
| **Granularität** | Pro Modul (= Bounded Context oder Sub-Feature) |
| **Steuerung** | Admin setzt Entitlements beim Onboarding und bei Vertragsänderungen |
| **Prüfung** | Application Layer via `IFeatureManager` (ADR-05700 §5) |

**Entitlement-Katalog (Beispiele):**

| Entitlement Toggle | Modul | Beschreibung |
|-------------------|-------|-------------|
| `Entitlement.Finance.Core` | Finanzwesen Basis | Buchführung, Konten, Belege (immer inkludiert) |
| `Entitlement.Finance.Dunning` | Mahnwesen | Mahnläufe, Mahnstufenverwaltung |
| `Entitlement.Inventory.Core` | Lagerverwaltung | Bestände, Wareneingänge, Warenausgänge |
| `Entitlement.Inventory.BatchTracking` | Chargenrückverfolgung | Chargen, MHD, Rückverfolgung |
| `Entitlement.Sales.Core` | Vertrieb | Angebote, Aufträge, Lieferscheine |
| `Entitlement.Purchasing.Core` | Einkauf | Bestellungen, Wareneingänge |
| `Entitlement.Integration.Datev` | DATEV-Export | DATEV-Schnittstelle (ADR-50100) |
| `Entitlement.Integration.EDI` | EDI | Elektronischer Datenaustausch |
| `Entitlement.Integration.EInvoice` | E-Rechnung | XRechnung, ZUGFeRD (ADR-50100) |
| `Entitlement.Reporting.Advanced` | Erweitertes Reporting | Custom Dashboards, DW-Anbindung (ADR-50300) |

**Regeln:**
- Jeder Bounded Context hat mindestens einen `Core`-Entitlement-Toggle.
- Entitlement Toggles sind **langlebig** – sie werden nicht entfernt, solange das Modul existiert (ADR-05700 §2).
- Bei deaktiviertem Entitlement antwortet die API mit `403 Forbidden` + Fehlerdetail `MODULE_NOT_LICENSED` (ADR-05200).
- Im Frontend werden nicht-lizenzierte Module im Menü **nicht angezeigt** (ADR-05700 §6).
- Entitlements werden beim **Tenant-Onboarding** gesetzt (ADR-06200 §2, Schritt 1) und bei Vertragsänderungen per Admin-API aktualisiert.

### 4) Metering und Usage Tracking

Das Metering-System erfasst nutzungsbasierte Kennzahlen für Abrechnung und Kapazitätsplanung.

**Metering-Dimensionen:**

| Dimension | Erfassung | Quelle | Abrechnungsrelevant |
|-----------|----------|--------|-------------------|
| **Aktive User** | Monatlich aktive Benutzer (MAU) pro User-Typ | Auth-Events (Login) | Ja (für Compliance: Named ≤ Licensed) |
| **Storage** | Genutzter Speicherplatz pro Tenant | Blob Storage Metrics (ADR-08500) | Ja (über Inklusivkontingent) |
| **API Calls** | Anzahl externe API-Aufrufe an Drittsysteme | API Gateway / Application Layer | Ja (DATEV, E-Rechnung etc.) |
| **Transaktionen** | Anzahl erstellter Belege (Buchungen, SEPA, EDI) | Domain Events (ADR-01200) | Ja |
| **Webhook Deliveries** | Anzahl gesendeter Webhooks | Webhook-Service (ADR-50400) | Nein (informational) |

**Metering-Architektur:**

| Aspekt | Entscheidung |
|--------|-------------|
| **Datenerfassung** | Event-basiert via Domain/Integration Events (ADR-01200, ADR-00006) |
| **Aggregation** | Background Job (ADR-05500): stündliche Aggregation in Metering-Tabelle |
| **Speicher** | `MeteringEvents`-Tabelle in der **zentralen Admin-DB** (nicht in der Tenant-DB) |
| **Retention** | Aggregierte Metering-Daten: 24 Monate; Roh-Events: 90 Tage |
| **API** | Admin-API für Metering-Abfragen (pro Tenant, pro Zeitraum, pro Dimension) |

**MeteringEvent (Entity):**

| Eigenschaft | Beschreibung |
|-------------|-------------|
| `Id` | Guid |
| `TenantId` | Tenant-Zugehörigkeit |
| `Dimension` | `ActiveUser` \| `Storage` \| `ApiCall` \| `Transaction` \| `WebhookDelivery` |
| `SubType` | Unterkategorie (z.B. `SEPA.DirectDebit`, `EDI.ORDERS`, `DATEV.Export`) |
| `Quantity` | Anzahl / Menge |
| `Unit` | `Count` \| `Bytes` \| `Calls` |
| `Period` | Abrechnungsperiode (`YYYY-MM`) |
| `RecordedAt` | Zeitstempel der Erfassung |

**MeteringAggregate (monatliche Zusammenfassung):**

| Eigenschaft | Beschreibung |
|-------------|-------------|
| `TenantId` | Tenant |
| `Period` | Monat (`YYYY-MM`) |
| `Dimension` | Metering-Dimension |
| `SubType` | Unterkategorie |
| `TotalQuantity` | Summe der Quantity im Zeitraum |
| `PeakQuantity` | Maximum (z.B. Peak Storage) |

**Regeln:**
- Metering-Events werden **asynchron** erfasst – kein Performance-Impact auf den normalen Betrieb.
- Die Erfassung erfolgt über einen **MeteringEventHandler**, der auf relevante Domain/Integration Events reagiert.
- Metering-Daten sind **append-only** – keine Löschung oder Korrektur von Roh-Events.
- Die monatliche Aggregation läuft als **Scheduled Background Job** (ADR-05500) am Monatsende.
- Metering-Daten werden für die **Rechnungsstellung** an ein externes Billing-System exportiert (Schnittstelle in §6).
- **Limit-Enforcement**: Bei Überschreitung vertraglicher Limits (z.B. Named Users > Licensed Users) wird eine Admin-Notification ausgelöst – kein Hard-Block (Grace Period + Nachlizenzierung).

### 5) Deployment-Optionen

| Option | Beschreibung | Isolation | Preis |
|--------|-------------|-----------|-------|
| **SaaS Shared** | Multi-Tenant, gemeinsame Infrastruktur (Standard) | Logische Isolation (Database-per-Tenant, ADR-06000) | Standard |
| **SaaS Dedicated** | Single-Tenant, dedizierte Infrastruktur, wir betreiben | Physische Isolation (eigener SQL Server, eigener App Service) | Aufpreis |

**SaaS Shared (Standard):**
- Alle Tenants teilen sich die Anwendungsinfrastruktur (App Service, Redis, Service Bus).
- Daten-Isolation via Database-per-Tenant (ADR-06000).
- Elastic Pool für SQL-Datenbanken (ADR-06000).
- Geeignet für 95% der Mandanten.

**SaaS Dedicated (Premium):**
- Eigener Azure SQL Server (nicht im Elastic Pool).
- Optionaler eigener App Service Plan (dedizierte Compute-Ressourcen).
- Eigener Redis-Cache.
- **Gleiche Codebasis** – Unterschied ist nur die Infrastruktur-Konfiguration.
- Geeignet für Mandanten mit erhöhten Anforderungen an Performance, Compliance oder Datenisolation.
- Tenant-Konfiguration in der Admin-DB markiert den Deployment-Typ (`DeploymentModel: Shared | Dedicated`).

**Explizit ausgeschlossen:**
- **Private Cloud** (Kunde betreibt in seiner Cloud) – Zu hoher Support-Aufwand, unkontrollierte Umgebungen.
- **On-Premise** (Kunde betreibt lokal) – Widerspricht dem SaaS-Modell, unmögliche Update-Zyklen.

### 6) Billing-Integration

| Aspekt | Entscheidung |
|--------|-------------|
| **Billing-System** | Externes System (Stripe, Chargebee o.ä.) – kein Eigenbau |
| **Schnittstelle** | Monatlicher Export der Metering-Aggregate + Vertragsdaten an das Billing-System |
| **Richtung** | ERP → Billing (Push via API), Billing → ERP (Webhook für Zahlungsstatus) |
| **Rechnungsstellung** | Durch das Billing-System (nicht durch das ERP) |

**Regeln:**
- Das ERP-System erstellt **keine Rechnungen für sich selbst** – die Rechnungsstellung an Mandanten erfolgt über ein externes Billing-System.
- Die Schnittstelle zwischen ERP und Billing ist ein **monatlicher Export** der Metering-Daten + Vertragsinformationen.
- Das Billing-System meldet Zahlungsstatus per Webhook zurück (z.B. für automatische Tenant-Suspension bei Zahlungsverzug, ADR-06200 §3).
- Die Auswahl des konkreten Billing-Systems ist **kein Architektur-Entscheid** – die Schnittstelle ist generisch (JSON-Export + Webhook-Import).
- Billing-Integration wird über einen eigenen Bounded Context „Billing" implementiert (ADR-01600).

### 7) Tenant-Vertragsverwaltung (Admin-DB)

Die zentrale Admin-DB speichert die vertraglichen Informationen pro Tenant:

**TenantContract (Entity, zentrale Admin-DB):**

| Eigenschaft | Beschreibung |
|-------------|-------------|
| `TenantId` | Tenant-Zugehörigkeit |
| `ContractStart` | Vertragsbeginn |
| `ContractEnd` | Vertragsende (nullable bei unbefristeten Verträgen) |
| `DeploymentModel` | `Shared` \| `Dedicated` |
| `LicensedFullUsers` | Max. Anzahl Full User |
| `LicensedLimitedUsers` | Max. Anzahl Limited User |
| `LicensedPortalUsers` | Max. Anzahl Portal User (0 = unbegrenzt für manche Pläne) |
| `LicensedDevices` | Max. Anzahl Device User |
| `LicensedModules` | Liste der lizenzierten Module (korreliert mit Entitlement Toggles) |
| `IncludedStorageGB` | Inklusives Storage-Kontingent |
| `IncludedTransactions` | Inklusive Transaktionen pro Monat (0 = alles pay-per-use) |
| `PricingPlanId` | Referenz auf den Preisplan |
| `BillingExternalId` | ID im externen Billing-System |

**Admin-API-Endpunkte:**

| Endpunkt | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/admin/v1/tenants/{id}/contract` | GET | Vertragsinformationen abrufen |
| `/api/admin/v1/tenants/{id}/contract` | PUT | Vertrag aktualisieren (Module, User-Limits) |
| `/api/admin/v1/tenants/{id}/metering` | GET | Metering-Daten (pro Zeitraum, pro Dimension) |
| `/api/admin/v1/tenants/{id}/metering/export` | POST | Metering-Export für Billing-System |
| `/api/admin/v1/tenants/{id}/entitlements` | GET | Aktuelle Entitlements (Feature Flags) |
| `/api/admin/v1/tenants/{id}/entitlements` | PUT | Entitlements aktualisieren (setzt Feature Flags) |

**Regeln:**
- Admin-API ist **separiert** von der Tenant-API – eigene Authentifizierung (Plattform-Admins), eigene Base-URL.
- Vertragliche Änderungen (Module hinzufügen/entfernen) aktualisieren **automatisch** die Entitlement Toggles in Azure App Configuration (ADR-05700).
- Änderungen an Vertragsdaten werden im Audit-Log protokolliert (ADR-05800).

## Begründung
- **Hybrid-Modell** (Named User + Module + Pay-per-Use): Kalkulierbarkeit für Mandanten (Fixkosten vorab bekannt) + Fairness (volumenabhängige Kosten proportional). Reine Flat Fee wäre für kleine Mandanten zu teuer, reines Pay-per-Use wäre schwer budgetierbar.
- **4 User-Typen**: Deckt alle typischen ERP-Szenarien ab – vom Vollzugriff-Sachbearbeiter bis zum externen Lieferanten-Portal und POS-Kasse. `user_type` ist bereits im JWT-Token verankert (ADR-03000).
- **Feature Flags als Entitlement-Mechanismus**: Sofortige Aktivierung/Deaktivierung ohne Deployment, zentral steuerbar, bereits als Infrastruktur vorhanden (ADR-05700).
- **Event-basiertes Metering**: Kein Performance-Impact auf den Normalbetrieb, lose Kopplung, Metering kann unabhängig skalieren.
- **Externes Billing-System**: Billing ist kein Kernkompetenz-Bereich eines ERP-Herstellers (für die eigene Abrechnung) – Stripe/Chargebee sind spezialisierter und compliance-konformer (PCI DSS, Steuerberechnung, Dunning).
- **SaaS Shared + Dedicated**: Shared als kosteneffizienter Standard für die Mehrheit, Dedicated als Premium-Option für Kunden mit erhöhten Anforderungen. Kein On-Premise/Private Cloud – widerspricht dem SaaS-Modell und macht Updates unmöglich.

## Alternativen

1) **Concurrent User (statt Named User)**
   - Vorteile: Günstiger für Mandanten mit vielen seltenen Nutzern
   - Nachteile: Schwer zu enforcen (Session-Tracking), unberechenbare Peak-Kosten, Lizenz-Streitigkeiten

2) **Flat Fee pro Tenant**
   - Vorteile: Maximale Einfachheit, kein Metering nötig
   - Nachteile: Unfair (kleine und große Tenants zahlen gleich), keine Skalierung mit Nutzung

3) **Rein transaktionsbasiert**
   - Vorteile: Maximale Fairness
   - Nachteile: Schwer kalkulierbar für Mandanten, hoher Metering-Aufwand für alles, Revenue-Schwankungen

4) **Eigenes Billing-System**
   - Vorteile: Volle Kontrolle
   - Nachteile: Enormer Entwicklungsaufwand (Rechnungsstellung, Zahlungsabwicklung, PCI DSS, Mahnwesen, Steuerberechnung international)

## Konsequenzen

### Positiv
- Faire und transparente Abrechnung – Mandanten zahlen proportional zur Nutzung
- Feature-Entitlement via Feature Flags ermöglicht sofortige Modul-Aktivierung ohne Deployment
- 4 User-Typen decken alle typischen Szenarien ab (intern, extern, Geräte)
- Metering-Daten liefern wertvolle Insights für Kapazitätsplanung und Geschäftsentscheidungen
- SaaS Dedicated als Premium-Option ohne separaten Code-Branch

### Negativ / Trade-offs
- Hybrid-Modell ist komplexer als reine Flat Fee (Metering, Aggregation, Billing-Export)
- Metering-System muss zuverlässig sein – fehlerhafte Metering-Daten = fehlerhafte Rechnungen
- Abhängigkeit von externem Billing-System (Vendor Lock-in möglich)
- Limit-Enforcement mit Grace Period statt Hard-Block kann zu Nachlizenzierungs-Diskussionen führen
- Device User Authentifizierung (Geräte-Zertifikat + PIN) ist komplexer als Standard-OIDC

### Umsetzungshinweise

#### A) Domain-Modell
- `TenantContract` und `MeteringAggregate` leben in der **zentralen Admin-DB** – nicht in der Tenant-DB.
- Ein neuer Bounded Context **„Licensing"** (oder Teil von „Platform Administration") verwaltet Verträge, Metering und Billing-Export.
- Metering-Events werden über den Outbox-Pattern (ADR-00006) aus den Tenant-DBs in die zentrale Admin-DB übertragen.

#### B) Metering-Pipeline
```
Domain Event (Tenant-DB)
  → Integration Event (Outbox, ADR-00006)
  → MeteringEventHandler (Central Service)
  → MeteringEvents Tabelle (Admin-DB)
  → Scheduled Aggregation (Background Job, ADR-05500)
  → MeteringAggregate Tabelle (Admin-DB)
  → Monthly Billing Export
```

#### C) Entitlement-Sync
- Admin aktualisiert `TenantContract.LicensedModules`
- System mappt Module → Entitlement Toggles
- Azure App Configuration Feature Flags werden automatisch gesetzt/entfernt
- Änderung greift innerhalb von 30 Sekunden (Polling-Intervall, ADR-05700 §7)

#### D) User-Limit-Enforcement
- Bei User-Erstellung: Application Validation prüft `COUNT(active users WHERE user_type = X AND tenant_id = Y) < LicensedXUsers`.
- Bei Überschreitung: Warnung (Soft Limit) → Admin-Notification → 30 Tage Grace Period → danach Erstellung gesperrt.
- Bestehende User werden **nie** automatisch deaktiviert (keine Betriebsunterbrechung).

#### E) Testing
- Metering-Pipeline: **Integration Tests** (Event → Handler → Aggregation → Export).
- Entitlement-Prüfung: **Integration Tests** (Feature Flag aktiv → Zugriff OK; deaktiv → 403).
- User-Limit: **Unit Tests** (Validation Logic) + **Integration Tests** (End-to-End User-Erstellung).
- Billing-Export: **Integration Tests** (korrektes JSON-Format, alle Dimensionen enthalten).

## Verweise
- ADR-00006 (Outbox Pattern – Metering-Events aus Tenant-DB in zentrale DB)
- ADR-00008 (Platform SaaS Cloud Europe – SaaS-Modell, Azure)
- ADR-01200 (Domain Events – Trigger für Metering)
- ADR-01600 (Bounded-Context-Katalog – Module als Entitlement-Einheiten)
- ADR-03000 (Authentication – `user_type` Claim, Device User Auth, API Keys)
- ADR-03100 (Authorization – Permissions pro User-Typ)
- ADR-03200 (Permission Catalog – Admin-Permissions für Vertragsverwaltung)
- ADR-05200 (Error Handling – `MODULE_NOT_LICENSED` Fehlercode)
- ADR-05500 (Background Jobs – Metering-Aggregation, Billing-Export)
- ADR-05700 (Feature Flags – Entitlement Toggles, Azure App Configuration)
- ADR-05800 (Daten-Audit – Vertragsänderungen protokollieren)
- ADR-06000 (Multi-Tenancy – Database-per-Tenant, Elastic Pool vs. Dedicated)
- ADR-06200 (Tenant Lifecycle – Onboarding, Suspension, Vertragskonfiguration)
- ADR-08500 (File Storage – Storage-Metering pro Tenant)
- ADR-50100 (Zahlungsverkehr – SEPA/EDI/DATEV als transaktionsbasierte Services)
