---
id: ADR-01600
title: Bounded-Context-Katalog und BC-Kommunikation
status: accepted
date: 2026-02-24
scope: backend
enforced_by: archtests
affects:
  - backend
  - frontend
---

# ADR-01600 – Bounded-Context-Katalog und BC-Kommunikation

## Entscheidungstreiber
- Klare fachliche Modulgrenzen von Beginn an (vermeidet „Big Ball of Mud")
- Definierte Kommunikationsregeln zwischen Bounded Contexts (BCs)
- Konsistenz mit Clean Architecture (ADR-00001), DDD (ADR-01000) und CQRS (ADR-00003)
- Vorbereitung für späteres Aufbrechen in separate Deployments (falls nötig)
- Erweiterbarkeit durch branchenspezifische Module (Extensions) ohne Core-Änderungen
- Agentenfreundlich: sprechende BC-Namen + Namespace-Konvention = klare Scaffolding-Regeln

## Kontext
ADR-01000 definiert DDD als Modellierungsansatz, ADR-01300 regelt Aggregatgrenzen innerhalb eines BCs.
Was bisher fehlt, ist die **übergeordnete Strukturierung in Bounded Contexts** – also die fachlichen Module des ERP-Systems und die Regeln für ihre Zusammenarbeit.

Das System wird als **Modularer Monolith** (ADR-00001) implementiert: alle BCs leben im selben Deployment, aber mit strikter Modultrennung in der Codestruktur. Die BC-Grenzen sind der erste Schnitt, Aggregatgrenzen (ADR-01300) der zweite.

Zusätzlich soll das System als **Kern-ERP** mit **branchenspezifischen Erweiterungen** (Extensions) gebaut werden. Core-Module sind immer aktiv, Extensions werden pro Tenant lizenziert und aktiviert.

## Entscheidung

---

### 1) Initialer Bounded-Context-Katalog (Core)

| # | Bounded Context | Modulname | DB-Schema | Verantwortung | Beispiel-Aggregate |
|---|----------------|-----------|-----------|---------------|-------------------|
| 1 | **Identity & Access** | `Identity` | `identity` | User, Rollen, Permissions, Authentifizierung, Security Audit | User, Role, Permission |
| 2 | **Organization** | `Organization` | `organization` | Tenant-Konfiguration, Companies, Kostenstellen, Organisationseinheiten | Company, CostCenter, OrgUnit |
| 3 | **Master Data** | `MasterData` | `masterdata` | Geschäftspartner (Kunden, Lieferanten), Artikel, Artikelgruppen, Einheiten (keine Preislogik – s. Pricing) | Customer, Supplier, Article, UnitOfMeasure |
| 4 | **Finance & Accounting** | `Finance` | `finance` | Hauptbuch, Kontenrahmen, Buchungen, Kreditoren, Debitoren, Steuern, Periodenabschlüsse | JournalEntry, Account, TaxRate, FiscalPeriod |
| 5 | **Sales** | `Sales` | `sales` | Angebote, Aufträge, Auftragsbestätigungen, Rechnungen (Ausgang), CRM (light) | Quote, SalesOrder, OrderConfirmation, SalesInvoice |
| 6 | **Purchasing** | `Purchasing` | `purchasing` | Anfragen, Bestellungen, Bestellantworten, Rechnungen (Eingang) | PurchaseRequest, PurchaseOrder, OrderResponse, PurchaseInvoice |
| 7 | **Inventory & Warehouse** | `Inventory` | `inventory` | Lagerorte, Bestände, Lagerbewegungen, Chargen/Seriennummern | Warehouse, StockLevel, StockMovement, Batch |
| 8 | **Document Management** | `Documents` | `documents` | Dokumente, Vorlagen, Anhänge, Metadaten | Document, Template, Attachment |
| 9 | **Audit & Compliance** | `Audit` | `audit` | Änderungsprotokollierung, Daten-Audit, Security-Audit-Auswertungen | AuditEntry, ChangeLog |
| 10 | **Reporting** | `Reporting` | `reporting` | Berichte, Dashboards, Datenexporte (read-only, kein eigener Write-State) | Report, Dashboard |
| 11 | **Logistics** | `Logistics` | `logistics` | Sendungen (Lieferavis), Packstücke (SSCC), Wareneingänge, Chargen/MHD-Tracking, Teillieferungen | Shipment, Package, GoodsReceipt |
| 12 | **Goods Return** | `GoodsReturn` | `goodsreturn` | Retourenankündigungen (RETANN), Retourenanweisungen (RETINS), Retourensendungen, Retourengutschriften | ReturnAnnouncement, ReturnInstruction |
| 13 | **EDI** | `Edi` | `edi` | EDI-Nachrichten empfangen/senden/validieren, Partnerkonfiguration, Mapping-Regeln, EANCOM-Geschäftsregeln | EdiMessage, EdiPartnerConfig, EdiMapping |
| 14 | **Pricing** | `Pricing` | `pricing` | Preislisten, Artikelpreise, Staffelpreise, Konditionen, Preisfindung (PriceDetermination) | PriceList, ArticlePrice, GraduatedPrice, Condition |

**Regeln für den Katalog:**
- Der Katalog ist **erweiterbar** – neue Core-BCs können per ADR hinzugefügt werden
- Jeder BC hat einen **sprechenden Modulnamen**, der in Namespaces, Ordnerstruktur und DB-Schema verwendet wird
- Kein BC darf fachliche Verantwortung eines anderen BCs übernehmen

---

### 2) Namespace- und Projektstruktur

#### a) Core-Module (`src/Modules/`)

Jeder Core-BC spiegelt die Clean-Architecture-Schichten (ADR-00001) wider:

```
src/
  Modules/
    {Modulname}/
      {Modulname}.Domain/
      {Modulname}.Application/
      {Modulname}.Application.Contracts/
      {Modulname}.Infrastructure/
      {Modulname}.Presentation/     (API-Controller, ggf. entfällt bei internen BCs)
```

**Beispiel:**
```
src/Modules/Sales/Sales.Domain/
src/Modules/Sales/Sales.Application/
src/Modules/Sales/Sales.Application.Contracts/
src/Modules/Sales/Sales.Infrastructure/
src/Modules/Sales/Sales.Presentation/
```

#### b) Branchenspezifische Extensions (`src/Extensions/`)

Branchenmodule leben in einer separaten Struktur:

```
src/
  Extensions/
    {Branchenname}/
      {Branchenname}.Domain/
      {Branchenname}.Application/
      {Branchenname}.Application.Contracts/
      {Branchenname}.Infrastructure/
      {Branchenname}.Presentation/
```

**Beispiele:**
```
src/Extensions/Beverage/Beverage.Domain/
src/Extensions/Beverage/Beverage.Application/
src/Extensions/GraveCare/GraveCare.Domain/
src/Extensions/GraveCare/GraveCare.Application/
```

#### c) Abhängigkeitsregeln

| Referenz | Erlaubt? |
|----------|----------|
| Core-Modul → anderes Core-Modul (`.Contracts`) | ✅ Ja |
| Core-Modul → anderes Core-Modul (`.Domain`, `.Application`) | ❌ Nein |
| Extension → Core-Modul (`.Contracts`) | ✅ Ja |
| Extension → anderes Extension-Modul | ❌ Nein |
| Core-Modul → Extension | ❌ **Nie** (Core weiß nichts von Branchen) |
| Domain → SharedKernel.Domain | ✅ Ja |
| Application → SharedKernel.Domain + SharedKernel.Application | ✅ Ja |
| Infrastructure/Presentation → SharedKernel.Domain + SharedKernel.Application | ✅ Ja |

- Core-Module sind **branchenagnostisch** – sie enthalten keine Branchenlogik
- Extensions erweitern Core-BCs, indem sie Core-Events konsumieren und eigene Aggregate/Endpunkte bereitstellen
- Extensions werden pro Tenant über Feature Flags (ADR-05700) aktiviert/deaktiviert
- Extensions passen zum Modul-basierten Lizenzmodell (ADR-50500 geplant): Core = Basislizenz, Extensions = Zusatzmodule

---

### 3) Kommunikationsmodell: Hybrid (Queries synchron, Commands asynchron)

| Kommunikationsart | Mechanismus | Beispiel |
|-------------------|------------|---------|
| **Query (lesend, BC-übergreifend)** | Synchroner In-Process-Call über Interface | Sales fragt MasterData nach Artikeldaten |
| **Command (schreibend, BC-übergreifend)** | Asynchron über Integration Events (Outbox, ADR-08100) | Sales publiziert `OrderPlaced` → Finance reagiert mit Buchung |
| **Event-Notification (informierend)** | Integration Event, Fire-and-Forget für den Sender | MasterData publiziert `ArticlePriceChanged` → Sales/Purchasing reagieren |

**Regeln:**
- Ein BC darf einen **anderen BC niemals direkt schreibend aufrufen** (kein synchroner Cross-BC-Write)
- Lesende Cross-BC-Zugriffe erfolgen über **BC-Query-Interfaces** (definiert im jeweiligen BC als öffentlicher Vertrag)
- Schreibende Folgeaktionen werden **ausschließlich über Integration Events** (Outbox, ADR-00006/ADR-08100) ausgelöst
- Ein Command-Handler ändert immer nur Aggregate **innerhalb seines eigenen BCs**

---

### 4) BC-Contracts (öffentliche Schnittstellen)

Jeder BC definiert explizite Contracts für die Kommunikation mit anderen BCs:

**a) Query Contracts (synchron):**
```csharp
// Definiert in MasterData.Application.Contracts
public interface IArticleQueryService
{
    Task<ArticleDto?> GetByIdAsync(ArticleId articleId, CancellationToken ct);
    Task<IReadOnlyList<ArticleDto>> GetByIdsAsync(IEnumerable<ArticleId> articleIds, CancellationToken ct);
}
```

