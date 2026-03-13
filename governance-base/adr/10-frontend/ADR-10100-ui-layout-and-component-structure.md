---
id: ADR-10100
title: UI-Layout & Komponentenstruktur
status: proposed
date: 2026-02-16
scope: frontend
enforced_by: code-review
affects:
  - frontend
---

# ADR-10100 – UI-Layout & Komponentenstruktur

## Entscheidungstreiber
- Konsistentes visuelles Erscheinungsbild über alle Features
- Klare Verantwortlichkeiten der Layout-Komponenten
- Wiederverwendbarkeit und Wartbarkeit
- Responsives Design für verschiedene Bildschirmgrößen

## Kontext
Die Anwendung ist eine SPA (ADR-10000) für das Erstellen, Bearbeiten und Einsehen von Datensätzen.
Die UI besteht aus festen Layoutbereichen (Header, Menü, Content, Footer),
die über alle Seiten hinweg konsistent bleiben müssen.

Das Layout muss so gestaltet sein, dass:
- der Content-Bereich dynamisch wechselt (via Routing)
- Header, Footer und Menü persistent bleiben
- die Navigation intuitiv und zugänglich ist

## Entscheidung

### 1) Shell-Komponente
Die Anwendung nutzt eine **Shell-Komponente** als Layout-Container.

Die Shell definiert das Grundgerüst:
```
┌────────────────────────────────────────────┐
│                  Header                     │
├──────────┬─────────────────────────────────┤
│          │                                  │
│   Menü   │         Content-Bereich          │
│  (Side-  │         (Routing-Outlet)         │
│   nav)   │                                  │
│          │                                  │
├──────────┴─────────────────────────────────┤
│                  Footer                     │
└────────────────────────────────────────────┘
```

- Die Shell wird als eigenständige Komponente im `layout/`-Bereich gepflegt.
- Routing-Inhalte werden über das Router-Outlet in den Content-Bereich geladen.

---

### 2) Header
Der Header enthält:

- **Anwendungsname / Logo**
- **Benutzerinfo** (Name, Rolle/Tenant – aus Auth-Context)
- **Logout-Aktion**
- **Sprachauswahl** (sofern i18n aktiviert, siehe ADR-10800)

Der Header ist eine **eigenständige Komponente**.

---

### 3) Seitennavigation (Menü / Sidenav)
Das Menü enthält:

- **Navigationslinks** zu den Feature-Bereichen
- **Visuelles Feedback** für den aktiven Menüpunkt
- **Collapsible / Toggle-Funktion** für mobile Ansichten

Regeln:
- Menüeinträge werden **konfigurationsgesteuert** definiert (nicht hardcoded im Template)
- Berechtigungsabhängige Menüeinträge werden über Permissions gefiltert (ADR-10600)
- Das Menü ist eine **eigenständige Komponente**

---

### 4) Content-Bereich
Der Content-Bereich ist der **dynamische Hauptbereich** der Anwendung.

- Inhalte werden über den **Router** geladen
- Jedes Feature stellt eigene Seiten-Komponenten bereit (List, Detail, Create, Edit)
- Der Content-Bereich scrollt unabhängig von Header/Footer

---

### 5) Footer
Der Footer enthält:

- **Versionsnummer** der Anwendung
- **Copyright / Rechtliches** (optional)
- **Links** (z. B. Impressum, Datenschutz – falls zutreffend)

Der Footer ist eine **eigenständige Komponente**.

---

### 6) Komponentenhierarchie

```
App
└── Shell
    ├── Header
    ├── Sidenav
    ├── Router-Outlet   ← Feature-Seiten
    └── Footer
```

---

### 7) UI-Komponentenbibliothek: Infragistics Ignite UI for Angular

Die Anwendung setzt **Infragistics Ignite UI for Angular** als primäre UI-Komponentenbibliothek ein.

#### Begründung der Bibliothekswahl

