---
id: ADR-01700
title: ID-Strategie – Hybrid GUID + fachliche ID und Belegnummernkreise
status: accepted
date: 2026-02-24
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-01700 – ID-Strategie: Hybrid GUID + fachliche ID und Belegnummernkreise

## Entscheidungstreiber
- Eindeutige, global kollisionsfreie Identifikatoren für verteilte Systeme und Multi-Tenancy
- Fachlich sprechende IDs für Benutzer, Dokumente, Druck und Suche
- Lückenlose Belegnummern als gesetzliche Pflicht (GoBD, UStG)
- Performance: clustered Index auf sequenziellen Werten
- Referenzierbarkeit zwischen Bounded Contexts (ADR-01300 §2, ADR-01600)
- API-Ergonomie: Integratoren und Support arbeiten mit fachlichen Nummern, nicht mit GUIDs
- Kompatibilität mit DDD Value Objects (ADR-01400) und Multi-Company (ADR-06300)

## Kontext
ERP-Systeme arbeiten mit zwei Arten von Identität:

1. **Technische Identität** – muss global eindeutig, performant und merge-sicher sein (DB-PK, FK, Events).
2. **Fachliche Identität** – muss für Menschen lesbar, druckbar und rechtlich gültig sein (Rechnungsnummer, Bestellnummer, Artikelnummer).

In der **externen API** erwarten Integratoren und Support-Mitarbeiter fachlich sprechende Identifier (`RE-2026-00001`) statt kryptischer GUIDs. ERP-übliche APIs (SAP, DATEV) arbeiten ebenfalls mit fachlichen Nummern.

Ohne klare Trennung entstehen Probleme:
- Auto-Increment-IDs kollidieren bei Tenant-Migration, DB-Merge oder Event-Replay.
- Reine GUIDs sind für Endbenutzer unbrauchbar (Anzeige, Telefon, Suche).
- Belegnummernkreise (pro Company, pro Belegart, lückenlos) sind gesetzlich vorgeschrieben (GoBD §146 AO).

Zusätzlich müssen Bounded Contexts einander referenzieren, ohne direkte Objektgraphen aufzubauen (ADR-01300).

## Entscheidung

### 1) Technische ID: Sequential GUID

Jedes Aggregate Root besitzt eine technische ID vom Typ `Guid`:

```csharp
public abstract class Entity
{
    public Guid Id { get; protected init; }
}
```

**Regeln:**
- `Guid` ist **Primary Key** und **Clustered Index** in der Datenbank.
- Erzeugung via `Guid.CreateVersion7()` (.NET 9+) – zeitbasiert, sequenziell, kein Hotspot.
- Die technische ID wird für **Foreign Keys**, **Events** und **inter-BC-Referenzen** verwendet.
- Die technische ID wird **nicht** in externen API-URLs exponiert (siehe §3b).
- Technische IDs werden **niemals** dem Endbenutzer als Geschäftsnummer angezeigt.

### 2) Fachliche ID: Zusammengesetzter Geschäftsschlüssel

Aggregate mit fachlicher Sichtbarkeit erhalten zusätzlich eine **fachliche ID** als Value Object:

```csharp
// Value Object (ADR-01400)
public sealed record InvoiceNumber
{
    public string Prefix { get; }       // "RE" (Belegart-Kürzel)
    public int Year { get; }            // 2026
    public int SequenceNumber { get; }  // 1
    public string Value => $"{Prefix}-{Year}-{SequenceNumber:D5}";  // "RE-2026-00001"
}

// Aggregate Root
public class Invoice : AggregateRoot
{
    public InvoiceNumber InvoiceNumber { get; private set; }  // Fachliche ID
    // Id (Guid) wird von Entity geerbt                       // Technische ID
}
```

**Regeln:**
- Die fachliche ID ist ein **Unique Constraint** in der Datenbank (kein PK).
- Sie wird für **Anzeige**, **Suche**, **Druck** und **menschliche Kommunikation** verwendet.
- Sie ist **immutable** nach Erstellung (kein Umbenennen von Belegnummern).
- Nicht alle Entities benötigen eine fachliche ID – nur solche mit Benutzer- oder Rechtsrelevanz.