- Contracts liegen in einem eigenen `{Modulname}.Application.Contracts`-Projekt
- Andere Module referenzieren **nur** das Contracts-Projekt, nie `Domain` oder `Application` direkt
- DTOs in Contracts sind **read-only** und modulspezifisch (kein Sharing von Domain-Entities)

**b) Integration Event Contracts (asynchron):**
```csharp
// Definiert in Sales.Application.Contracts
public record OrderPlacedIntegrationEvent(
    Guid OrderId,
    string OrderNumber,
    Guid CustomerId,
    Guid CompanyId,
    decimal TotalAmount,
    DateTime OccurredAt,
    int Version = 1
);
```

- Integration Events sind versioniert (ADR-01200, ADR-08100)
- Event-Naming: `{AggregateRoot}{Action}IntegrationEvent` (Past Tense)
- Events enthalten nur IDs und Werte, keine verschachtelten Domain-Objekte

---

### 5) Anti-Corruption Layer (ACL) bei BC-Kommunikation

Wenn ein BC Daten eines anderen BCs konsumiert, übersetzt er diese in sein eigenes Modell:

- **Kein direktes Verwenden fremder DTOs im eigenen Domain-Modell**
- Mapping erfolgt im konsumierenden BC (Application/Infrastructure)
- Beispiel: Sales empfängt `ArticleDto` von MasterData und erzeugt daraus `OrderLineArticleSnapshot` (Value Object in Sales.Domain)

