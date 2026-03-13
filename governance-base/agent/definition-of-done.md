# Definition of Done

Diese Definition of Done gilt für **jede User Story und jeden Task**, unabhängig davon, ob er von einem Menschen oder einem Agenten umgesetzt wird.

---

## Build

- Build läuft fehlerfrei (`dotnet build` / `ng build` / `npm run build`)
- Keine Compiler-/Linter-Warnings (TreatWarningsAsErrors / strict mode aktiv)
- Warnings dürfen **nicht** unterdrückt werden (`#pragma`, `@ts-ignore`, `eslint-disable`)
- Solution/Projekt kann lokal ohne manuelle Schritte gebaut werden

---

## Tests

- `dotnet test` läuft erfolgreich
- Neue Projekte enthalten mindestens:
  - ein Testprojekt (auch wenn noch leer)
- Architekturrelevante Regeln werden bevorzugt durch **ArchTests** abgesichert

---

## Format & Code Style

- `.editorconfig` ist vorhanden und wird eingehalten
- Code ist formatiert (keine unformatierten Änderungen)
- Keine auskommentierten Code-Leichen

---

## Lint & Analyse

- Statische Codeanalyse ist aktiviert (z.B. .NET Analyzers)
- Neue Verstöße werden nicht eingeführt
- Technische Schulden werden nicht „nebenbei“ erhöht

---

## Struktur & Dokumentation

- Projekt- und Ordnerstruktur entspricht den Architekturregeln
- Neue Konzepte oder Abweichungen erfordern:
  - eine Anpassung bestehender ADRs **oder**
  - eine neue ADR (nicht durch Agenten)

### Dokumentationsablage

- Dokumentation gehört in den `/docs/`-Ordner (siehe `documentation-guidelines.md`)
- **Keine automatische Dokumenterstellung** für abgeschlossene Tasks
- Dokumentation ist nur erforderlich, wenn:
  - explizit in den Akzeptanzkriterien gefordert **oder**
  - ein neues Konzept eingeführt wird, das ohne Dokumentation nicht verständlich ist

---

## Nachweis

Jede abgeschlossene Arbeit liefert mindestens einen dieser Nachweise:
- lauffähiger Build
- erfolgreiche Tests
- neue oder erweiterte ArchTests
- klar nachvollziehbare Strukturänderung im Code
