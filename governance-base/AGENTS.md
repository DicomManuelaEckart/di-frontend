# Coding Agent Rules (governance-base)

> Dieses Repository ist die **Single Source of Truth** für alle architekturellen und prozessualen Referenzdokumente.
> Es wird als Git Submodule in alle Produkt-Repositories eingebunden und ist dort **read-only**.

## Allowed
- Erstellen neuer ADRs
- Ändern bestehender ADRs
- Aktualisieren von Agent-Dokumentation (definition-of-done, architecture-rules, agent-governance)
- Aktualisieren von Standards (coding-guidelines, api-guidelines)
- Aktualisieren des Index

## Forbidden
- Änderungen an Produkt-spezifischem Code
- Implementierungsdetails (gehören in Produkt-Repos)

## Conventions
- ADRs müssen YAML Front Matter enthalten (id, scope, enforced_by, affects)
- ADR-Dateinamen: ADR-xxxxx-short-title.md
- ADRs in thematischen Unterordnern unter `adr/`
- Agent-Dokumente unter `agent/`
- Standards unter `standards/`