### 3) Referenzen zwischen Aggregaten / Bounded Contexts

| Schicht | Referenztyp | Beispiel |
|---------|------------|----------|
| **Infrastructure (DB)** | Technische ID (`Guid`) als Foreign Key | `OrderLine.ProductId = Guid` |
| **Domain (Aggregate)** | Fachliche ID als Value Object für Domänenlogik | `OrderLine.ArticleNumber = new ArticleNumber("ART-2026-00042")` |
| **Events (inter-BC)** | Technische ID (`Guid`) für Maschineninteraktion | `{ "productId": "a1b2c3..." }` |
| **Externe API** | Fachliche ID in URLs und Responses | `GET /api/articles/ART-2026-00042` |

**Regel:** Zwischen Bounded Contexts **intern** (Events, Infrastructure) wird die **technische ID (Guid)** verwendet.
Die fachliche ID wird bei Bedarf über den Contract des besitzenden BC aufgelöst (ADR-01600 §4).

### 3b) API-Identifikatoren: Fachliche ID bevorzugt

Die **externe REST-API** verwendet die **fachliche ID** als primären Identifier in URLs:

```
GET  /api/invoices/RE-2026-00001
GET  /api/customers/KD-10001
GET  /api/articles/ART-2026-00042
PUT  /api/invoices/RE-2026-00001/finalize
```

**Regeln:**
- API-URLs verwenden die fachliche ID (Value Object `.Value`) als Route-Parameter.
- Entities **ohne** fachliche ID verwenden die GUID als Fallback (z.B. interne System-Entities).
- API Responses enthalten **beide** IDs – die fachliche ID als primäres Feld, die GUID als `id`-Feld für technische Konsumenten:

```json
{
  "id": "a1b2c3d4-5678-...",           // GUID für technische Referenzen
  "invoiceNumber": "RE-2026-00001",     // Fachliche ID (primär)
  "customer": {
    "customerNumber": "KD-10001",       // Fachliche Referenz
    "name": "Mustermann GmbH"
  }
}
```

- Cross-BC-Referenzen in Responses zeigen die fachliche ID + ggf. denormalisierte Display-Felder.
- Die GUID wird **nicht** in URLs verwendet, damit Integratoren mit bekannten Geschäftsnummern arbeiten können.

### 4) Belegnummernkreise

Belegnummern werden **pro Company** und **pro Belegart** vergeben und sind **lückenlos**.

#### 4.1 Aufbau

```
{Prefix}-{Jahr}-{Sequenznummer}
```

| Bestandteil | Beschreibung | Beispiel |
|-------------|-------------|----------|
| Prefix | Belegar-Kürzel (2–4 Zeichen, konfigurierbar pro Company) | `RE`, `GU`, `BE`, `LI`, `AN` |
| Jahr | Geschäftsjahr (4-stellig) | `2026` |
| Sequenznummer | Laufende Nummer, 5-stellig mit führenden Nullen | `00001` |

Beispiele: `RE-2026-00001` (Rechnung), `GU-2026-00001` (Gutschrift), `BE-2026-00001` (Bestellung), `LI-2026-00001` (Lieferschein), `AN-2026-00001` (Angebot).

#### 4.2 Geltungsbereich

| Dimension | Scope | Begründung |
|-----------|-------|-----------|
| **Tenant** | Separiert (DB-per-Tenant, ADR-06000) | Automatisch durch Datenbankisolation |
| **Company** | Separater Nummernkreis pro Company | Rechtlich erforderlich: jede Company (Buchungskreis) hat eigene Nummernkreise |
| **Belegart** | Separater Nummernkreis pro Belegart | Fachlich üblich und GoBD-konform |
| **Geschäftsjahr** | Sequenz startet pro Jahr neu bei 1 | Standard-ERP-Verhalten |

#### 4.3 Lückenlosigkeit (GoBD-Pflicht)

Für steuerrelevante Belege (Rechnungen, Gutschriften) gilt:
- Nummern müssen **lückenlos** und **fortlaufend** vergeben werden (§146 AO, GoBD).
- Reservierte, aber nicht verwendete Nummern müssen als **storniert** dokumentiert werden.
- Nachträgliches Einfügen oder Ändern ist verboten.

