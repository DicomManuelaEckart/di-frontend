---
id: ADR-09100
title: SLOs, Alerts & Operational Monitoring
status: accepted
date: 2026-01-21
scope: infrastructure
enforced_by: code-review
affects:
  - backend
  - infrastructure
---

# ADR-09100 – SLOs, Alerts & Operational Monitoring

## Entscheidungstreiber
- Verlässliche, messbare Service-Qualität im Betrieb
- Orientierung an SRE-Prinzipien inkl. Error Budgets
- Wenige, hochwertige Alerts statt Alert-Fatigue
- Transparenz für Engineering, Betrieb und Stakeholder
- Enge Kopplung an CI/CD, Releases und Betriebsentscheidungen

## Kontext
Das System verfügt über:
- Zentrales Logging (ADR-04000)
- Telemetry & Metrics (ADR-04100)
- Health Checks & Readiness (ADR-09000)
- CI/CD mit Release-Gates (ADR-08300)
- Multi-Tenancy (ADR-06000)

Operational Monitoring soll nicht nur Probleme melden,
sondern **Entscheidungen steuern** (Deployments, Priorisierung, Stabilisierung).

## Entscheidung

---

### 1) Ziel & Philosophie
SLOs dienen:
- Reporting
- Engineering-Leitplanken (Error Budgets)
- Alerting

Das System folgt **SRE-Prinzipien**:
- Error Budgets sind zentraler Steuerungsmechanismus
- Stabilität ist eine explizite Produktanforderung

---

### 2) Scope der SLOs
SLOs gelten für:

- API
- Background Jobs / Worker
- Integrationen (Outbound Calls)

SLOs werden definiert als **Mischmodell**:
- systemweit
- pro Service
- für kritische Endpoints / Use Cases

---

### 3) SLO-Metriken
Relevante Metriken:

- Availability / Success Rate
- Latency (z. B. p95 / p99)
- Error Rate
- Job Success Rate
- Queue Lag / Backlog

Welche Errors zählen gegen SLOs ist **konfigurierbar**
(z. B. nur 5xx, oder bestimmte 4xx ausgeschlossen).

---

### 4) Multi-Tenancy & SLOs
SLOs werden kombiniert ausgewertet:

- global aggregiert
- zusätzlich für ausgewählte, relevante Tenants

Regeln:
- Einzelne Tenants dürfen SLOs verletzen,
  ohne automatisch einen globalen Alarm auszulösen
- Tenant-spezifische Auffälligkeiten sind dennoch sichtbar

---

### 5) Alerts – Wann & Wie
Alerts werden ausgelöst bei:

- tatsächlichen SLO-Verletzungen
- drohenden Verletzungen (Error Budget Burn Rate)

Alert-Philosophie:
- **wenige, hochqualitative Alerts**
- Alerts sind handlungsorientiert

---

### 6) Alert-Ziele & Eskalation
Alerts werden verteilt an:

- On-Call / Pager
- Chat (z. B. Teams)
- Ticket-System

Eskalation erfolgt kombiniert:
- zeitbasiert
- severity-basiert

---

### 7) Dashboards & Transparenz
Dashboards umfassen:

- technische Dashboards (Ops / Engineering)
- produkt- und businessnahe Dashboards

Sichtbarkeit:
- organisationweit (Engineering, Produkt, Stakeholder)

Optional können ausgewählte Kennzahlen extern geteilt werden
(z. B. Status Page), dies ist jedoch nicht verpflichtend.

---

### 8) CI/CD & Error Budgets
SLOs beeinflussen Deployments:

- Bei aufgebrauchtem Error Budget kann ein **Deployment Freeze**
  ausgelöst werden
- Ausnahmen sind explizite Management- oder Incident-Entscheidungen

Release-Gates prüfen nach Deploy:
- Health Checks
- Telemetry (Errors, Latency)
- frühe SLO-Indikatoren

---

### 9) Quelle der Wahrheit & Korrelation
Quelle der Wahrheit ist ein **kombiniertes Modell**:

- Metrics (primär für SLOs & Alerts)
- Logs (Analyse & Debugging)
- Traces (Root Cause Analyse)

SLO-Verletzungen müssen auf:
- Requests
- Traces
- CorrelationIds

zurückführbar sein.

---

### 10) Tests
SLO- und Alert-Regeln werden kombiniert geprüft:

- automatisierte Tests / Simulationen
- manuelle Verifikation bei Änderungen

Ziel:
- Vermeidung von Fehlalarmen
- Sicherstellung korrekter Schwellenwerte

---

### 11) Governance
Governance-Regeln:

- Alerts werden **nicht** auf Logs definiert
- Alerts basieren ausschließlich auf Metrics
- SLOs sind versioniert und dokumentiert
- Änderungen an SLOs/Alerts erfolgen kontrolliert (Review)

ArchTests und CI-Gates unterstützen diese Regeln indirekt
(z. B. über Telemetry-Pflicht und Naming-Konventionen).

---

## Begründung
- SLOs machen Qualität messbar und steuerbar
- Error Budgets schaffen Balance zwischen Feature-Delivery und Stabilität
- Wenige Alerts reduzieren Stress und erhöhen Wirksamkeit
- Tenant-spezifische Auswertungen erhöhen Fairness und Transparenz
- Enge CI/CD-Integration verhindert riskante Deployments

## Konsequenzen

### Positiv
- Vorhersagbarer Betrieb
- Klare Priorisierung bei Störungen
- Hohe Transparenz für alle Beteiligten
- Bessere Zusammenarbeit zwischen Dev & Ops

### Negativ / Trade-offs
- Initialer Aufwand für Definition & Kalibrierung
- Erfordert Disziplin bei Pflege und Review
- Nicht alle Qualitätsaspekte sind sofort messbar

## Umsetzungshinweise
- SLOs klar dokumentieren (Definition, Messung, Zielwert)
- Burn-Rate-Alerts bevorzugen gegenüber statischen Schwellen
- Dashboards als „Single Pane of Glass“ pflegen
- Error Budget Status regelmäßig reviewen (z. B. Sprint-Retro)
- Alerts regelmäßig evaluieren und reduzieren

## Verweise
- ADR-04000 (Logging)
- ADR-04100 (Telemetry & Observability)
- ADR-09000 (Health Checks & Readiness Probes)
- ADR-08300 (CI/CD Pipelines & Environment Strategy)
- ADR-06000 (Multi-Tenancy)
- ADR-00002 (ArchTests / Gates)
