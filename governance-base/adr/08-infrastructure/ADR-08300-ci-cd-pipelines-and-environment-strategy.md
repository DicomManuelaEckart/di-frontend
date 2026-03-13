---
id: ADR-08300
title: CI/CD Pipelines & Environment Strategy
status: accepted
date: 2026-01-21
scope: infrastructure
enforced_by: code-review
affects:
  - backend
  - frontend
  - infrastructure
---

# ADR-08300 – CI/CD Pipelines & Environment Strategy

## Entscheidungstreiber
- Hohe Code- und Architekturqualität
- Schnelle Feedback-Zyklen
- Sichere Deployments in mehreren Environments
- Nachvollziehbare Releases
- Konsistenz mit Testing-, Security- und Infra-ADRs

## Kontext
Das System besteht aus mehreren Repositories
und wird automatisiert gebaut, getestet und deployed.
CI/CD ist ein zentrales Qualitäts- und Governance-Instrument.

## Entscheidung

---

### 1) CI – Quality Gates
Pflicht-Gates in jeder CI-Pipeline:

- Build
- Unit Tests
- Architecture Tests
- Code Coverage Gate
- Linting / Formatting
- SAST / Dependency Scans

Ein Build schlägt fehl, wenn ein Gate verletzt wird.

---

### 2) Pipeline-Strategie
- **Pro Repository eine eigene Pipeline**
- Gemeinsame Standards über Templates / Konventionen

---

### 3) Deployment Targets
Deployments erfolgen auf:

- App Service
- Container Apps

Strategie abhängig vom Environment:
- Dev: schneller, weniger restriktiv
- Prod: kontrolliert, stabil

---

### 4) Branching & Promotion
**Branching-Modell:**
- trunk-based
- `dev` Branch → Dev-System
- `main` Branch → Prod-System
- Short-lived Feature Branches

**Promotion:**
- trunk-based mit klar getrennten Environments
- keine klassischen Stages (stage/test optional)

---

### 5) Versioning
- Automatisches Versioning (z. B. GitVersion)
- Versionen sind eindeutig, reproduzierbar und traceable

---

### 6) Secrets & Konfiguration
- Secrets ausschließlich aus **Azure Key Vault**
- Keine Secrets in Pipelines oder Repos

**Konfiguration:**
- Mischung:
  - environment variables (12-factor)
  - env-spezifische Konfigurationsdateien, wo sinnvoll

---

### 7) Datenbank-Migrationen
Migrationen folgen einem **kombinierten Modell**:

- Admin-/Ops-Jobs
- Pipeline Steps
- optional Application Startup (kontrolliert)

Nie ungeprüft im normalen Request-Flow.

---

### 8) Rollback-Strategie
- Rollback durch Redeploy der vorherigen Version
- Datenbank ist **forward-only**
- Rollbacks sind kontrollierte Ops-Entscheidungen

---

### 9) Release Gates & Monitoring
Nach jedem Deploy:

- Smoke Tests / Health Checks
- API-Vertragsprüfungen
- Telemetry & Error Monitoring (definiertes Zeitfenster)

Deployments können bei Auffälligkeiten gestoppt werden.

---

### 10) Artefakte & Images
- **Build once, promote artifact**
- Keine Rebuilds pro Environment
- Container Images liegen in **Azure Container Registry (ACR)**

---

### 11) Blue/Green Deployment-Strategie (Fragebogen §11.2)

Die Deployment-Strategie für Production ist **Blue/Green** – zwei identische Umgebungen (Slots), zwischen denen per Traffic-Switch gewechselt wird.

| Aspekt | Entscheidung |
|--------|-------------|
| **Strategie** | Blue/Green via Azure Deployment Slots (App Service) bzw. Revisions (Container Apps) |
| **Zero-Downtime** | Ja – der Slot-Swap ist atomar, kein Cold Start für Endbenutzer |
| **Rollback** | Sofortiger Swap zurück auf die vorherige Version (Sekunden, nicht Minuten) |
| **Verworfene Alternativen** | Canary (zu komplex für v1, erfordert Traffic-Splitting-Logik), Rolling Update (kein sofortiger Rollback) |

