# Architecture Rules

Diese Regeln sind aus den bestehenden ADRs abgeleitet und gelten als **verbindlich**.

Sie dienen sowohl Menschen als auch Agenten als Referenz und sollen perspektivisch durch **ArchTests** abgesichert werden.

---

## Layering (Clean Architecture)

- `Domain`
  - kennt **keine** anderen Layer
  - enthält keine Framework-Abhängigkeiten
- `Application`
  - darf Domain referenzieren
  - kennt keine Infrastruktur-Details
- `Infrastructure`
  - implementiert technische Details
  - darf Application und Domain referenzieren
- `Api`
  - ist reiner Entry Point
  - enthält keine Business-Logik

---

## Bounded Contexts

- **Customer** und **Admin** sind strikt getrennte Bounded Contexts
- Es gibt:
  - getrennte Projekte
  - getrennte Aggregate
  - getrennte DbContexts
- Direkte Referenzen zwischen Customer und Admin sind **verboten**

---

## Persistence

- Jeder Bounded Context hat einen eigenen DbContext
- EF Core ist auf Infrastructure beschränkt
- Domain kennt keine Persistenzkonzepte

---

## CQRS

- Reads und Writes sind logisch getrennt
- Read-Modelle sind nicht automatisch Domain-Modelle
- Mapping ist explizit und nachvollziehbar

---

## Cross-Cutting Concerns

- Logging, Configuration, Observability sind:
  - konsistent
  - zentral geregelt
  - nicht in der Domain implementiert

---

## Durchsetzung

- Architekturregeln sollen:
  - dokumentiert **und**
  - testbar sein
- Neue Regeln → neue oder erweiterte ArchTests
- Verletzungen gelten als Fehler, nicht als „technische Schulden“
