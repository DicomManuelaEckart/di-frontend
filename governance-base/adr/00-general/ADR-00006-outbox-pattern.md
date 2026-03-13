---
id: ADR-00006
title: Integration Reliability – Outbox Pattern
status: accepted
date: 2026-01-20
scope: backend
enforced_by: code-review
affects:
  - backend
---

# ADR-00006 – Integration Reliability: Outbox Pattern

## Entscheidungstreiber
- Zuverlässige Event-Publikation ohne Lost Messages
- Konsistenz zwischen DB-Commit und Event-Dispatch
- Vorbereitung auf spätere Integrationen

## Kontext
Sobald wir Domain Events/Integrationsereignisse publizieren (z. B. für E-Mail, andere Services,
Audit Streams), kann “DB commit ok, publish fail” zu Inkonsistenz führen.

## Entscheidung
Wir führen das Outbox Pattern ein:
- Outbox-Tabelle in der gleichen DB
- Schreiben in Outbox innerhalb derselben Transaktion wie der State Change
- Background Worker publiziert und markiert Ereignisse als verarbeitet
- Idempotenz über MessageId/Unique Constraint

## Begründung
- Verhindert verlorene Events bei Netzwerk-/Broker-Ausfällen
- Gut testbar und bewährt
- Kann zunächst ohne echten Broker starten (Fake Publisher), später Broker ergänzen

## Alternativen
1) Direkt publish nach DB commit
   - Vorteile: Einfach
   - Nachteile: Lost Messages möglich, keine Garantie

2) Distributed Transactions / 2PC
   - Vorteile: Theoretisch starke Konsistenz
   - Nachteile: Praktisch schwer, teuer, fehleranfällig

## Konsequenzen
### Positiv
- Zuverlässige Integration
- Nachvollziehbarkeit (Audit) über Outbox

### Negativ / Trade-offs
- Mehr Komponenten (Worker, Retry, Cleanup)
- Monitoring nötig (Backlog, Failures)

### Umsetzungshinweise
- Outbox-Schema standardisieren (Id, OccurredAt, Type, Payload, Version, ProcessedAt, Attempts, LastError)
- Worker läuft in derselben App (anfangs) oder als separater Prozess (später)
- Retry-Strategie + Dead-letter Konzept definieren

## Verweise
- ADR-00004 (Persistence)
- ADR-00003 (CQRS)
