---
id: ADR-01400
title: Value Objects – Immutability, Equality, Validation & Serialization
status: accepted
date: 2026-01-20
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-01400 – Value Objects: Immutability, Equality, Validation & Serialization

## Entscheidungstreiber
- Fachliche Ausdruckskraft (keine Primitive Obsession)
- Schutz fachlicher Invarianten
- Vergleichbarkeit und Korrektheit (Equality)
- Testbarkeit und Vorhersagbarkeit
- Reproduzierbare, agentenfähige Implementierung

## Kontext
In der Domäne treten viele fachliche Konzepte auf, die mehr Bedeutung haben als primitive Typen
(z. B. Email-Adresse, Geldbetrag, Kunden-ID, Zeitraum).
Ohne klare Regeln werden diese Konzepte oft als `string`, `int`, `Guid` modelliert,
was zu verteilter Validierung, Inkonsistenzen und schwer wartbarem Code führt.

Value Objects sind ein zentrales DDD-Mittel, um solche fachlichen Konzepte korrekt zu modellieren.

## Entscheidung
Wir modellieren fachliche Wertkonzepte als **Value Objects** mit folgenden verbindlichen Regeln:

1) **Value Objects sind immutable**
   - Nach der Erzeugung darf sich der Zustand nicht ändern.
   - Jede “Änderung” erzeugt ein neues Value Object.

2) **Equality basiert ausschließlich auf den Werten**
   - Zwei Value Objects sind gleich, wenn alle ihre relevanten Werte gleich sind.
   - Identität (ID) spielt keine Rolle.

3) **Validierung erfolgt bei der Erstellung**
   - Ein Value Object kann nicht in einem ungültigen Zustand existieren.
   - Ungültige Werte führen zu einer kontrollierten fachlichen Fehlermeldung
     (kein stilles Korrigieren).

4) **Value Objects enthalten keine Infrastrukturabhängigkeiten**
   - Kein Logging, keine Localization, keine Datenbank- oder Framework-Abhängigkeiten.
   - Keine Abhängigkeiten zu Application oder Infrastructure.

5) **Value Objects sind Teil der Domain und werden von Aggregates verwendet**
   - Aggregates verwenden Value Objects zur Durchsetzung ihrer Invarianten.
   - Value Objects kapseln fachliche Regeln, nicht nur Datenformate.

6) **Value Objects sind serialisierbar**
   - Sie müssen eindeutig und verlustfrei persistierbar sein (über Infrastructure-Mapping).
   - Serialization ist explizit und kontrolliert (kein “magisches” Verhalten).

## Begründung
- Immutability verhindert versteckte Seiteneffekte.
- Value-basierte Equality ist Voraussetzung für korrekte Vergleiche und Collections.
- Zentrale Validierung verhindert Regel-Duplikation in mehreren Schichten.
- Infrastruktur-Freiheit hält die Domain langlebig.
- Klare Regeln ermöglichen ArchTests und Code-Generierung durch Agenten.

## Alternativen
1) Verwendung primitiver Typen (string/int/Guid)
   - Vorteile: schnell, wenig Code
   - Nachteile: Primitive Obsession, verteilte Validierung, schwer testbar

2) Mutable Value Objects
   - Vorteile: vermeintlich einfacher bei EF/Serialization
   - Nachteile: Seiteneffekte, schwer nachvollziehbare Zustände

3) Validierung außerhalb der Value Objects
   - Vorteile: weniger Logik im Typ
   - Nachteile: ungültige Zustände möglich, Regelverteilung

## Konsequenzen
### Positiv
- Klare fachliche Modelle
- Weniger Fehler durch ungültige Zustände
- Hohe Testbarkeit
- Konsistente Verwendung fachlicher Begriffe

### Negativ / Trade-offs
- Mehr Typen und Code
- Initialer Modellierungsaufwand
- Etwas mehr Mapping-Aufwand in Infrastructure

## Umsetzungshinweise

### A) Struktur & Basistyp
- Value Objects liegen im Domain-Projekt (z. B. `Domain/ValueObjects`)
- Optional: gemeinsame abstrakte Basisklasse `ValueObject`
  - Implementiert `Equals`

### B) Erstellung & Validierung
- Erstellung über:
  - Konstruktor (intern/private) + Factory-Methode oder
  - statische `Of(...)` und `TryParse(...)` Methode
- Ungültige Werte:
  - führen zu einem fachlichen Fehlerobjekt oder
  - werfen eine domänenspezifische Exception (kein Framework-Exception-Typ)

### C) Nutzung in Aggregates
- Aggregates akzeptieren Value Objects als Parameter
- Aggregates erzeugen Value Objects selbst, wenn sie Regeln durchsetzen müssen
- Kein direkter Zugriff auf primitive Werte von außen, wenn nicht nötig

### D) Persistenz & Mapping
- Persistenz erfolgt über Infrastructure (ADR-00004)
- Mapping:
  - Entweder als Owned Types (EF Core) oder
  - über explizite Konverter (z. B. Value <-> primitive)
- Domain kennt keine Mapping-Details

### E) Architekturtests (ArchTests)
Mindestens:
1) Alle Typen im Namespace `Domain.ValueObjects`:
   - sind immutable (keine public setters)
   - implementieren Value-based Equality
2) Value Objects referenzieren keine Application/Infrastructure/Presentation-Typen
3) Value Objects besitzen ein `DomainTerm`-Attribut (siehe ADR-01100)
4) Value Objects enthalten keine Logging-/Localization-Abhängigkeiten

### F) Agenten-Regeln
- Agenten erzeugen Value Objects nur:
  - wenn ein fachlicher Begriff mehr Bedeutung als ein primitiver Typ hat
  - mit Immutability + Equality + Validierung
- Agenten dürfen keine primitiven Typen einführen,
  wenn ein bestehendes Value Object fachlich passt

## Verweise
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests)
- ADR-01000 (DDD Ansatz)
- ADR-01100 (Ubiquitous Language als Attribute)
- ADR-01200 (Domain Events)
- ADR-01300 (Aggregatgrenzen & Konsistenz)