#### 4.4 Technische Umsetzung

```csharp
// Tabelle: DocumentNumberSequence (pro Tenant-DB)
public class DocumentNumberSequence
{
    public Guid Id { get; init; }
    public Guid CompanyId { get; init; }
    public string DocumentType { get; init; }    // "RE", "GU", "BE", etc.
    public int Year { get; init; }
    public int CurrentValue { get; private set; }

    public int NextValue()
    {
        CurrentValue++;
        return CurrentValue;
    }
}
```

**Vergaberegeln:**
- Nummernvergabe erfolgt innerhalb einer **serialisierten Transaktion** (`SELECT ... WITH (UPDLOCK, ROWLOCK)`).
- Kein optimistisches Vergeben: die Nummer wird **erst bei Persistierung** des Belegs vergeben, nicht bei Anlage eines Entwurfs.
- Entwürfe/Drafts erhalten **keine Belegnummer** – erst bei Finalisierung (Status-Übergang).
- Bei Parallelität: Retry-Mechanismus im Application Layer (Deadlock-sicher).

#### 4.5 Konfiguration

Belegnummernkreise sind pro Company konfigurierbar:

| Konfiguration | Default | Anpassbar |
|---------------|---------|-----------|
| Prefix pro Belegart | `RE`, `GU`, `BE`, `LI`, `AN` | ✅ Ja, pro Company |
| Stellenanzahl Sequenz | 5 | ✅ Ja, pro Company |
| Jahreswechsel-Verhalten | Sequenz startet bei 1 | ✅ Ja (alternativ: fortlaufend) |

### 5) Stammdaten-IDs (Artikel, Kunden, Lieferanten)

Stammdaten verwenden ebenfalls das Hybrid-Muster:

| Entity | Technische ID | Fachliche ID (Value Object) | Beispiel |
|--------|--------------|---------------------------|----------|
| Article | `Guid` | `ArticleNumber` | `ART-2026-00042` |
| Customer | `Guid` | `CustomerNumber` | `KD-10001` |
| Supplier | `Guid` | `SupplierNumber` | `LF-20001` |
| Account | `Guid` | `AccountNumber` | `1000` (Kontonummer aus SKR) |

**Regeln für Stammdaten-IDs:**
- Stammdaten-Nummernkreise sind **nicht** zwingend lückenlos (keine GoBD-Pflicht).
- Können manuell oder automatisch vergeben werden (konfigurierbar).
- Müssen innerhalb des Scopes (Tenant + ggf. Company) eindeutig sein.

### 6) DB-Schema-Muster

```sql
-- Aggregate mit Hybrid-ID
CREATE TABLE sales.Invoices (
    Id              UNIQUEIDENTIFIER NOT NULL PRIMARY KEY CLUSTERED,  -- Technische ID (V7 GUID)
    InvoiceNumber   NVARCHAR(20)     NOT NULL,                        -- Fachliche ID
    CompanyId       UNIQUEIDENTIFIER NOT NULL,                        -- Company-Scope
    -- weitere Spalten ...
    CONSTRAINT UQ_Invoice_Number UNIQUE (CompanyId, InvoiceNumber)    -- Unique pro Company
);

-- Nummernkreis-Tabelle
CREATE TABLE shared.DocumentNumberSequences (
    Id              UNIQUEIDENTIFIER NOT NULL PRIMARY KEY CLUSTERED,
    CompanyId       UNIQUEIDENTIFIER NOT NULL,
    DocumentType    NVARCHAR(10)     NOT NULL,
    [Year]          INT              NOT NULL,
    CurrentValue    INT              NOT NULL DEFAULT 0,
    CONSTRAINT UQ_Sequence UNIQUE (CompanyId, DocumentType, [Year])
);

-- FK-Referenz: immer über technische ID
CREATE TABLE sales.OrderLines (
    Id              UNIQUEIDENTIFIER NOT NULL PRIMARY KEY CLUSTERED,
    OrderId         UNIQUEIDENTIFIER NOT NULL,   -- FK zu sales.Orders
    ProductId       UNIQUEIDENTIFIER NOT NULL,   -- FK zu masterdata.Articles (cross-BC)
    ArticleNumber   NVARCHAR(20)     NOT NULL,   -- Denormalisierte fachliche ID (Snapshot)
    -- ...
);
```

