---
id: ADR-50600
title: Migrations- und Go-Live-Strategie – Pilot+Phased, Import, Verdichtung, Legacy-Automatisierung
status: accepted
date: 2026-02-25
scope: fullstack
enforced_by: code-review
affects:
  - backend
  - operations
---

# ADR-50600 – Migrations- und Go-Live-Strategie

## Entscheidungstreiber
- Bestandskunden aus eigenen Legacy-Systemen (gesoft, terra, bsi, dicommerce) müssen risikoarm migriert werden (Fragebogen §24)
- Neukunden von Fremdsystemen (Lexware, DATEV etc.) benötigen standardisierte Import-Wege
- Multi-Company-Architektur (ADR-06300) ermöglicht Test-Company + Prod-Company im selben Tenant
- GoBD-konforme Datenarchivierung (10 Jahre, §147 AO) bei gleichzeitiger DSGVO-Konformität
- Minimales Risiko beim Go-Live: kein Big Bang, sondern schrittweise Einführung
- Wiederholbarkeit: Test-Migration kann beliebig oft durchgeführt werden

## Kontext
Das ERP-System löst für den Großteil der initialen Mandanten **eigene Legacy-Systeme** ab (gesoft, terra, bsi, dicommerce). Da beide Seiten (Legacy + neues ERP) unter unserer Kontrolle stehen, kann die Migration für diese Systeme **weitgehend automatisiert** werden. Für Fremdsysteme werden standardisierte CSV/Excel-Import-Templates bereitgestellt.

Die Multi-Company-Architektur (ADR-06300) ist der Schlüssel zur Migrationsstrategie: Jeder Tenant erhält zuerst eine **Test-Company** zum Testen und Schulen, anschließend eine **Prod-Company** für den sauberen Produktivstart. Beide Companies leben im selben Tenant – der Benutzer wechselt per Company-Picker (ADR-06300).

Die Tenant-Datenbank wird beim Onboarding erstellt (ADR-06200), mit Schema-Migrationen (ADR-06100) und Seed-Daten (Kontenrahmen, Rollen, Steuersätze) versehen. Die Migration fachlicher Daten aus dem Altsystem erfolgt **nach** dem Onboarding als separater Prozess.

## Entscheidung

### 1) Migrationsstrategie: Pilot + Phased (Test-Company → Prod-Company)

| Aspekt | Entscheidung |
|--------|-------------|
| **Strategie** | Pilot + Phased – kein Big Bang, kein Parallel Run |
| **Mechanismus** | Test-Company → Prod-Company innerhalb desselben Tenants |
| **Test-Company** | Bleibt dauerhaft bestehen (Sandbox für Schulungen, Tests) |
| **Prod-Company** | Sauberer Start – nur Stammdaten, keine Bewegungsdaten |

**3-Phasen-Modell pro Mandant:**

**Phase 1: Test-Company (4–6 Wochen)**

| Schritt | Beschreibung |
|---------|-------------|
| 1a | Tenant-Onboarding (ADR-06200): DB erstellen, Seeds, Admin-User |
| 1b | Test-Company anlegen (ADR-06300) |
| 1c | Daten-Migration in Test-Company (Stammdaten + Bewegungsdaten 12–24 Monate) |
| 1d | Kunde testet Geschäftsprozesse, Workflows, Reports |
| 1e | Schulungen durchführen |
| 1f | Anpassungen vornehmen (Custom Fields, Validations, ADR-50400) |
| 1g | Bei Bedarf: Migration zurücksetzen und neu starten (Test-Company truncate + re-import) |

**Phase 2: Go-Live**

| Schritt | Beschreibung |
|---------|-------------|
| 2a | Prod-Company anlegen (im selben Tenant) |
| 2b | Stammdaten aus Test-Company in Prod-Company kopieren (Artikel, Kunden, Lieferanten, Kontenrahmen) |
| 2c | **Keine Bewegungsdaten** übernehmen (sauberer Start) |
| 2d | Anfangsbestände manuell buchen: Offene Posten, Lagerbestände, Bankbestände (Eröffnungsbuchungen) |
| 2e | Altsystem stilllegen (Read-only oder abschalten) |

