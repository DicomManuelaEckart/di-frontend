---
id: ADR-01100
title: Ubiquitous Language – Begriffe als Attribute + ArchTests + Generierung
status: accepted
date: 2026-01-20
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-01100 – Ubiquitous Language: Begriffe als Attribute + ArchTests + Generierung

## Entscheidungstreiber
- Reproduzierbarkeit und Konsistenz
- Maschinenlesbarkeit für Agenten/Generatoren
- Vermeidung von “Glossary Drift”
- Minimierung manueller Dokumentationspflege

## Kontext
Wir wollen die Ubiquitous Language nicht in separaten Dokumenten (z. B. glossary.md) pflegen,
weil diese erfahrungsgemäß nicht synchron mit dem Code bleibt.
Stattdessen sollen Begriffe direkt an den zentralen Domain-Typen stehen und automatisiert
auslesbar sein.

## Entscheidung
Wir erfassen Domänenbegriffe als Attribute an Domain-Typen:

- Jeder AggregateRoot-Typ MUSS genau ein DomainTerm-Attribut haben.
- Jeder Entity- und ValueObject-Typ MUSS genau ein DomainTerm-Attribut haben.
- DomainTerm-Attribute sind NUR auf AggregateRoots/Entities/ValueObjects erlaubt.
- Die Attribute liegen im Domain-Projekt (keine Infrastruktur-Abhängigkeiten).
- Architekturtests prüfen die Einhaltung dieser Regeln.
- Aus den Attributen kann eine generierbare Domänenübersicht erstellt werden
  (z. B. Markdown/JSON für Agenten oder Dokumentation).

## Begründung
- Begriffe bleiben am “Source of Truth” (Domain Code).
- ArchTests verhindern, dass Begriffe vergessen oder falsch platziert werden.
- Generatoren/Agenten können die Sprache als Input verwenden
  (z. B. für Story Scaffolding, Dokumentation, Diagramme).

## Alternativen
1) glossary.md / Wiki
   - Vorteile: sehr einfach
   - Nachteile: Drift, keine maschinelle Validierung, Pflegeaufwand

2) XML-Doc Kommentare
   - Vorteile: nahe am Code
   - Nachteile: schwer zu validieren/auszuwerten, inkonsistent, weniger strukturiert

## Konsequenzen
### Positiv
- Automatisierbare Ubiquitous Language
- Hohe Konsistenz durch CI-Gates

### Negativ / Trade-offs
- Zusätzliche Disziplin/Boilerplate bei neuen Domain-Typen
- Term-Änderungen sind Breaking Changes für Generatoren (müssen versioniert werden)

### Umsetzungshinweise
- DomainTerm-Attribute enthalten mindestens:
  - Term (string, Pflicht)
  - Description (string, optional)
  - Language (string, Default z. B. "de-DE")
  - Optional: Synonyms, Context/Module
- ArchTests (Minimum):
  1) Alle AggregateRoots haben DomainTerm
  2) Alle Entities haben DomainTerm
  3) Alle ValueObjects haben DomainTerm
  4) DomainTerm wird nicht auf DTOs/EF Configs/Controllers verwendet
- Generator/Export:
  - Ein Tool/Job kann über Reflection die Terms auslesen und als JSON/MD exportieren
  - Export wird versioniert oder als Build-Artifact bereitgestellt

## Verweise
- ADR-01000 (DDD-Ansatz)
- ADR-00002 (ArchTests)
