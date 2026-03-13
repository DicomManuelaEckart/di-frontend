---
id: ADR-02100
title: Test Projects, Naming & Struktur
status: accepted
date: 2026-01-21
scope: backend
enforced_by: convention
affects:
  - backend
---

# ADR-02100 – Test Projects, Naming & Struktur

## Entscheidungstreiber
- Einheitliche und nachvollziehbare Teststruktur
- Klare Trennung von fachlichen Tests und Architekturtests
- Agentenfähige Testgenerierung ohne Interpretationsspielraum
- Reduzierung von Stil- und Struktur-Diskussionen im Review

## Kontext
Mit ADR-02000 ist festgelegt:
- welche Testarten verpflichtend sind
- welche Gates in CI gelten
- dass ArchTests als Architektur-Gate eingesetzt werden

Ohne klare Projekt-, Ordner- und Naming-Konventionen entstehen:
- vermischte Verantwortlichkeiten (z. B. ArchTests in Unit-Test-Projekten)
- inkonsistente Testnamen
- schwer auffindbare Tests
- nicht reproduzierbare Agenten-Ergebnisse

Dieses ADR definiert verbindlich:
- welche Testprojekte existieren
- wofür jedes Projekt verantwortlich ist
- wie Tests strukturiert und benannt werden

## Entscheidung

### 1) Testprojekte (verbindlich)

#### Pflichtprojekte (Phase 1)
- `Domain.Tests`  
  Unit Tests für Domain (Aggregates, Value Objects, Domain Errors, Domain Events)

- `Application.Tests`  
  Unit Tests für Application (Commands, Queries, Handler, Orchestrierung)

- `Architecture.Tests`  
  Architekturtests (ArchTests) zur Durchsetzung der Architekturregeln

- `Infrastructure.Tests`
  Integrationstests für Infrastructure (EF Core, Repositories, externe Systeme)

- `Presentation.Tests`
  Integrationstests für Presentation Layer (API Endpoints, Controllers)

**Regel:**  
`Architecture.Tests` enthält ausschließlich Architekturregeln – keine fachlichen Tests.

---

### 2) Verantwortlichkeiten je Testprojekt

#### Domain.Tests
- Testet:
  - Aggregates
  - Value Objects
  - Domain Errors
  - Erzeugung von Domain Events
- Enthält keine:
  - Mocks
  - Infrastruktur
  - EF Core
  - Architekturtests

#### Application.Tests
- Testet:
  - Command / Query Handler
  - Use-Case-Orchestrierung
  - Validierung
  - Result-/Error-Mapping
- Erlaubt:
  - Mocking von Ports/Interfaces (Moq)
- Enthält keine:
  - EF Core DbContext
  - Architekturtests

#### Architecture.Tests
- Testet:
  - Layer-Abhängigkeiten
  - DDD-Regeln (Aggregate-Grenzen, Value Objects, Domain Events)
  - Verbotene Referenzen
  - Konventionsregeln (Namespaces, Platzierung)
- Enthält keine:
  - Businesslogik
  - Use-Case-Tests
  - Mocks

#### Infrastructure.Tests
- Testet:
  - Repository-Implementierungen (EF Core)
  - DbContext-Konfiguration und Mappings
  - Migrations-Validierung
  - Adapter zu externen Systemen (z. B. E-Mail, Blob Storage)
  - Outbox-Pattern-Implementierung
- Erlaubt:
  - Testcontainers (z. B. SQL Server, PostgreSQL)
  - In-Memory-Datenbank für einfache Szenarien
  - Mocking externer Dienste (WireMock, eigene Fakes)
- Enthält keine:
  - Domain-Logik-Tests
  - Use-Case-Tests
  - Architekturtests

#### Presentation.Tests
- Testet:
  - API-Endpoints (HTTP Request/Response)
  - Controller-Routing und Modelbinding
  - Authentication/Authorization-Middleware
  - OpenAPI/Swagger-Konformität
  - ProblemDetails-Formatierung
- Erlaubt:
  - WebApplicationFactory für Integration Tests
  - Mocking von Application-Layer-Ports
  - Testcontainers für vollständige Integration
- Enthält keine:
  - Domain-Logik-Tests
  - Repository-Tests
  - Architekturtests

---

### 3) Ordnerstruktur innerhalb der Testprojekte

Die Ordnerstruktur spiegelt die fachliche Struktur des Systems wider:

- Application.Tests
  - Customers
    - CreateCustomer
      - CreateCustomerCommandHandlerTests.cs

Verboten sind generische Ordner wie:
- `Helpers`
- `Utils`
- `Misc`
- `Common`

---

### 4) Testklassen-Naming

Testklassen werden nach dem System Under Test (SUT) benannt:

- `<AggregateName>Tests`
- `<ValueObjectName>Tests`
- `<CommandName>HandlerTests`
- `<QueryName>HandlerTests`
- `<ArchitectureRuleName>Tests` (in `Architecture.Tests`)

---

### 5) Testmethoden-Naming

Alle Testmethoden folgen strikt dem Schema:

MethodName_Scenario_ExpectedResult


Beispiele:
- `Create_WithValidData_ShouldCreateCustomer`
- `ChangeEmail_WithInvalidEmail_ShouldReturnDomainError`
- `CalculateTotal_WithNegativeValues_ShouldThrowException`

---

### 6) Teststil

Alle Tests folgen dem AAA-Pattern (Arrange – Act – Assert).

---

### 7) Assertions

- Assertion Library: **Shouldly**
- Assertions müssen explizit, lesbar und fachlich aussagekräftig sein.

---

### 8) Mocking-Regeln

- Mocking Framework: **Moq**
- Erlaubt:
  - Mocking von Ports/Interfaces in `Application.Tests`
- Verboten:
  - Mocking von Domain-Typen
  - Mocking von EF Core `DbContext`
  - Mocking in `Domain.Tests` und `Architecture.Tests`

---

### 9) Testdaten & Builder

- Testdaten werden über Builder / Object Mother erzeugt
- Builder liegen im jeweiligen Testprojekt
- Builder erzeugen valide Default-Objekte
- Ungültige Zustände werden explizit im Test erzeugt

---

### 10) Regeln für Architecture.Tests

- Referenziert nur Assemblies, keine konkreten Implementierungen
- Erzwingt Regeln wie:
  - Domain darf Infrastructure nicht referenzieren
  - AggregateRoots dürfen keine anderen AggregateRoots referenzieren
  - Domain-Typen müssen `DomainTerm`-Attribute besitzen
  - Value Objects sind immutable
- Architekturtests sind harte CI-Gates

---

## Konsequenzen

### Positiv
- Hohe Konsistenz
- Gute Auffindbarkeit von Tests
- Klare Architektur-Governance

### Negativ
- Mehr Projekte im Solution-Setup
- Höhere Disziplin erforderlich

## Verweise
- ADR-02000 (Testing Strategy)
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests / Gates)
- ADR-01000–ADR-01500 (DDD)
