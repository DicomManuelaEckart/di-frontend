---
id: ADR-50700
title: Mehrwährungsstrategie
status: accepted
date: 2026-02-25
scope: global
enforced_by: archtests
affects:
  - backend
  - frontend
---

# ADR-50700 – Mehrwährungsstrategie

## Entscheidungstreiber
- Multi-Company-Architektur mit Companies in verschiedenen Ländern (z.B. DE → EUR, CH → CHF)
- Konzernkonsolidierung erfordert einheitliche Berichtswährung
- Kunden-/Lieferantenbelege können in Fremdwährung ausgestellt werden
- GoBD/HGB fordern: Buchung in Leitwährung + Fremdwährung, Kursdifferenzen korrekt ausweisen
- Wechselkurse ändern sich täglich – historische Kurse müssen für Bewertung und Prüfung erhalten bleiben

## Kontext
Ein Multi-Tenant SaaS-ERP mit Multi-Company-Struktur (ADR-06300) benötigt eine durchdachte Mehrwährungsstrategie. Jede Company operiert in einer Firmenleitwährung (Bilanzwährung), der Konzern (Tenant) kann optional eine Berichtswährung definieren. Im Tagesgeschäft werden Belege in Fremdwährung erfasst (z.B. Einkauf in USD, Verkauf in GBP). Die Umrechnung erfolgt zum Tageskurs, Kursdifferenzen bei Zahlung werden als Ertrag/Aufwand gebucht.

**Beispiel aus dem Fragebogen:**
- Tenant „Contoso Holding" → Konzern-Berichtswährung: EUR
- Company „Contoso DE GmbH" → Leitwährung EUR
- Company „Contoso CH AG" → Leitwährung CHF
- Eingangsrechnung bei Contoso CH AG in USD → Umrechnung USD→CHF (Buchung) + USD→EUR (Konzern-Reporting)

## Entscheidung

### 1) Drei-Währungsebenen-Modell

| Ebene | Scope | Pflicht | Beschreibung |
|-------|-------|---------|-------------|
| **Company-Leitwährung** (Local Currency, LC) | Company | ✅ Ja | Bilanzwährung der Company, ISO 4217, definiert bei Company-Anlage (ADR-06300), **unveränderbar** nach erster Buchung |
| **Transaktionswährung** (Transaction Currency, TC) | Beleg | ✅ Ja | Währung des Geschäftsvorfalls (z.B. Rechnung in USD). Kann = LC sein |
| **Konzern-Berichtswährung** (Group Currency, GC) | Tenant | ❌ Optional | Gemeinsame Währung für konsolidierte Auswertungen. Konfigurierbar auf Tenant-Ebene. Wenn nicht gesetzt: kein paralleles Reporting |

**Regel:** Jeder monetäre Betrag wird in **bis zu drei Darstellungen** geführt:

```
TransactionAmount (TC)  →  Tageskurs  →  LocalAmount (LC)
                                      →  GroupAmount (GC)  [wenn GC konfiguriert]
```

---

### 2) Money Value Object

Alle monetären Beträge werden als **Value Object** abgebildet:

```csharp
public sealed record Money(decimal Amount, CurrencyCode Currency)
{
    public static Money Zero(CurrencyCode currency) => new(0m, currency);
    
    // Rundung nach Währungs-Dezimalstellen (EUR: 2, JPY: 0, BHD: 3)
    public Money Round() => this with { Amount = decimal.Round(Amount, Currency.DecimalPlaces, MidpointRounding.AwayFromZero) };
}

public sealed record CurrencyCode
{
    public string Value { get; }          // ISO 4217 (EUR, USD, CHF, ...)
    public int DecimalPlaces { get; }     // 2 für EUR, 0 für JPY, 3 für BHD
    
    // Factory mit Validierung gegen ISO 4217 Lookup
    public static CurrencyCode FromIso(string iso) => ...;
}
```

