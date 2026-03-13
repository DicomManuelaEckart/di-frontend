---
id: ADR-00005
title: Validierung und Fehlerbehandlung (Boundary-Validation)
status: accepted
date: 2026-01-20
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-00005 – Validierung und Fehlerbehandlung (Boundary-Validation)

## Entscheidungstreiber
- Konsistente Fehlerantworten
- Vermeidung doppelter Validierungslogik
- Saubere Trennung: syntaktisch vs. fachlich

## Kontext
In typischen Projekten entsteht Validierungschaos:
- UI validiert anders als API
- Domain-Regeln werden in Controller kopiert
- Fehlermeldungen sind inkonsistent

## Entscheidung
Wir trennen:
1) Syntaktische/Format-Validierung (z. B. required, length, regex) in Application Boundary
2) Fachliche Invarianten in Domain (Aggregate/Value Objects)
Fehler werden als strukturierter Fehlervertrag nach außen gegeben (ProblemDetails/ähnlich).

## Begründung
- Domain bleibt Quelle der Wahrheit für Fachregeln
- Application verhindert unnötige Domain-Aufrufe bei kaputten Requests
- Einheitlicher Fehlervertrag für Frontend/Clients

## Alternativen
1) Validierung nur im Controller
   - Vorteile: Schnell
   - Nachteile: Nicht wiederverwendbar, Controller werden fett

2) Validierung nur in Domain
   - Vorteile: Alles zentral
   - Nachteile: Schlecht für Request-Formatierung, unschöne Exceptions/Flows

## Konsequenzen
### Positiv
- Klare Verantwortlichkeiten
- Konsistente Fehlerbehandlung

### Negativ / Trade-offs
- Zwei Ebenen erfordern Disziplin
- Fehler-Mapping muss standardisiert werden

### Umsetzungshinweise
- Handler validieren Request-Shape (z. B. via Validator)
- Domain wirft keine “technischen Exceptions” für Regeln, sondern modelliert Regeln sauber
- Presentation mappt Fehler in ein einheitliches Response-Format

## Verweise
- ADR-00003 (CQRS)
- ADR-00001 (Clean Architecture)
