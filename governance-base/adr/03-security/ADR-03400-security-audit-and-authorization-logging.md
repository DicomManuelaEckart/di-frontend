---
id: ADR-03400
title: Security Audit & Authorization Logging
status: accepted
date: 2026-01-21
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-03400 – Security Audit & Authorization Logging

## Entscheidungstreiber
- Nachvollziehbarkeit sicherheitsrelevanter Aktionen
- Einheitliches Audit-Verhalten über alle Use Cases
- Unterstützung für Compliance, Debugging und Incident Analysis
- Klare Trennung von Audit, technischem Logging und Business-Logging
- Agenten- und CI-fähige Durchsetzung über ArchTests

## Kontext
Mit ADR-03100 und ADR-03200 ist festgelegt:
- Autorisierung erfolgt ausschließlich in der Application
- jede Command-Operation besitzt genau eine Permission
- Multi-Tenancy ist integraler Bestandteil des Security Contexts

Um Sicherheitsentscheidungen nachvollziehbar zu machen, benötigen wir ein konsistentes
Audit-Logging für Autorisierung und sicherheitsrelevante Aktionen – ohne PII-Leaks
und ohne Vermischung mit technischem Logging.

## Entscheidung

### 1) Scope des Audit Loggings
Audit Logging erfasst:

- **Autorisierungsentscheidungen** (Allowed / Denied)
- **sicherheitsrelevante Commands** (z. B. Create, Update, Delete, Approve)

Audit Logging gilt **ausschließlich für Commands**, nicht für Queries.

### 2) Pflichtfelder eines Audit-Eintrags
Jeder Audit-Eintrag enthält mindestens:

- `UserId` (Claim `oid`)
- `TenantId` (Claim `tid`)
- `Permission`
- `UseCase` (Command-Name)
- `Result` (Allowed / Denied / Failed)
- `Timestamp`

### 3) Fachliche Identifikatoren
Fachliche IDs (z. B. `CustomerId`, `OrderId`) dürfen im Audit enthalten sein.

- Keine fachlichen Texte
- Keine personenbezogenen Daten
- Nur technische oder fachliche Identifikatoren

### 4) Umgang mit PII
- **PII ist im Audit strikt verboten**
- Keine Namen, E-Mail-Adressen, Freitexte oder Payloads
- Schutz sensibler Daten erfolgt durch **Nicht-Erfassung**

### 5) Auslösung des Audit Loggings
Audit Logging wird **zentral in der Application** ausgelöst:

- z. B. über Pipeline Behavior / Middleware auf Command-Ebene
- Kein Audit-Code in Presentation
- Kein Audit-Code verteilt in einzelnen Use Cases (Ausnahme nur per ADR)

### 6) Synchronisation
Audit Logging erfolgt **transaktional über Domain Events und Outbox**:

- Sicherheitsrelevante Aktionen erzeugen Domain Events (z. B. `AuthorizationDecisionMade`)
- Diese werden in der Outbox persistiert (gleiche Transaktion wie der State Change, ADR-00006 / ADR-08100)
- Ein Audit-Consumer verarbeitet die Events und schreibt sie ins Log-System
- Dies garantiert: kein Audit-Eintrag geht verloren (im Gegensatz zu Fire-and-Forget-Logging)
- Gilt für Tenant-DBs und die Admin-DB gleichermaßen

### 7) Speicherung
Audit Logs werden initial in einem **zentralen Log-System** gespeichert
(z. B. Application Insights / Log Analytics).

- Kein eigenes Audit-DB-Schema in Phase 1
- Strukturierte Logs (kein Freitext)

### 8) Retention
Die Aufbewahrung von Audit Logs ist **konfigurierbar**:

- Standardwerte werden betrieblich oder compliance-getrieben festgelegt
- Keine feste Retention im Code verankert

### 9) Dev-Auth Verhalten
Audit Logs aus Dev-Auth werden **klar markiert**:

- z. B. Feld `IsDevAuth = true`
- Ermöglicht saubere Trennung von echten Sicherheitsereignissen
- Dev-Audit-Einträge werden nicht für Compliance ausgewertet

### 10) Tests
Tests dürfen Audit Logging prüfen:

- z. B. über Fake-/In-Memory-Audit-Sinks
- Fokus: „Audit wurde ausgelöst“ und „korrekte Metadaten“
- Keine Tests gegen konkrete Log-Backends

### 11) Governance & ArchTests
ArchTests erzwingen:

1) Audit Logging ist für alle relevanten Command-Use-Cases aktiv
2) Kein Audit-Code in Presentation
3) Audit-Modelle enthalten keine PII-Typen
4) Audit-Auslösung erfolgt ausschließlich zentral in der Application

CI schlägt fehl, wenn eine dieser Regeln verletzt wird.

## Begründung
- Zentralisiertes Audit verhindert Lücken und Inkonsistenzen
- Asynchrones Logging schützt Performance und Stabilität
- Striktes PII-Verbot reduziert Datenschutzrisiken
- Dev-Auth-Markierung verhindert falsche Interpretation von Logs
- ArchTests sichern langfristige Einhaltung

## Alternativen
1) Audit direkt in jedem Use Case
   - Vorteile: explizit
   - Nachteile: hoher Pflegeaufwand, inkonsistent

2) Synchrone Audit-Persistenz
   - Vorteile: sofortige Garantie
   - Nachteile: Performance- und Stabilitätsrisiken

3) Eigene Audit-DB von Beginn an
   - Vorteile: strukturierte Auswertung
   - Nachteile: hoher Initialaufwand, premature complexity

## Konsequenzen

### Positiv
- Hohe Transparenz sicherheitsrelevanter Aktionen
- Gute Basis für Compliance und Incident Analysis
- Saubere Trennung von Audit und Business-Logik
- Agenten- und CI-fähige Governance

### Negativ / Trade-offs
- Audit ist nicht Teil der Business-Transaktion
- Auswertung erfolgt initial über Log-Systeme, nicht relational
- Zusätzlicher Infrastrukturbedarf für Log-Analyse

## Umsetzungshinweise
- Audit-Events als Domain Events modellieren (z. B. `CommandAuthorized`, `CommandDenied`)
- Transport über Outbox (ADR-08100) – garantiert keine verlorenen Audit-Einträge
- Gilt für Tenant-DBs und Admin-DB gleichermaßen (ADR-01200 §6)
- Auslösung im Application Layer nach Authorization-Entscheidung
- Structured Logging (Key/Value), keine Message-Texte
- `IsDevAuth` aus Security Context ableiten
- Audit-Tests verwenden abstrahierten Sink/Interface

## Verweise
- ADR-03000 (Authentifizierung)
- ADR-03100 (Autorisierung)
- ADR-03200 (Permission-Katalog & Claim-Schema)
- ADR-03300 (Dev Authentication)
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests / Gates)
- ADR-09000 (Telemetry) (geplant)