**Regeln:**
- `decimal` als Datentyp (nicht `double`) – exakte Arithmetik für Finanzbeträge
- Rundung erfolgt **nach jeder Umrechnung**, nicht erst am Ende
- Vergleiche und Arithmetik nur zwischen gleichen `CurrencyCode` erlaubt (Compiler-sicher via Typsystem)
- `Money` ist **immutabel** (record)

---

### 3) Wechselkurs-Management

#### ExchangeRate Entity

```
ExchangeRate (Entity, Company-spezifisch)
├── BaseCurrency      : CurrencyCode     // z.B. EUR
├── QuoteCurrency     : CurrencyCode     // z.B. USD
├── Rate              : decimal           // z.B. 1.0850 (1 EUR = 1.085 USD)
├── InverseRate        : decimal           // z.B. 0.9217 (1 USD = 0.9217 EUR)
├── ValidFrom         : DateOnly          // Gültig ab (inkl.)
├── ValidTo           : DateOnly?         // Gültig bis (NULL = aktuell)
├── RateType          : ExchangeRateType  // Spot | Average | Closing
└── Source            : string            // "ECB" | "Manual" | "API:XE"
```

**ExchangeRateType:**

| Typ | Verwendung |
|-----|-----------|
| **Spot** | Tageskurs – für Belege (Rechnungen, Zahlungen, Gutschriften) |
| **Average** | Durchschnittskurs (Monat) – für Periodenauswertungen |
| **Closing** | Stichtagskurs (Monats-/Jahresende) – für Bilanzstichtag-Bewertung |

**Regeln:**
- Wechselkurse sind **Company-spezifisch** (`ICompanyScoped`) – verschiedene Companies können verschiedene Kursquellen nutzen
- Kein Kurs darf **rückwirkend geändert** werden, wenn bereits Buchungen existieren (append-only für historische Kurse)
- Jede Company pflegt Kurse gegen ihre **Leitwährung als Basiswährung** (Base Currency = LC)
- Wenn kein Kurs für ein Datum vorliegt: Fallback auf den letzten verfügbaren Kurs (mit Warnung bei > 7 Tagen Alter)
- **Dreiecksumrechnung** (Triangulation): Wenn kein direkter Kurs TC→LC existiert, wird über EUR oder USD als Pivot-Währung umgerechnet (konfigurierbar pro Company)

---

### 4) Umrechnungslogik (Currency Conversion Service)

```csharp
public interface ICurrencyConversionService
{
    /// Rechnet einen Betrag von TC in LC um (Tageskurs)
    Money ConvertToLocal(Money transactionAmount, CurrencyCode localCurrency, DateOnly postingDate, CompanyId companyId);
    
    /// Rechnet einen Betrag von LC in GC um (für Konzern-Reporting)
    Money ConvertToGroup(Money localAmount, CurrencyCode groupCurrency, DateOnly postingDate, CompanyId companyId);
    
    /// Gibt den angewandten Kurs zurück (für Beleg-Speicherung)
    ExchangeRateSnapshot GetAppliedRate(CurrencyCode from, CurrencyCode to, DateOnly date, ExchangeRateType type, CompanyId companyId);
}

public sealed record ExchangeRateSnapshot(
    decimal Rate,
    CurrencyCode BaseCurrency,
    CurrencyCode QuoteCurrency,
    DateOnly RateDate,
    ExchangeRateType Type,
    string Source
);
```

**Regeln:**
- Umrechnung erfolgt im **Application Layer** (nicht im Domain-Modell) – der Domain Layer kennt nur `Money`
- Der angewandte Kurs wird **im Beleg gespeichert** (`AppliedExchangeRate`), nicht nur referenziert – damit ist die Umrechnung jederzeit nachvollziehbar (GoBD)
- Wenn TC = LC, wird kein Kurs benötigt (1:1)
- Dreiecksumrechnung nur, wenn kein direkter Kurs vorhanden

---

### 5) Beleg-Struktur mit Mehrwährung

Jeder Beleg (Invoice, CreditNote, Payment etc.) speichert monetäre Beträge dreifach:

| Feld | Beschreibung |
|------|-------------|
| `TransactionAmount` | Betrag in Belegwährung (TC) – z.B. 1.000,00 USD |
| `TransactionCurrency` | ISO 4217 der Belegwährung |
| `LocalAmount` | Umgerechnet in Company-Leitwährung (LC) – z.B. 921,66 EUR |
| `AppliedExchangeRate` | Kurs zum Buchungszeitpunkt (Snapshot, nicht FK) |
| `GroupAmount` | Umgerechnet in Konzern-Berichtswährung (GC) – nur wenn GC konfiguriert |
| `GroupExchangeRate` | Kurs LC→GC (Snapshot) – nur wenn GC konfiguriert |

**Belegzeilen (Line Items)** speichern ebenfalls `TransactionAmount` + `LocalAmount` + optional `GroupAmount`. Die Summe der Lines muss dem Header-Betrag entsprechen (Invariante im Aggregate).

**JournalEntry-Integration (ADR-50000):**
- `DebitAmount` / `CreditAmount` in `JournalEntryLine` speichern den **LC-Betrag** (Company-Leitwährung)
- Zusätzlich: `OriginalTransactionAmount` und `OriginalTransactionCurrency` für Fremdwährungsbuchungen
- Die Invariante `Sum(Soll) == Sum(Haben)` gilt immer für **LC-Beträge**

---

### 6) Kursdifferenzen (Realized / Unrealized Exchange Differences)

#### Realisierte Kursdifferenzen (bei Zahlung)

Wenn zwischen Belegdatum und Zahlungsdatum der Wechselkurs sich ändert:

```
Rechnung:  1.000 USD × 0,9217 (Kurs 01.01.) = 921,66 EUR
Zahlung:   1.000 USD × 0,9150 (Kurs 15.02.) = 915,00 EUR
Differenz:                                     = +6,66 EUR (Kursgewinn)
```

- **Automatische Buchung** durch den Application Layer:
  - Kursgewinn → Konto 2660 (Erträge aus Kursdifferenzen)
  - Kursverlust → Konto 2150 (Aufwendungen aus Kursdifferenzen)
- Konten sind in der Posting Template-Konfiguration (ADR-50000) hinterlegt

#### Unrealisierte Kursdifferenzen (Stichtagsbewertung)

Am Periodenende (Monats-/Jahresabschluss) werden alle offenen Fremdwährungsposten mit dem **Closing-Kurs** neubewertet:

- Differenzen werden als **unrealisierte Kursgewinne/-verluste** gebucht
- Bei konservativem Ansatz (Niederstwertprinzip/Imparitätsprinzip): nur unrealisierte Verluste buchen, unrealisierte Gewinne nicht
- Die Bewertung wird beim nächsten Periodenabschluss **rückgebucht** (Storno) und neu berechnet
- Konfigurierbar pro Company: `RevaluationMethod = Conservative | FullFairValue`

---

### 7) Konzern-Konsolidierung (Reporting in Group Currency)

| Aspekt | Entscheidung |
|--------|-------------|
| **Bilanzpositionen** | Umrechnung mit **Closing-Kurs** (Stichtagskurs) |
| **GuV-Positionen** | Umrechnung mit **Average-Kurs** (Durchschnittskurs der Periode) |
| **Eigenkapital** | Umrechnung mit **historischem Kurs** (Kurs bei Einbuchung) |
| **Umrechnungsdifferenz** | Separate Position in Eigenkapital (IAS 21 / § 256a HGB) |
| **Implementierung** | Reporting Layer (ADR-50300) – keine Buchungen, nur berechnete Sicht |

**Regeln:**
- Konsolidierung ist **read-only** – es werden keine Buchungen in GC erzeugt
- Die Umrechnung erfolgt im Reporting Layer (ADR-50300), nicht im Buchungskreis
- Intercompany-Eliminierungen sind Phase-2-Feature (nicht in v1)
- Zugriff erfordert Permission `Finance.Consolidation.View` (ADR-03100)

---

### 8) Währungsstammdaten

