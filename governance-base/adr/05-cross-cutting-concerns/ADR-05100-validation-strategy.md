---
id: ADR-05100
title: Validation Strategy (Domain + Application)
status: accepted
date: 2026-01-21
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-05100 – Validation Strategy (Domain + Application)

## Entscheidungstreiber
- Klare Verantwortlichkeiten zwischen Domain und Application
- Frühzeitiges Abfangen von Input-Fehlern vor Use-Case-Ausführung
- Konsistente Fehlercodes und Lokalisierung
- Minimierung von duplicated validation logic
- Agenten- und CI-fähige Durchsetzung über ArchTests

## Kontext
Das System nutzt Clean Architecture und DDD.
Validierung ist erforderlich auf zwei Ebenen:

- **Application Validation**: schützt Use Cases vor ungültigem Input (Command/Query Inputs)
- **Domain Validation**: schützt fachliche Invarianten innerhalb der Domain (Aggregate Rules)

Localization ist über Resource Keys geregelt (ADR-05000).
Domain Errors und Ergebnis-Modelle sind definiert (ADR-01500).

## Entscheidung

### 1) Validierungs-Ebenen
Validierung findet in **Domain und Application** statt, mit klarer Trennung:

- **Domain** validiert fachliche Invarianten und Konsistenzregeln
- **Application** validiert Input (Form, Required, Range, Cross-field, etc.) vor Use-Case-Ausführung

### 2) Domain Validation (Invarianten)
Domain Validation umfasst ausschließlich:

- Invarianten in Aggregates
- konsistente Zustandsübergänge
- fachliche Regeln, die bei Domain-Operationen gelten

Domain übernimmt **keine** Input-Validierung wie:
- Required / Length / Format auf DTO/Command-Ebene

### 3) Application Validation (Commands + Queries)
Application Validation gilt für:

- **Commands und Queries** (Scope B)

Sie wird umgesetzt mit:

- **FluentValidation**

### 4) Zeitpunkt der Application Validation
Application Validation läuft:

- **vor** der Handler-Ausführung
- zentral über Pipeline/Behavior (nicht im Handler)

Handler dürfen davon ausgehen, dass Validation bereits ausgeführt wurde.

### 5) Validation Errors vs Domain Errors (Fehlerstrategie)
Wir unterscheiden zwei Fehlerarten:

- **Validation Errors** (Application Layer)
- **Domain Errors** (Domain Layer)

Regeln:
- Validation Errors sind keine Domain Errors
- Domain Errors entstehen nur aus Domain-Operationen
- Beide werden konsistent an die API gemappt (ADR-05000)

### 6) Localization
Validation Errors werden auf **Resource Keys** gemappt (ADR-05000).

- Keine hardcodierten User-facing Texte in Domain/Application
- Validation Error Codes/Keys sind stabil und lokalisierbar

### 7) Fail Strategy
Application Validation sammelt **alle** Fehler und liefert sie gesammelt zurück
(kein fail-fast).

### 8) Async Validation
Async Validation ist erlaubt, insbesondere für:

- Existence Checks
- Uniqueness Checks

Uniqueness/Existence Checks erfolgen in der **Application Validation**.

### 9) Abhängigkeiten in Validatoren
Validatoren dürfen **read-only** Abhängigkeiten nutzen (z. B. Query-Ports):

- keine Side Effects
- keine Writes
- keine komplexe Orchestrierung

Validatoren sind deterministisch und schnell zu halten.

### 10) Cross-Field Validation
Cross-Field/Cross-Property Validation ist in Application Validation erlaubt
(FluentValidation), sofern es reine Input-Konsistenz betrifft.

Fachliche Invarianten bleiben in der Domain.

### 11) Tests
- Validatoren werden explizit getestet.
- Handler-Tests dürfen davon ausgehen, dass Validation vor dem Handler lief.
- Separate Tests stellen sicher, dass Pipeline/Behavior Validation tatsächlich ausführt.

### 12) Governance & ArchTests
ArchTests erzwingen:

1) Domain enthält keine FluentValidation-Abhängigkeiten
2) Application Validation wird zentral vor Handlern ausgeführt
3) Keine Validation-Logik im Presentation Layer
4) Commands/Queries besitzen Validatoren nach Konvention (sofern definiert)

CI schlägt fehl, wenn Regeln verletzt werden.

## Begründung
- Domain schützt Invarianten; Application schützt Use Cases vor invalidem Input
- FluentValidation ist etabliert und unterstützt komplexe Regeln (Cross-field, async)
- Zentrale Pipeline reduziert Duplicates und verhindert “vergessene Validierung”
- Klare Trennung der Fehlertypen ermöglicht konsistentes Error-Handling und Localization
- ArchTests verhindern schleichende Regelverletzungen

## Alternativen
1) Nur Domain Validation
   - Vorteile: weniger Validatoren
   - Nachteile: UI-/Inputfehler landen als Domain Errors, schlechte UX, schwer zu lokalisieren

2) Nur Application Validation
   - Vorteile: schnell
   - Nachteile: Domain kann in ungültige Zustände geraten, Invarianten nicht geschützt

3) Data Annotations statt FluentValidation
   - Vorteile: simpel
   - Nachteile: eingeschränkt, schlechter für Cross-field/async

## Konsequenzen

### Positiv
- Saubere Trennung von Input- und Fachvalidierung
- Einheitliche Validation-Pipeline
- Lokalisierbare Fehlermeldungen
- Gute Testbarkeit und Governance

### Negativ / Trade-offs
- Mehr Code (Validatoren zusätzlich zu Domain-Regeln)
- Async Checks erfordern Read-Ports und können Laufzeit erhöhen
- Disziplin nötig, um Fachregeln nicht in Validatoren zu verlagern

## Umsetzungshinweise
- Pro Command/Query ein Validator (Konvention)
- Validatoren in `Application.Validation` organisieren (feature-basiert)
- Validation Behavior:
  - ruft alle Validatoren für Request-Type auf
  - aggregiert Fehler
  - liefert standardisiertes Fehlerobjekt (Validation Errors) zurück
- Uniqueness/Existence:
  - über read-only Ports (Repository Read Model / Query Service)
  - keine Writes im Validator
- Mapping:
  - Validation Errors → ProblemDetails + Resource Keys (ADR-05000)
  - Domain Errors → ProblemDetails + Resource Keys (ADR-05000)

## Verweise
- ADR-01500 (Domain Errors & Results)
- ADR-05000 (Localization / i18n)
- ADR-02000–ADR-02200 (Testing & CI Gates)
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests / Gates)
