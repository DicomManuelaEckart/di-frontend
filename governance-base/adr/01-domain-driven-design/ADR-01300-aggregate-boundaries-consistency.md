---
id: ADR-01300
title: Aggregatgrenzen & Konsistenzregeln
status: accepted
date: 2026-01-20
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-01300 – Aggregatgrenzen & Konsistenzregeln

## Entscheidungstreiber
- Schutz fachlicher Invarianten
- Klare Transaktions- und Konsistenzgrenzen
- Vermeidung von unkontrollierten Objektgraphen / Coupling
- Reproduzierbare, agentenfreundliche Implementierung

## Kontext
Wir setzen DDD in Clean Architecture ein (ADR-00001, ADR-01000). Ohne klar definierte Aggregatgrenzen
entstehen in der Praxis:
- “God Aggregates” (zu groß, schwer testbar)
- Cross-Aggregate Objektgraphen (wenig kontrollierbar, Performance-Probleme)
- Fachregeln werden außerhalb der Domain “zusammengeklickt”
- Unklare Transaktionsgrenzen

Wir wollen deshalb explizite Regeln definieren:
- Was gehört in ein Aggregate?
- Wie referenzieren Aggregates sich gegenseitig?
- Wie werden Konsistenzanforderungen umgesetzt (stark vs. eventual)?

## Entscheidung
Wir definieren Aggregatgrenzen und Konsistenz nach folgenden Regeln:

1) **Aggregate Root als Konsistenzgrenze**
   - Innerhalb eines Aggregates werden Invarianten *atomar* durchgesetzt.
   - Änderungen innerhalb eines Aggregates passieren in einer Transaktion.

2) **Referenzen zwischen Aggregaten nur über Identitäten**
   - Ein Aggregate referenziert ein anderes Aggregate ausschließlich über dessen ID
     (keine direkten Objekt-Referenzen auf fremde Aggregate / Entities).
   - Navigation Properties über Aggregate-Grenzen hinweg sind im Domain-Modell nicht erlaubt.
   - **Hybrid-ID-Referenzierung (ADR-01700):**
     - **Infrastructure (DB):** Foreign Keys verwenden die **technische ID (Guid)** des referenzierten Aggregates.
     - **Domain (Aggregate):** Fachliche Referenzen verwenden **Value Objects** mit der fachlichen ID
       (z. B. `ArticleNumber`, `CustomerNumber`), sofern die fachliche ID im Domänen-Kontext relevant ist.
     - Beide IDs können koexistieren: `ProductId` (Guid, für Persistenz) + `ArticleNumber` (Value Object, für Domänenlogik).
     - Zwischen Bounded Contexts wird **intern** (FK, Events) immer die technische Guid verwendet.

3) **Keine fachlichen Invarianten über Aggregatgrenzen innerhalb einer Transaktion erzwingen**
   - Regeln, die mehrere Aggregates betreffen, werden als:
     - Use-Case-Orchestrierung (Application) oder
     - Prozess/Workflow (Saga/Process Manager) oder
     - eventual consistency via Domain/Integration Events
     implementiert.

4) **Lesezugriffe dürfen projektions-/querybasiert über Grenzen gehen**
   - Queries (ADR-00003) dürfen für Read-Modelle joinen/aggregieren (in Infrastructure),
     ohne daraus Domain-Objektgraphen zu bauen.
   - Domain-Modelle werden nicht als Read-DTO missbraucht.

5) **Änderungen an mehreren Aggregaten**
   - Default: ein Command ändert genau ein Aggregate.
   - Ausnahme: ein Command kann mehrere Aggregates ändern, wenn:
     a) es fachlich zwingend atomar sein muss UND
     b) die Aggregatgrenzen sonst künstlich wären.
   - Diese Ausnahme muss begründet werden (ggf. eigenes ADR oder Story-Notiz).

6) **Konsistenzmodell**
   - Default: starke Konsistenz innerhalb des Aggregates.
   - Zwischen Aggregaten: eventual consistency ist akzeptiert, sofern fachlich möglich.
   - Wenn starke Konsistenz zwischen Aggregaten fachlich zwingend ist,
     muss die Modellierung (Aggregat-Schnitt) neu bewertet werden.

