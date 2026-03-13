---
id: ADR-09000
title: Health Checks & Readiness Probes
status: accepted
date: 2026-01-21
scope: backend
enforced_by: code-review
affects:
  - backend
  - infrastructure
---

# ADR-09000 – Health Checks & Readiness Probes

## Entscheidungstreiber
- Stabiler Betrieb in orchestrierten Plattformen
- Saubere Trennung von Liveness, Readiness und Startup
- Verlässliche Deployments, Rollouts und Autoscaling
- Multi-Tenancy-taugliches Verhalten ohne Performance-Risiken
- Konsistenz mit Logging, Telemetry und CI/CD

## Kontext
Das System besteht aus:
- HTTP APIs
- Background Jobs / Worker
- Outbox Dispatcher

Es läuft in mehreren Environments und nutzt:
- Observability (Logging & Telemetry)
- CI/CD mit automatisierten Deployments
- Multi-Tenancy mit separaten Datenbanken pro Tenant

Health Checks sind zentrale Steuerungsinstrumente für:
- Traffic-Zulassung
- Rollouts
- Restart-Entscheidungen
- Monitoring

## Entscheidung

---

### 1) Ziel & Scope
Health Checks dienen:

- Plattform-Orchestrierung
- Load Balancer / Traffic Steering
- Monitoring & Alerting

Sie gelten für:
- API
- Background Jobs / Worker
- Integrations-Dispatcher (Outbox)

---

### 2) Health-Check-Typen
Es werden **drei Typen** unterschieden:

- **Liveness** – läuft der Prozess?
- **Readiness** – kann Traffic verarbeitet werden?
- **Startup** – Initialisierung abgeschlossen?

Jeder Typ erhält einen **eigenen Endpoint**.

---

### 3) Abhängigkeiten & Prüftiefe
Health Checks dürfen prüfen:

- Datenbank
- Message Broker / Queue
- Key Vault / Secrets

Externe APIs werden **nicht** geprüft.

**Prüftiefe:**  
Kombiniertes Modell:
- Shallow Checks für Liveness
- Deep Checks (echte Roundtrips) für Readiness

---

### 4) Multi-Tenancy
Tenant-spezifische Health Checks werden **kombiniert** umgesetzt:

- Systemweite Checks
- Sampling über ausgewählte Tenants

Regeln:
- Keine vollständigen Tenant-Loops
- Sampling ist erlaubt und bevorzugt

---

### 5) Status-Logik
Ein Service gilt als **unhealthy**, wenn:

- eine kritische Kernabhängigkeit nicht verfügbar ist

**Readiness bei partiellen Fehlern:**
- Ready mit Degradation (Traffic erlaubt, eingeschränktes Verhalten)

---

### 6) Sicherheit & Zugriff
Health Endpoints sind:

- **intern zugänglich** (Netzwerk / Platform)

Detailinformationen:
- konfigurierbar
- intern erlaubt
- extern nur aggregierter Status

---

### 7) Integration mit CI/CD & Platform
Health Checks werden genutzt für:

- Startup- & Readiness-Gates
- Rollout-Entscheidungen

Autoscaling berücksichtigt:
- Health-Status
- Telemetry/Metrics

---

### 8) Observability
**Logging:**
- Nur Fehler werden geloggt (Noise vermeiden)

**Telemetry:**
- Health Status als Metrics
- Aggregierte Zustände zusätzlich verfügbar

---

### 9) Tests
Tests umfassen:

- Unit Tests für Health-Check-Logik
- Integration Tests für Abhängigkeiten

---

### 10) Governance & ArchTests
ArchTests erzwingen:

1) Keine Domain-Abhängigkeiten in Health Checks
2) Keine Tenant-Loops
3) Keine externen Calls im Liveness-Check
4) Klare Trennung von Liveness, Readiness und Startup

CI schlägt fehl, wenn Regeln verletzt werden.

---

## Begründung
- Getrennte Health-Typen ermöglichen präzise Plattformsteuerung
- Sampling vermeidet Skalierungsprobleme bei vielen Tenants
- Degraded Readiness erhöht Verfügbarkeit
- Keine externen API-Checks vermeiden Kaskadenfehler
- Integration in CI/CD erhöht Deployment-Sicherheit

## Konsequenzen

### Positiv
- Stabilere Deployments
- Bessere Skalierbarkeit
- Klare Betriebssignale
- Geringes Rauschen in Logs

### Negativ / Trade-offs
- Zusätzlicher Implementierungsaufwand
- Entscheidung über „kritische Abhängigkeiten“ erforderlich
- Sampling erfordert saubere Auswahlstrategie

## Umsetzungshinweise
- Separate Endpoints für Liveness/Readiness/Startup
- Liveness strikt ohne externe Abhängigkeiten
- Readiness mit Timeouts und klaren SLAs
- Tenant-Sampling konfigurierbar halten
- Health-Metrics an Monitoring-System anbinden
- Health Checks niemals Business-Logik ausführen

## Verweise
- ADR-04000 (Logging)
- ADR-04100 (Telemetry & Observability)
- ADR-05500 (Background Jobs)
- ADR-06000 (Multi-Tenancy)
- ADR-08300 (CI/CD Pipelines)
- ADR-00002 (ArchTests / Gates)
