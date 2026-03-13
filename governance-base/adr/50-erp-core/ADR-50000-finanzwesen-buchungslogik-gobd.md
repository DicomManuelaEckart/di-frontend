---
id: ADR-50000
title: Finanz- und Rechnungswesen – Kontenrahmen, Buchungslogik, Periodenabschlüsse, Steuern, GoBD
status: accepted
date: 2026-02-24
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-50000 – Finanz- und Rechnungswesen: Buchungslogik, GoBD, Periodenabschlüsse

## Entscheidungstreiber
- GoBD-Konformität (§146 AO, §238 HGB): ordnungsgemäße, vollständige, unveränderbare Buchführung
- Doppelte Buchführung als gesetzliche Pflicht für Kapital- und Personengesellschaften
- Multi-Company: jede Company (Buchungskreis) ist eine eigenständige rechtliche Einheit (ADR-06300)
- Internationale Einsatzfähigkeit: länderspezifische Kontenrahmen und Steuerregeln
- Periodenabschlüsse mit Sperrmechanismus zur Wahrung der Revisionssicherheit
- Denormalisierung von Stammdaten in Belege (kein Historisierungsbedarf, §7.3 Fragebogen)

## Kontext
Das ERP-System muss ein vollständiges Finanz- und Rechnungswesen abbilden, das sowohl den deutschen gesetzlichen Anforderungen (HGB, GoBD, UStG) als auch internationalen Anforderungen genügt. Die Architektur muss:

- Doppelte Buchführung (Soll/Haben) korrekt abbilden
- Belege unveränderbar speichern (GoBD)
- Periodenabschlüsse (Monat, Jahr) als Sperrmechanismus bieten
- Steuerverwaltung pro Land/Region ermöglichen
- Kontenrahmen (SKR03/04) als Templates bereitstellen, aber auch freie Definition erlauben
- Pro Company getrennt führen, aber Konzernkonsolidierung ermöglichen (ADR-06300)

Die fachliche Domäne „Finance" ist ein eigenständiger Bounded Context (ADR-01600) mit den Sub-Domains Buchhaltung, Steuerverwaltung und Periodenmanagement.

## Entscheidung

### 1) Kontenrahmen (Chart of Accounts)

| Aspekt | Entscheidung |
|--------|-------------|
| **Basis** | Vordefinierte Kontenrahmen-Templates: SKR03, SKR04 (Deutschland), weitere pro Land |
| **Anpassbarkeit** | Mandant (Tenant) kann eigenen Kontenrahmen anlegen oder Template erweitern |
| **Scope** | Tenant-weit mit Company-spezifischen Konten (ADR-06300 Override-Pattern) |
| **Struktur** | Hierarchisch: Kontenklasse → Kontengruppe → Konto → Unterkonto |

**Account-Entity (Aggregate Root):**

| Eigenschaft | Beschreibung |
|-------------|-------------|
| Number | Fachliche Kontonummer als Value Object (z.B. "1000") |
| Name | Bezeichnung (z.B. "Bank") |
| Type | Asset, Liability, Revenue, Expense, Equity |
| ParentAccountId | Übergeordnetes Konto (Hierarchie) |
| CompanyId | `NULL` = Tenant-weit, Wert = Company-spezifisch |
| IsPostable | `true` = bebuchbar, `false` = Sammelposition |
| DefaultTaxCode | Standard-Steuersatz für dieses Konto |

**Regeln:**
- Konten mit `CompanyId = NULL` sind für alle Companies des Tenants verfügbar (Konzern-Standard).
- Konten mit `CompanyId = <Wert>` sind nur für die jeweilige Company sichtbar.
- Kontonummern müssen innerhalb des Scopes (Tenant + ggf. Company) eindeutig sein.
- Templates (SKR03/04) werden beim Tenant-Onboarding als initiale Konten angelegt.

### 2) Buchungslogik: Doppelte Buchführung

Jede Buchung folgt dem Prinzip **Soll an Haben** mit folgenden Invarianten:

**JournalEntry (Aggregate Root):**

| Eigenschaft | Beschreibung |
|-------------|-------------|
| EntryNumber | Fachliche ID / Belegnummer (ADR-01700) |
| CompanyId | Company-Scope (Buchungskreis) |
| PostingDate | Buchungsdatum |
| DocumentDate | Belegdatum |
| Period | Buchungsperiode (Monat/Jahr) |
| Description | Buchungstext |
| SourceDocumentId | Verweis auf Ursprungsbeleg (Rechnung, Gutschrift etc.) |
| Lines | Buchungszeilen (1:n) |