**Phase 3: Hypercare (4 Wochen)**

| Schritt | Beschreibung |
|---------|-------------|
| 3a | Intensive Betreuung nach Go-Live |
| 3b | Test-Company bleibt als Sandbox verfügbar |
| 3c | Monitoring: Fehlerrate, Performance, Support-Tickets (ADR-04100) |
| 3d | Nach Hypercare: normaler Support-Modus |

**Regeln:**
- Die Test-Company wird **nicht** gelöscht – sie dient dauerhaft als Sandbox für Schulungen und Tests.
- Die Stammdaten-Kopie (2b) ist eine **interne Operation** innerhalb derselben Tenant-DB (Copy zwischen Companies, ADR-06300).
- Eröffnungsbuchungen (2d) werden als reguläre Buchungen im System erfasst (ADR-50000) – keine Sondermechanismen.
- Der Mandant kann jederzeit zwischen Test-Company und Prod-Company wechseln (Company-Picker im UI).
- Die Dauer der Phasen ist pro Mandant individuell – 4–6 Wochen Test sind eine Empfehlung, keine Pflicht.

### 2) Datenimport – Standardisierte Schnittstellen

| Aspekt | Entscheidung |
|--------|-------------|
| **Formate** | CSV und Excel (XLSX) als Import-Formate |
| **Templates** | Standardisierte Import-Templates pro Entity-Typ |
| **Validierung** | Mehrstufig: Format → Schema → Business Rules |
| **Fehlerbehandlung** | Detailliertes Error-Reporting pro Zeile, kein Abbruch bei Einzelfehlern |

**Import-Templates (Standardisierte Entity-Importe):**

| Entity-Typ | Template-Datei | Pflichtfelder | Optionale Felder |
|-----------|---------------|-------------|----------------|
| Artikel | `import_articles.xlsx` | ArticleNumber, Name, Unit | Description, Category, TaxRate, CustomFields |
| Kunden | `import_customers.xlsx` | CustomerNumber, Name, Street, City, Country | VatId, PaymentTerms, CreditLimit |
| Lieferanten | `import_suppliers.xlsx` | SupplierNumber, Name, Street, City, Country | VatId, PaymentTerms, LeadTime |
| Kontenrahmen | `import_chart_of_accounts.xlsx` | AccountNumber, Name, AccountType | TaxCode, CostCenter |
| Offene Posten (Debitoren) | `import_open_items_ar.xlsx` | InvoiceNumber, CustomerNumber, Amount, DueDate | Currency, Reference |
| Offene Posten (Kreditoren) | `import_open_items_ap.xlsx` | InvoiceNumber, SupplierNumber, Amount, DueDate | Currency, Reference |
| Lagerbestände | `import_inventory.xlsx` | ArticleNumber, WarehouseCode, Quantity | BatchNumber, Location |

**Import-Pipeline:**

```
Upload (CSV/XLSX)
  → Format-Validierung (Encoding, Spalten, Datentypen)
  → Schema-Validierung (Pflichtfelder, Referenzen)
  → Business-Validierung (Duplikate, Konsistenz, Custom Validations ADR-50400)
  → Preview (Zusammenfassung: X Records valide, Y Fehler, Z Warnungen)
  → Bestätigung durch User
  → Import-Ausführung (Batch, innerhalb Transaction)
  → Import-Report (Erfolgreich, Fehler, Übersprungen)
```