```
Currency (Entity, Tenant-weit)
├── Code              : CurrencyCode     // ISO 4217 (EUR, USD, CHF)
├── Name              : LocalizedField   // Mehrsprachig (ADR-05000 §13)
├── Symbol            : string           // €, $, Fr.
├── DecimalPlaces     : int              // 2, 0, 3
├── IsActive          : bool             // Nur aktive Währungen nutzbar
├── IsBaseCurrency    : bool             // Kennzeichnung der häufigsten Basiswährung
└── ThousandSeparator : string?          // Optional, sonst aus User-Locale (ADR-05000 §14)
```

**Regeln:**
- Währungsstammdaten sind **Tenant-weit** (nicht Company-spezifisch) – alle Companies sehen die gleichen Währungen
- Beim Tenant-Onboarding (ADR-06200) werden die gängigsten Währungen (EUR, USD, CHF, GBP) automatisch angelegt
- Company-Leitwährung verweist auf den `CurrencyCode` aus diesen Stammdaten
- Eine Währung kann nur deaktiviert werden, wenn keine offenen Belege in dieser Währung existieren
- ISO 4217-Compliance: Nur gültige ISO-Codes zulässig (Validierung via Stammdaten-Lookup)

---

### 9) EF Core Mapping und Datenbankstruktur

**Money Value Object Mapping:**

```csharp
// Owned Type Configuration
builder.OwnsOne(e => e.TransactionAmount, money =>
{
    money.Property(m => m.Amount)
         .HasColumnName("TransactionAmount")
         .HasColumnType("decimal(18,6)")  // 6 Dezimalstellen für Zwischenrechnungen
         .IsRequired();
    money.Property(m => m.Currency)
         .HasColumnName("TransactionCurrency")
         .HasMaxLength(3)
         .HasConversion<CurrencyCodeConverter>()
         .IsRequired();
});
```

**Precision-Regeln:**
| Spalte | Precision | Begründung |
|--------|-----------|-----------|
| `Amount` (in Beleg) | `decimal(18,4)` | 4 Dezimalstellen – ausreichend für alle ISO 4217-Währungen |
| `Amount` (Zwischenberechnung) | `decimal(18,6)` | 6 Dezimalstellen – für Umrechnungen, bevor gerundet wird |
| `ExchangeRate.Rate` | `decimal(18,10)` | 10 Dezimalstellen – Wechselkurse können sehr klein sein (z.B. JPY) |

**Indizes:**
- `IX_ExchangeRate_Company_Currencies_Date` → `(CompanyId, BaseCurrency, QuoteCurrency, ValidFrom DESC)` – für Kursabfrage
- `IX_Currency_Code` → `(TenantId, Code)` UNIQUE – ein Currency-Code pro Tenant

---

### 10) Wechselkurs-Import (Phase 2)

| Aspekt | Entscheidung |
|--------|-------------|
| **Phase 1 (MVP)** | Manuelle Kurspflege über UI (CRUD für ExchangeRate) |
| **Phase 2** | Automatischer Import via Background Job (ADR-05500) |
| **Quelle** | EZB (European Central Bank) – kostenlos, tagesaktuell, ~30 Währungen gegen EUR |
| **Fallback-Quelle** | XE.com oder Open Exchange Rates (API-Key, kostenpflichtig für > 30 Currencies) |
| **Frequenz** | Täglich, 16:00 CET (nach EZB-Veröffentlichung) |
| **Format** | EZB: XML (SDMX), alternativ CSV-Import für manuelle Uploads |
| **Fehlerbehandlung** | Bei Import-Fehler: Warnung an Admin, letzter bekannter Kurs wird beibehalten, Belege mit veraltetem Kurs werden markiert |

---

## Begründung
- **Drei-Ebenen-Modell** (TC/LC/GC) ist Standard in ERP-Systemen (SAP, Dynamics, Navision) und deckt alle Szenarien ab
- **Money Value Object** verhindert Verwechslung von Beträgen verschiedener Währungen → Compile-Time-Sicherheit
- **Snapshot-Speicherung** des angewandten Kurses im Beleg statt FK-Referenz stellt GoBD-Konformität und Nachvollziehbarkeit sicher
- **Company-spezifische Wechselkurse** ermöglichen unterschiedliche Kursquellen pro Buchungskreis
- **Closing-/Average-Kurse** für Konsolidierung folgen IAS 21 und §256a HGB
- **Dezimalstellen-Strategie** (4 für Beträge, 10 für Kurse, 6 für Zwischenrechnungen) verhindert Rundungsprobleme
- **Automatische Kursdifferenz-Buchung** reduziert manuellen Aufwand und Fehlerquellen