**JournalEntryLine (Entity):**

| Eigenschaft | Beschreibung |
|-------------|-------------|
| AccountId | Referenz auf das gebuchte Konto |
| DebitAmount | Soll-Betrag (Value Object: Amount + Currency) |
| CreditAmount | Haben-Betrag (Value Object: Amount + Currency) |
| CostCenterId | Optionale Kostenstelle |
| TaxCode | Steuerschlüssel |

**Invarianten im Domain-Modell:**
- `Sum(DebitAmount) == Sum(CreditAmount)` — erzwungen im `JournalEntry`-Aggregate.
- Jede Line hat entweder Soll **oder** Haben (nicht beides).
- `PostingDate` muss in einer **offenen Periode** liegen (§3).
- `JournalEntry` ist **immutable nach Erstellung** (GoBD, §4).

**Automatische Gegenbuchungen:**
- Bei Belegbuchungen (Rechnung, Gutschrift) erzeugt der Application Layer automatisch die korrekten Buchungssätze:
  - Beispiel Eingangsrechnung: Aufwandskonto (Soll) ↔ Verbindlichkeiten (Haben) + Vorsteuer
  - Beispiel Ausgangsrechnung: Forderungen (Soll) ↔ Erlöskonto (Haben) + Umsatzsteuer
- Buchungsvorlagen (Posting Templates) sind konfigurierbar pro Belegart und Steuerszenario.

### 3) Periodenabschlüsse und Sperrmechanismus

Buchungsperioden werden pro Company verwaltet und können gesperrt werden.

**FiscalPeriod (Aggregate Root):** Identifiziert durch CompanyId + Year + Month (1–12 regulär, 13 = Nachbuchungsperiode).

**Status-Übergänge:**

| Status | Bedeutung | Buchungen erlaubt? |
|--------|-----------|-------------------|
| **Open** | Periode offen | Ja |
| **Closed** | Regulär abgeschlossen | Nur mit Permission `Finance.Period.Reopen` |
| **Locked** | Endgültig gesperrt (Jahresabschluss) | Nein – keine Änderungen möglich |

**Regeln:**

| Funktion | Beschreibung |
|----------|-------------|
| **Monatsabschluss** | Setzt Period auf `Closed`. Neue Buchungen in dieser Periode nur mit Permission `Finance.Period.Reopen` |
| **Jahresabschluss** | Setzt alle Perioden des Jahres auf `Locked`. Eröffnungsbuchungen für das Folgejahr werden automatisch erzeugt |
| **Nachbuchungsperiode** | Monat 13 – steht nach Monatsabschluss temporär offen für Nachbuchungen (z.B. Steuerberater-Korrekturen) |
| **Periodenprüfung** | Jede Buchung prüft: `FiscalPeriod.Status == Open` (oder `Closed` + Permission). Bei `Locked` → Ablehnung |

### 4) GoBD-Konformität und Revisionssicherheit

GoBD (Grundsätze zur ordnungsmäßigen Führung und Aufbewahrung von Büchern, Aufzeichnungen und Unterlagen in elektronischer Form) stellt folgende Anforderungen:

| GoBD-Anforderung | Umsetzung |
|-------------------|----------|
| **Unveränderbarkeit** | Buchungen und Belege sind nach Persistierung **immutable** – kein Update, kein Delete |
| **Storno statt Korrektur** | Falsche Buchungen werden durch **Storno-Buchung** (Umkehrbuchung) + neue Buchung korrigiert |
| **Lückenlose Nummerierung** | Belegnummernkreise pro Company + Belegart, lückenlos (ADR-01700 §4) |
| **Nachvollziehbarkeit** | Jede Buchung enthält Verweis auf Ursprungsbeleg (`SourceDocumentId`) und Audit-Trail |
| **Aufbewahrung** | Steuerrelevante Belege: 10 Jahre; Geschäftsbriefe: 6 Jahre |
| **Maschinelle Auswertbarkeit** | Daten müssen strukturiert und exportierbar sein (DATEV-Format, §ADR-50100) |
| **Periodenabschlüsse** | Abgeschlossene Perioden sind gesperrt (§3) |