**Regeln:**
- Jedes Import-Template enthält eine **Beispielzeile** und eine **Anleitung** (zweites Sheet im Excel).
- Import-Dateien werden im Blob Storage abgelegt (ADR-08500, Pfad: `imports/csv/` bzw. `imports/migration/`).
- Custom Fields (ADR-50400) können über eine `CustomFields`-Spalte im CSV/Excel importiert werden (JSON-String).
- Der Import ist **idempotent** – bei erneutem Import mit gleicher Datei werden nur neue/geänderte Datensätze verarbeitet (Matching über fachliche ID, ADR-01700).
- Max. **100.000 Zeilen** pro Import-Datei (Performance-Schutz); für größere Mengen: Datei splitten.
- Import-Ausführung erfolgt als **Background Job** (ADR-05500) bei > 1.000 Zeilen.
- Import-Ergebnisse werden im Audit-Log protokolliert (ADR-05800).

### 3) Automatisierte Migration für eigene Legacy-Systeme

| Aspekt | Entscheidung |
|--------|-------------|
| **Ziel-Systeme** | gesoft, terra, bsi, dicommerce (eigene Legacy-Systeme) |
| **Automatisierungsgrad** | Weitgehend automatisiert (Ein-Klick-Migration) |
| **Architektur** | DDD-basiertes Mapping über Anti-Corruption Layer (ADR-07100) |
| **Zugriff** | Read-only auf Legacy-Datenbank oder Export-API |

**Migrations-Service-Architektur:**

```
Legacy-System (gesoft/terra/bsi/dicommerce)
  ↓ Read-only DB-Zugriff oder Export-API
Anti-Corruption Layer (Mapping Legacy → Neues Domain-Modell)
  ↓ Domain-Modell-Instanzen
Import-Service (wiederverwendet Standard-Import-Pipeline)
  ↓ Validierung + Persistierung
Test-Company (Ziel)
```

**Ablauf der automatisierten Migration:**

| Schritt | Beschreibung | Automatisiert |
|---------|-------------|:------------:|
| 1 | Admin wählt Legacy-System-Typ (gesoft/terra/bsi/dicommerce) im Admin-Portal | ✅ |
| 2 | Systemverbindung herstellen (Connection String oder API-Endpoint) | Config |
| 3 | Mandant automatisch erkennen (Mandantennummer, Stammdaten) | ✅ |
| 4 | DDD-basiertes Mapping: Legacy-Entities → Neue Domain-Entities | ✅ |
| 5 | Validierung und Delta-Report: „Was wird migriert? Was fehlt?" | ✅ |
| 6 | Preview-Anzeige für den Kunden | ✅ |
| 7 | Bestätigung → Migration ausführen → Test-Company | ✅ |
| 8 | Kunde prüft Test-Company → bei Bedarf: Reset + erneut migrieren | ✅ |

**Anti-Corruption Layer pro Legacy-System:**

| Legacy-System | Mapper-Klasse | Besonderheiten |
|-------------|-------------|---------------|
| gesoft | `GesoftMigrationMapper` | Mandantennummer-basierte Zuordnung |
| terra | `TerraMigrationMapper` | Artikelgruppen-Mapping |
| bsi | `BsiMigrationMapper` | Kundenhierarchien |
| dicommerce | `DicommerceMigrationMapper` | E-Commerce-Artikeldaten |

**Migrierte Datentypen:**

| Datentyp | Migration | Bemerkung |
|----------|:---------:|----------|
| Stammdaten (Artikel, Kunden, Lieferanten) | ✅ | Immer |
| Kontenrahmen / Kontenpläne | ✅ | Mapping auf SKR03/SKR04 |
| Bewegungsdaten (letzte 12–24 Monate) | ✅ | Optional, nur für Test-Company |
| Offene Posten | ✅ | Für Eröffnungsbilanz |
| Lagerbestände | ✅ | Aktuelle Bestände |
| Belege (Rechnungen, Aufträge) | ⚠️ | Nur als Read-only-Archiv (kein Re-Import) |
| Dokumente / Anhänge | ⚠️ | Optional, Blob-Migration (ADR-08500) |

