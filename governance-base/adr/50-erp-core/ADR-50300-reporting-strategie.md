---
id: ADR-50300
title: Reporting-Strategie – Phasen-Ansatz, Custom Dashboards, Mandantentrennung
status: proposed
date: 2026-02-25
scope: fullstack
enforced_by: code-review
affects:
  - backend
  - frontend
  - infrastructure
---

# ADR-50300 – Reporting-Strategie und Business Intelligence

## Entscheidungstreiber
- ERP-System erfordert umfangreiche Reporting-Funktionalität (Offene Posten, Umsatz, Bestand etc.) (Fragebogen §18)
- Multi-Tenant-Architektur: Reports dürfen keine Tenant-/Company-Grenzen verletzen (ADR-06000, ADR-06300)
- Performance: Reports dürfen die OLTP-Produktiv-DB nicht belasten (ab bestimmter Größe)
- Evolutionärer Ansatz: Start einfach, Skalierung bei Bedarf (kein Over-Engineering)
- CQRS-Read-Seite (Dapper, ADR-00003, ADR-08000 §10) als Grundlage für optimierte Report-Queries
- GoBD-Anforderungen: bestimmte Reports (Journale, OP-Listen) müssen revisionssicher exportierbar sein (ADR-50000)

## Kontext
Das ERP-System bedient 500–600 Tenants (ADR-00008) mit unterschiedlichen Reporting-Anforderungen. Kleine Mandanten benötigen einfache Standard-Reports, große Mandanten erwarten Custom Dashboards und perspektivisch BI-Fähigkeiten. Der Fragebogen entscheidet sich für einen **evolutionären Phasen-Ansatz**: Start mit Reports direkt aus der Produktiv-DB, bei Performance-Problemen Read Replica aktivieren, Data Warehouse nur bei echten Analytics-Anforderungen.

Reports unterscheiden sich grundlegend von normalen CQRS-Queries: sie aggregieren große Datenmengen, überspannen häufig mehrere Aggregate-Grenzen und können mehrere Sekunden dauern. Dennoch sollen sie innerhalb derselben Architektur (Clean Architecture, CQRS) implementiert werden – als spezialisierte Queries im Application Layer.

## Entscheidung

### 1) Phasen-Ansatz (evolutionär)

| Phase | Trigger | Technologie | Kosten |
|-------|---------|-------------|--------|
| **Phase 1 – OLTP Only (MVP)** | Start | Reports direkt aus Tenant-DB (Azure SQL) | Keine zusätzlichen |
| **Phase 2 – Read Replica** | Performance-Probleme bei Reports | Azure SQL Read Scale-Out (Geo-Replication) | ~50% zusätzlich pro DB |
| **Phase 3 – Data Warehouse** | Historische Analysen über Jahre, komplexe Konsolidierung | Dediziertes DW (Azure SQL DW oder Synapse) | Signifikant |

**Entscheidungsbaum:**

```
Reports langsam? (P95 > 5s)
  └─ Nein → Phase 1 (OLTP-only)
  └─ Ja → Phase 2 (Read Replica aktivieren)
       └─ Noch zu langsam? → Phase 3 (Data Warehouse)
       └─ Ausreichend → Phase 2 beibehalten

Historische Analysen über Jahre (> 2 Geschäftsjahre)?
  └─ Ja → Phase 3 (Data Warehouse)
  └─ Nein → Phase 1 oder 2 ausreichend
```

**Regeln:**
- **Phase 1 ist der Default** für alle Tenants. Kein Tenant startet mit Read Replica oder DW.
- Phasenwechsel erfolgt **pro Tenant** – nicht global. Ein großer Tenant kann Read Replica nutzen, während kleine Tenants auf Phase 1 bleiben.
- Phasenwechsel ist eine **Ops-Entscheidung** (kein Self-Service für Tenants).
- Die Report-Implementierung im Code ist **phasenunabhängig** – die Connection-String-Auflösung entscheidet, ob OLTP oder Replica gelesen wird.

### 2) Phase 1 – OLTP-only (MVP)

| Aspekt | Entscheidung |
|--------|-------------|
| **Datenquelle** | Direkt die Tenant-DB (Azure SQL, ADR-08000) |
| **Query-Technologie** | Dapper (CQRS Read-Seite, ADR-08000 §10) |
| **Connection** | Gleicher Connection String wie normale Queries |
| **Einschränkung** | Kein Query-Timeout > 30 Sekunden (SLO-Schutz, ADR-09100) |

