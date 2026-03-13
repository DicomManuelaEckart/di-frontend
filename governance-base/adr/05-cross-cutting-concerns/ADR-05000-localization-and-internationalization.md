---
id: ADR-05000
title: Localization / Internationalization (i18n)
status: accepted
date: 2026-01-21
scope: global
enforced_by: archtests
affects:
  - backend
  - frontend
  - admin
---

# ADR-05000 – Localization / Internationalization (i18n)

## Entscheidungstreiber
- Mehrsprachigkeit für API, UI und Notifications
- Klare Trennung zwischen fachlicher Bedeutung und sprachlicher Darstellung
- Vermeidung von Hardcoded-Texten
- Konsistenz mit Domain Errors, Permissions und Validation
- Agenten- und CI-fähige Durchsetzung

## Kontext
Das System soll mehrsprachig betrieben werden.
Dabei gelten folgende Grundsätze:
- Die **Domain** modelliert fachliche Bedeutung (Codes), keine Texte.
- Die **Application** kennt Codes/Keys, aber keine sprachspezifischen Inhalte.
- Die **Presentation** ist für die sprachliche Auflösung verantwortlich.

Localization betrifft:
- API-Fehlermeldungen
- Validierungsfehler
- UI-Texte (Frontend)
- E-Mails / Notifications

## Entscheidung

### 1) Scope der Lokalisierung
Localization umfasst:

- Fehlermeldungen (Domain Errors, Validation)
- UI-Texte
- E-Mails / Notifications

Business-Logik und Domain-Modelle enthalten **keine** lokalisierbaren Texte.

---

### 2) Ort der Lokalisierung
Localization erfolgt in:

- **Presentation**
- **Application** (technische Vorbereitung, Key-Weitergabe)

**Domain** enthält:
- ausschließlich **Codes / Keys**
- keine Texte
- keine Abhängigkeiten zu Localization-Frameworks

---

### 3) Culture Resolution
Die Sprache pro Request wird wie folgt bestimmt:

1. `Accept-Language` Header
2. User-Profil (z. B. Claim oder Persistenz)
3. Fallback auf Default-Sprache

**Default-Sprache:** `de-DE`

**Unterstützte Sprachen (initial):**
- `de-DE`
- `en-US`

---

### 4) Resource-Format
Resources werden als **JSON** gepflegt.

- Einheitliches Format für Backend und Frontend
- Keine `.resx` Dateien
- Ermöglicht einfache Nutzung in verschiedenen Technologien

---

### 5) Ablage der Resources
Resources sind **feature-/modulbezogen** organisiert.

Beispiel:
└── Customers/
  ├── errors.de-DE.json
  ├── errors.en-US.json
  ├── validation.de-DE.json
  └── validation.en-US.json


Keine monolithischen, globalen Resource-Dateien.

---

### 6) Key-Strategie
Keys folgen dem Schema:

Regeln:
- stabil
- sprechend
- nicht sprachabhängig
- eindeutig

---

### 7) Source of Truth
**Domain Error Codes** (ADR-01500) sind die **Source of Truth**.

- Domain liefert Error Codes
- Application/Presentation mappt Error Codes → Resource Keys
- Keine neuen User-facing Texte ohne Code/Key

---

### 8) API-Verhalten
Die API liefert:

- **Error Code**
- **Resource Key**
- **lokalisierte Message** (optional, abhängig vom Client)

Das API-Fehlerformat basiert auf **ProblemDetails**.

Frontend darf:
- die gelieferte Message verwenden **oder**
- selbst anhand des Keys lokalisieren

---

### 9) Zahlen-, Datums- und Währungsformate
Die API liefert:

- **kultur-neutrale Werte** (ISO-Formate, numerisch)
- keine sprach-/kulturspezifische Formatierung

Formatierung erfolgt ausschließlich:
- im Frontend
- oder in E-Mails/Reports

---

### 10) Governance & Regeln
Verbindliche Regeln:

1) Domain enthält **keine Localization-Abhängigkeiten**
2) Keine hardcodierten User-facing Texte in Domain oder Application
3) Alle User-facing Texte müssen über Resource Keys erfolgen
4) Für jeden verwendeten Key muss eine Resource existieren

---

### 11) Health Checks
Es existiert ein **Localization Health Check**:

- prüft auf fehlende Resource Keys
- prüft alle unterstützten Sprachen
- schlägt fehl, wenn Keys fehlen

---

### 12) Tests
Tests stellen sicher:

- Domain Errors werden korrekt auf Resource Keys gemappt
- Für jeden Key existiert eine Resource pro unterstützter Sprache
- Keine hardcodierten User-facing Texte in Domain/Application

Tests sind Teil der CI-Gates.

---

### 13) Mehrsprachige Stammdaten via JSON-Spalten (Fragebogen §8.3)

Fachliche Stammdaten (z.B. Artikelname, Artikelbeschreibung, Kategorienamen) können **mehrsprachig** gespeichert werden. Die Speicherung erfolgt als **JSON-Objekt** in einer dedizierten Spalte – nicht über separate Übersetzungstabellen.

**Schema-Konvention:**

| Aspekt | Entscheidung |
|--------|-------------|
| **Spaltentyp** | `NVARCHAR(MAX)` mit JSON-Inhalt |
| **Spaltenname** | Name des Feldes + `Translations`-Suffix (z.B. `NameTranslations`) |
| **JSON-Format** | `{"de": "Schraubendreher", "en": "Screwdriver", "fr": "Tournevis"}` |
| **Key** | ISO 639-1 Sprachcode (2-stellig: `de`, `en`, `fr`) |
| **Fallback** | Wenn gewünschte Sprache nicht vorhanden → `de` (Default-Sprache, §3) → erster vorhandener Eintrag |
| **Verworfene Alternative** | Separate `ArticleTranslation`-Tabellen (zu viele JOINs, Schema-Wachstum) |

**Beispiel:**

```sql
-- Article-Tabelle
ALTER TABLE Article ADD NameTranslations NVARCHAR(MAX) NULL;
ALTER TABLE Article ADD DescriptionTranslations NVARCHAR(MAX) NULL;

-- Gespeicherter Wert:
-- NameTranslations: {"de": "Schraubendreher", "en": "Screwdriver"}
-- DescriptionTranslations: {"de": "Phillips PH2, 200mm", "en": "Phillips PH2, 200mm"}

-- Abfrage in gewünschter Sprache:
SELECT JSON_VALUE(NameTranslations, '$.en') AS Name FROM Article;
```

**Regeln:**
- Nicht alle Stammdaten sind mehrsprachig – nur Felder, die für Endbenutzer sichtbar sind (z.B. `Name`, `Description`). Technische Felder (Codes, Nummern) bleiben einsprachig.
- Die **primäre Sprache** (Default) ist immer `de` – sie ist Pflicht, weitere Sprachen sind optional.
- Das **EF Core Mapping** nutzt einen Value Converter, der `Dictionary<string, string>` ↔ JSON serialisiert.
- Ein **`ILocalizedFieldResolver`**-Service löst zur Laufzeit die korrekte Sprache auf (basierend auf Request Culture, ADR-05300).
- In der **API** werden lokalisierte Felder als einfacher `string` zurückgegeben (aufgelöst nach Request-Culture). Optional: `?includeAllTranslations=true` gibt das vollständige JSON-Objekt zurück.
- In **Reports und E-Mails** wird die Sprache des Empfängers/der Company verwendet.
- **Suche**: Volltextsuche läuft über alle Sprachvarianten (`OPENJSON` + `CROSS APPLY`).

**Entities mit mehrsprachigen Feldern (initial):**

| Entity | Mehrsprachige Felder |
|--------|---------------------|
| Article | `NameTranslations`, `DescriptionTranslations` |
| ArticleCategory | `NameTranslations` |
| Unit | `NameTranslations` |
| PaymentTerms | `DescriptionTranslations` |
| TaxRate | `DescriptionTranslations` |
| Warehouse | `NameTranslations` |

---

### 14) User-Locale-Preferences (Fragebogen §8.4)

Jeder Benutzer kann individuelle Locale-Einstellungen konfigurieren, die die Darstellung von Daten im Frontend und in generierten Dokumenten (E-Mails, Reports) steuern.

**UserLocalePreference (Entity, persistiert in Tenant-DB):**