Dies entspricht dem Anti-Corruption Layer Pattern (ADR-07100).

---

### 6) Shared Kernel

Der Shared Kernel besteht aus **zwei separaten Projekten** (Compiler-enforced Dependency Rules):

**SharedKernel.Domain** (referenziert von: allen Layern):
- **Building Blocks**: `AggregateRoot<T>`, `Entity<T>`, `ValueObject`, `IDomainEvent`, `IIntegrationEvent`
- **Cross-Cutting Marker**: `ITenantScoped`, `ICompanyScoped` (ADR-06000, ADR-06300), `IAuditable`
- **Strongly-typed IDs**: `TenantId`, `CompanyId`, `UserId` (wenn mehrere BCs dieselbe ID referenzieren)
- **Error/Result Model**: `Error`, `Result<T>` (ADR-01500)

**SharedKernel.Application** (referenziert von: Application, Infrastructure, Presentation – **nicht von Domain**):
- **Persistence Ports**: `IRepository<T, TId>`, `IReadRepository<T, TId>`, `IUnitOfWork`
- **Query Abstractions**: `PaginatedResult<T>`, `PaginationRequest`, `SortingRequest`
- **Cross-Cutting Application Ports**: (zukünftig, z.B. `IClock`, `IEventPublisher`)

**Regeln:**
- Beide Projekte enthalten **keine fachliche Logik**
- `SharedKernel.Domain` hat **keine** Abhängigkeiten (reine Domain-Primitives)
- `SharedKernel.Application` darf `SharedKernel.Domain` referenzieren
- Domain-Projekte dürfen **nur** `SharedKernel.Domain` referenzieren (Compiler-enforced)
- Änderungen am Shared Kernel erfordern besondere Sorgfalt (Breaking Change für alle BCs)