## Alternativen

1) **Nur Einwährungs-System (kein Mehrwährungssupport)**
   - Vorteile: Deutlich einfacher, weniger Code
   - Nachteile: Kein internationaler Einsatz möglich, widerspricht dem Ziel „Architektur für Global" (Fragebogen §8.1)

2) **Separate Buchungskreise statt Dreifach-Speicherung**
   - Vorteile: Parallele Buchhaltung in mehreren Währungen (z.B. Schweizer OR + IFRS)
   - Nachteile: Massiv höhere Komplexität, doppelte Buchungslogik, in v1 nicht gerechtfertigt

3) **Zentrale Währungstabelle statt Company-spezifische Kurse**
   - Vorteile: Einfacheres Kurs-Management
   - Nachteile: Keine Flexibilität für Companies mit unterschiedlichen Kursquellen, Bankkurse vs. EZB-Kurse

## Konsequenzen

### Positiv
- Vollständiger Mehrwährungssupport für internationale Kunden ab v1
- GoBD-/HGB-/IAS-21-konforme Kursdokumentation durch Snapshot-Speicherung
- Compile-Time-Sicherheit gegen Währungsfehler durch `Money` Value Object
- Konzernkonsolidierung ohne zusätzliche Buchungen (read-only Reporting)
- Saubere Trennung: Domain kennt nur `Money`, Umrechnung liegt im Application Layer

### Negativ / Trade-offs
- Jeder Beleg speichert bis zu drei Betragsdarstellungen → höherer Speicherbedarf (~30% mehr Spalten auf Belegtabellen)
- Wechselkurs-Management muss gepflegt werden (Phase 1 manuell, Phase 2 automatisiert)
- Kursdifferenz-Buchungslogik erhöht die Komplexität im Application Layer
- Dreiecksumrechnung kann zu minimalen Rundungsabweichungen führen (akzeptabel, da kaufmännisch gerundet)
- Drei Precision-Levels (4/6/10) erfordern Disziplin bei Migrations und Mappings

### Umsetzungshinweise
- `Money` Value Object als Domain Primitives in `SharedKernel.Domain`
- `ICurrencyConversionService` im Application Layer, nicht im Domain Layer
- ArchTest: Kein `decimal`-Feld in Domain-Entities für monetäre Beträge – nur `Money` erlaubt
- ArchTest: Keine direkte Arithmetik zwischen `Money`-Instanzen verschiedener Währungen
- Wechselkurse mit L1-Cache (In-Memory, 5 Min TTL) – Kurse ändern sich maximal täglich
- Beleg-Validierung: Wenn Kurs > 7 Tage alt → Warnung (nicht Fehler)
- DB-Migration: Alle bestehenden `decimal`-Amount-Spalten auf `decimal(18,4)` normalisieren

## Verweise
- ADR-06300 (Multi-Company – Company-Leitwährung als Pflichtfeld)
- ADR-50000 (Finanzwesen – JournalEntry mit Amount + Currency)
- ADR-50100 (Zahlungsverkehr – Zahlungen in Fremdwährung)
- ADR-01400 (Value Objects – Money als Value Object)
- ADR-05000 §13 (Lokalisierung – mehrsprachige Währungsnamen)
- ADR-05000 §14 (User-Locale – Zahlenformat, Tausender-/Dezimaltrenner)
- ADR-05500 (Background Jobs – Wechselkurs-Import)
- ADR-08400 (Caching – L1-Cache für Wechselkurse)
- ADR-50300 (Reporting – Konzernkonsolidierung in Group Currency)
- ADR-03100 (Autorisierung – Finance.Consolidation.View Permission)