| Kriterium | Bewertung |
|-----------|-----------|
| **Komponentenumfang** | Vollständiges Enterprise-Set: Data Grid, Tree Grid, Pivot Grid, Charts, Gauges, Excel Export, Scheduler, Dialoge, Inputs etc. |
| **Data Grid** | Virtualisierung (Millionen Rows), Filtering, Sorting, Grouping, Column Pinning, Multi-Row Layout, Excel-Style-Filtering |
| **Charts & Pivots** | Umfangreiche Charting-Library, Pivot-Tabellen, Financial Charts |
| **Excel Export** | Nativer Excel/CSV-Export direkt aus der Grid-Komponente |
| **Barrierefreiheit** | WCAG 2.1 AA-konform, ARIA-Attribute, Keyboard-Navigation, Screenreader |
| **Theming** | Eigenes Theming-System (Sass-Variablen, Palettes), kompatibel mit Design Tokens (§9) |
| **Angular-Integration** | Native Angular-Komponenten (keine jQuery-Wrapping), Reactive Forms Support, OnPush-kompatibel |
| **Performance** | Virtualisierung für große Datenmengen, Lazy Rendering, Density-Modi (comfortable/cosy/compact) |
| **Enterprise-Support** | Kommerzieller Support, SLA, dedizierte Ansprechpartner |
| **Langfristige Wartung** | Regelmäßige Releases synchron mit Angular Major-Versionen |

#### Verworfene Alternativen

1) **Angular Material**
   - Vorteile: Kostenlos, Google-backed, gute Basis-Komponenten
   - Nachteile: Kein vollwertiges Data Grid (CDK Table ist rudimentär), kein nativer Excel Export, keine Charts
   - Bewertung: Zu wenig für Enterprise-ERP-Anforderungen

2) **PrimeNG**
   - Vorteile: Umfangreiches Komponentenset, kostenlose Basis-Version
   - Nachteile: Inkonsistente Qualität, kommerzieller Support weniger ausgeprägt als Infragistics
   - Bewertung: Gute Alternative, aber Infragistics bietet Enterprise-Grid-Funktionen (Pivot, Virtualisierung)

3) **Custom-only**
   - Vorteile: Volle Kontrolle
   - Nachteile: Enormer Entwicklungsaufwand, keine fertigen Enterprise-Komponenten
   - Bewertung: Nicht wirtschaftlich für ein ERP-System

#### Anforderungen an die Bibliothek:
- **Vollständiges Komponentenset**: Buttons, Inputs, Selects, Tabellen, Dialoge, Datepicker, Autocomplete, Tabs, Tooltips, etc.
- **Barrierefreiheit (a11y)**: ARIA-Attribute, Keyboard-Navigation, Screenreader-Unterstützung
- **Theming-Unterstützung**: Anpassung an das Projekt-Design über Theming-Mechanismen (siehe Abschnitt 9)
- **Aktive Wartung**: Regelmäßige Updates, aktive Community, langfristiger Support
- **Dokumentation**: Umfassende API-Dokumentation und Beispiele

#### Nutzungsregeln:
- Die Komponentenbibliothek ist die **erste Wahl** für alle UI-Elemente – eigene Implementierungen nur, wenn die Bibliothek keine passende Komponente bietet
- **Wrapper-Komponenten** werden für projektspezifische Anpassungen erstellt (z. B. Tabellen mit Standard-Pagination, Formulare mit einheitlichem Fehler-Layout)
- Direkte Nutzung der Bibliothek in Feature-Komponenten ist erlaubt, sofern kein projektspezifischer Wrapper existiert
- Keine Mischung mehrerer Komponentenbibliotheken – eine Bibliothek als einheitliche Basis

---

### 8) Responsive Design
Die Anwendung unterstützt verschiedene Bildschirmgrößen:

- **Desktop**: Sidenav dauerhaft sichtbar
- **Tablet / Mobile**: Sidenav als Overlay (toggle via Hamburger-Icon im Header)
- Breakpoints werden über CSS Media Queries oder ein Utility gesteuert
- Content-Bereich nutzt CSS Grid oder Flexbox für flexible Layouts

---

### 9) Theming & CSS-Strategie
Das visuelle Erscheinungsbild wird über ein **zentrales Theming** gesteuert:

#### a) Design Tokens / CSS Custom Properties
- Farben, Abstände, Schriftgrößen, Border-Radii, Schatten etc. werden als **Design Tokens** (CSS Custom Properties / Variablen) definiert
- Alle Komponenten referenzieren diese Tokens – keine hardcodierten Farbwerte oder Größen in Feature-Komponenten
- Tokens liegen in einer **zentralen Theme-Datei** (z. B. `theme.scss`, `theme.css`)

