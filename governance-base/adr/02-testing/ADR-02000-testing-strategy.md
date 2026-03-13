---
id: ADR-02000
title: Testing Strategy
status: accepted
date: 2026-01-21
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-02000 – Testing Strategy

## Entscheidungstreiber
- Schnelle Feedbackzyklen (CI und lokal)
- Hohe Sicherheit für Domain- und Application-Logik
- Reproduzierbarkeit und agentenfähige Standards
- Minimierung von Test-Flakiness und Setup-Aufwand

## Kontext
Das System ist überwiegend CRUD-dominiert, enthält aber auch Domain-/Application-Logik.
Für den Start soll der Fokus auf einer stabilen, schnellen Unit-Test-Basis liegen.
Weitere Testarten (Integration/API/E2E) sollen später ergänzbar sein, ohne die bestehende Strategie zu brechen.

Zusätzlich werden Architekturgates über ArchTests eingesetzt, um Architekturdrift zu verhindern (ADR-00002).

## Entscheidung
Wir definieren folgende Testing Strategy für Phase 1:

1) **Unit Tests sind Pflicht**
   - Domain und Application werden umfassend per Unit Tests getestet.
   - Ziel: schnelles, deterministisches Test-Set, das lokal und in CI immer läuft.

2) **Integration-, API- und E2E-Tests sind vorerst optional**
   - Diese Testarten werden später eingeführt, sobald konkrete Integrationsbedarfe bestehen.
   - In Phase 1 gibt es kein verpflichtendes Setup für DB-/Container-Tests.

3) **DbContext wird nicht gemockt**
   - EF Core `DbContext` wird nicht über Mocks simuliert.
   - Persistenzverhalten wird später über echte Integrationstests (z. B. Testcontainer) abgesichert.

4) **CI Gates (verpflichtend)**
   - Build muss erfolgreich sein.
   - Unit Tests müssen erfolgreich sein.
   - ArchTests müssen erfolgreich sein.

5) **Coverage-Ziel**
   - Für **Domain** und **Application** gilt ein Zielwert von **mindestens 80% Coverage**.
   - (Andere Layer sind in Phase 1 nicht Ziel-coveragepflichtig.)

6) **Tooling & Konventionen**
   - Test Framework: **xUnit**
   - Mocking: **Moq** (für Ports/Interfaces, nicht für EF DbContext)
   - Assertions: **Shouldly**
   - Testprojekte: **pro Layer ein Testprojekt** (z. B. `Domain.Tests`, `Application.Tests`, …) und extra eines für Architekturtests (`Architecture.Tests`)
   - Teststil: **AAA (Arrange-Act-Assert)**
   - Testmethodennamen: `MethodName_Scenario_ExpectedResult`
     - Beispiel: `CalculateTotal_WithNegativeValues_ShouldThrowException`

## Begründung
- Unit Tests liefern den höchsten Nutzen bei geringstem Setup und sind ideal für den Start.
- 80% Coverage in Domain/Application setzt einen klaren Qualitätsstandard ohne Overhead für UI/Infra.
- Kein DbContext-Mocking reduziert “falsche Sicherheit” und vermeidet fragile Tests.
- ArchTests als Gate verhindern Architekturdrift früh und dauerhaft.

## Alternativen
1) Integrationstests sofort verpflichtend (z. B. Testcontainer)
   - Vorteile: höhere Sicherheit für Persistence/Infra
   - Nachteile: Setup- und Laufzeitkosten, höheres Flakiness-Risiko zu Beginn

2) DbContext mocken
   - Vorteile: schnelle Tests ohne DB
   - Nachteile: bildet EF-Verhalten unzuverlässig ab, kann zu trügerischer Sicherheit führen

3) Keine Coverage-Ziele
   - Vorteile: kein “Gaming”
   - Nachteile: fehlende Leitplanke, Qualität sinkt oft schleichend

## Konsequenzen
### Positiv
- Schnelle, stabile Feedbackschleife für Kernlogik
- Klare Standards, die Agenten zuverlässig befolgen können
- Architektur bleibt durch CI-Gates stabil

### Negativ / Trade-offs
- Persistenz-/Integrationsfehler werden erst mit späteren Integrationstests abgesichert
- Coverage-Ziele können zu “Test um des Tests willen” verleiten, wenn nicht sinnvoll angewendet

### Umsetzungshinweise
- Domain Tests:
  - Fokus auf Invarianten, Value Objects, Domain Errors, Domain Events (nur Erzeugung/State)
- Application Tests:
  - Fokus auf Use Cases (Commands/Queries), Orchestrierung, Validierung, Result-Mapping
  - Ports (Interfaces) werden gemockt (Moq), um deterministische Tests zu gewährleisten
- Architecture Tests:
  - Absichern der Einhaltung von Architektur-Richtlinien
- Coverage:
  - Coverage wird in CI gemessen und für Domain/Application separat ausgewertet
  - Bei Unterschreitung: Build schlägt fehl
- Naming/Structure:
  - Testklassen benennen nach SUT (`CustomerAggregateTests`, `CreateCustomerCommandHandlerTests`)
  - AAA konsequent, keine versteckten Assertions in Helpers ohne klaren Namen

## Verweise
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests / Gates)
- ADR-00003 (CQRS)
- ADR-01000..01500 (DDD Basis)
