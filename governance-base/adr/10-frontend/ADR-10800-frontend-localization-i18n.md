---
id: ADR-10800
title: Lokalisierung & Internationalisierung im Frontend
status: proposed
date: 2026-02-16
scope: frontend
enforced_by: code-review
affects:
  - frontend
---

# ADR-10800 – Lokalisierung & Internationalisierung im Frontend

## Entscheidungstreiber
- Konsistenz mit der globalen Lokalisierungsstrategie (ADR-05000)
- Mehrsprachige Benutzeroberfläche
- Formatierung von Datums-, Zahlen- und Währungswerten
- Wartbare, modulare Übersetzungsdateien
- Gute Developer Experience (einfache Nutzung in Templates und Code)

## Kontext
Die globale Lokalisierungsstrategie (ADR-05000) definiert:
- JSON als Resource-Format
- Default-Sprache: `de-DE`
- Unterstützte Sprachen: `de-DE`, `en-US`
- Feature-/modulbezogene Resource-Dateien
- API liefert Error Codes + Resource Keys, Frontend löst diese auf

Das Frontend muss:
- UI-Texte (Labels, Buttons, Meldungen) lokalisieren
- API-Fehlermeldungen über Resource Keys auflösen
- Datum, Zahlen und Währung kulturabhängig formatieren
- Die aktive Sprache steuerbar machen (Sprachauswahl im Header)

## Entscheidung

### 1) i18n-Ansatz
Für die Lokalisierung wird eine **i18n-Bibliothek** eingesetzt, die folgende Anforderungen erfüllt:

- Runtime-Sprachwechsel ohne App-Reload
- Lazy Loading von Übersetzungsdateien
- Scope-/Modul-basierte Übersetzungen (pro Feature)
- Nutzung sowohl in Templates als auch in Code

---

### 2) Übersetzungsdateien
Übersetzungen werden als **JSON-Dateien** gepflegt:

```
src/i18n/
├── de-DE/
│   ├── common.json          # Globale Texte (Buttons, Labels, Fehler)
│   ├── customers.json       # Feature-spezifische Texte
│   └── orders.json
└── en-US/
    ├── common.json
    ├── customers.json
    └── orders.json
```

- Pro Feature eine Datei pro Sprache
- `common.json` für shared/globale Texte
- Kein monolithisches, einzelnes Übersetzungs-File

---

### 3) Key-Schema
Übersetzungskeys folgen einem einheitlichen Schema:

```
<feature>.<context>.<element>
```

Beispiele:
- `customers.list.title` → "Kunden"
- `customers.form.name.label` → "Name"
- `customers.form.name.required` → "Name ist erforderlich"
- `common.actions.save` → "Speichern"
- `common.actions.cancel` → "Abbrechen"
- `common.errors.generic` → "Ein unerwarteter Fehler ist aufgetreten"

---

### 4) Sprachwechsel
- Sprachauswahl im **Header** (ADR-10100)
- Sprachwechsel erfolgt zur Laufzeit, ohne Seitenreload
- Aktive Sprache wird im **LocalStorage** gespeichert (Persistenz über Sessions)
- Fallback-Reihenfolge: LocalStorage → Browser-Sprache → Default (`de-DE`)

---

### 5) API-Fehlermeldungen
API-Fehler liefern Resource Keys (ADR-05200):

- Das Frontend kann die **lokalisierte Message** aus der API-Response verwenden
- **Oder** den Resource Key selbst auflösen (für konsistentere Frontend-Texte)
- Die Entscheidung wird pro Fehlerart getroffen (fachliche Fehler → selbst auflösen, generische → API-Text)

---

### 6) Datums-, Zahlen- und Währungsformatierung
Die API liefert kultur-neutrale Werte (ADR-05000):

- **Datum**: Formatierung gemäß aktiver Locale (z. B. `Intl.DateTimeFormat`)
- **Zahlen**: Formatierung gemäß aktiver Locale (z. B. `Intl.NumberFormat`)
- **Währung**: Formatierung gemäß aktiver Locale
- Das Browser-native `Intl`-API oder Framework-Pipes/-Filter können genutzt werden

---

### 7) Validierungsmeldungen
Formular-Validierungsmeldungen (ADR-10500) werden lokalisiert:

- Jeder Validierungsfehler hat einen i18n-Key
- Key-Schema: `<feature>.form.<field>.<validatorName>`
- Parametrisierte Meldungen werden unterstützt (z. B. "Mindestens {min} Zeichen")

## Begründung
- JSON-Dateien sind konsistent mit der Backend-Strategie (ADR-05000).
- Feature-basierte Übersetzungsdateien skalieren gut bei wachsender Feature-Anzahl.
- Runtime-Sprachwechsel bietet eine gute User Experience.
- Das Browser-native `Intl`-API bietet standardisierte Formatierung ohne zusätzliche Abhängigkeiten.

## Alternativen
1) Ein Build pro Sprache (Compile-Time i18n)
   - Vorteile: Keine Runtime-Kosten, optimierter Output
   - Nachteile: Kein Runtime-Sprachwechsel, ein Deployment pro Sprache

2) Monolithische Übersetzungsdatei
   - Vorteile: Einfacher zu pflegen bei kleinen Projekten
   - Nachteile: Skaliert schlecht, große Dateien, kein Lazy Loading

## Konsequenzen

### Positiv
- Konsistente Mehrsprachigkeit über die gesamte UI
- Lazy Loading von Übersetzungen reduziert Bundle-Größe
- Runtime-Sprachwechsel ohne Seitenreload
- Konsistenz zwischen Frontend- und Backend-Lokalisierung

### Negativ / Trade-offs
- Übersetzungsdateien müssen für jede Sprache gepflegt werden
- Keys müssen konsistent und sprechend sein (Governance-Aufwand)
- Runtime-Lokalisierung hat minimale Performance-Kosten gegenüber Compile-Time

### Umsetzungshinweise
- Übersetzungsdateien unter `src/i18n/<locale>/`
- Sprachauswahl-Komponente im Header
- Fehlende Übersetzungen: der Key wird direkt angezeigt (auffällig in Entwicklung)
- CI-Prüfung: alle Keys in Default-Sprache müssen auch in anderen Sprachen vorhanden sein (optional)
- Keine hardcodierten Texte in Templates oder Komponenten

## Verweise
- ADR-05000 (Localization / i18n – Global Strategy)
- ADR-10000 (Frontend-Architektur)
- ADR-10100 (UI-Layout – Sprachauswahl im Header)
- ADR-10500 (Formulare & Validierung – Validierungsmeldungen)
- ADR-10700 (Fehlerbehandlung – Fehlertexte)
