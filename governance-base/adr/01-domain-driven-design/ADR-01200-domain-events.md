---
id: ADR-01200
title: Domain Events – Definition, Platzierung, Dispatch & Integration
status: accepted
date: 2026-01-20
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-01200 – Domain Events: Definition, Platzierung, Dispatch & Integration

## Entscheidungstreiber
- Saubere Entkopplung innerhalb der Domäne
- Nachvollziehbarkeit fachlicher Zustandsänderungen
- Vorbereitung für Integrationen (Outbox, Messaging)
- Testbarkeit ohne Infrastrukturabhängigkeiten

## Kontext
Wir modellieren die Fachlogik mit DDD (siehe ADR-01000). Bestimmte fachliche
Zustandsänderungen sollen als Ereignisse ausgedrückt werden, um:
- interne Folgeaktionen zu entkoppeln (z. B. Reaktionen innerhalb desselben Bounded Contexts)
- später Integrationen zuverlässig anzustoßen (z. B. Benachrichtigungen, externe Systeme)

Gleichzeitig muss die Domain infrastructure-ignorant bleiben (siehe ADR-01000, ADR-00001).
Das bedeutet: Domain Events dürfen keine technische Abhängigkeiten (Broker, DB, HTTP) haben.

## Entscheidung
Wir führen Domain Events als Bestandteil der Domain ein, mit folgenden Regeln:

1) Domain Events sind fachliche Ereignisse, die durch Domain-Operationen entstehen
   (z. B. "CustomerRegistered", "OrderPlaced").
2) Domain Events sind reine Daten + Bedeutung:
   - keine Services/Ports in Domain Events
   - keine Infrastrukturtypen (z. B. HttpContext, DbContext, Broker Messages)
3) Domain Events werden in der Domain gesammelt (z. B. in AggregateRoot-Basis)
   und nach erfolgreicher Use-Case-Ausführung in der Application-Schicht dispatcht.
4) Es gibt zwei Event-Arten:
   a) **Domain Events (intern)**: für Reaktionen innerhalb des Systems / Bounded Context
   b) **Integration Events (extern)**: explizite, versionierte Events für andere Systeme
      (werden aus Domain Events abgeleitet; Transport über Outbox siehe ADR-00006)
5) Domain Events sind optional, aber wenn ein Prozess fachlich “bedeutsam” ist,
   soll er als Domain Event modelliert werden (nicht als “Log only”).6) **Geltungsbereich: Tenant-DBs und Admin-DB.**
   Domain Events gelten nicht nur für fachliche Bounded Contexts in den Tenant-Datenbanken,
   sondern auch für die **zentrale Admin-DB**. Die Admin-DB verwaltet Tenant-Lifecycle,
   Feature Flags, Lizenzen und andere plattformweite Aggregates – diese erzeugen
   ebenfalls Domain Events (z. B. `TenantCreated`, `TenantSuspended`, `FeatureFlagChanged`,
   `LicensePlanUpdated`). Dieselben Regeln (Sammeln im Aggregate, Dispatch in Application,
   Outbox für Integration Events) gelten für beide DB-Typen.
## Begründung
- Fachliche Ereignisse schaffen eine stabile, verständliche Sprache und klare Trigger.
- Durch Sammeln in Aggregates bleibt die Domain frei von technischen Mechanismen.
- Dispatch in Application ermöglicht:
  - Transaktionskontrolle
  - deterministische Reihenfolge (falls nötig)
  - Mapping in Integration Events / Outbox
- Trennung Domain vs Integration Event verhindert “externe Contracts” in der Domäne.

## Alternativen
1) Keine Domain Events, nur direkte Calls
   - Vorteile: weniger Struktur
   - Nachteile: starke Kopplung, schwer erweiterbar, weniger Auditierbarkeit

2) Domain Events direkt über Infrastruktur publishen
   - Vorteile: schnell
   - Nachteile: Domain wird technisch, Testbarkeit sinkt, schwierige Fehlerfälle