## Begründung
- **V7 GUIDs** sind zeitbasiert-sequenziell → minimaler Index-Fragmentation, kein Page-Split-Hotspot wie bei V4 GUIDs.
- **Hybrid-Ansatz** trennt technische und fachliche Identität sauber – jede Art wird für ihren Zweck optimiert.
- **Lückenlose Belegnummernkreise** pro Company und Belegart sind gesetzlich vorgeschrieben (GoBD, §146 AO).
- **Serialisierte Nummernvergabe** bei Finalisierung (nicht bei Entwurf) vermeidet Lücken durch abgebrochene Vorgänge.
- **Value Objects für fachliche IDs** erzwingen Validierung bei Erstellung und verhindern Primitive Obsession (ADR-01400).
- **Denormalisierung der fachlichen ID** in referenzierende Tabellen (z.B. `ArticleNumber` in `OrderLines`) ermöglicht performante Anzeige ohne Cross-BC-Joins.
- **Fachliche ID in der API** – Integratoren und Support arbeiten mit bekannten Nummern (`RE-2026-00001`), nicht mit kryptischen GUIDs. Üblich in ERP-APIs.
- **Company-Scope** für Nummernkreise ist rechtlich erforderlich (eigenständige Buchungskreise, ADR-06300).

## Alternativen
1) **Auto-Increment (Long) als PK**
   - Vorteile: kompakt, natürlich sortiert, einfach
   - Nachteile: kollidiert bei DB-Merge/Migration, nicht pre-generierbar, Tenant-übergreifend problematisch

2) **Nur GUID, keine fachliche ID**
   - Vorteile: maximal einfach
   - Nachteile: Benutzer können keine menschenlesbare Nummer kommunizieren, gesetzliche Anforderungen (Belegnummern) nicht erfüllt

3) **Fachliche ID als PK**
   - Vorteile: ein Schlüssel für alles
   - Nachteile: FK-Referenzen mit Composite Keys sind komplex, Änderung der fachlichen ID erfordert Kaskaden-Updates, Performance-Probleme bei String-PKs

4) **Nummernvergabe bei Entwurf (sofort)**
   - Vorteile: Nummer ist sofort sichtbar
   - Nachteile: Lücken bei abgebrochenen Entwürfen, GoBD-Verstoß bei steuerrelevanten Belegen

5) **GUID als API-Identifier**
   - Vorteile: universell, kein Format-Parsing, eindeutig
   - Nachteile: für Menschen kryptisch, Integratoren können nicht mit bekannten Geschäftsnummern arbeiten, untypisch für ERP-APIs

## Konsequenzen

### Positiv
- Saubere Trennung: technische IDs für System, fachliche IDs für Menschen und API
- API-URLs mit fachlichen Nummern – verständlich für Integratoren, Support und Logs
- GoBD-konforme Belegnummern ohne Workarounds
- Keine Kollisionen bei DB-Migration oder Tenant-Merge
- Value Objects erzwingen Format-Validierung zentral in der Domain
- Performance: V7 GUIDs + Clustered Index = kein Hotspot

### Negativ / Trade-offs
- Jedes fachlich sichtbare Aggregate hat zwei IDs → mehr Spalten in der DB
- Serialisierte Nummernvergabe ist ein potenzieller Engpass bei sehr hoher Parallelität (mitigierbar durch DB-Partitionierung oder Queue)
- Fachliche IDs müssen bei Cross-BC-Referenzen als Snapshot denormalisiert werden → Konsistenz via Events (ADR-01200)
- API-Routing muss zwischen fachlicher ID und GUID-Fallback unterscheiden (einmalige Infrastruktur)
- Mehr Implementierungsaufwand als reine GUID-Strategie

### Umsetzungshinweise