**Regeln:**
- Jedes Legacy-System hat einen eigenen **Migrations-Mapper** (Anti-Corruption Layer), der die Unterschiede in der Datenstruktur ausgleicht.
- Die Migration nutzt intern die **Standard-Import-Pipeline** (§2) – der ACL produziert dasselbe Format wie die CSV/Excel-Importe.
- Die Migration ist **wiederholbar** – bei Problemen kann die Test-Company zurückgesetzt (Truncate) und die Migration erneut ausgeführt werden.
- Der Migrations-Service hat **nur Read-only-Zugriff** auf das Legacy-System.
- Entwicklungsaufwand pro Legacy-System: initial ~2–3 Wochen (Mapping + Tests), danach minimale Wartung.
- Die Migration wird als **Background Job** (ADR-05500) ausgeführt und der Fortschritt in Echtzeit angezeigt.

### 4) Historische Daten und Verdichtungsstrategie

| Aspekt | Entscheidung |
|--------|-------------|
| **Migrierte Historie** | 1–2 Jahre Bewegungsdaten (empfohlen) |
| **Langzeitarchivierung** | Verdichtungsstrategie mit 3 Stufen |
| **Compliance** | GoBD (10 Jahre, §147 AO) + DSGVO (Löschpflicht) |

**3-Stufen-Verdichtungsmodell:**

| Stufe | Zeitraum | Speicherort | Detailgrad | Zugriff |
|-------|---------|------------|-----------|---------|
| **Stufe 1: Aktiv** | 0–2 Jahre | Tenant-DB (SQL) | Volle Detaildaten (alle Positionen, alle Felder) | Online (Standard-API) |
| **Stufe 2: Archiv** | 3–10 Jahre | Azure Blob Storage Cool Tier (ADR-08500) | Verdichtet: Belegköpfe + PDF, Detail-Positionen entfernt, Buchungssätze für JA bleiben | On-Demand (Archiv-API, Sekunden bis Minuten) |
| **Stufe 3: Löschung** | > 10 Jahre | – | Automatische Löschung | – |

**Verdichtungsregeln für Stufe 2 (Archiv):**

| Datentyp | Archiv-Behandlung |
|----------|------------------|
| Belegköpfe (Rechnungen, Aufträge, Lieferscheine) | Behalten (als JSON + PDF) |
| Beleg-Positionen (Einzelzeilen) | Entfernen (nur Summen behalten) |
| Buchungssätze (Soll/Haben) | Behalten (für Jahresabschluss und Betriebsprüfung) |
| Personenbezogene Daten (Namen, Adressen, E-Mails) | Anonymisieren (DSGVO, ADR-06200 §5) |
| Bankverbindungen | Entfernen |
| Beleg-PDFs (generierte Dokumente) | Behalten (GoBD-Pflicht) |
| Anhänge / Scan-Dokumente | Behalten (soweit steuerrelevant) |

**Verdichtungsprozess:**

```
Scheduled Background Job (monatlich, ADR-05500)
  → Identifiziere Daten älter als 2 Jahre
  → Exportiere als JSON + zugehörige PDFs
  → Anonymisiere personenbezogene Daten
  → Uploade in Blob Storage Cool Tier (ADR-08500, Pfad: archive/financial/)
  → Lösche Detail-Positionen aus SQL-DB
  → Aktualisiere Beleg-Status: IsArchived = true
  → Audit-Log-Eintrag (ADR-05800)
```

**Automatische Löschung (Stufe 3):**

```
Scheduled Background Job (monatlich)
  → Identifiziere Archiv-Daten älter als 10 Jahre
  → Lösche Blobs aus Archive Tier
  → Lösche verbleibende DB-Referenzen
  → Audit-Log-Eintrag
```

**GoBD/DSGVO-Konflikt-Auflösung:**
- GoBD verlangt 10 Jahre Aufbewahrung steuerrelevanter Unterlagen (§147 AO, §257 HGB).
- DSGVO verlangt Löschung personenbezogener Daten nach Wegfall des Verarbeitungszwecks.
- **Lösung:** Anonymisierung bei Archivierung (Stufe 2) – personenbezogene Felder werden durch Platzhalter ersetzt, steuerlich relevante Beträge und Buchungssätze bleiben erhalten. Identisch mit der Strategie bei Tenant-Löschung (ADR-06200 §5).