3) Nur Integration Events (keine Domain Events)
   - Vorteile: weniger Event-Typen
   - Nachteile: externe Contracts drücken intern das Modell, weniger flexibel

## Konsequenzen
### Positiv
- Bessere Entkopplung und Erweiterbarkeit
- Klare fachliche “Momente” als First-Class Concepts
- Vorbereitung für Outbox / Messaging

### Negativ / Trade-offs
- Zusätzliche Konzepte und Boilerplate (Event-Klassen, Handler, Mapping)
- Gefahr von “Event-Overuse” (zu viele Events ohne Mehrwert)
- Reihenfolge/Transaktionsfragen müssen bewusst geregelt werden

### Umsetzungshinweise

#### A) Modellierung
- Domain Event Naming: Vergangenheitsform (Past Tense), z. B. `CustomerRegistered`
- Domain Events enthalten nur fachliche Daten (IDs, Werte, Zeitpunkte)
- Events sind immutable

#### B) Platzierung im Code
- Domain Events liegen im Domain-Projekt (z. B. `Domain/Events`)
- AggregateRoot-Basis enthält:
  - `AddDomainEvent(IDomainEvent e)`
  - `IReadOnlyCollection<IDomainEvent> DomainEvents`
  - `ClearDomainEvents()`

#### C) Dispatch-Mechanik
- Dispatch findet in Application statt (z. B. in UnitOfWork / SaveChanges-Interceptor / Pipeline)
- Dispatch-Reihenfolge:
  1) Persistiere State Change (DB Commit)
  2) Leite daraus Integration Events ab und schreibe sie in Outbox (gleiche Transaktion) (siehe ADR-00006)
  3) Domain Events werden in der Domain gesammelt (z. B. in AggregateRoot-Basis) 
  und in der Application-Schicht in-process dispatcht (interne Handler sind erlaubt).
  4) In-process Domain Event Handler sind Teil der Application-Schicht und dienen internen Reaktionen.
  Externe Kommunikation erfolgt ausschließlich über Integration Events (Outbox), nicht aus Domain Events heraus.

> Default-Regel (empfohlen):
> - Interne Handler, die nur Side-Effects außerhalb der DB machen (E-Mail, HTTP), niemals vor Commit.
> - Handler, die innerhalb derselben DB weitere State Changes benötigen, sollten eher als Teil des Use Cases modelliert werden
>   (Command Orchestration) oder klar als eigener Command laufen.

#### D) Handler-Regeln
- Domain Event Handler liegen in Application
- Handler sind idempotent, wenn sie externe Side Effects auslösen
- Kein Handler darf direkt in Presentation arbeiten (keine HttpContext-Abhängigkeiten)
- In-process Domain Event Handler in Application sind erlaubt und erwünscht, wenn sie interne Folgeaktionen kapseln.
- Handler dürfen keine fachlichen Invarianten “nachträglich retten”; Invarianten bleiben im Aggregate/Use Case.

#### E) Architekturtests
- ArchTests erzwingen:
  - Domain Events dürfen keine Referenzen auf Infrastructure/Presentation haben
  - Events sind nur im Domain-Projekt definiert
  - Handler liegen nicht im Domain-Projekt
  - Integration Events (Contracts) liegen nicht im Domain-Projekt (z. B. `Application.Contracts` oder `Infrastructure.Messaging.Contracts`)

#### F) Versionierung (für Integration Events)
- Integration Events erhalten eine explizite Version (z. B. `CustomerRegisteredV1`)
- Breaking Changes → neue Version, alte bleibt (solange Konsumenten existieren)

## Verweise
- ADR-01000 (DDD Ansatz) 
- ADR-01100 (Ubiquitous Language)
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests)
- ADR-00003 (CQRS)
- ADR-00006 (Outbox Pattern)
