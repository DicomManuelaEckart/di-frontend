---
id: ADR-00003
title: Use-Case Struktur – CQRS mit Commands/Queries
status: accepted
date: 2026-01-20
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-00003 – Use-Case Struktur: CQRS mit Commands/Queries

## Entscheidungstreiber
- Klare Trennung von Lesen/Schreiben
- Testbarkeit und Wartbarkeit der Use Cases
- Einheitliches Muster für Agenten-Generierung (Scaffold)

## Kontext
Wir wollen Use Cases klar modellieren, Controller/Endpoints dünn halten und Businesslogik
nicht in UI/Infrastructure verteilen. Gleichzeitig soll der Einstieg nicht überkomplex werden.

## Entscheidung
Wir implementieren CQRS in “Minimalform”:
- Commands für zustandsändernde Operationen
- Queries für lesende Operationen
- Handler in Application
- Ein gemeinsames Persistenzmodell zu Beginn (keine getrennten Read Stores am Anfang)

## Begründung
- Struktur ist konsistent und leicht testbar
- Skalierbar: später erweiterbar um Pipeline Behaviors, getrennte Modelle, Events
- Agenten können wiederholbare Muster zuverlässig generieren

## Alternativen
1) Service-Klassen ohne CQRS
   - Vorteile: Weniger Dateien/Boilerplate
   - Nachteile: Verantwortlichkeiten vermischen sich schnell

2) “Full CQRS” mit separatem Read Model + Eventual Consistency
   - Vorteile: Skalierung / Performance
   - Nachteile: Komplexität zu früh, erfordert Messaging/Outbox konsequent

## Konsequenzen
### Positiv
- Einheitlicher Aufbau jedes Features
- Gute Testbarkeit der Handler

### Negativ / Trade-offs
- Mehr Dateien (Command/Query/Handler/DTO)
- Disziplin nötig bei Namensgebung und Layering

### Umsetzungshinweise
- Presentation darf keine Businesslogik enthalten, ruft nur Handler an
- Handler geben fachlich sinnvolle Result-Objekte zurück (kein EF Entity nach außen)
- Read/Write Modelle bleiben zunächst nah beieinander, Trennung später über ADR

### Naming: Typ-Suffixe nach Layer

| Layer | Erlaubte Suffixe | Beispiele |
|-------|-----------------|----------|
| `Application` (Handler-Parameter) | `*Command`, `*Query` | `CreateCustomerCommand`, `GetCustomerQuery` |
| `Application.Contracts` (Inter-BC-API, Rückgaben) | `*Dto` | `CustomerDto`, `CustomerSummaryDto` |
| `Presentation` (HTTP-Boundary) | `*Request`, `*Response` | `CreateCustomerRequest`, `CustomerResponse` |

**Verboten in Application/Contracts:** `*ReadModel`, `*ViewModel`, `*Request`, `*Response`  
**Verboten in Presentation:** `*Dto` als öffentlicher HTTP-Typ  
**Hinweis:** `Result<T>` ist ein Rückgabe-Wrapper, kein DTO-Typ – der Typ-Parameter folgt der obigen Tabelle (z. B. `Result<CustomerDto>`).

## Verweise
- ADR-00001, ADR-00002
- ADR-00004 (Persistence)
- ADR-00005 (Validation)