### 5) Stammdaten-Kopie (Test-Company → Prod-Company)

| Aspekt | Entscheidung |
|--------|-------------|
| **Mechanismus** | Interne DB-Operation (SQL INSERT ... SELECT zwischen Companies) |
| **Scope** | Nur Stammdaten – keine Bewegungsdaten, keine Audit-Daten |
| **Trigger** | Admin-Aktion im Admin-UI |
| **Idempotenz** | Ja – bei erneuter Ausführung werden nur fehlende Stammdaten nachkopiert |

**Kopierte Stammdaten:**

| Entity | Kopiert | Bemerkung |
|--------|:-------:|----------|
| Artikel (Article) | ✅ | Inkl. Custom Fields |
| Kunden (Customer) | ✅ | Inkl. Adressen, Zahlungsbedingungen |
| Lieferanten (Supplier) | ✅ | Inkl. Adressen, Zahlungsbedingungen |
| Kontenrahmen (ChartOfAccounts) | ✅ | Inkl. Steuer-Zuordnungen |
| Steuersätze (TaxRate) | ✅ | |
| Zahlungsbedingungen (PaymentTerms) | ✅ | |
| Lagerorte (Warehouse, Location) | ✅ | |
| Custom-Field-Definitionen | ✅ | Bereits Tenant-weit definiert (ADR-50400) |
| Benutzer / Rollen | – | Bereits Tenant-weit definiert |
| Buchungen / Belege | ❌ | Sauberer Start |
| Offene Posten | ❌ | Eröffnungsbuchungen manuell |
| Lagerbestände | ❌ | Inventur-Buchung manuell |

**Regeln:**
- Die Stammdaten-Kopie erzeugt **neue GUIDs** für die Prod-Company-Entities (ADR-01700).
- Fachliche IDs (z.B. Artikelnummer, Kundennummer) bleiben identisch – sie sind innerhalb desselben Tenants eindeutig pro Company.
- Die Kopie wird als **Background Job** (ADR-05500) ausgeführt und protokolliert.
- Custom Fields und Custom Validations gelten automatisch (Tenant-weite Definition, ADR-50400).
- Nach der Kopie muss der Mandant **Eröffnungsbuchungen** erfassen:
  - Offene Posten (Debitoren + Kreditoren)
  - Lagerbestände (Inventurbuchung)
  - Bankbestände (Anfangssaldo)
  - Ggf. Anlagevermögen

### 6) Import-Verwaltung (Admin-UI)

| Aspekt | Entscheidung |
|--------|-------------|
| **Zugriff** | Admin-Bereich + dedizierter Migrations-Bereich |
| **Permission** | `Migration.Admin`, `Import.Execute` (ADR-03200) |

**API-Endpunkte:**

