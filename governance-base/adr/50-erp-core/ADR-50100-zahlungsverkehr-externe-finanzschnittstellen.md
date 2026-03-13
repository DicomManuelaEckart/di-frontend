---
id: ADR-50100
title: Zahlungsverkehr und externe Finanzschnittstellen (SEPA, CAMT, DATEV, E-Rechnung)
status: accepted
date: 2026-02-24
scope: backend
enforced_by: code-review
affects:
  - backend
---

# ADR-50100 – Zahlungsverkehr und externe Finanzschnittstellen

## Entscheidungstreiber
- Gesetzliche Pflicht: E-Rechnung (ZUGFeRD/XRechnung) ab 2025 für B2B in Deutschland
- DATEV-Export als De-facto-Standard für Zusammenarbeit mit Steuerberatern
- SEPA als europäischer Zahlungsstandard (Überweisungen, Lastschriften)
- CAMT-Import für automatische Bankabstimmung
- Offene-Posten-Verwaltung und Mahnwesen als Kern-ERP-Funktionalität
- Multi-Company: jede Company hat eigene Bankverbindungen und Steuernummern (ADR-06300)

## Kontext
Ein ERP-System muss mit dem Finanzökosystem interagieren:

1. **Ausgehend:** Zahlungen auslösen (SEPA), Buchungen exportieren (DATEV), Rechnungen senden (ZUGFeRD/XRechnung)
2. **Eingehend:** Kontoauszüge importieren (CAMT), Zahlungseingänge zuordnen

Diese Schnittstellen sind pro Company (Buchungskreis) zu führen, da jede Company eigene Bankkonten, Steuernummern und USt-IDs besitzt.

Die externen Formate (SEPA XML, CAMT.053, DATEV CSV, ZUGFeRD/XRechnung XML) werden über Anti-Corruption Layer (ADR-07100) angebunden, um die Domain von externen Formatdetails zu isolieren.

## Entscheidung

### 1) SEPA-Integration (Zahlungsausgang)

| Aspekt | Entscheidung |
|--------|-------------|
| **Formate** | SEPA Credit Transfer (pain.001), SEPA Direct Debit (pain.008) |
| **Erzeugung** | Application Layer erzeugt SEPA-XML aus offenen Zahlungsaufträgen |
| **Scope** | Pro Company – jede Company hat eigene Bankverbindung (IBAN, BIC, Gläubiger-ID) |
| **Ablauf** | Zahlungsvorschlag → Prüfung/Freigabe → SEPA-XML-Erzeugung → Download/Bankübermittlung |
| **Bankübermittlung** | Phase 1: manueller Download der SEPA-Datei, Upload ins Banking-Portal. Kein EBICS/HBCI initial |

**Regeln:**
- Zahlungsaufträge werden aus **fälligen offenen Posten** generiert (Query über OP-Liste).
- Eine SEPA-Datei kann mehrere Zahlungen bündeln (Sammler).
- Jede Zahlung referenziert den Ursprungsbeleg (`SourceDocumentId`, z.B. Eingangsrechnung).
- Nach Erzeugung der SEPA-Datei werden die OPs als „Zahlung angewiesen" markiert (nicht „bezahlt" — erst nach CAMT-Abgleich).

### 2) CAMT-Import (Kontoauszüge)

| Aspekt | Entscheidung |
|--------|-------------|
| **Format** | CAMT.053 (Kontoauszug), CAMT.054 (Einzelbuchung) |
| **Import** | Datei-Upload über UI oder automatisiert via Scheduled Job |
| **Zuordnung** | Automatischer Abgleich (Matching) von Bankbuchungen zu offenen Posten |
| **Matching-Strategie** | 1) Verwendungszweck → Belegnummer, 2) Betrag + Debitor/Kreditor, 3) Manuell |

**Ablauf:**

1. CAMT-Datei importieren (Upload oder Scheduled Job)
2. Bankbuchungen parsen
3. Auto-Matching versuchen: Verwendungszweck → Belegnummer, Betrag + Debitor/Kreditor
4. Nicht-zuordenbare Buchungen → manuelle Zuordnung im Clearing-Cockpit
5. Zugeordnete Buchungen → OP als „bezahlt“ markieren + Buchungssatz erzeugen

