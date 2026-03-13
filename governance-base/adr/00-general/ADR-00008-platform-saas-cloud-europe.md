---
id: ADR-00008
title: Plattform-Entscheidung – Reines Cloud-SaaS-Produkt für den europäischen Markt
status: accepted
date: 2026-02-24
scope: global
enforced_by: convention
affects:
  - backend
  - frontend
  - infrastructure
---

# ADR-00008 – Plattform-Entscheidung: Reines Cloud-SaaS-Produkt für den europäischen Markt

## Entscheidungstreiber
- Langfristige Planbarkeit von Infrastruktur, Betriebsmodell und Architektur
- Reduzierung von Betriebskomplexität durch Fokussierung auf ein Deployment-Modell
- Datenschutz- und Compliance-Anforderungen (DSGVO, GoBD)
- Skalierungsanforderungen: 500–600 Mandanten in 5 Jahren
- Kosteneffizienz durch Shared Infrastructure (Azure Elastic Pools, gemeinsame Compute-Ressourcen)
- Kein Kundenwunsch nach On-Premise oder Private-Cloud-Betrieb

## Kontext
Das ERP-System wird als Neuentwicklung konzipiert. Vor Entwicklungsbeginn muss entschieden werden,
ob das Produkt als Cloud-Service, On-Premise-Software oder Hybrid angeboten wird.
Diese Entscheidung beeinflusst nahezu alle weiteren Architekturentscheidungen:
Deployment-Modell, Multi-Tenancy, Infrastruktur, Lizenzierung, Update-Strategie und Betrieb.

Bisherige Legacy-Systeme (gesoft, terra, bsi, dicommerce) laufen teilweise On-Premise
oder als Managed Hosting. Das neue System soll dieses Modell ablösen.

## Entscheidung

### 1) Reines Cloud-Produkt

Das ERP-System wird **ausschließlich als Cloud-SaaS-Produkt** betrieben.
Es gibt **kein On-Premise-Deployment** und **keine Private-Cloud-Option**.

### 2) SaaS-Betriebsmodelle

| Modell | Beschreibung | Zielgruppe |
|--------|-------------|------------|
| **SaaS Shared** | Multi-Tenant auf geteilter Infrastruktur (Database-per-Tenant, gemeinsame Compute) | Standard für alle Kunden |
| **SaaS Dedicated** | Single-Tenant auf dedizierter Infrastruktur (eigene App-Service-Instanz, eigene DB) | Enterprise-Kunden mit erhöhten Anforderungen (Aufpreis) |

Beide Modelle werden **von uns betrieben** – der Kunde hat keinen Zugriff auf Infrastruktur.

### 3) Datenresidenz: EU-only

Alle Daten (Datenbanken, Blob Storage, Caches, Logs, Backups) werden **ausschließlich in EU-Rechenzentren** gespeichert.

Freigegebene Azure-Regionen:
- **West Europe** (Amsterdam) – Primär
- **Germany West Central** (Frankfurt) – Sekundär / für deutsche Kunden mit spezifischen Anforderungen

Es gibt **keine mandantenspezifische Regionswahl** – alle Mandanten laufen in denselben EU-Regionen.

### 4) Skalierungsziel

- **500–600 Mandanten** innerhalb von 5 Jahren
- Database-per-Tenant mit **Azure Elastic Pools** zur Kostenoptimierung
- Compute via **Azure Container Apps** mit Auto-Scaling (siehe ADR-08300)

### 5) Verschlüsselung

| Schicht | Maßnahme |
|---------|----------|
| **At Rest** | Azure Storage Service Encryption (SSE) mit Microsoft-managed Keys |
| **In Transit** | TLS 1.3 (Minimum TLS 1.2) für alle Verbindungen |
| **Customer-managed Keys** | Nicht vorgesehen (kein Kundenwunsch) |

### 6) Kein On-Premise, keine Private Cloud

Das System wird **nicht** für den Betrieb außerhalb unserer Azure-Infrastruktur konzipiert.
Folgende Optionen werden **explizit ausgeschlossen:**
- On-Premise-Installation beim Kunden
- Deployment in kundeneigenen Cloud-Subscriptions
- Air-gapped / Offline-Deployments

