# Project Context

## Ziel
Dieses Projekt ist ein **Produkt "from scratch"**, umgesetzt mit **C# (.NET)** und **Angular**, basierend auf **Clean Architecture** und **Domain-Driven Design (DDD)**.

Das Ziel ist **nicht** schnelle Feature-Entwicklung, sondern:
- eine **saubere, skalierbare Architektur**
- klar dokumentierte Architekturentscheidungen (ADRs)
- eine Codebasis, die von Menschen **und Agenten** sicher weiterentwickelt werden kann

Das Projekt wird iterativ aufgebaut. Zu Beginn stehen **Struktur, Regeln und Guardrails** im Fokus – nicht Business-Logik.

---

## Technologiestack

### Backend
- .NET (aktuelles LTS)
- C#
- Clean Architecture
- CQRS (Read/Write getrennt)
- Entity Framework Core
- Separate DbContexts für unterschiedliche Bounded Contexts

### Frontend & Admin-Portal
- Angular
- TypeScript
- Klare Trennung zwischen Customer- und Admin-Bereich, eigene Anwendungen

### Infrastruktur & Tooling
- Azure (Zielplattform)
- GitHub (Repos, Actions, Projects)
- dotnet CLI
- npm / Angular CLI

---

## Grundprinzipien

- **Customer und Admin sind strikt getrennt**
  - eigener Code
  - eigene Datenmodelle
  - eigene DbContexts
  - eigenes Frontend
- **Architektur ist wichtiger als Implementierungsdetails**
- **Explizit ist besser als implizit**
- **Regeln werden bevorzugt als Code (Tests) durchgesetzt**
- **ADRs sind verbindlich**

---

## Rolle von Agenten

Agenten dürfen:
- Projekt- und Solution-Strukturen erzeugen
- Code-Skeletons erstellen
- Tests und ArchTests schreiben
- Konfigurationen und Boilerplate anlegen

Agenten dürfen **nicht**:
- ADRs eigenständig ändern oder neu bewerten
- Architekturregeln aufweichen
- Business-Entscheidungen treffen

Bei Unklarheiten gilt:
> Stoppen, Annahmen explizit machen oder Entscheidung an den Menschen zurückgeben.