**Regeln:**
- CAMT-Import erzeugt automatisch JournalEntries im Finance BC (Bank ↔ Forderungen/Verbindlichkeiten).
- Nicht-zuordenbare Buchungen werden in einem Clearing-Backlog gesammelt.
- Match-Ergebnisse werden mit Confidence Score versehen (für spätere ML-Verbesserung).

### 3) Offene-Posten-Verwaltung (OP)

Offene Posten entstehen automatisch bei der Buchung von Debitoren-/Kreditorenbelegen.

**OpenItem (Aggregate Root):**

| Eigenschaft | Beschreibung |
|-------------|-------------|
| CompanyId | Buchungskreis |
| Type | Receivable (Forderung) oder Payable (Verbindlichkeit) |
| BusinessPartnerId | Kunde oder Lieferant |
| SourceDocumentId | Referenz auf Rechnung, Gutschrift etc. |
| DocumentNumber | Fachliche Belegnummer (denormalisiert) |
| OriginalAmount | Ursprungsbetrag |
| RemainingAmount | Restbetrag nach Teilzahlungen |
| DueDate | Fälligkeitsdatum |
| Status | Open, PartiallyPaid, Paid, Overdue |
| DunningLevel | 0 = keine Mahnung, 1–3 = Mahnstufen |

**Regeln:**
- OP wird bei Belegbuchung automatisch erzeugt (Application Layer, nach JournalEntry).
- Zahlungseingänge (CAMT-Abgleich) reduzieren `RemainingAmount`.
- Bei `RemainingAmount == 0` → Status = `Paid`.
- Teilzahlungen sind erlaubt → Status = `PartiallyPaid`.

### 4) Mahnwesen

| Aspekt | Entscheidung |
|--------|-------------|
| **Auslöser** | Automatischer Mahnlauf (Scheduled Job) oder manuell |
| **Mahnstufen** | 3 Stufen (konfigurierbar pro Company): Zahlungserinnerung → 1. Mahnung → 2. Mahnung |
| **Fristen** | Konfigurierbar pro Mahnstufe (z.B. 14, 7, 7 Tage nach Fälligkeit) |
| **Mahngebühren** | Optional, konfigurierbar pro Mahnstufe und Company |
| **Ausgang** | Mahnschreiben als PDF (Documents BC) + E-Mail (optional) |
| **Sperrung** | Einzelne OPs oder Kunden können von der Mahnung ausgenommen werden |

**Ablauf:**

1. Mahnlauf starten (pro Company)
2. Alle offenen + überfälligen OPs ermitteln
3. Gesperrte OPs/Kunden ausfiltern
4. Pro Kunde: OPs gruppieren, Mahnstufe bestimmen
5. Mahnschreiben generieren (pro Kunde, nicht pro OP)
6. DunningLevel am OP aktualisieren
7. Mahnlauf protokollieren (Audit)

### 5) DATEV-Export

| Aspekt | Entscheidung |
|--------|-------------|
| **Format** | DATEV-Buchungsstapel (CSV, DATEV-Formatbeschreibung) |
| **Scope** | Pro Company, pro Zeitraum (Monat/Jahr) |
| **Inhalt** | Buchungssätze (Soll/Haben), Debitoren-/Kreditoren-Stammdaten, Kontenbeschriftungen |
| **Auslöser** | Manueller Export durch Benutzer mit Permission `Finance.Datev.Export` |
| **Validierung** | Vor dem Export wird geprüft, ob alle Pflichtfelder für DATEV befüllt sind |

**DATEV-Format-Mapping:**

| DATEV-Feld | Quelle |
|------------|--------|
| Umsatz | JournalEntryLine.DebitAmount oder CreditAmount |
| Gegenkonto | Gegenposition im Buchungssatz |
| Belegdatum | JournalEntry.DocumentDate |
| Buchungsdatum | JournalEntry.PostingDate |
| Belegfeld 1 | JournalEntry.EntryNumber (fachliche ID) |
| Buchungstext | JournalEntry.Description |
| Konto | Account.Number |
| Steuerschlüssel | TaxCode → DATEV-Steuerschlüssel-Mapping |