| Endpunkt | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/v1/imports/templates` | GET | Verfügbare Import-Templates herunterladen |
| `/api/v1/imports/upload` | POST | Import-Datei hochladen (CSV/XLSX) |
| `/api/v1/imports/{id}/validate` | POST | Validierung starten |
| `/api/v1/imports/{id}/preview` | GET | Validierungsergebnis / Preview |
| `/api/v1/imports/{id}/execute` | POST | Import ausführen |
| `/api/v1/imports/{id}/status` | GET | Import-Status (laufend, abgeschlossen, Fehler) |
| `/api/v1/imports/{id}/report` | GET | Import-Report (Erfolge, Fehler, Übersprungen) |
| `/api/admin/v1/migrations/legacy` | POST | Legacy-Migration starten (System-Typ, Connection) |
| `/api/admin/v1/migrations/{id}/status` | GET | Migrations-Fortschritt |
| `/api/admin/v1/migrations/{id}/reset` | POST | Test-Company zurücksetzen für erneute Migration |
| `/api/v1/companies/{id}/copy-master-data` | POST | Stammdaten-Kopie Test → Prod |

**Permissions (ADR-03200):**

| Permission | Beschreibung |
|-----------|-------------|
| `Import.Execute` | Standard-Importe (CSV/Excel) ausführen |
| `Import.Templates` | Import-Templates herunterladen |
| `Migration.Admin` | Legacy-Migration starten und verwalten |
| `Migration.Reset` | Test-Company für erneute Migration zurücksetzen |
| `Company.CopyMasterData` | Stammdaten zwischen Companies kopieren |

## Begründung
- **Pilot + Phased** statt Big Bang: minimales Risiko, Mandant kann das System vor Go-Live testen, bei Problemen kann die Test-Company zurückgesetzt werden. Parallel Run wäre doppelter Pflegeaufwand und Verwechslungsgefahr.
- **Test-Company + Prod-Company**: Nutzt die vorhandene Multi-Company-Architektur (ADR-06300), kein separater „Test-Tenant" nötig. Test-Company bleibt als dauerhafte Sandbox erhalten.
- **Standardisierte Import-Templates**: Einheitliches Format für alle Mandanten, reduziert Support-Aufwand. CSV/Excel sind universell verfügbar, kein grafisches Mapping-Tool nötig (zu hoher Entwicklungsaufwand für v1).
- **Automatisierte Legacy-Migration**: Da wir beide Systeme kennen, ist die Automatisierung der Migration eine enorme Zeitersparnis (Stunden statt Wochen). Anti-Corruption Layer kapselt die Legacy-Spezifika sauber ab.
- **3-Stufen-Verdichtung**: Balanciert Performance (schlanke Produktiv-DB), Compliance (GoBD 10 Jahre) und Datenschutz (DSGVO-Anonymisierung). Automatisiert via Background Jobs.
- **Keine Bewegungsdaten in Prod-Company**: Sauberer Produktivstart, keine Test-Altlasten, klare Buchungsperioden ab Go-Live.

## Alternativen

1) **Big Bang Migration**
   - Vorteile: Schneller Umstieg, kein Parallel-Betrieb
   - Nachteile: Hohes Risiko, kein Rückweg, keine Testphase, Mandant kennt das System nicht

2) **Parallel Run (beide Systeme gleichzeitig)**
   - Vorteile: Maximale Sicherheit, jederzeit Rückfall möglich
   - Nachteile: Doppelte Datenpflege, Verwechslungsgefahr, hoher Aufwand für Mandant, schwer zu terminieren

3) **Grafisches Mapping-Tool**
   - Vorteile: Flexible Zuordnung von Fremd-Feldern
   - Nachteile: Hoher Entwicklungsaufwand, Error-Handling komplex, Zielgruppe (ERP-Admins) kommt mit Templates besser zurecht

4) **Vollständige historische Migration**
   - Vorteile: Alle Daten im neuen System
   - Nachteile: Huge Datenmengen, Performance-Impact, fragliche Datenqualität älterer Daten, GoBD/DSGVO-Konflikte

## Konsequenzen

### Positiv
- Risikoarme Migration durch Test-Company → Prod-Company
- Automatisierte Legacy-Migration spart Wochen pro Mandant
- Standardisierte Import-Templates reduzieren Support-Aufwand
- Test-Company bleibt als dauerhafte Sandbox
- GoBD/DSGVO-konforme Archivierung mit automatischer Verdichtung und Löschung
- Wiederholbare Migration – bei Problemen: Reset und erneut

### Negativ / Trade-offs
- Eröffnungsbuchungen müssen manuell erfasst werden (Zeit + Fehleranfälligkeit)
- Legacy-Migrations-Mapper müssen pro System entwickelt und gewartet werden
- Verdichtungsprozess muss zuverlässig operativ betrieben werden
- Keine Bewegungsdaten in Prod-Company kann für manche Mandanten unbefriedigend sein
- Import auf 100.000 Zeilen limitiert – sehr große Mandanten benötigen gesplittete Dateien

### Umsetzungshinweise

#### A) Domain-Modell
- Import-Entities (`ImportJob`, `ImportResult`) leben im Bounded Context „Organization" oder einem dedizierten „Migration"-Context.
- Legacy-Mapper sind **Infrastructure-Adapter** (Clean Architecture) – sie implementieren ein `ILegacyMigrationSource`-Interface.
- Die Verdichtung ist ein **Ops-Service** (Background Job), kein Domain-Concern.

#### B) Import-Pipeline
- CSV-Parsing: `CsvHelper` (NuGet)
- Excel-Parsing: `ClosedXML` (NuGet, bereits für Reporting genutzt, ADR-50300)
- Validierung: Standard FluentValidation (ADR-05100) + Custom Validations (ADR-50400)
- Batch-Insert: `SqlBulkCopy` oder `EFCore.BulkExtensions` für Performance bei großen Imports

#### C) Legacy-Migration
- Jeder Legacy-Mapper implementiert `ILegacyMigrationSource`:
  ```csharp
  public interface ILegacyMigrationSource
  {
      string SystemType { get; } // "gesoft", "terra", "bsi", "dicommerce"
      Task<MigrationPreview> PreviewAsync(LegacyConnectionConfig config);
      Task<MigrationResult> ExecuteAsync(LegacyConnectionConfig config, Guid targetCompanyId);
  }
  ```
- Die Mapper produzieren Domain-Entities (nicht Import-DTOs) – sie verwenden die Factories und Value Objects des neuen Domain-Modells.

#### D) Verdichtungs-Job
- Monatlicher Background Job (ADR-05500), Scheduled via CRON.
- Pro Tenant isoliert (ADR-06000) – Verarbeitung in Batches von 100 Belegen.
- Archiv-Format: JSON (Beleg-Daten) + PDF (generierte Belege) in Blob Storage (ADR-08500).
- Anonymisierung: Personenbezogene Felder durch `[ANONYMISIERT]` ersetzen.

#### E) Testing
- Import-Templates: **Unit Tests** (CSV/Excel-Parsing, Validierung, Mapping).
- Legacy-Mapper: **Integration Tests** pro Legacy-System (Mapping-Korrektheit, Datenintegrität).
- Stammdaten-Kopie: **Integration Tests** (Copy zwischen Companies, Guid-Neugenerierung).
- Verdichtung: **Integration Tests** (Archivierung, Anonymisierung, Löschung nach 10 Jahren).
- End-to-End: **System Tests** (vollständiger Migrationsprozess Test-Company → Prod-Company).

## Verweise
- ADR-01700 (ID-Strategie – Guid-basiert, keine Kollisionen bei Migration)
- ADR-03200 (Permission Catalog – Migration/Import-Permissions)
- ADR-04100 (Telemetry – Monitoring während Hypercare)
- ADR-05100 (Validation Strategy – Import-Validierung)
- ADR-05500 (Background Jobs – Import-Ausführung, Verdichtung, Legacy-Migration)
- ADR-05800 (Daten-Audit – Import-Protokollierung, Archivierung)
- ADR-06000 (Multi-Tenancy – Database-per-Tenant)
- ADR-06100 (Tenant-aware Migrations & Seed Data – Schema-Setup)
- ADR-06200 (Tenant Lifecycle – Onboarding, Anonymisierung bei Löschung)
- ADR-06300 (Multi-Company – Test-Company/Prod-Company, Company-Picker)
- ADR-07100 (External Integrations & Anti-Corruption Layers – Legacy-Mapper)
- ADR-08500 (File Storage – Import-Dateien, Archiv-Blobs)
- ADR-50000 (Finanzwesen – Eröffnungsbuchungen, GoBD)
- ADR-50100 (Zahlungsverkehr – DATEV-Export/Import)
- ADR-50300 (Reporting – ClosedXML für Excel)
- ADR-50400 (Customizing – Custom Fields im Import, Custom Validations)