---

### 7) Datenbank-Isolation zwischen BCs

Im Modular Monolith teilen sich alle BCs **dieselbe Tenant-Datenbank** (ADR-06000), aber:

- Jeder BC hat ein **eigenes EF Core Schema** (z.B. `sales.Orders`, `finance.JournalEntries`)
- Extensions haben ebenfalls eigene Schemata (z.B. `beverage.Recipes`, `gravecare.Graves`)
- **Keine Cross-BC-Foreign-Keys** auf DB-Ebene (weder Core↔Core noch Core↔Extension)
- Cross-BC-Referenzen nur über IDs (konsistent mit ADR-01300 §2)
- Queries dürfen für Read-Models über Schemata joinen (z.B. Dapper-Queries für Reporting)

---

### 8) Context Map (Beziehungen zwischen BCs)

| Upstream BC | Downstream BC | Beziehung | Mechanismus |
|-------------|--------------|-----------|-------------|
| **MasterData** | Sales, Purchasing, Logistics, Pricing, Inventory | Supplier (Stammdaten-Lieferant) | Query Contract |
| **Pricing** | Sales, Purchasing | Supplier (Preisermittlung) | Query Contract |
| **Organization** | alle | Supplier (Company-Daten, Konfiguration) | Query Contract |
| **Identity** | alle | Supplier (User, Permissions) | Query Contract + Claims |
| **Sales** | Logistics | Customer/Supplier (Auftrag → Sendung) | Integration Event |
| **Sales** | Finance | Customer/Supplier (Auftragsabschluss → Buchung) | Integration Event |
| **Sales** | Inventory | Customer/Supplier (Auftrag → Reservierung) | Integration Event |
| **Purchasing** | Logistics | Customer/Supplier (Bestellung → Wareneingang) | Integration Event |
| **Purchasing** | Finance | Customer/Supplier (Wareneingang → Buchung) | Integration Event |
| **Purchasing** | Inventory | Customer/Supplier (Wareneingang → Bestandserhöhung) | Integration Event |
| **Logistics** | Inventory | Customer/Supplier (Sendung/Wareneingang → Bestandsbewegung) | Integration Event |
| **Logistics** | GoodsReturn | Customer/Supplier (Lieferung → Retoureneingang) | Integration Event |
| **GoodsReturn** | Finance | Customer/Supplier (Retourengutschrift → Buchung) | Integration Event |
| **GoodsReturn** | Inventory | Customer/Supplier (Retoure → Bestandskorrektur) | Integration Event |
| **Edi** | Sales, Purchasing, Logistics, GoodsReturn, Finance | Supplier (Inbound-Überführung) | Integration Event |
| **Sales, Purchasing, Logistics, GoodsReturn, Finance** | Edi | Supplier (Outbound-Generierung) | Integration Event |
| **Inventory** | Finance | Customer/Supplier (Bestandskorrektur → Buchung) | Integration Event |
| **alle** | Audit | Conformist (Audit-Events empfangen) | Integration Event |
| **alle** | Reporting | Conformist (Daten abfragen) | Query Contract / DB Read |
| **Core (diverse)** | Extensions | Supplier (Core-Events + Query Contracts) | Integration Event + Query Contract |

