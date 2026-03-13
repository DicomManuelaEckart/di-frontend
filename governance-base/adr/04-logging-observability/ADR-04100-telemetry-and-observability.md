---
id: ADR-04100
title: Telemetry & Observability (Tracing, Metrics, Health)
status: accepted
date: 2026-01-21
scope: backend
enforced_by: code-review
affects:
  - backend
  - infrastructure
---

# ADR-04100 – Telemetry & Observability (Tracing, Metrics, Health)

## Entscheidungstreiber
- Transparenz über Laufzeitverhalten, Performance und Stabilität
- Ergänzung zu Logging (ADR-04000), nicht Ersatz
- Unterstützung von Betrieb, Debugging und Skalierung
- Klare Trennung von Telemetry, Logging und Audit
- Agenten- und CI-fähige Governance

## Kontext
Das System verfügt bereits über:
- Technisches Logging (ADR-04000)
- Security Audit Logging (ADR-03400)
- Request Context (ADR-05300)

Telemetry & Observability liefern zusätzliche Signale:
- **Traces**: Wie fließt ein Request durch das System?
- **Metrics**: Wie performant und stabil ist das System?
- **Health**: Ist das System (und seine Abhängigkeiten) funktionsfähig?

Diese Signale müssen konsistent, datenschutzkonform und skalierbar erhoben werden.

## Entscheidung

---

### 1) Ziel & Scope
Telemetry dient gemeinsam der Beobachtung von:

- Performance (Latenzen, Durchsatz)
- Stabilität (Error Rates, Ausfälle)
- Abhängigkeiten (Datenbank, externe Services)

Zum Scope gehören explizit:
- Distributed Tracing
- Metrics
- Dependency Tracking
- Health Signals

---

### 2) Distributed Tracing
Es wird **End-to-End Distributed Tracing** eingesetzt:

- vom Ingress (HTTP)  
- über Application Use Cases  
- bis zu Datenbanken und externen Abhängigkeiten

#### Trace-Granularität
- Automatische Traces durch Frameworks/Libraries
- **Zusätzlich manuelle Spans an Use-Case-Grenzen**

#### Trace-Namen
Es gibt zwei klar getrennte Ebenen:
- **Technische Traces**: HTTP Route / Method
- **Fachliche Traces**: Use-Case-Namen (Commands/Queries)

---

### 3) Metrics
Folgende Metriken werden erfasst:

- HTTP Request Duration
- Error Rate
- Throughput
- DB Query Duration
- External Dependency Duration
- Custom Application Metrics (z. B. Use-Case-Dauer)

#### Custom Metrics
- Erlaubt, aber **sparsam und standardisiert**
- Keine unkontrollierte Metrik-Explosion
- Fokus auf geschäftlich oder betrieblich relevante Kennzahlen

---

### 4) Korrelation & Context
- **CorrelationId** (ADR-05300) wird für Traces verwendet
- **TenantId** wird als Trace-Attribut geführt

**Nicht enthalten als Telemetry-Attribute:**
- UserId (PII-Risiko)
- Culture

---

### 5) Sampling & Performance
#### Trace Sampling
- Sampling ist **umgebungsabhängig**:
  - Development: kein oder sehr geringes Sampling
  - Production: Sampling aktiv

#### Sampling-Regeln
- **Errors werden niemals gesampled**
- Erfolgreiche Traces können gesampled werden
- Sampling ist konfigurierbar

Audit Logs sind **nicht** Bestandteil von Sampling.

---

### 6) Health & Readiness
Das System stellt Health Endpoints bereit für:

- **Liveness**
- **Readiness**
- **Dependency Checks** (z. B. DB, externe Services)

#### Health-Status
- Neben `Up/Down` existiert der Zustand **Degraded**
- Ermöglicht differenzierte Betriebsentscheidungen

---

### 7) Abhängigkeiten & Architektur
Telemetry wird angebunden:

- über **Abstraktionen**
- ohne direkten Vendor Lock-in

Konkrete Implementierungen (z. B. OpenTelemetry, Cloud-Provider)
sind austauschbar.

---

### 8) Tests
Tests dürfen Telemetry prüfen:

- **Presence-Tests** (Span/Metrik wurde erzeugt)
- keine Detail- oder Backend-spezifischen Assertions

Telemetry wird nicht vollständig „durchgetestet“, sondern strukturell abgesichert.

---

### 9) Governance & ArchTests
ArchTests erzwingen:

1) Keine Telemetry-Abhängigkeiten im Domain Layer
2) Telemetry nur über definierte Abstraktionen
3) Keine PII in Traces oder Metrics
4) Keine direkte Tool-Abhängigkeit in Application/Domain

CI schlägt fehl, wenn Regeln verletzt werden.

---

## Begründung
- Telemetry ergänzt Logging um zeitliche und strukturelle Sicht
- End-to-End Tracing ermöglicht Ursachenanalyse über Systemgrenzen
- Metrics liefern langfristige Trends und SLO-Grundlagen
- Sampling schützt Performance und Kosten
- Abstraktionen verhindern Vendor Lock-in
- Klare Governance schützt Datenschutz und Architektur

## Konsequenzen

### Positiv
- Hohe Transparenz über Systemverhalten
- Schnellere Fehler- und Performance-Analyse
- Gute Grundlage für Skalierung und Betrieb
- Saubere Trennung von Logging, Audit und Telemetry

### Negativ / Trade-offs
- Zusätzlicher Initialaufwand
- Mehr Konfigurationsbedarf (Sampling, Metrics)
- Disziplin nötig bei Custom Metrics

## Umsetzungshinweise
- Tracing am Ingress starten
- Manuelle Spans an Application-Use-Case-Grenzen
- CorrelationId aus Request Context übernehmen
- TenantId als Attribut setzen
- Health Checks klar zwischen Liveness/Readiness/Dependencies trennen
- Sampling-Konfiguration umgebungsabhängig pflegen

## Verweise
- ADR-04000 (Logging Strategy & Guidelines)
- ADR-03400 (Security Audit & Authorization Logging)
- ADR-05300 (Request Context)
- ADR-05000 (Localization / i18n)
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests / Gates)