**Regeln:**
- DATEV-Steuerschlüssel werden aus internen TaxCodes gemappt (Mapping-Tabelle).
- Export erfolgt über Anti-Corruption Layer (Infrastructure) – Domain kennt kein DATEV-Format.
- Exportierte Zeiträume werden protokolliert (Audit-Log).

### 6) E-Rechnung (ZUGFeRD / XRechnung)

| Aspekt | Entscheidung |
|--------|-------------|
| **Formate** | ZUGFeRD 2.1+ (Profil EN16931), XRechnung (UBL/CII) |
| **Pflicht** | Ab 01.01.2025 B2B in DE (Empfangspflicht), ab 2027 Sendepflicht |
| **Erzeugung** | Application Layer: Rechnungsdaten → E-Rechnung XML → eingebettet in PDF (ZUGFeRD) oder standalone (XRechnung) |
| **Empfang** | Eingehende E-Rechnungen werden geparst und als Eingangsrechnungs-Entwurf importiert |
| **Routing** | Format-Wahl basierend auf Empfänger-Präferenz (Kunden-Stammdaten) |

**ZUGFeRD-Erzeugung:**

1. Invoice (Domain-Objekt) → `InvoiceToZugferdMapper` (Infrastructure/ACL)
2. Mapper erzeugt EN16931-konformes ZUGFeRD-XML
3. XML wird in PDF/A-3 eingebettet (via PDF-Library)
4. Ergebnis steht zum Versand/Download bereit

**Pflichtfelder E-Rechnung:**
- Leitweg-ID (XRechnung, für öffentliche Auftraggeber)
- Umsatzsteuer-ID des Rechnungsstellers und -empfängers
- Bankverbindung des Rechnungsstellers
- Einzelpositionen mit Artikelnummer, Menge, Einzelpreis, Steuersatz
- Alle aus den Beleg-Daten ableitbar (Denormalisierung, ADR-50000 §5)

**Regeln:**
- E-Rechnungs-Erzeugung erfolgt im Infrastructure Layer (ACL).
- Domain bleibt frei von XML/PDF-Logik.
- Format-Mapping (intern → ZUGFeRD/XRechnung) wird als eigener Service implementiert.
- Validierung gegen EN16931-Schema vor dem Versand (CI-testbar).

## Begründung
- **SEPA** ist der einzige europäische Zahlungsstandard – keine Alternative für EUR-Zahlungen.
- **CAMT** ist der ISO-Standard für elektronische Kontoauszüge und wird von allen deutschen Banken unterstützt.
- **DATEV-Export** ist De-facto-Pflicht für die Zusammenarbeit mit Steuerberatern in DACH.
- **E-Rechnung** (ZUGFeRD/XRechnung) ist ab 2025 gesetzliche Pflicht für B2B in Deutschland.
- **OP-Verwaltung + Mahnwesen** sind Kernfunktionen jedes ERP-Rechnungswesens.
- **Anti-Corruption Layer** isoliert externe Formate von der Domain – Format-Änderungen betreffen nur Infrastructure.
- **Manueller Bank-Upload** (kein EBICS) reduziert Komplexität in Phase 1; EBICS kann später ergänzt werden.

## Alternativen
1) **EBICS/HBCI für direkte Bankanbindung**
   - Vorteile: automatisierter Zahlungsverkehr, kein manueller Upload
   - Nachteile: deutlich höhere Komplexität, Bank-Zertifikate, regulatorische Anforderungen → Phase 2+

2) **Externer DATEV-Connector (z.B. DATEV Unternehmen Online API)**
   - Vorteile: Real-time Sync, weniger manueller Export
   - Nachteile: API-Abhängigkeit, Lizenzkosten, nicht alle Mandanten nutzen DATEV