| Eigenschaft | Typ | Beschreibung | Default |
|-------------|-----|-------------|---------|
| `UserId` | Guid | Benutzer-Referenz | – |
| `Language` | string | Bevorzugte Sprache (`de`, `en`, `fr`) | `de` |
| `DateFormat` | string | Datumsformat (`dd.MM.yyyy`, `MM/dd/yyyy`, `yyyy-MM-dd`) | `dd.MM.yyyy` |
| `NumberFormat` | string | Zahlenformat: Dezimaltrenner + Tausendertrenner (`de-DE`, `en-US`) | `de-DE` |
| `TimeZone` | string | IANA Timezone ID (`Europe/Berlin`, `Europe/Zurich`, `America/New_York`) | `Europe/Berlin` |
| `FirstDayOfWeek` | DayOfWeek | Erster Tag der Woche (`Monday`, `Sunday`) | `Monday` |

**Culture-Resolution-Kette (aktualisiert, ergänzt §3):**

| Priorität | Quelle | Beschreibung |
|-----------|--------|-------------|
| 1 (höchste) | `Accept-Language` Header | Explizite Anfrage des Clients |
| 2 | `UserLocalePreference.Language` | Persistierte User-Einstellung |
| 3 | Company-Default-Sprache | Konfiguriert pro Company (ADR-06300) |
| 4 (niedrigste) | System-Default | `de-DE` |

**Regeln:**
- User-Locale-Preferences werden im **Request Context** (ADR-05300) aufgelöst und sind über `ICurrentCultureContext` verfügbar.
- Die Preferences werden bei der **ersten Anmeldung** mit Defaults vorbelegt und sind durch den Benutzer im Profil änderbar.
- **Datumsformate** und **Zahlenformate** werden nur im **Frontend** und in **generierten Dokumenten** (E-Mails, PDFs, Excel-Reports) angewendet. Die API liefert weiterhin kultur-neutrale Werte (§9).
- **Timezone-Konvertierung**: Die API speichert und liefert UTC (§9). Das Frontend konvertiert UTC → lokale Zeit basierend auf `UserLocalePreference.TimeZone`.
- Preferences werden im **L1-Cache** (In-Memory, ADR-08400) gehalten (TTL: Session-Dauer, Invalidierung bei Änderung).

---

## Begründung
- Trennung von Bedeutung (Code) und Darstellung (Text) erhöht Wartbarkeit
- JSON-Resources vereinheitlichen Backend und Frontend
- Feature-basierte Ablage verhindert unübersichtliche Resource-Sammlungen
- ProblemDetails bietet standardisiertes API-Fehlerformat
- Health Checks und Tests verhindern schleichende Lokalisierungsfehler
- JSON-Spalten für mehrsprachige Stammdaten sind performanter und einfacher als separate Übersetzungstabellen
- User-Locale-Preferences ermöglichen individualisierte Darstellung ohne Backend-Änderungen

## Konsequenzen

### Positiv
- Konsistente Mehrsprachigkeit
- Klare Verantwortlichkeiten je Layer
- Gute Basis für Agenten, Generatoren und UI-Matrix
- Frühzeitiges Erkennen fehlender Übersetzungen
- Mehrsprachige Stammdaten ohne Schema-Änderung pro Sprache
- Individuelle Formatierung pro Benutzer

### Negativ / Trade-offs
- Mehr initialer Strukturierungsaufwand
- Pflege mehrerer Resource-Dateien
- Strikte Regeln erfordern Disziplin
- JSON-Spalten: keine Fremdschlüssel auf einzelne Übersetzungen, Volltext-Suche nur über JSON-Funktionen
- User-Locale-Preferences müssen im Frontend und in E-Mail-/Report-Rendering berücksichtigt werden

## Verweise
- ADR-01500 (Domain Errors & Results)
- ADR-03100 (Autorisierung)
- ADR-05300 (Request Context – Culture-Propagation)
- ADR-06000 (Multi-Tenancy – Tenant-Isolation bei Stammdaten)
- ADR-06300 (Multi-Company – Company-Override für Stammdaten)
- ADR-08000 (Persistenz – JSON-Spalten in SQL, EF Core Mapping)
- ADR-50400 (Customizing – Custom-Field-DisplayNames lokalisierbar)
- ADR-03200 (Permission-Katalog & Claim-Schema)
- ADR-04000 (Logging)
- ADR-03400 (Security Audit)
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests / Gates)