**Enforcement:**
- `JournalEntry` besitzt **keine Update- oder Delete-Methoden** – Immutability ist im Domain-Modell erzwungen.
- Storno wird als **neue** JournalEntry erzeugt, die auf die stornierte Buchung verweist (Eigenschaften `ReversedEntryId` + `IsReversal`).
- EF Core: `JournalEntry`-Tabellen erlauben nur `Insert`, kein `Update` oder `Delete` (Interceptor/SaveChanges-Override).
- Belege (Invoice, CreditNote) dürfen nach Status `Finalized` nicht mehr geändert werden.
- ArchTests stellen sicher, dass `JournalEntry` keine öffentlichen Setter oder Mutationsmethoden besitzt.

### 5) Stammdaten-Denormalisierung in Belege

Gemäß Fragebogen §7.3 werden Stammdaten **nicht** historisiert, sondern bei Belegstellung in den Beleg kopiert:

| Daten | Quelle | Ziel (Beleg) | Zeitpunkt |
|-------|--------|-------------|-----------|
| Artikelpreis | Preisliste (MasterData) | `InvoiceLine.UnitPrice` | Bei Belegstellung |
| Artikelbezeichnung | Article.Name | `InvoiceLine.ItemDescription` | Bei Belegstellung |
| Kundenadresse | Customer.Address | `Invoice.BillingAddress` | Bei Belegstellung |
| Steuersatz | TaxRate.Percentage | `InvoiceLine.TaxRate` | Bei Belegstellung |
| Zahlungskondition | PaymentTerm | `Invoice.PaymentTerms` | Bei Belegstellung |

**Regeln:**
- Denormalisierte Werte im Beleg sind **immutable** (GoBD) – sie bilden den rechtsgültigen Stand ab.
- Spätere Änderungen an Stammdaten (Preisänderung, Adressänderung) haben **keinen Einfluss** auf bestehende Belege.
- Dadurch entfällt die Notwendigkeit für Stammdaten-Historisierung (Validity-From/To-Pattern).

### 6) Steuerverwaltung

| Aspekt | Entscheidung |
|--------|-------------|
| **Modell** | Steuersätze und -regeln als eigenständige Domain-Entities |
| **Scope** | Tenant-weit (Steuersätze gelten für alle Companies), Company-Override für Sonderfälle |
| **Automatik** | Steuerberechnung basierend auf: Artikel-Steuerklasse × Kunden-Steuerklasse × Land × Datum |
| **Länderspezifisch** | Steuerregeln pro Land/Region konfigurierbar (MwSt DE, USt AT, TVA CH etc.) |
| **Reverse Charge** | Erkennnung und Kennzeichnung von Reverse-Charge-Fällen (innergemeinschaftliche Lieferung) |

**Steuerermittlung:** Die `TaxRuleEngine` bestimmt den Steuersatz anhand von vier Parametern:
- **Artikel-Steuerklasse** (Standard, Ermäßigt, Steuerfrei)
- **Kunden-Steuerklasse** (Inland, EU-Ausland, Drittland)
- **Ländercode** (DE, AT, CH etc.)
- **Transaktionsdatum** (für zeitliche Gültigkeit)

**TaxRate-Entity (Aggregate Root):**

| Eigenschaft | Beschreibung | Beispiel |
|-------------|-------------|----------|
| CountryCode | Länderkennung | DE, AT, CH |
| TaxClass | Steuerklasse | Standard, Reduced, Zero |
| Percentage | Steuersatz | 19.0, 7.0, 0.0 |
| ValidFrom | Gültig ab | 2024-01-01 |
| ValidTo | Gültig bis (NULL = unbegrenzt) | – |

## Begründung
- **Doppelte Buchführung** ist gesetzlich vorgeschrieben und international anerkannter Standard.
- **GoBD-Konformität** durch Immutability im Domain-Modell (keine Update-Methoden) – Storno statt Korrektur.
- **Kontenrahmen-Templates** (SKR03/04) beschleunigen das Onboarding für deutsche Mandanten.
- **Tenant-weit mit Company-Override** für Kontenrahmen folgt dem bewährten Muster aus ADR-06300.
- **Periodenabschlüsse** mit 3 Status (Open/Closed/Locked) + Nachbuchungsperiode decken alle Praxis-Szenarien ab.
- **Denormalisierung in Belege** ist die einfachste und GoBD-konformste Lösung – keine Stammdaten-Historisierung nötig.
- **Steuerberechnung als Rule Engine** ermöglicht länderspezifische Erweiterung ohne Kernänderung.

