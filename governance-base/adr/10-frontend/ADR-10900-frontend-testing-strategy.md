---
id: ADR-10900
title: Frontend-Testing-Strategie
status: proposed
date: 2026-02-16
scope: frontend
enforced_by: code-review
affects:
  - frontend
---

# ADR-10900 – Frontend-Testing-Strategie

## Entscheidungstreiber
- Qualitätssicherung für UI-Komponenten und Anwendungslogik
- Schnelle Feedbackzyklen in CI und lokal
- Konsistenz mit der globalen Testing Strategy (ADR-02000)
- Testbarkeit der gewählten Architektur (ADR-10000)
- Vermeidung von fragilen, schwer wartbaren Tests

## Kontext
Die Anwendung ist eine SPA (ADR-10000) mit:
- Feature-Services (State, API-Kommunikation)
- Formularen mit Validierung
- Routing und Guards
- OIDC-basierter Authentifizierung

Die Backend-Testing-Strategie (ADR-02000) definiert Unit Tests als Pflicht für Domain und Application.
Für das Frontend wird eine analoge, aber UI-spezifische Strategie benötigt.

## Entscheidung

### 1) Testing-Pyramide im Frontend
Die Frontend-Tests folgen einer angepassten Pyramide:

1. **Unit Tests** (Pflicht) – Services, Pipes/Filter, Guards, Utilities
2. **Component Tests** (Pflicht) – Isolierte Komponentenlogik
3. **Integration Tests** (optional, empfohlen) – Zusammenspiel von Komponenten
4. **E2E Tests** (optional, später) – Vollständige User Journeys

---

### 2) Unit Tests
Unit Tests sind **Pflicht** für:

- **Services** (API-Services, State-Services, Auth-Service, Error-Handling-Service)
- **Guards** (Permission Guard, Navigation Guard)
- **Pipes / Filter** (Custom Transformationen)
- **Utility-Funktionen** (Mapper, Formatter, Validators)

Nicht Unit-getestet:
- Triviale Getter/Setter
- Framework-interne Funktionalität

---

### 3) Component Tests
Component Tests sind **Pflicht** für:

- **Formular-Komponenten**: Validierungsverhalten, Ein-/Ausgabe
- **Listen-Komponenten**: Datenanzeige, Pagination-Verhalten
- **Layout-Komponenten**: Rendering, Menü-Toggle, Berechtigungs-Hiding

Component Tests prüfen:
- Template-Rendering (Elemente vorhanden/nicht vorhanden)
- User-Interaktionen (Klick, Eingabe)
- Input/Output-Verhalten
- Bedingte Anzeige (z. B. Berechtigungen)

---

### 4) Mocking-Strategie
- **Services**: über Dependency Injection gemockt
- **HTTP-Aufrufe**: über Mock-Server oder Framework-spezifische Test-Utilities
- **Auth**: über Mock-Auth-Service
- **Router**: über Test-Utilities oder Spy
- **Keine Mocks für Framework-interne Mechanismen**

---

### 5) Test-Struktur & Naming
- Testdateien liegen **neben der Source-Datei** (z. B. `*.spec.ts`, `*.test.ts`)
- Testmethoden-Name: `should <expected behavior> when <scenario>`
  - Beispiel: `should disable save button when form is invalid`
- AAA-Pattern (Arrange-Act-Assert)

---

### 6) Coverage-Ziel
- **Services, Guards, Utilities**: mindestens **80% Coverage**
- **Komponenten**: mindestens **60% Coverage** (Template-Logik ist schwerer testbar)
- Coverage wird in CI gemessen
- Unterschreitung: Build-Warning (kein harter Block in Phase 1)

---

### 7) E2E Tests (spätere Phase)
E2E Tests werden in einer späteren Phase eingeführt:

- Fokus auf kritische User Journeys (Login, CRUD-Workflow)
- Laufen in CI gegen eine Test-Umgebung
- Nicht Teil der initialen Umsetzung

## Begründung
- Unit Tests für Services sind schnell, deterministisch und bieten hohen Wert.
- Component Tests sichern UI-Verhalten ohne E2E-Overhead.
- Coverage-Ziele setzen eine Leitplanke ohne zu "Test-Gaming" zu verleiten.
- E2E Tests werden erst eingeführt, wenn stabile Integrationsbedarfe bestehen.

## Alternativen
1) Nur E2E Tests (kein Unit/Component Testing)
   - Vorteile: Testen den echten User Flow
   - Nachteile: Langsam, fragil, schwer debugbar, teuer in CI

2) Visual Regression Testing (z. B. Storybook + Chromatic)
   - Vorteile: Visuelles Testing, Komponentendokumentation
   - Nachteile: Kein Ersatz für Logik-Tests, zusätzliches Tool

## Konsequenzen

### Positiv
- Stabile, schnelle Feedbackschleife für Frontend-Code
- Services und Guards sind gut testbar durch Dependency Injection
- Konsistente Test-Standards über das Team
- Coverage-Messung gibt Orientierung

### Negativ / Trade-offs
- Initiale Testinfrastruktur muss aufgesetzt werden
- Component Tests können bei Template-Änderungen fragil sein

### Umsetzungshinweise
- Tests liegen neben den Source-Dateien
- Jeder Service und Guard hat mindestens eine Testdatei
- Formular-Komponenten testen: Validierung, Submit, Reset, Server-Fehler-Zuordnung
- Mock-Services für Auth, API und Router bereitstellen
- CI: Tests automatisch ausführen mit Coverage-Report
- Coverage-Report als CI-Artefakt veröffentlichen
- Keine fokussierten/exklusiven Tests (z. B. `fdescribe`, `fit`, `test.only`) in Commits (CI-Gate)

## Verweise
- ADR-02000 (Testing Strategy – Backend)
- ADR-10000 (Frontend-Architektur)
- ADR-10200 (State Management – Service-Tests)
- ADR-10300 (REST-API-Kommunikation – HTTP-Mocking)
- ADR-10500 (Formulare & Validierung – Formular-Tests)
- ADR-10600 (Authentifizierung – Mock-Auth)
