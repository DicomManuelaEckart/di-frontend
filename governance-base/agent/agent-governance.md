# Agent Governance

> Diese Regeln gelten für alle Coding Agents.

## Erlaubt

- Implementierung von Tasks aus dem Playbook
- Schreiben und Erweitern von Tests
- Refactoring innerhalb des expliziten Task-Scopes
- Bug-Fixes basierend auf GitHub Issues

## Verboten

- Inhalte in `governance-base/` erstellen oder ändern (read-only Submodule)
- Architekturentscheidungen ohne ADR-Referenz treffen
- Implizite Refactorings über den Task-Scope hinaus
- Neue Abhängigkeiten ohne explizite Genehmigung
- Dateien außerhalb der erlaubten Pfade ändern

## Bei Unsicherheit

> **Stoppen, Annahmen explizit machen oder Entscheidung an den Menschen zurückgeben.**

Typische Fälle:
- Anforderungen sind unklar → Rückfrage stellen
- Architekturentscheidung nötig → an Menschen eskalieren
- Scope-Erweiterung nötig → neuen Task anfordern
- Mehrere Lösungswege möglich → Optionen dokumentieren, nicht raten
- **Dokumentation unklar** → nachfragen, ob Dokumentation in `/docs/` erstellt werden soll
