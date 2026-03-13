---
id: ADR-00007
title: Agenten-Governance – Was Agenten dürfen (und was nicht)
status: accepted
date: 2026-01-20
scope: global
enforced_by: convention
affects:
  - backend
  - frontend
  - admin
  - prinservice
---

# ADR-00007 – Agenten-Governance: Was Agenten dürfen (und was nicht)

## Entscheidungstreiber
- Konsistenz über Features hinweg
- Schutz vor “Boilerplate-Explosion”
- Nachvollziehbarkeit von Architekturentscheidungen

## Kontext
Wir wollen Agenten nutzen, um wiederkehrende Arbeiten zu beschleunigen.
Ohne klare Grenzen neigen Agenten dazu, zu viel zu generieren oder Entscheidungen zu “erraten”.

## Entscheidung
Agenten dürfen:
- Scaffold/Boilerplate erzeugen, wenn ADRs die Struktur klar vorgeben
- Tests/ArchTests ergänzen, wenn Kriterien eindeutig sind
- ADR-Vorschläge erstellen, wenn Entscheidungen fehlen (aber nicht “heimlich entscheiden”)

Agenten dürfen NICHT:
- Neue Architektur-Entscheidungen ohne ADR treffen
- Domain-Regeln erfinden (Domain kommt aus Fachkontext/Stories)
- Layering-Regeln umgehen oder “quick fixes” einbauen
---

### Agent-Typen

Im Projekt kommen folgende Agent-Typen zum Einsatz:

| Agent-Typ | Aufgabe | Einsatzbereich |
|-----------|---------|----------------|
| **Code Agent** | Implementiert Features auf Basis von User Stories + ADRs | Feature-Branches, Scaffold, CRUD |
| **Review Agent** | Prüft Code gegen ADRs, Coding Guidelines, ArchTests | Pull Request Reviews, Pre-Merge Checks |
| **Test Agent** | Generiert Unit-/Integration-Tests auf Basis bestehender Implementierung | Test-Projekte, Coverage-Lücken |
| **Documentation Agent** | Erstellt/aktualisiert ADRs, API-Docs, Inline-Dokumentation | governance-base, XML-Docs, README |

Nicht im initialen Scope (perspektivisch evaluierbar):
- **Migration Agent** – Datenmigration und Schema-Transformation
- **Ops Agent** – Incident-Analyse, Log-Auswertung, Runbook-Automatisierung

---

### LLM-Auswahl

| Aspekt | Entscheidung |
|--------|-------------|
| **Primäres Modell** | **Claude (Anthropic)** – starke Code-Generierung, gute ADR-Qualität, lange Context-Windows |
| **Modell-Mix** | Erlaubt – verschiedene Modelle für verschiedene Tasks bei nachgewiesenem Mehrwert |
| **Fallback** | GPT-4 (OpenAI) als Alternative bei Verfügbarkeitsproblemen |
| **Modellwechsel** | Neue Modelle werden evaluiert, bevor sie produktiv eingesetzt werden |

#### Evaluationskriterien für LLM-Wechsel
- Code-Qualität (Compilability, ArchTest-Konformität)
- ADR- und Dokumentationsqualität
- Context-Window-Größe (wichtig für große Codebasen)
- Kosten pro Token
- Verfügbarkeit und Latenz

---

### Budget-Modell

| Aspekt | Entscheidung |
|--------|-------------|
| **Budgetierung** | **Pro Monat** – festgelegtes Limit für API-Kosten |
| **Tracking** | Monatliche Auswertung der API-Kosten pro Agent-Typ |
| **Eskalation** | Bei 80 % Verbrauch: Warnung; bei 100 %: manuelle Freigabe erforderlich |
| **Optimierung** | Regelmäßige Überprüfung von Prompt-Effizienz und Modellkosten |

---
## Begründung
- Architektur bleibt menschengesteuert, Code-Erzeugung maschinell
- Entscheidungen werden explizit und versioniert
- Reviews werden einfacher: Agent liefert standardisierte Muster

## Alternativen
1) Agenten “frei” implementieren lassen
   - Vorteile: Schnell
   - Nachteile: Drift, Inkonsistenz, schwer zu reviewen

2) Agenten nur für Text (keinen Code)
   - Vorteile: Sicher
   - Nachteile: Weniger Nutzen, mehr Handarbeit

## Konsequenzen
### Positiv
- Reproduzierbare, konsistente Feature-Strukturen
- Höhere Geschwindigkeit bei geringerem Risiko

### Negativ / Trade-offs
- Initiale Spezifikation kostet Zeit (Rules/Checklisten)
- Agenten brauchen klare Eingaben (Stories, ADRs, Beispiele)

### Umsetzungshinweise
- Jede Generator-Story referenziert ADRs + enthält “Allowed/Forbidden”
- CI/ArchTests sind die “Wahrheit” (Agenten müssen grün bekommen)
- Bei Unklarheit: Agent erstellt ADR-Entwurf statt Code

## Verweise
- ADR-00002 (ArchTests)
- ADR-00001 (Clean Architecture)
