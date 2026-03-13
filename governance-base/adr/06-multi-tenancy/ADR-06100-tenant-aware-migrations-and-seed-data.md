---
id: ADR-06100
title: Tenant-aware Migrations & Seed Data
status: accepted
date: 2026-01-21
scope: backend
enforced_by: code-review
affects:
  - backend
  - infrastructure
---

# ADR-06100 – Tenant-aware Migrations & Seed Data

## Entscheidungstreiber
- Sichere und reproduzierbare Datenbankschemata pro Tenant
- Klare Trennung zwischen technischen und fachlichen Seed-Daten
- Unterstützung von Tenant Lifecycle (Onboarding, Betrieb, Upgrade)
- Konsistenz mit Multi-Tenancy, Idempotency und Background Jobs
- Auditierbarkeit und CI-fähige Durchsetzung

## Kontext
Das System nutzt **Separate Database pro Tenant** (ADR-06000).  
Datenbankänderungen (Schema + Daten) müssen daher:

- tenant-spezifisch ausgeführt werden
- wiederholbar und idempotent sein
- klar zwischen *Initialzustand* und *Upgrade* unterscheiden

Migrations und Seeds dürfen nicht implizit über HTTP-Flows ausgelöst werden
und müssen unter kontrollierten System-/Admin-Kontexten laufen.

## Entscheidung

---

### 1) Scope
Dieses ADR regelt:

- Datenbank-Migrationsstrategie pro Tenant
- Seed-Daten (technisch und fachlich)
- Fehler-, Rollback- und Recovery-Verhalten
- Governance, Tests und ArchTests

---

### 2) Migrationsstrategie
Migrations werden als **globales, einheitliches Migrations-Set** erstellt:

- Code-first (z. B. EF Core Migrations)
- Ein Migrationsverlauf für alle Tenants
- Keine tenant-spezifischen Migrationsdefinitionen

Migrationslogik enthält **keine Tenant-Fachlogik**.

---

### 3) Ausführung von Migrations
Migrations werden ausgeführt über ein **kombiniertes Modell**:

- **Explizite Admin-/Ops-Jobs** (bevorzugt, kontrolliert)
- **Optional beim Application-Startup** (klar getrennt und konfigurierbar)

HTTP-Requests dürfen **keine** Migrationen auslösen.

---

### 4) Tenant-Auflösung
Ziel-Tenants für Migrations werden bestimmt über:

- eine **Tenant Registry / Tenant Store**
- zentrale Auflösung: Tenant → Connection String

Migrationen können:
- tenant-übergreifend iterieren
- **parallel** ausgeführt werden (konfigurierbar, begrenzt)

---

### 5) Seed Data – Grundprinzip
Seed Data wird **bewusst in zwei Kategorien getrennt**:

1. **Technische / systemische Seeds**
2. **Fachliche Default-Seeds**

Diese Kategorien haben unterschiedliche Zeitpunkte und Regeln.

---

### 6) Technische / systemische Seeds
Technische Seeds umfassen z. B.:

- Lookup-Tabellen
- Systemwerte
- Pflicht-Permissions
- technische Konfigurationen

**Zeitpunkt:**
- Ausführung **bei Migrationen**
- **idempotent**

**Ziel:**
- Sicherstellen, dass alle Tenants technisch lauffähig bleiben

---

### 7) Fachliche Default-Seeds
Fachliche Seeds umfassen z. B.:

- Default-Rollen
- Initiale Fachkonfiguration
- Startwerte für neue Tenants

**Zeitpunkt:**
- **nur beim Tenant-Onboarding**

**Regeln:**
- keine automatische Ausführung bei späteren Migrationen
- keine unbeabsichtigten Änderungen an bestehenden Tenants
- explizite Fachentscheidung nötig für spätere Anpassungen

---

### 8) Idempotency & Schutzmechanismen
- Migrationen und Seeds sind **idempotent**
- Mehrfachausführung ist erlaubt und sicher

Schutzmechanismen:
- Versionierung
- Guards / Existenzprüfungen in der DB
- Kombination aus beiden

---

### 9) Fehler & Recovery
Bei Fehlern gilt ein **kombiniertes Modell**:

- Abbruch bei Fehlern (kein stiller Partial State)
- Retry für transiente Fehler
- Manueller Eingriff bei persistierenden Fehlern

Fehler sind klar sichtbar und nachvollziehbar.

---

### 10) Rollback
Rollback ist **teilweise unterstützt**:

- technische Migrations können Down-Migrations besitzen
- fachliche Seeds werden **nicht automatisch zurückgerollt**
- Rollback ist ein bewusstes, kontrolliertes Ops-Thema

---

### 11) Security & Berechtigungen
Migrationen und Seeds dürfen nur ausgeführt werden durch:

- **System-/Admin-Jobs**

Normale Application-Flows und HTTP-Endpunkte sind ausgeschlossen.

---

### 12) Audit
Folgende Aktionen werden auditiert:

- Migrationsläufe (Start, Ende, Version, Tenant)
- Seed-Ausführungen (Kategorie, Tenant)
- Fehlerfälle

Audit erfolgt konsistent zu ADR-03400.

---

### 13) Tests
Tests stellen sicher:

- Migrationen sind wiederholbar
- Seeds sind idempotent
- Technische und fachliche Seeds sind sauber getrennt
- Onboarding-Seeds laufen nur beim Tenant-Onboarding

Tests können Teil von CI-Pipelines sein (z. B. Test-Tenants).

---

### 14) Governance & ArchTests
ArchTests erzwingen:

1) Keine Tenant-Fachlogik in Migrationen
2) Trennung von Migrationen, technischen Seeds und fachlichen Seeds
3) Keine Migrationen oder Seeds aus HTTP-Flows
4) Seeds liegen nicht im Domain Layer

CI schlägt fehl, wenn Regeln verletzt werden.

---

## Begründung
- Einheitliche Migrationen reduzieren Komplexität
- Getrennte Seed-Kategorien verhindern fachliche Seiteneffekte
- Explizite Admin-Jobs erhöhen Kontrolle und Sicherheit
- Idempotency ermöglicht robuste Wiederholbarkeit
- Audit und Tests sorgen für Nachvollziehbarkeit und Compliance

## Konsequenzen

### Positiv
- Sichere Schema- und Datenverwaltung pro Tenant
- Klare Tenant-Onboarding-Prozesse
- Kontrollierte Upgrades bestehender Tenants
- Gute Grundlage für Skalierung und Automatisierung

### Negativ / Trade-offs
- Höherer initialer Implementierungsaufwand
- Mehr Ops-/Admin-Logik erforderlich
- Fachliche Änderungen benötigen explizite Upgrade-Strategien

## Umsetzungshinweise
- Migrationsausführung zentral kapseln (Service/Job)
- Technische Seeds klar kennzeichnen und idempotent halten
- Fachliche Seeds ausschließlich im Tenant-Onboarding
- Parallele Migrationen begrenzen (Throttling)
- Migrationsergebnisse pro Tenant persistieren
- Fehler frühzeitig sichtbar machen (Logs, Telemetry, Audit)

## Verweise
- ADR-06000 (Multi-Tenancy – Tenant Isolation & Data Scoping)
- ADR-05400 (Idempotency & Request Deduplication)
- ADR-05500 (Background Jobs & Application Boundaries)
- ADR-03400 (Security Audit)
- ADR-04000 (Logging)
- ADR-04100 (Telemetry & Observability)
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests / Gates)