**Regeln:**
- Reports nutzen **Dapper** mit expliziten SQL-Queries – kein EF Core für Reports.
- Report-Queries verwenden **READ UNCOMMITTED** (Snapshot Isolation) um Locks auf der OLTP-DB zu vermeiden.
- Jede Report-Query hat ein **explizites Timeout** (Default: 30s, konfigurierbar bis 60s).
- Komplexe Aggregationen (z.B. Jahresabschluss-Summen) werden als **vorberechnete Materialized Views** oder **Indexed Views** in der Tenant-DB angelegt, wenn die Laufzeit > 5s beträgt.
- Report-Queries sind **Company-scoped** (ADR-06300) – Multi-Company-Konsolidierung nur mit expliziter `Reports.Consolidation`-Permission.

### 3) Phase 2 – Read Replica

| Aspekt | Entscheidung |
|--------|-------------|
| **Technologie** | Azure SQL Read Scale-Out (Active Geo-Replication, Read-only Endpoint) |
| **Aktivierung** | Pro Tenant, durch Platform-Ops |
| **Latenz** | Asynchrone Replikation, typisch < 5 Sekunden Verzögerung |
| **Connection** | Separater Read-only Connection String (`ApplicationIntent=ReadOnly`) |

**Regeln:**
- Phase 2 wird durch einen **Tenant-Konfigurationswert** (`Tenant.ReportingMode = ReadReplica`) aktiviert.
- Der `IReportingConnectionFactory` löst basierend auf `ReportingMode` den korrekten Connection String auf.
- Reports zeigen einen Hinweis „Daten können bis zu 5 Sekunden verzögert sein", wenn Read Replica aktiv ist.
- Alle Report-Queries bleiben **identisch** – nur die Datenquelle ändert sich.
- **Kein separates Schema** – die Replica hat dieselbe Tabellenstruktur wie die OLTP-DB.
- Fallback: bei Replica-Ausfall werden Reports automatisch gegen die OLTP-DB ausgeführt (Graceful Degradation).

### 4) Phase 3 – Data Warehouse (optional, später)

| Aspekt | Entscheidung |
|--------|-------------|
| **Technologie** | Azure Synapse Analytics oder dediziertes Azure SQL DW |
| **Schema** | Star-/Snowflake-Schema, denormalisiert |
| **ETL** | Nightly Sync via Background Job (ADR-05500) |
| **Anwendungsfall** | Historische Analysen, Trend-Reports, Konzernkonsolidierung, Power BI |

**Regeln:**
- Phase 3 ist **explizit nicht Teil des MVP** – wird erst bei echten Analytics-Anforderungen evaluiert.
- Wenn Phase 3 implementiert wird, erfolgt ein eigener ADR mit detailliertem ETL-Design.
- Mandantentrennung im DW: **separate Schemas pro Tenant** oder **TenantId-Spalte mit Row-Level Security**.
- DW-Reports sind **nicht echtzeitfähig** – immer Tagesstand (nightly).

### 5) Report-Architektur im Code

Reports werden als **spezialisierte Queries** innerhalb der CQRS-Architektur (ADR-00003) implementiert:

```
API Controller
  └─ ReportQuery (Application Layer)
       └─ ReportQueryHandler
            └─ IReportingConnectionFactory (Port)
                 └─ DapperReportRepository (Infrastructure)
                      └─ SQL Query (explizit, optimiert)
                           └─ Tenant-DB oder Read Replica
```

**IReportingConnectionFactory (Port im Application Layer):**

| Methode | Beschreibung |
|---------|-------------|
| `GetReportingConnection(TenantId)` | Gibt Connection zurück (OLTP oder Replica, je nach Tenant-Konfiguration) |

**Regeln:**
- Reports sind **eigenständige Query-Klassen** im Application Layer (z.B. `GetOpenItemsReportQuery`).
- Report-Handlers nutzen `IReportingConnectionFactory` statt `IDbConnectionFactory` – dadurch phasenunabhängig.
- Reports haben **eigene DTOs** (Report-Modelle), die nicht mit Domain-Entities oder normalen Query-DTOs vermischt werden.
- Report-Queries haben die Namenskonvention `Get{Name}ReportQuery` / `Get{Name}ReportQueryHandler`.
- Jede Report-Query deklariert eine **Permission** (ADR-03200), z.B. `Reports.OpenItems.Read`.
- Report-Queries sind **Company-aware** – der TenantId + CompanyId-Filter wird automatisch angewendet (ADR-06000, ADR-06300).

### 6) Custom Dashboards (In-App)