---

### 9) BC-Ownership und Verantwortlichkeit

- Jeder BC hat genau **einen verantwortlichen Owner** (Person oder Team)
- Der Owner entscheidet über:
  - Aggregate-Design innerhalb des BCs
  - Veröffentlichte Contracts (Query + Events)
  - Breaking Changes an Contracts (erfordert Abstimmung mit Konsumenten)
- Bei einem Single-Team-Setup (initial) ist das gesamte Team für alle BCs verantwortlich, aber die **logische Trennung bleibt bestehen**

## Begründung
- 14 initiale Core-BCs decken die Kernanforderungen eines ERP-Systems ab, ohne zu granular zu schneiden
- Sprechende Modulnamen (statt Kürzel) verbessern Lesbarkeit in Code, Namespaces und Dokumentation
- Das Hybrid-Kommunikationsmodell (Queries synchron, Commands asynchron) ist pragmatisch: synchrone Reads sind performant und einfach, asynchrone Writes vermeiden gefährliche Cross-BC-Transaktionen
- BC-Contracts als eigenständige Projekte verhindern unbeabsichtigte Kopplung
- Schema-Trennung in der DB ermöglicht späteres Aufbrechen in separate Services
- Der Shared Kernel ist bewusst minimal gehalten, um BC-Autonomie zu maximieren
- Die Trennung Core/Extensions ermöglicht branchenspezifische Erweiterungen ohne Core-Kontamination und passt direkt zum Lizenzmodell

## Alternativen

1) **Kein expliziter BC-Katalog (organisch wachsen lassen)**
   - Vorteile: weniger Upfront-Aufwand
   - Nachteile: Grenzen verwischen, „Big Ball of Mud" Risiko, nachträgliches Aufteilen sehr teuer

2) **Microservices von Anfang an (ein Service pro BC)**
   - Vorteile: maximale Isolation, unabhängige Deployments
   - Nachteile: enorme Infrastrukturkomplexität für ein kleines Team, Distributed-System-Probleme (Netzwerk, Eventual Consistency, Debugging)

3) **Nur synchrone Kommunikation (kein Event-basierter Ansatz)**
   - Vorteile: einfacher zu debuggen
   - Nachteile: starke Kopplung, Kaskadenausfälle, Cross-BC-Transaktionen

4) **Nur asynchrone Kommunikation (auch für Reads)**
   - Vorteile: maximale Entkopplung
   - Nachteile: Read-Modelle müssen lokal repliziert werden, Eventual Consistency überall, hohe Komplexität

## Konsequenzen

### Positiv
- Klare Modulgrenzen von Tag 1 – erleichtert Orientierung, Code Reviews und Onboarding
- Agentenfreundlich: sprechende Modulnamen + Namespace-Konvention = klare Scaffolding-Regeln
- Späteres Aufbrechen in Services möglich ohne Rewrite (Schema-Trennung, Contract-Projekte)
- Integration Events (Outbox) sorgen für zuverlässige Cross-BC-Kommunikation
- Branchenmodule als Extensions entkoppelt vom Core → Core bleibt stabil

### Negativ / Trade-offs
- Initialer Aufwand für Projekt-/Ordnerstruktur (14 Core-BCs × 5 Projekte = 70+ Projekte)
- Contracts-Pflege bei BC-übergreifender Kommunikation
- Schema-Prefixes erfordern Konvention und Konfiguration in EF Core
- BC-Schnitt kann sich als falsch erweisen → erfordert Refactoring (aber: besser zu granular als zu monolithisch). Erweiterung 10 → 14 BCs am 2026-03-09 (Logistics, GoodsReturn, Edi, Pricing) auf Basis der PO-Story-Analyse.
- Extensions erhöhen die Gesamtkomplexität, sind aber erst relevant, wenn erste Branchenmodule entstehen