## Begründung
- **Einheitlicher Betrieb:** Ein Betriebsmodell reduziert Komplexität bei Updates, Monitoring, Support und Incident-Handling erheblich.
- **Continuous Delivery:** Alle Mandanten erhalten Updates gleichzeitig – keine Versionsfragmentierung, kein Support für Altversionen.
- **Kosteneffizienz:** Shared Infrastructure (Elastic Pools, gemeinsame Container Apps) senkt die Kosten pro Mandant signifikant.
- **DSGVO-Konformität:** EU-only-Datenresidenz vereinfacht Compliance und vermeidet Schrems-II-Problematik.
- **Kein Marktbedarf:** Befragung ergab, dass kein Kunde dedizierte On-Premise-Infrastruktur verlangt.
- **Sicherheit:** Zentrale Kontrolle über Patches, Secrets-Rotation und Security-Updates – kein Risiko durch veraltete Kundeninstallationen.

## Alternativen

1) **Hybrid (Cloud + On-Premise)**
   - Vorteile: Breiterer Markt, Kunden mit strengen Compliance-Anforderungen bedienbar
   - Nachteile: Massive Komplexitätssteigerung (zwei Deployment-Pfade, Versionierung, Setup-Automatisierung, Support-Matrix), höhere Entwicklungskosten, langsamere Releases

2) **Private-Cloud-Option (Kunden-Subscription)**
   - Vorteile: Datensouveränität für Enterprise-Kunden
   - Nachteile: Kein direkter Zugriff auf Infrastruktur für Ops, erschwertes Monitoring, unkontrollierte Umgebungsvarianz, deutlich höherer Support-Aufwand

3) **Multi-Region mit mandantenspezifischer Regionswahl**
   - Vorteile: Latenz-Optimierung, Datenresidenz pro Land
   - Nachteile: Deutlich höhere Infrastrukturkosten, komplexe Datensynchronisation, derzeit kein Kundenbedarf außerhalb EU

## Konsequenzen

### Positiv
- Einheitliche Infrastruktur vereinfacht Betrieb, Monitoring und Incident-Response
- Schnellere Release-Zyklen (Blue/Green Deployment für alle Mandanten)
- Geringere Betriebskosten pro Mandant durch Shared Resources
- Einfachere Compliance: eine Region, ein Rechtsrahmen (EU/DSGVO)
- Zero-Downtime-Updates sind einfacher durchzusetzen ('wir kontrollieren die Umgebung')

### Negativ / Trade-offs
- Kunden mit strikten On-Premise-Anforderungen können nicht bedient werden
- Abhängigkeit von Microsoft Azure als Cloud-Provider
- Latenz für Kunden außerhalb Europas (falls internationaler Rollout erfolgt)
- Bei Azure-Ausfällen in EU-Regionen sind alle Mandanten betroffen

### Umsetzungshinweise
- Alle Terraform-Module und IaC-Definitionen gehen von Azure EU-Regionen aus (ADR-08200)
- Connection Strings, Storage-Accounts und Service-Bus-Namespaces werden in den freigegebenen Regionen provisioniert
- CI/CD-Pipelines deployen ausschließlich in Azure (ADR-08300)
- Die SaaS-Dedicated-Variante wird über Terraform-Module als eigenständige Ressourcengruppe realisiert (gleicher Code, separates Deployment)
- Tenant-Onboarding erstellt Ressourcen in den freigegebenen Regionen (siehe ADR-06200, geplant)
- Architektur muss auf **horizontale Skalierung** ausgelegt sein (Auto-Scaling für 500+ Tenants)
- Kein Code darf Annahmen über lokale Dateisysteme, lokale Netzwerke oder Offline-Betrieb treffen

## Verweise
- [ERP-Grundsatzentscheidungen-Fragebogen](../../docs/ERP-Grundsatzentscheidungen-Fragebogen.md) – §1.5, §19.2, §19.3, §21.5
- ADR-06000 – Multi-Tenancy (Database-per-Tenant)
- ADR-06200 – Tenant Lifecycle Management *(geplant)*
- ADR-08200 – Infrastructure as Code (Terraform)
- ADR-08300 – CI/CD Pipelines & Environment Strategy
- ADR-03500 – DSGVO, Datenschutz und Datenresidenz
