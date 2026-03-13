---
id: ADR-08000
title: Persistence (EF Core, SQL, Migrations)
status: accepted
date: 2026-01-21
scope: backend
enforced_by: code-review
affects:
  - backend
  - infrastructure
---

# ADR-08000 – Persistence (EF Core, SQL, Migrations)

## Entscheidungstreiber
- Saubere Persistenz für DDD-Aggregates
- Klare Trennung zwischen Domain, Application und Infrastructure
- Unterstützung von CQRS (optimierte Reads, konsistente Writes)
- Multi-Tenancy mit separaten Datenbanken pro Tenant
- Transaktionale Konsistenz inkl. Outbox Pattern
- Testbarkeit, Performance und Governance über ArchTests

## Kontext
Das System nutzt:
- Clean Architecture & DDD (01000–01999)
- CQRS (Reads ≠ Writes)
- Separate Database pro Tenant (ADR-06000)
- Tenant-aware Migrations & Seeds (ADR-06100)
- Idempotency & Background Jobs (ADR-05400, ADR-05500)

Persistenz darf die Domain nicht beeinflussen und muss
robust, testbar und skalierbar umgesetzt werden.

## Entscheidung

---

### 1) Datenbank & ORM
**Zieldatenbank:**
- **Azure SQL** (SQL Server kompatibel)

**ORM-Strategie (CQRS-orientiert):**
- **EF Core** für Writes (Aggregates, Change Tracking, Transaktionen)
- **Dapper** für Reads (optimierte SELECTs, Projections)

EF Core und Dapper werden **nicht gemischt** innerhalb eines Use Cases.

---

### 2) Trennung von Domain & Persistence
Die Domain ist **persistence-ignorant**:

- Keine EF Core Attribute in Domain-Modellen
- Keine DbContext- oder ORM-Abhängigkeiten im Domain Layer

---

### 3) Mapping-Strategie
Mapping erfolgt ausschließlich über:

- **Fluent API**
- separate Configuration-Klassen im Infrastructure Layer

Keine Attribute-basierten Mappings.

---

### 3.1) Naming Conventions für Datenbank-Objekte
**Tabellen- und Spaltennamen:**
- **PascalCase** für Tabellennamen: `Orders`, `OrderItems`
- **PascalCase** für Spaltennamen: `CustomerId`, `OrderDate`, `TotalAmount`

Begründung:
- Microsoft SQL Server / Azure SQL Standard
- EF Core Default Convention
- Konsistent mit .NET Naming Guidelines
- Keine Quoting-Probleme (im Gegensatz zu kebab-case)

**Explizite Konfiguration:**
```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<Order>(entity =>
    {
        entity.ToTable("Orders");
        entity.Property(e => e.CustomerId).HasColumnName("CustomerId");
    });
}
```

---

### 4) Aggregate & Repository-Pattern
Repositories gelten **nur für Aggregates**:

- Repositories kapseln Aggregate-Zugriffe
- Keine Repositories für einzelne Entities oder Value Objects
- Queries (Reads) umgehen Repositories und nutzen optimierte Read-Modelle

---

### 5) Unit of Work
Der **EF Core DbContext fungiert als Unit of Work**:

- Ein DbContext pro Use Case
- `SaveChanges()` definiert den Commit

Regeln:
- DbContext existiert ausschließlich im Infrastructure Layer
- Application nutzt Repositories, nicht DbContext direkt

---

### 6) Transaktionen & Konsistenz
Transaktionsstrategie ist ein **Mischmodell**:

- Eine Transaktion pro Use Case (Standard)
- Explizite Transaktionen bei komplexen Szenarien

---

### 7) Outbox Integration
Das **Outbox Pattern** ist integraler Bestandteil der Persistenz:

- Outbox-Einträge werden in derselben Transaktion wie fachliche Änderungen geschrieben
- Garantiert atomare Zustandsänderungen und Event-Erzeugung

---

### 8) Migrations
**Migrations-Erstellung:**
- Code-first (EF Core Migrations)

**Migrations-Ausführung:**
- gemäß ADR-06100:
  - bevorzugt über Admin-/Ops-Jobs
  - optional beim Application-Startup (klar getrennt & konfigurierbar)

HTTP-Flows dürfen keine Migrationen auslösen.

---

### 9) Multi-Tenancy & DbContext
Tenant-Isolation wird umgesetzt durch:

- **Separate DbContext-Instanz pro Tenant**
- Tenant → Connection String Resolver

Keine dynamischen Tenant-Switches innerhalb eines DbContext.

---

### 10) Query-Strategie (CQRS)
- **Writes:** EF Core + Repositories
- **Reads:** Dapper + explizite SQL Queries

Vorteile:
- klare Performance-Charakteristik
- keine versteckten DB-Zugriffe
- einfache Projections für API Contracts

---

### 11) Lazy Loading
**Lazy Loading ist verboten.**

Begründung:
- vermeidet versteckte Datenbankzugriffe
- verhindert N+1-Probleme
- erhöht Vorhersagbarkeit und Testbarkeit
- schützt Aggregate-Grenzen

Nur explizites oder eager Loading ist erlaubt.

---

### 12) Concurrency Control
Es wird **Optimistic Concurrency** verwendet:

- Concurrency Tokens (z. B. `RowVersion`)
- Konflikte werden als explizite Concurrency Errors behandelt

---

### 13) Tests
Persistenztests nutzen eine Kombination aus:

- SQLite / Testcontainer für Integrationstests
- Keine InMemory-Provider für realistische Tests

Tests stellen sicher:
- korrekte Mappings
- Transaktionsverhalten
- Tenant-Isolation
- Concurrency-Verhalten

---

### 14) Governance & ArchTests
ArchTests erzwingen:

1) Domain kennt kein EF Core
2) EF Core liegt ausschließlich im Infrastructure Layer
3) DbContext wird nicht direkt in Application genutzt
4) Lazy Loading ist deaktiviert
5) Repositories existieren nur für Aggregates

CI schlägt fehl, wenn Regeln verletzt werden.

---

## Begründung
- EF Core eignet sich hervorragend für Aggregate-Writes und Transaktionen
- Dapper ermöglicht performante, explizite Read-Modelle
- Persistence-Ignoranz schützt die Domain
- Separate DbContexts sichern Tenant-Isolation
- Verbot von Lazy Loading erhöht Transparenz und Stabilität
- ArchTests verhindern schleichende Architekturverletzungen

## Konsequenzen

### Positiv
- Hohe Performance und Vorhersagbarkeit
- Saubere Trennung von Reads und Writes
- Gute Unterstützung für Multi-Tenancy
- Testbare, robuste Persistenzschicht

### Negativ / Trade-offs
- Mehr initialer Implementierungsaufwand
- Zusätzlicher Mapping-Code
- Zwei Datenzugriffsansätze (EF Core + Dapper)

## Umsetzungshinweise
- DbContext pro Use Case instanziieren
- Tenant Connection String früh auflösen
- Mapping-Klassen klar pro Aggregate strukturieren
- Dapper-Queries explizit und versioniert halten
- Concurrency Errors sauber an ADR-05200 anbinden
- Lazy Loading explizit deaktivieren

## Verweise
- ADR-06000 (Multi-Tenancy)
- ADR-06100 (Tenant-aware Migrations & Seed Data)
- ADR-05400 (Idempotency)
- ADR-05500 (Background Jobs)
- ADR-07100 (External Integrations & ACL)
- ADR-08100 (Outbox Pattern & Integration Events)
- ADR-02000–02200 (Testing & CI)
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests / Gates)