| Aspekt | Entscheidung |
|--------|-------------|
| **Technologie** | Frontend-Charting-Bibliothek (z.B. Chart.js, ngx-charts oder Infragistics Charts) |
| **Rendering** | Client-seitig im Browser (kein Server-Side-Rendering) |
| **Datenquelle** | Dedizierte Report-API-Endpunkte (JSON) |
| **Kein externer BI-Tool** | Kein Power BI, kein Tableau als Primär-Lösung (Phase 1/2) |

**Dashboard-Typen (Built-in):**

| Dashboard | Beschreibung | Datenquelle |
|-----------|-------------|-------------|
| **Finanz-Übersicht** | Umsatz, Kosten, Gewinn (Monat/Quartal/Jahr) | JournalEntry-Aggregationen |
| **Offene Posten** | Forderungen/Verbindlichkeiten nach Fälligkeit (Aging) | OpenItem-Tabelle |
| **Cashflow** | Zahlungseingänge/-ausgänge über Zeit | PaymentTransaction-Aggregationen |
| **Bestandsübersicht** | Lagerbestände, Warenwert, Bewegungen | Inventory-Aggregationen |
| **Mahnquote** | Offene Mahnungen, Erfolgsquote, Mahnstufen | DunningRun-Aggregationen |

**Regeln:**
- Dashboards werden als **Angular-Komponenten** (ADR-10000) mit der gewählten Charting-Bibliothek implementiert.
- Dashboard-Daten werden über **dedizierte API-Endpunkte** geladen – Dashboards greifen nicht direkt auf Entity-APIs zu.
- Dashboards sind **Company-scoped** – bei Multi-Company wählt der Benutzer die Company (oder „Alle" für Konsolidierung).
- Dashboard-Konfiguration (welche Widgets sichtbar) ist **pro Benutzer persistiert** (User Preferences).
- Daten werden **beim Laden gecacht** (ADR-08400, TTL: 5 Minuten für Dashboard-Aggregationen).

### 7) Standard-Reports (Built-in)

| Report | Beschreibung | Format | Auslösung |
|--------|-------------|--------|-----------|
| **Offene Posten Liste** | Forderungen/Verbindlichkeiten mit Fälligkeit, Aging-Klassen | PDF, Excel, CSV | On-Demand + Stichtag |
| **Umsatzübersicht** | Umsatz nach Periode, Kunde, Artikelgruppe | PDF, Excel | On-Demand |
| **Bestandsliste** | Aktuelle Bestände mit Warenwert | PDF, Excel | On-Demand |
| **Journal** | Buchungsjournal für Periode (GoBD-relevant) | PDF | On-Demand + Periodenabschluss |
| **Kontoblatt** | Bewegungen pro Konto für Periode | PDF, Excel | On-Demand |
| **Summen- und Saldenliste** | Soll/Haben/Saldo pro Konto für Periode | PDF, Excel | On-Demand + Periodenabschluss |
| **Umsatzsteuer-Voranmeldung** | UStVA-Daten nach Konten (für ELSTER-Export) | PDF | Monatlich |
| **DATEV-Export** | Buchungsstapel im DATEV-Format | CSV | On-Demand (ADR-50100 §5) |
| **Mahnliste** | Offene Mahnungen, Mahnstufen, Beträge | PDF, Excel | On-Demand |

**Regeln:**
- Standard-Reports sind **vordefiniert** und nicht durch Tenants anpassbar (v1).
- GoBD-relevante Reports (Journal, Kontoblatt, SuSa) müssen **periodengerecht** abrufbar sein (ADR-50000 §3).
- PDF-Generierung erfolgt im **Backend** (z.B. QuestPDF oder iText) – nicht im Client.
- Excel/CSV-Export nutzt **ClosedXML** (Excel) bzw. **CsvHelper** (.NET).
- Generierte Report-Dateien werden temporär in **Azure Blob Storage** gespeichert (ADR-08500, Kategorie `exports/reports/`, TTL 7 Tage).
- Große Reports (> 10.000 Zeilen) werden als **Background Job** (ADR-05500) generiert – der Benutzer erhält eine Notification (ADR-50200 §8), wenn der Report fertig ist.

### 8) Report-Export und Download

| Aspekt | Entscheidung |
|--------|-------------|
| **Kleine Reports** (< 10.000 Zeilen) | Synchrone Generierung, direkter Download als Response |
| **Große Reports** (≥ 10.000 Zeilen) | Asynchron via Background Job, Notification + Download-Link |
| **Formate** | PDF (Standard), Excel (XLSX), CSV |
| **Speicherort** | Azure Blob Storage (ADR-08500), Kategorie `exports/reports/` |
| **TTL** | 7 Tage, danach automatisch gelöscht |

**API-Endpunkte:**

| Endpunkt | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/v1/reports/{type}` | POST | Report generieren (Parameter: Zeitraum, Company, Filter) |
| `/api/v1/reports/{type}/preview` | POST | Report-Vorschau (JSON, limitiert auf 100 Zeilen) |
| `/api/v1/reports/jobs/{jobId}` | GET | Status eines asynchronen Report-Jobs |
| `/api/v1/reports/jobs/{jobId}/download` | GET | Download des generierten Reports |
| `/api/v1/dashboards/widgets` | GET | Verfügbare Dashboard-Widgets für aktuellen User |
| `/api/v1/dashboards/data/{widgetType}` | GET | Daten für ein Dashboard-Widget |

**Regeln:**
- Synchrone Generierung hat ein **Timeout von 30 Sekunden** – wird der Report nicht rechtzeitig fertig, wird er automatisch als Background Job weitergegeben.
- Download-Links für asynchrone Reports nutzen **SAS Tokens** (ADR-08500 §5, User Delegation, 1h TTL).
- Report-Generierung wird im **Daten-Audit** (ADR-05800) protokolliert (Wer, Wann, Welcher Report, Welche Parameter).

### 9) Mandantentrennung bei Reports

| Ebene | Mechanismus |
|-------|------------|
| **Tenant-Isolation** | Separate Tenant-DB (ADR-06000) – Reports können physisch keine anderen Tenants sehen |
| **Company-Isolation** | EF Core Global Query Filter / Dapper WHERE-Clause mit `CompanyId` (ADR-06300) |
| **Konsolidierung** | Explizite `Reports.Consolidation`-Permission – Cross-Company-Reports nur mit dieser Berechtigung |

**Regeln:**
- Standard-Reports sind immer **Company-scoped** (Default: aktive Company des Benutzers).
- Konsolidierungs-Reports (alle Companies) erfordern die Permission `Reports.Consolidation` und ignorieren den Company-Filter via `IgnoreQueryFilters` (ADR-06300).
- Konsolidierungs-Reports zeigen immer eine **Company-Spalte** zur Unterscheidung der Daten.

### 10) Permissions

| Permission | Beschreibung |
|-----------|-------------|
| `Reports.OpenItems.Read` | Offene Posten Liste |
| `Reports.Revenue.Read` | Umsatzübersicht |
| `Reports.Inventory.Read` | Bestandsliste |
| `Reports.Journal.Read` | Buchungsjournal |
| `Reports.AccountSheet.Read` | Kontoblatt |
| `Reports.TrialBalance.Read` | Summen- und Saldenliste |
| `Reports.VatReturn.Read` | UStVA |
| `Reports.Dunning.Read` | Mahnliste |
| `Reports.Consolidation` | Cross-Company-Konsolidierung |
| `Reports.Export` | Export in PDF/Excel/CSV |
| `Dashboard.Read` | Dashboard-Widgets anzeigen |
| `Dashboard.Configure` | Dashboard-Widgets konfigurieren |

## Begründung
- **Phasen-Ansatz** vermeidet Over-Engineering – kein Data Warehouse, bevor es gebraucht wird.
- **OLTP-only als Default** ist kostengünstig und ausreichend für kleine/mittlere Mandanten.
- **Read Replica pro Tenant** entlastet die Produktiv-DB gezielt dort, wo es nötig ist.
- **Dapper für Reports** (statt EF Core): volle Kontrolle über SQL, keine ORM-Overhead, optimierte Aggregations-Queries.
- **IReportingConnectionFactory** als Abstraktion: Report-Code ist phasenunabhängig – nur die Infrastruktur entscheidet, woher die Daten kommen.
- **Custom Dashboards statt Power BI**: keine externen Lizenzkosten, volle Integration ins ERP, Tenant-Isolation garantiert.
- **Asynchrone große Reports**: vermeidet Request-Timeouts und schützt die Server-Ressourcen.
- **QuestPDF**: .NET-natives PDF-Framework, Open Source, Fluent API – kein Java/LibreOffice-Abhängigkeit.

## Alternativen

1) **Power BI als Primär-Lösung**
   - Vorteile: mächtiges BI-Tool, Self-Service-Analytics, viele Visualisierungen
   - Nachteile: Lizenzkosten pro User ($10–20/Monat × 500+ Tenants), Mandantentrennung komplex (Row-Level Security in Power BI), externer Datenzugriff, keine Integration ins ERP-UI

2) **Azure Synapse von Anfang an**
   - Vorteile: leistungsstarke Analytics, Spark/SQL-Integration
   - Nachteile: massive Over-Engineering für MVP, hohe Kosten, ETL-Komplexität, Datenlatenz

3) **Reporting-Microservice (eigener Service)**
   - Vorteile: vollständige Entkopplung, eigene Skalierung
   - Nachteile: zusätzlicher Service, Datensynchronisation nötig, Netzwerk-Latenz, Komplexität

4) **Server-Side PDF-Rendering mit Headless Chrome**
   - Vorteile: pixelgenaue PDFs, HTML als Template
   - Nachteile: Ressourcen-intensiv, langsam, Docker-Image-Größe, Sicherheitsrisiko

## Konsequenzen

### Positiv
- Evolutionärer Ansatz: keine unnötigen Kosten in Phase 1
- Reports nutzen bestehende Architektur (CQRS, Dapper, Tenant-Isolation)
- Phasenunabhängiger Code durch `IReportingConnectionFactory`
- Custom Dashboards bieten gute UX ohne externe Tool-Abhängigkeit
- Asynchrone große Reports schützen die System-Performance

### Negativ / Trade-offs
- Keine Self-Service-BI-Fähigkeiten in Phase 1/2 (keine Ad-hoc-Queries für Endbenutzer)
- Custom Dashboards erfordern Frontend-Entwicklungsaufwand für jedes neue Widget
- Phase 2 (Read Replica) verursacht ~50% zusätzliche DB-Kosten pro aktiviertem Tenant
- Standard-Reports sind nicht durch Tenants anpassbar (v1) – Custom Reports erst in späterem Release
- PDF-Generierung im Backend erfordert zusätzliche Bibliothek (QuestPDF)

### Umsetzungshinweise

#### A) Code-Struktur
- Report-Queries im Application Layer: `{BoundedContext}.Application.Reports.Get{Name}ReportQuery`.
- Report-DTOs: `{BoundedContext}.Application.Reports.Models.{Name}ReportDto`.
- Report-Repositories im Infrastructure Layer: `{BoundedContext}.Infrastructure.Reports.{Name}ReportRepository`.
- PDF-Templates: `{BoundedContext}.Infrastructure.Reports.Templates.{Name}PdfTemplate`.

#### B) Datenbank
- Indexed Views für häufig abgerufene Aggregationen (z.B. `vw_OpenItems_Aging`, `vw_Revenue_Monthly`).
- Report-Queries nutzen `SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED` oder Snapshot Isolation.
- Indizes: `IX_JournalEntry_Period_CompanyId`, `IX_OpenItem_DueDate_CompanyId`, `IX_PaymentTransaction_Date_CompanyId`.

#### C) Caching
- Dashboard-Aggregationen: L1/L2-Cache (ADR-08400), TTL 5 Minuten, Cache-Region `DashboardData`.
- Invalidierung: bei Buchung/Zahlung wird Dashboard-Cache der betroffenen Company invalidiert.
- Report-Ergebnisse (PDF/Excel) werden **nicht** gecacht – sie werden in Blob Storage gespeichert und nach TTL gelöscht.

#### D) Performance-Monitoring
- Report-Queries werden mit **Custom Metrics** (ADR-04100) instrumentiert: Dauer, Zeilenanzahl, Tenant, Report-Typ.
- Alerts bei Report-Queries > 10s (Trigger für Phase-2-Evaluation).
- Dashboard: „Report Performance" in Azure Monitor (ADR-09100).

#### E) Testing
- Report-Queries: **Integration Tests** mit Test-Datenbank und definierten Testdaten.
- PDF-Generierung: **Snapshot Tests** (generierte PDFs gegen Referenz vergleichen).
- Dashboard-Widgets: **Component Tests** (Angular, ADR-10900).

## Verweise
- ADR-00003 (CQRS – Reports als spezialisierte Queries)
- ADR-03200 (Permission Catalog – Report-Permissions)
- ADR-04100 (Telemetry – Report-Performance-Metriken)
- ADR-05500 (Background Jobs – asynchrone Report-Generierung)
- ADR-06000 (Multi-Tenancy – Tenant-Isolation bei Reports)
- ADR-06300 (Multi-Company – Company-Scoping, Konsolidierung)
- ADR-08000 (Persistenz – Dapper für Reads, Azure SQL)
- ADR-08400 (Caching – Dashboard-Aggregationen)
- ADR-08500 (File Storage – Report-PDFs in Blob Storage)
- ADR-09100 (SLOs – Report-Performance-Monitoring)
- ADR-10000 (Frontend – Angular Dashboards)
- ADR-50000 (Finanzwesen – GoBD-Reports, Periodenabschlüsse)
- ADR-50100 (Zahlungsverkehr – DATEV-Export, OP-Liste, Mahnliste)
- ADR-50200 (Workflows – Notification bei Report-Fertigstellung)
