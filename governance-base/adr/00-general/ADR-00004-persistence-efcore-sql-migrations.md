---
id: ADR-00004
title: Persistence – EF Core + SQL + Migrations
status: accepted
date: 2026-01-20
scope: backend
enforced_by: code-review
affects:
  - backend
---

# ADR-00004 – Persistence: EF Core + SQL + Migrations

## Entscheidungstreiber
- Produktive Datenhaltung mit guter Tooling-Unterstützung
- Reproduzierbarer Setup (local + CI)
- Transaktionen, Constraints, Migrations

## Kontext
Wir benötigen eine relationale Datenbank und wollen Datenmodelländerungen versionieren.
Das Projekt soll schnell startbar sein und bei Neuaufsetzen deterministisch migrieren.

## Entscheidung
Wir verwenden:
- SQL Datenbank (konkret: SQL Server oder PostgreSQL je nach Hosting)
- EF Core als ORM
- Code-First Migrations als Standardmechanismus

## Begründung
- Migrations liefern reproduzierbaren DB-Stand
- EF Core ist im .NET-Ökosystem etabliert, gute Integrationen
- Transaktionen und Constraints sind zuverlässig abbildbar

## Alternativen
1) Dapper / SQL First
   - Vorteile: Sehr performant, explizite SQL-Kontrolle
   - Nachteile: Mehr Handarbeit, Migrations/Schema-Management komplexer

2) NoSQL (z. B. Cosmos DB)
   - Vorteile: Flexible Schemas, Skalierung
   - Nachteile: Für viele Domänenregeln/Joins/Reporting unnötig komplex

## Konsequenzen
### Positiv
- Saubere Versionierung des Schemas
- Entwickler können lokal schnell starten

### Negativ / Trade-offs
- EF Core kann “leaky abstractions” haben (N+1, Tracking, etc.)
- Migrations müssen gepflegt und reviewt werden

### Umsetzungshinweise
- Domain bleibt persistence-ignorant (keine EF Attributes in Domain)
- Infrastructure enthält DbContext + Mappings/Configurations
- Migrationen werden im Repo versioniert und in CI geprüft/ausgeführt (Smoke)

## Verweise
- ADR-00001, ADR-00002
- ADR-00006 (Outbox)