**A) Basis-Abstraktion:**
```csharp
// Basisklasse für alle Entities
public abstract class Entity
{
    public Guid Id { get; protected init; } = Guid.CreateVersion7();
}

// Basisklasse für Aggregate Roots mit fachlicher ID
public abstract class AggregateRoot<TBusinessId> : Entity
    where TBusinessId : notnull
{
    public TBusinessId BusinessId { get; protected set; } = default!;
}
```

**B) Nummernvergabe-Service:**
```csharp
public interface IDocumentNumberService
{
    Task<string> GenerateNextAsync(
        Guid companyId,
        string documentType,
        int year,
        CancellationToken ct);
}
```
- Implementierung verwendet `UPDLOCK, ROWLOCK` auf `DocumentNumberSequences`.
- Wird im Command Handler aufgerufen, **nicht** im Domain-Modell (Infrastructure-Abhängigkeit).
- Retry bei Deadlock (max. 3 Versuche).

**C) EF Core Mapping:**
```csharp
builder.Property(x => x.InvoiceNumber)
    .HasConversion(
        v => v.Value,                    // → "RE-2026-00001"
        v => InvoiceNumber.Parse(v))     // ← parst String zurück
    .HasMaxLength(20)
    .IsRequired();

builder.HasIndex(x => new { x.CompanyId, x.InvoiceNumber })
    .IsUnique();
```

**D) ArchTests:**
- Alle Aggregate Roots müssen Property `Id` vom Typ `Guid` besitzen.
- Fachliche IDs müssen als Value Object implementiert sein (kein `string` als Geschäftsnummer).
- Primary Key muss `Guid` sein (kein Auto-Increment, kein String-PK).
- In der Domain-Schicht darf `IDocumentNumberService` nicht referenziert werden.

**E) Naming-Konventionen:**

| Konzept | Benennung | Beispiel |
|---------|-----------|---------|
| Technische ID | `Id` | `Invoice.Id` |
| Fachliche ID (Property) | `{Entity}Number` | `Invoice.InvoiceNumber` |
| Fachliche ID (Value Object Typ) | `{Entity}Number` | `InvoiceNumber`, `ArticleNumber` |
| DB-Spalte (technisch) | `Id` | `Invoices.Id` |
| DB-Spalte (fachlich) | `{Entity}Number` | `Invoices.InvoiceNumber` |
| FK-Spalte | `{ReferencedEntity}Id` | `OrderLines.ProductId` || API-URL-Parameter | `{entityNumber}` | `/api/invoices/{invoiceNumber}` |
| API-Response (technisch) | `id` | `"id": "a1b2c3..."` |
| API-Response (fachlich) | `{entity}Number` | `"invoiceNumber": "RE-2026-00001"` |

**F) API-Controller-Muster:**
```csharp
[ApiController]
[Route("api/invoices")]
public class InvoicesController : ControllerBase
{
    // Fachliche ID als Route-Parameter (Standardfall)
    [HttpGet("{invoiceNumber}")]
    public async Task<InvoiceResponse> GetByNumber(string invoiceNumber, CancellationToken ct)
    {
        var query = new GetInvoiceByNumberQuery(InvoiceNumber.Parse(invoiceNumber));
        return await _mediator.Send(query, ct);
    }
}
```
- Route-Parameter ist immer die **fachliche ID** (String-Repräsentation des Value Objects).
- Lookup erfolgt über den Unique Index `(CompanyId, InvoiceNumber)`.
- Entities ohne fachliche ID verwenden `Guid` als Route-Parameter (Ausnahme, nicht Regel).
## Verweise
- ADR-01300 – Aggregatgrenzen & Konsistenzregeln (Referenzen nur über ID)
- ADR-01400 – Value Objects (fachliche IDs als Value Objects)
- ADR-01600 – Bounded-Context-Katalog (Cross-BC-Referenzierung)
- ADR-06000 – Multi-Tenancy / Tenant-Isolation (DB-per-Tenant)
- ADR-06300 – Multi-Company / Organisationsstruktur (CompanyId-Scope)
- ADR-08000 – Persistenz / EF Core (Clustered Index, Concurrency)
- Fragebogen §2.4 (ID-Strategie), §2.5 (Referenzen), §7.5 (Belegnummernkreise)
