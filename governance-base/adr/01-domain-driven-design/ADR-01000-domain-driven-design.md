---
id: ADR-01000
title: Domain-Driven Design – Ansatz und Modellierungsregeln
status: accepted
date: 2026-01-20
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-01000 – Domain-Driven Design: Ansatz und Modellierungsregeln

## Entscheidungstreiber
- Fachliche Änderbarkeit und Wartbarkeit
- Verständlichkeit für Team und Stakeholder
- Testbarkeit der fachlichen Regeln
- Saubere Grenzen (Clean Architecture)

## Kontext
Wir starten ein neues Projekt (from scratch) mit Clean Architecture.
Die Kernlogik soll in der Domain liegen und langfristig stabil bleiben.
Gleichzeitig möchten wir die Domänensprache (Ubiquitous Language) so erfassen,
dass sie automatisiert nutzbar ist (für Generierung, Dokumentation, Agenten).

## Entscheidung
Wir nutzen Domain-Driven Design als Modellierungsansatz mit folgenden Regeln:

1) Domänenlogik ist in Aggregates (Aggregate Roots + Entities + Value Objects) modelliert.
2) Fachliche Invarianten werden in der Domain durchgesetzt (nicht in Controller/DTOs).
3) Die Domain ist infrastructure-ignorant:
   - keine EF Core Attributes/DbContext-Referenzen
   - keine Logging/Telemetry/Localization-Abhängigkeiten
4) Repositories und externe Abhängigkeiten werden als Ports in Application modelliert,
   Implementierungen liegen in Infrastructure.
5) Ubiquitous Language wird im Code als Attribute an Domain-Typen ausgedrückt
   (Details siehe ADR-01100).

## Begründung
- Fachliche Regeln bleiben nahe am Modell und werden nicht verteilt.
- Aggregatgrenzen schaffen klare Konsistenz-/Transaktionsgrenzen.
- Domain bleibt langfristig stabil, auch wenn Infrastruktur wechselt.
- Agenten können aus konsistenten Mustern leichter Scaffold erzeugen.

## Alternativen
1) Anemic Domain Model (Entities als Datenträger, Logik in Services)
   - Vorteile: initial schnell
   - Nachteile: Logik verteilt, schwer testbar, driftet schnell

2) Transaction Script / Use-Case-only ohne Domainmodell
   - Vorteile: sehr schnell für einfache CRUD-Systeme
   - Nachteile: bei wachsender Komplexität schwer wartbar

## Konsequenzen
### Positiv
- Fachlogik wird zentral und testbar
- Klarere Sprache und Modellstruktur

### Negativ / Trade-offs
- Mehr Modellierungsarbeit zu Beginn
- Erfordert Disziplin beim Schneiden der Aggregate

### Umsetzungshinweise
- Domain-Typen werden bewusst kategorisiert: AggregateRoot, Entity, ValueObject
- Domain-Regeln vermeiden “primitive obsession” (Value Objects statt string/int wo sinnvoll)
- Domain wirft keine technischen Exceptions; fachliche Fehler werden als Domain-Fehler modelliert
- Architekturtests prüfen, dass Domain keine Infrastruktur referenziert
- Ubiquitous Language-Attribute sind Pflicht (siehe ADR-01100)

## Verweise
- ADR-00001 (Clean Architecture)
- ADR-00002 (Architektur-Gates / ArchTests)
- ADR-01100 (Ubiquitous Language als Attribute)