### Umsetzungshinweise

#### A) Projektstruktur
- Core-Module: `src/Modules/{Modulname}/`
- Extensions: `src/Extensions/{Branchenname}/`
- Contracts-Projekt: `{Modulname}.Application.Contracts` (einziges Projekt, das andere Module referenzieren dürfen)
- Shared Kernel Domain: `src/SharedKernel/SharedKernel.Domain/` (Building Blocks, Domain-Primitives)
- Shared Kernel Application: `src/SharedKernel/SharedKernel.Application/` (Application-Ports, Query-Abstractions)

#### B) EF Core Schema-Trennung
- Jeder BC hat einen eigenen `DbContext` (z.B. `SalesDbContext`, `FinanceDbContext`)
- Schema via `modelBuilder.HasDefaultSchema("sales")`
- Extensions analog: `modelBuilder.HasDefaultSchema("beverage")`
- Alle DbContexts operieren auf derselben Tenant-Datenbank (ADR-06000)
- Migrations pro BC-DbContext (ermöglicht unabhängige Schema-Evolution)

#### C) ArchTests
1. Kein Projekt in `Modules/{BC-A}/` darf Projekte in `Modules/{BC-B}/` referenzieren (außer `*.Contracts`)
2. Kein Projekt in `Modules/` darf Projekte in `Extensions/` referenzieren (Core → Extension verboten)
3. Extensions dürfen nur `*.Contracts`-Projekte aus `Modules/` referenzieren
4. Domain-Projekte dürfen keine Contracts anderer BCs referenzieren
5. Domain-Projekte dürfen nur `SharedKernel.Domain` referenzieren, nicht `SharedKernel.Application`
6. Integration Events liegen nur in `*.Contracts`-Projekten
7. Keine Cross-Schema-Foreign-Keys in EF Core Configurations
8. Jedes `ICompanyScoped`- und `ITenantScoped`-Entity hat einen Global Query Filter

#### D) Event-Konventionen
- Integration Event Namespace: `{Modulname}.Application.Contracts.IntegrationEvents`
- Event-Naming: `{Aggregate}{Verb}IntegrationEvent` (z.B. `OrderPlacedIntegrationEvent`)
- Jedes Event enthält: `Guid EventId`, `DateTime OccurredAt`, `int Version`
- Routing: Event-Type als Routing Key (konsistent mit ADR-08100)

#### E) Neuen Core-BC hinzufügen
1. ADR-01600 aktualisieren (Katalog-Tabelle erweitern)
2. Ordner + Projekte anlegen unter `src/Modules/{Modulname}/`
3. Schema definieren und in EF Core konfigurieren
4. Contracts-Projekt erstellen, wenn BC mit anderen kommuniziert
5. Context Map aktualisieren

#### F) Neues Branchenmodul (Extension) hinzufügen
1. Eigenes ADR im Branchenmodul-Kontext erstellen
2. Ordner + Projekte anlegen unter `src/Extensions/{Branchenname}/`
3. Eigenes DB-Schema definieren (z.B. `beverage`)
4. Core-Contracts referenzieren (nur `*.Contracts`)
5. Feature Flag für Tenant-Aktivierung konfigurieren (ADR-05700)
6. Lizenzmodul registrieren (ADR-50500)

## Verweise
- ADR-00001 (Clean Architecture – Layering)
- ADR-00003 (CQRS – Commands/Queries)
- ADR-01000 (DDD – Modellierungsregeln)
- ADR-01200 (Domain Events – intern vs. Integration)
- ADR-01300 (Aggregatgrenzen & Konsistenzregeln)
- ADR-06000 (Multi-Tenancy – Tenant Isolation)
- ADR-06300 (Multi-Company – Company-Scoping)
- ADR-07100 (External Integrations & Anti-Corruption Layers)
- ADR-08100 (Outbox Pattern & Integration Events)