#### b) Theme-Anpassung der Komponentenbibliothek
- Die gewählte Komponentenbibliothek (Abschnitt 7) wird über deren Theming-Mechanismus an das Projektdesign angepasst
- Anpassungen erfolgen **ausschließlich über offizielle Theming-APIs** (Variablen, Mixins, Token-Overrides) – kein Überschreiben interner CSS-Klassen der Bibliothek
- Das Theme wird einmal zentral definiert und wirkt auf alle Bibliothekskomponenten

#### c) CSS-Architektur
- **Komponentenscoped CSS**: Styles sind per Default auf die jeweilige Komponente beschränkt (kein globales CSS-Leaking)
- **Globale Styles**: nur für Theme-Variablen, Resets, Typografie-Grundlagen und Layout-Grundgerüst
- **Keine Inline-Styles** in Templates (Ausnahme: dynamisch berechnete Werte wie Breite/Höhe)
- **Utility-Klassen** der Komponentenbibliothek dürfen genutzt werden, eigene Utility-Klassen nur bei Bedarf

#### d) Dark Mode (optional, vorbereitet)
- Die Token-basierte Architektur ermöglicht die spätere Einführung eines Dark Mode
- Umschaltung erfolgt über Austausch der Token-Werte (CSS-Klasse am Root-Element)
- Nicht Teil des initialen Scopes, aber durch die Architektur vorbereitet

## Begründung
- Shell-Komponente als Layout-Container ist ein bewährtes SPA-Pattern.
- Trennung von Layout- und Feature-Komponenten ermöglicht unabhängige Entwicklung.
- Konfigurationsgesteuerte Navigation ermöglicht berechtigungsbasiertes Filtern ohne Template-Logik.
- Eine umfassende Komponentenbibliothek beschleunigt die Entwicklung und sichert Barrierefreiheit.
- Zentrales Theming über Design Tokens garantiert visuelles Konsistenz und erleichtert spätere Anpassungen.
- Responsive Design ist für professionelle Anwendungen Standard.

## Alternativen
1) Kein festes Layout – jede Seite definiert eigenes Layout
   - Vorteile: Maximale Flexibilität pro Seite
   - Nachteile: Inkonsistenz, Duplikation, hoher Wartungsaufwand

2) Reines CSS Framework ohne Komponentenbibliothek
   - Vorteile: Volle Kontrolle, kleines Bundle
   - Nachteile: Kein fertiges Komponentenset, alles muss selbst gebaut werden

## Konsequenzen

### Positiv
- Konsistentes Layout über alle Features
- Klare Verantwortlichkeiten der Layout-Komponenten
- Einfache Erweiterung um neue Features (nur neuer Menüeintrag + Route)

### Negativ / Trade-offs
- Komponentenbibliothek kann ästhetisch einschränkend wirken
- Wrapper-Komponenten erzeugen initialen Mehraufwand
- Responsive Design erfordert konsistentes Testing auf verschiedenen Viewports

### Umsetzungshinweise
- Layout-Komponenten liegen unter `app/layout/`
- Shell-Komponente wird als Container in der Root-Route definiert
- Menüeinträge werden in einer Konfigurationsdatei gepflegt
- Jeder Menüeintrag enthält: `label`, `icon`, `route`, `permission` (optional)
- Header zeigt Benutzerinfo aus dem Auth-Service (ADR-10600)
- Footer-Version wird aus der Umgebungskonfiguration oder Build-Metadaten bezogen
- Keine Business-Logik in Layout-Komponenten
- Theme-Datei liegt unter `app/styles/` oder `app/theme/`
- Design Tokens werden als CSS Custom Properties definiert (z. B. `--color-primary`, `--spacing-md`, `--font-size-body`)
- Neue Farben oder Abstände werden immer als Token angelegt, nie direkt als Wert in Komponenten verwendet

## Verweise
- ADR-10000 (Frontend-Architektur)
- ADR-10400 (Routing & Navigation)
- ADR-10600 (Authentifizierung & Autorisierung im Frontend)
- ADR-10800 (Lokalisierung im Frontend)