**Ablauf (App Service / Container Apps):**

| Schritt | Beschreibung |
|---------|-------------|
| 1 | Neues Artefakt in **Staging Slot** (Green) deployen |
| 2 | Health Checks + Smoke Tests gegen Staging Slot ausführen |
| 3 | Datenbank-Migrationen ausführen (forward-only, §7) – kompatibel mit alter **und** neuer Version (Expand/Contract) |
| 4 | Staging Slot warm-up (Pre-Warm: Application Startup, Cache-Fill, Connection Pool) |
| 5 | **Slot Swap** (Traffic-Switch Blue ↔ Green) – atomar, zero-downtime |
| 6 | Post-Deployment Monitoring (§9): Fehlerrate, Latency, Exceptions – definiertes Zeitfenster (15 Min) |
| 7 | Bei Auffälligkeiten: **sofortiger Swap-Back** auf vorherige Version |
| 8 | Nach erfolgreicher Validation: alter Slot (jetzt Staging) steht für nächstes Deployment bereit |

**Regeln:**
- Datenbank-Migrationen müssen **vorwärts- und rückwärtskompatibel** sein (Expand/Contract-Pattern) – alter Code muss mit neuem Schema funktionieren und umgekehrt, da während des Swaps kurzzeitig beide Versionen laufen könnten.
- **Staging Slot** hat identische Konfiguration wie Production (gleiche App Settings, gleiche Managed Identities, gleiche Connection Strings zu Production-Ressourcen).
- Der Slot-Swap tauscht **nur Traffic-Routing**, nicht die Konfiguration – slot-spezifische Settings (z.B. `SLOT_NAME`) bleiben erhalten.
- Deployments auf **Dev/Test** nutzen kein Blue/Green (dort: Direct Deployment für Geschwindigkeit).
- **Wartungsfenster**: Sonntag 02:00–06:00 CET für Deployments, die nicht zero-downtime-fähig sind (z.B. große Schema-Migrationen). Reguläre Deployments sind jederzeit möglich.

---

## Begründung
- Harte CI-Gates sichern Architektur und Qualität
- Trunk-based Development reduziert Komplexität
- Build-once-Deploy-many verhindert Drift
- **Blue/Green Deployment** ermöglicht Zero-Downtime-Releases und sofortigen Rollback durch Slot-Swap – die sicherste Strategie für ein SaaS-ERP mit 500+ Tenants
- Klare Rollback-Strategie erhöht Sicherheit: Swap-Back in Sekunden statt Minuten
- Monitoring als Release-Gate verbessert Betrieb
- Expand/Contract für DB-Migrationen stellt sicher, dass Blue/Green auch bei Schema-Änderungen funktioniert

## Konsequenzen

### Positiv
- Hohe Stabilität
- Schnelle Feedback-Zyklen
- Klare Verantwortlichkeiten
- Sehr gute Automatisierung
- **Zero-Downtime-Deployments** durch Blue/Green Slot-Swap
- **Sofortiger Rollback** (Sekunden) – kein erneuter Build oder Re-Deployment nötig

### Negativ / Trade-offs
- Strenge Gates erfordern Disziplin
- Initial höherer Pipeline-Aufwand
- DB-Migrationen müssen Expand/Contract-Pattern folgen (forward-only + rückwärtskompatibel), was Migrations-Design komplexer macht
- Staging Slot erzeugt zusätzliche Azure-Kosten (zweite Instanz permanent aktiv)
- Slot-spezifische vs. swap-fähige Settings müssen sorgfältig gepflegt werden

## Verweise
- ADR-02000–02200 (Testing & CI)
- ADR-07000 (API Contracts & Versioning)
- ADR-08000 (Persistence – EF Core Migrations)
- ADR-08200 (Terraform – Infrastruktur-Provisionierung inkl. Deployment Slots)
- ADR-04000 (Logging)
- ADR-04100 (Telemetry – Post-Deployment Monitoring)
- ADR-09000 (Betriebskonzept – Wartungsfenster)