## Begründung
- Aggregates sind der Mechanismus, um Invarianten zuverlässig zu schützen.
- ID-Referenzen reduzieren Coupling, verhindern große Objektgraphen und vereinfachen Persistenz.
- Hybrid-ID-Referenzierung (Guid + fachliche Value Objects) ermöglicht sowohl performante DB-Operationen als auch ausdrucksstarke Domänenmodelle (ADR-01700).
- Eventual Consistency zwischen Aggregaten erlaubt Skalierung und klare Verantwortlichkeiten.
- Read/Write Trennung vermeidet “Domain als DTO”.

## Alternativen
1) Direkte Objekt-Referenzen zwischen Aggregaten
   - Vorteile: bequem, weniger Mapping
   - Nachteile: Coupling, unklare Grenzen, Performance/N+1, Invarianten schwer kontrollierbar

2) Ein riesiges Aggregate pro Bounded Context
   - Vorteile: vermeintlich einfache Konsistenz
   - Nachteile: sehr schwer wartbar, Konflikte, Locking/Performance, geringe Parallelisierbarkeit

3) Immer starke Konsistenz über mehrere Aggregates in einer Transaktion
   - Vorteile: einfache Denkweise
   - Nachteile: widerspricht DDD-Intention, führt zu komplexen Transaktionsgrenzen und Abhängigkeiten

## Konsequenzen
### Positiv
- Klarere Modellgrenzen, bessere Wartbarkeit
- Weniger Risiko von “Domain-Spaghetti”
- Einfachere Tests pro Aggregate

### Negativ / Trade-offs
- Mehr Orchestrierung in Application (Workflows)
- Eventual Consistency erfordert Akzeptanz + ggf. UI-Pattern (z. B. “pending”)
- Zusätzliche Implementierung für Prozessmanager/Sagas kann später nötig werden

### Umsetzungshinweise

#### A) Struktur- und Code-Regeln
- Jedes Aggregate besitzt:
  - eine AggregateRoot-Klasse (Root)
  - interne Entities/ValueObjects (sofern nötig)
  - Methoden, die Invarianten schützen (keine “Setters für alles”)
- Fremd-Aggregate-IDs werden als Value Objects modelliert, wenn sinnvoll
  (z. B. `CustomerId` statt `Guid`), um primitive obsession zu vermeiden.

#### B) Persistenz
- EF Core Mapping in Infrastructure (ADR-00004), Domain bleibt frei von EF.
- Keine EF Navigation Properties über Aggregategrenzen im Domain-Modell.
  (Joins sind für Queries ok, aber nicht als Domain-Beziehung.)

#### C) Transaktionen
- Transaktionsgrenze entspricht i. d. R. einem Command Handler.
- Änderungen an einem Aggregate + Schreiben in Outbox (ADR-00006) in derselben Transaktion.

#### D) Events & Workflows
- Cross-Aggregate Folgewirkungen werden bevorzugt über Domain Events (ADR-01200)
  + interne Handler oder über Integration Events (Outbox) realisiert.
- Für länger laufende, mehrstufige Prozesse: Process Manager / Saga (separates ADR bei Bedarf).

#### E) Architekturtests (ArchTests)
Mindestens:
1) Domain-Typen im Namespace/Projekt "Domain" dürfen keine Referenzen auf Infrastructure/Presentation haben (ADR-00002).
2) AggregateRoots dürfen keine Felder/Properties vom Typ einer anderen AggregateRoot haben (nur IDs).
3) Entities/ValueObjects dürfen keine Abhängigkeiten zu Application/Infrastructure haben.
4) Optional: “Public setters” auf AggregateRoots/Entities einschränken (Konventionsregel).

## Verweise
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests / Gates)
- ADR-00003 (CQRS)
- ADR-00004 (Persistence)
- ADR-01000 (DDD Ansatz)
- ADR-01200 (Domain Events)
- ADR-01400 (Value Objects)
- ADR-01700 (ID-Strategie: Hybrid GUID + fachliche ID)
- ADR-00006 (Outbox Pattern)
- Fragebogen §2.5