3) **Nur XRechnung (kein ZUGFeRD)**
   - Vorteile: weniger Komplexität (kein PDF/A-3 Embedding)
   - Nachteile: ZUGFeRD ist im privaten B2B-Bereich verbreiteter, PDF mit eingebetteten Daten ist benutzerfreundlicher

## Konsequenzen

### Positiv
- Vollständige Abdeckung der deutschen Finanz-Schnittstellen (SEPA, CAMT, DATEV, E-Rechnung)
- Automatische OP-Verwaltung und Mahnwesen reduzieren manuellen Aufwand
- Anti-Corruption Layer hält die Domain sauber – externe Formate als reines Infrastruktur-Thema
- CAMT-Auto-Matching beschleunigt die Bankabstimmung erheblich
- E-Rechnung per Default – gesetzeskonform ab Tag 1

### Negativ / Trade-offs
- Hoher initialer Implementierungsaufwand (5 externe Formate: pain.001, pain.008, CAMT.053, DATEV CSV, ZUGFeRD/XRechnung)
- Format-Spezifikationen sind komplex und ändern sich (SEPA-Versionen, DATEV-Format-Updates, EN16931-Revisionen)
- Kein automatischer Zahlungsverkehr in Phase 1 (manueller Download/Upload)
- DATEV-Steuerschlüssel-Mapping muss manuell gepflegt werden
- Mahnwesen erfordert Template-Engine für Mahnschreiben (PDF-Generierung)

### Umsetzungshinweise

**A) Projekt-Struktur (ADR-01600):**
- Zahlungsverkehr und externe Schnittstellen gehören zum **Finance BC**
- ACL-Mapper liegen in `Finance.Infrastructure/ExternalFormats/`:
  - `Sepa/` – pain.001, pain.008 XML-Generierung
  - `Camt/` – CAMT.053 Parser
  - `Datev/` – DATEV CSV-Writer
  - `EInvoice/` – ZUGFeRD/XRechnung XML-Generierung und -Parsing

**B) NuGet-Pakete (Empfehlung):**
- SEPA: `Hbci.Net` oder eigene XML-Generierung (Schema ist stabil)
- CAMT: eigener Parser (XDocument), Schema ist ISO 20022
- DATEV: kein Standard-Paket, eigener CSV-Writer
- ZUGFeRD: `ZUGFeRD-csharp` oder `Mustangproject` (.NET Port)
- XRechnung: `UblSharp` (UBL 2.1) oder eigene CII-Generierung

**C) Permissions:**
- `Finance.Sepa.Create` – SEPA-Datei erzeugen
- `Finance.Sepa.Approve` – SEPA-Zahlungslauf freigeben
- `Finance.Camt.Import` – Kontoauszug importieren
- `Finance.Datev.Export` – DATEV-Export durchführen
- `Finance.Dunning.Run` – Mahnlauf starten
- `Finance.Dunning.Block` – OP/Kunde von Mahnung sperren

**D) Scheduled Jobs (ADR-05500):**
- `CamtImportJob` – periodischer Import neuer Kontoauszüge (falls Verzeichnis/API konfiguriert)
- `DunningRunJob` – täglicher/wöchentlicher Mahnlauf (konfigurierbar pro Company)
- `PaymentReminderJob` – Erinnerung an fällige Zahlungsaufträge

**E) Integration Events (ADR-08100):**
- `InvoiceFinalized` → Finance erzeugt automatisch JournalEntry + OpenItem
- `PaymentMatched` → Finance bucht Zahlungseingang und aktualisiert OP
- `DunningRunCompleted` → Notification Service erzeugt Mahnschreiben

## Verweise
- ADR-50000 – Finanz-/Rechnungswesen (Buchungslogik, GoBD, Periodenabschlüsse)
- ADR-01600 – Bounded-Context-Katalog (Finance BC)
- ADR-01700 – ID-Strategie (Belegnummernkreise)
- ADR-06300 – Multi-Company (Company-spezifische Bankverbindungen)
- ADR-07100 – External Integrations & ACL
- ADR-08100 – Outbox Pattern & Integration Events
- ADR-05500 – Background Jobs
- Fragebogen §16.5 (Zahlungsverkehr), §16.6 (Schnittstellen)
