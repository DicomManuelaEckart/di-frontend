---
id: ADR-00001
title: Architektur-Stil – Clean Architecture
status: accepted
date: 2026-01-20
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-00001 – Architektur-Stil: Clean Architecture

## Entscheidungstreiber
- Wartbarkeit und langfristige Änderbarkeit
- Testbarkeit (insb. Application/Domain)
- Austauschbarkeit von Infrastruktur (DB, Messaging, Auth Provider)
- Skalierbare Teamarbeit durch klare Grenzen

## Kontext
Wir starten ein neues Projekt (from scratch) und möchten es reproduzierbar aus User Stories aufbauen.
Wir erwarten spätere Erweiterungen (weitere Domänen, Integrationen) und wollen technische Schulden
durch unklare Abhängigkeitsstrukturen vermeiden.

## Entscheidung

### Deployment-Modell: Modularer Monolith
Das System wird als **Modularer Monolith** deployed:

- **Ein Deployment-Artefakt** (eine deploybare Einheit pro Umgebung)
- **Strikte Bounded Contexts** als interne Module (ADR-01600)
- Jeder Bounded Context hat eigene Domain-, Application- und Infrastructure-Schichten
- Kommunikation zwischen BCs über **Integration Events** (ADR-08100), nicht über direkte Aufrufe
- Shared Kernel nur für explizit geteilte Value Objects und Interfaces

#### Warum Modularer Monolith (kein Microservices)?
- **Einfacheres Deployment und Betrieb** – ein Artefakt statt 10+ Services
- **Transaktionale Konsistenz** innerhalb eines BCs ohne Distributed Transactions
- **Geringere Infrastrukturkomplexität** – kein Service Mesh, kein API Gateway zwischen Services
- **Schnellerer Start** – Fokus auf fachliche Logik statt Infrastruktur
- **Spätere Extraktion möglich** – einzelne BCs können bei Bedarf als eigenständige Services extrahiert werden

#### Abgrenzung
- Kein klassischer Monolith: Module sind intern strikt getrennt (ArchTests erzwingen Grenzen)
- Kein Microservices-System: Kein separates Deployment pro BC im initialen Scope
- Evolutionspfad: Bei nachgewiesenem Bedarf (Skalierung, Team-Autonomie) können BCs zu Microservices werden

---

### Architekturschichten (Clean Architecture)
Wir verwenden Clean Architecture mit klaren Layern:
- Domain: reine Domänenlogik, keine Infrastruktur-Abhängigkeiten
- Application: Use Cases (Commands/Queries), Ports (Interfaces), Validierung/Orchestrierung
- Infrastructure: Implementierungen (DB, Messaging, External Services)
- Presentation: API, keine Businesslogik

## Begründung
- Domain bleibt frei von technischen Details und dadurch langlebig.
- Application ist optimal testbar (Use Cases, Policies, Regeln).
- Infrastructure kann ausgetauscht werden (z. B. SQL → anderes Storage).
- Presentation bleibt dünn, reduziert “Fat Controller”.

## Alternativen
1) Layered Architecture (klassisch)
   - Vorteile: Vertraut, schnell startbar
   - Nachteile: Businesslogik rutscht oft in UI/Services, Grenzen verwischen

2) Hexagonal Architecture (Ports & Adapters)
   - Vorteile: Sehr klare Adapter-Struktur
   - Nachteile: In der Praxis ähnlich, aber initial mehr Strukturarbeit/Schulung

## Konsequenzen
### Positiv
- Klare Verantwortlichkeiten und Abhängigkeitsrichtung
- Gute Testbarkeit der wichtigsten Logik

### Negativ / Trade-offs
- Mehr Initialstruktur (Projekte/Namespaces)
- Disziplin nötig, sonst “Abkürzungen” durchbrechen Grenzen

### Umsetzungshinweise
- Domain referenziert nichts außerhalb Domain
- Application darf Domain referenzieren
- Infrastructure darf Application + Domain referenzieren
- Presentation darf Application referenzieren (Infrastructure nur über Composition Root/DI)
- CI enthält Architekturstests, die diese Regeln prüfen

## Verweise
- ADR-00002 (Dependency Rules / Architekturtore)
- ADR-00003 (CQRS / Use Case Struktur)
- ADR-01600 (Bounded-Context-Katalog und BC-Kommunikation)
- ADR-08100 (Integration Events & Messaging)
