# Documentation Guidelines

> Diese Richtlinien gelten für alle Product-Repositories und beschreiben,
> wie und wo Dokumentation abgelegt werden soll.

---

## Grundprinzipien

1. **Keine verstreuten README-Dateien** – Unterordner sollen keine eigenen README.md enthalten
2. **Zentraler `/docs/`-Ordner** – Themenspezifische Dokumentation gehört in den `/docs/`-Ordner
3. **Root-README minimal halten** – Nur Projektübersicht und Verweis auf `/docs/`

---

## Datei-Struktur

```
/
├── README.md                  # Projektübersicht, Quick Start, Links zu /docs/
├── docs/
│   ├── api-baseline.md        # API-Konventionen, Routing, Error Handling
│   ├── architecture.md        # Architektur-Übersicht
│   ├── development-setup.md   # Lokale Entwicklungsumgebung
│   ├── testing.md             # Test-Strategie und -Ausführung
│   └── ...
└── src/
    └── ...                    # ❌ Keine README.md in Unterordnern!
```

---

## Namenskonventionen

| Regel | Beispiel |
|-------|----------|
| Dateinamen in `kebab-case` | `api-baseline.md`, `error-handling.md` |
| Sprechende Namen | `development-setup.md` statt `dev.md` |
| Thema im Namen erkennbar | `testing-strategy.md` statt `tests.md` |

---

## Was gehört wohin?

### Root-README.md

- Projektname und Kurzbeschreibung
- Quick Start (Prerequisites, Build, Run)
- Links zu `/docs/` für Details
- Badge-Links (CI, Coverage, etc.)

**Beispiel:**

```markdown
# Backend

> ASP.NET Core Backend für [Projektname]

## Quick Start

1. Prerequisites: .NET 9 SDK
2. `dotnet build`
3. `dotnet run --project src/Presentation`

## Documentation

- [API Baseline](docs/api-baseline.md)
- [Architecture](docs/architecture.md)
- [Development Setup](docs/development-setup.md)
```

### /docs/-Ordner

- Detaillierte technische Dokumentation
- Architektur-Entscheidungen (sofern nicht in ADRs)
- Setup-Anleitungen
- API-Konventionen
- Test-Strategien

---

## Verboten

| ❌ Nicht erlaubt | ✅ Stattdessen |
|------------------|----------------|
| `src/Application/README.md` | Doku in `/docs/architecture.md` |
| `src/Domain/Models/README.md` | Doku in `/docs/domain-model.md` |
| `tests/README.md` | Doku in `/docs/testing.md` |
| Inline-Kommentare als Doku-Ersatz | Eigenständige Doku-Datei |

---

## Ausnahmen

Folgende README-Dateien sind **erlaubt**:

- `/README.md` – Root-Level Projektübersicht
- `/docs/README.md` – Optional: Inhaltsverzeichnis für `/docs/`

---

## Für Coding Agents

> **Regel:** Erstelle keine README.md in Unterordnern.
> Wenn Dokumentation benötigt wird, lege sie in `/docs/` ab.

**Prüfe vor dem Commit:**
- [ ] Keine neuen README.md außerhalb von Root oder `/docs/`
- [ ] Neue Doku-Dateien liegen in `/docs/`
- [ ] Dateinamen folgen `kebab-case`
- [ ] Root-README verweist auf neue Doku-Dateien