## Alternativen
1) **Event Sourcing für Buchungen**
   - Vorteile: natürliche Append-only, vollständige Historie
   - Nachteile: erheblich höhere Komplexität, kein Standard-EF-Core-Support, Lernkurve

2) **Temporal Tables (SQL Server) statt Immutability im Code**
   - Vorteile: automatische Historisierung, weniger Code
   - Nachteile: GoBD fordert *keine Änderung*, nicht nur Historisierung; Kontrolle liegt bei DB statt Domain

3) **Stammdaten-Historisierung (Validity-From/To)**
   - Vorteile: komplette zeitliche Auflösung möglich
   - Nachteile: deutlich höhere Komplexität, nicht nötig wenn Denormalisierung in Belege erfolgt

## Konsequenzen

### Positiv
- GoBD-konform per Design: Immutability als Domain-Regel, nicht als nachträgliches Feature
- Klare Buchungsinvarianten (Soll = Haben) im Domain-Modell erzwungen
- Periodenabschlüsse verhindern versehentliche Buchungen in abgeschlossenen Zeiträumen
- Mandanten können mit Standard-Kontenrahmen sofort starten
- Denormalisierung vereinfacht die Architektur erheblich (keine Stammdaten-Versionen)

### Negativ / Trade-offs
- Storno statt Update erzeugt mehr Datensätze (Speicherverbrauch, Komplexität bei Auswertungen)
- Denormalisierung bedeutet redundante Daten in Belegen (Speicher, Konsistenz bei Fehlern vor Finalisierung)
- Kontenrahmen-Templates müssen gepflegt und bei Gesetzesänderungen aktualisiert werden
- Steuerregelwerk ist komplex und muss pro Land implementiert werden
- Finance BC wird einer der umfangreichsten Bounded Contexts

### Umsetzungshinweise

**A) Projekt-Struktur (ADR-01600):**
- `src/Modules/Finance/Finance.Domain/` – JournalEntry, Account, FiscalPeriod, TaxRate
- `src/Modules/Finance/Finance.Application/` – PostJournalEntry, ClosePeriod, GenerateAutoPostings
- `src/Modules/Finance/Finance.Infrastructure/` – EF Core Mappings (Insert-only für JournalEntry)
- `src/Modules/Finance/Finance.Presentation/` – API Endpoints

**B) EF Core – Insert-only für Buchungen:**
- Im `DbContext` oder als `SaveChangesInterceptor`: `JournalEntry` und `JournalEntryLine` erlauben nur `Add`.
- Bei `Modified` oder `Deleted` State → Exception mit Verweis auf Storno-Workflow.

**C) ArchTests:**
- `JournalEntry` darf keine öffentlichen Setter besitzen.
- `JournalEntry`-Aggregate darf keine `Update*`- oder `Delete*`-Methoden enthalten.
- Namespace `Finance.Domain` darf keinen Verweis auf `Infrastructure` haben.
- Buchungsinvariante (Soll = Haben) muss als Unit Test pro JournalEntry-Factory-Methode geprüft werden.

**D) Periodenprüfung:**
- Vor jeder Buchung prüft der Application Layer die `FiscalPeriod` für das Buchungsdatum.
- `Locked` → Buchung wird abgelehnt.
- `Closed` ohne Permission `Finance.Period.Reopen` → Buchung wird abgelehnt.

**E) Aufbewahrungsfristen:**
- Steuerrelevante Belege: **10 Jahre** (§147 AO)
- Geschäftsbriefe: **6 Jahre** (§147 AO)
- Audit-Logs: mindestens **10 Jahre** (analog zu Belegen)
- Cleanup-Jobs sperren Löschung für Daten innerhalb der Aufbewahrungsfrist.

## Verweise
- ADR-01600 – Bounded-Context-Katalog (Finance BC)
- ADR-01700 – ID-Strategie (Belegnummernkreise, lückenlos)
- ADR-06300 – Multi-Company / Organisationsstruktur (Company-Scope, Override-Pattern)
- ADR-03100 – Autorisierung (Finance.Period.Reopen Permission)
- ADR-08000 – Persistenz / EF Core
- ADR-50100 – Zahlungsverkehr und externe Finanzschnittstellen (SEPA, DATEV)
- Fragebogen §7.2 (GoBD), §7.3 (Stammdaten-Historisierung), §16.1–§16.4
