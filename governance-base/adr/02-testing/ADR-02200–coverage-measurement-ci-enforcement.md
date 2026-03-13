---
id: ADR-02200
title: Coverage Measurement & CI Enforcement
status: accepted
date: 2026-01-21
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-02200 – Coverage Measurement & CI Enforcement

## Entscheidungstreiber
- Messbare Qualität für Domain- und Application-Logik
- Vermeidung von “Test Debt” durch harte CI-Gates
- Reproduzierbarkeit und agentenfähige Standards
- Fokus auf aussagekräftige Coverage (Branch Coverage)

## Kontext
In ADR-02000 ist ein Coverage-Ziel von mindestens 80% für Domain und Application definiert.
Damit dies zuverlässig und konsistent eingehalten wird, braucht es:
- klare Messregeln (welche Coverage, welche Assemblies)
- definierte Ausschlüsse (damit Coverage nicht durch Boilerplate verzerrt wird)
- harte Durchsetzung in CI
- Regeln für Agenten, damit generierter Code Coverage nicht verschlechtert

## Entscheidung

### 1) Coverage-Art
Wir messen **Branch Coverage** als maßgebliche Coverage-Art.

### 2) Scope
Coverage wird **pro Assembly** für folgende Assemblies gemessen und enforced:
- **Domain**: mindestens 80%
- **Application**: mindestens 80%

Andere Assemblies (Infrastructure, Presentation, etc.) sind in Phase 1 nicht coveragepflichtig.

### 3) Ausschlüsse (Excludes)
Coverage soll aussagekräftig bleiben und wird daher um typische “Nicht-Logik”-Bereiche bereinigt.
Folgende Kategorien werden von der Coverage-Messung ausgeschlossen:

- DTOs / reine Contracts ohne Logik
- Mapping-Code (z. B. Profile, Mapper, reine Konverter ohne Regeln)
- Generated Code (Source Generator Output, Designer-Dateien, Auto-Generated)
- reine Exception-/Error-Typen ohne Logik (z. B. Marker/Container)
- Domain Events (Event-Datenklassen ohne Logik)
- sonstiger Boilerplate ohne fachliche Logik (nur nach klarer Konvention)

**Regel:** Ausschlüsse dürfen nicht genutzt werden, um fachliche Logik “aus der Coverage herauszuschieben”.

### 4) Messung & Tooling
Wir nutzen .NET Test-Coverage über:

- `dotnet test --collect "Code Coverage"`

Die Coverage-Auswertung erfolgt in CI (kein verpflichtender HTML-Report in Phase 1).

### 5) CI Enforcement (hartes Gate)
- Unterschreitet **Domain** oder **Application** die 80% Branch Coverage, **schlägt der Build fehl**.
- Coverage ist ein **harter Quality Gate** neben Build, Unit Tests und ArchTests.

### 6) Agenten-Regeln
- Agenten dürfen keine Änderungen erzeugen, die die Coverage senken.
- Jeder von Agenten erzeugte Code muss:
  - passende Unit Tests enthalten (Domain/Application)
  - die Coverage-Ziele mindestens halten
- Wenn eine Änderung unvermeidlich Coverage senkt, muss der Agent:
  - den Grund dokumentieren und
  - ein konkretes Test-Upgrade vorschlagen, sodass die Coverage wieder erreicht wird

## Begründung
- Branch Coverage ist aussagekräftiger als reine Line Coverage für Entscheidungslogik.
- Pro-Assembly Enforcement verhindert, dass eine Assembly die andere “mitzieht”.
- Ausschlüsse reduzieren Verzerrung durch Boilerplate und Generated Code.
- Harte Gates verhindern schleichenden Qualitätsverlust.
- Agenten-Regeln sichern Konsistenz und verhindern “Test-Lücken” durch Generierung.

## Alternativen
1) Line Coverage statt Branch Coverage
   - Vorteile: einfacher, häufiger Standard
   - Nachteile: weniger aussagekräftig bei komplexer Logik

2) Aggregierte Coverage statt pro Assembly
   - Vorteile: einfacher zu erreichen
   - Nachteile: Domain/Application-Qualität kann verdeckt sinken

3) Keine Ausschlüsse
   - Vorteile: objektiv, weniger Regeln
   - Nachteile: Boilerplate verzerrt, Signal/Rauschen sinkt

4) Soft Gate (Warnung)
   - Vorteile: weniger Blocker
   - Nachteile: Coverage sinkt erfahrungsgemäß über Zeit

## Konsequenzen

### Positiv
- Messbarer Qualitätsstandard in Domain/Application
- Stabilere CI-Qualität, weniger Regressionen
- Agenten können zuverlässig Tests mitliefern

### Negativ / Trade-offs
- Coverage-Gates können initial “schmerzhaft” sein (mehr Testaufwand)
- Ausschlussregeln erfordern klare Konventionen und Review-Disziplin
- Branch Coverage kann bei refactorings kurzfristig stärker schwanken

## Umsetzungshinweise
- Excludes werden über klare Konventionen gesteuert (z. B. Namespace/Folder/Attribute)
- Domain/Application müssen bei neuen Features immer Tests mitliefern
- CI Pipeline bewertet Coverage getrennt für Domain und Application
- Bei wiederkehrenden Problemen: Konventionen nachschärfen oder neues ADR (z. B. zu Excludes)

## Verweise
- ADR-02000 (Testing Strategy)
- ADR-02100 (Test Projects, Naming & Struktur)
- ADR-00002 (ArchTests / Gates)
- ADR-00003 (CQRS)
- ADR-01000–ADR-01500 (DDD)
