---
id: ADR-08200
title: Terraform / Infrastructure as Code
status: accepted
date: 2026-01-21
scope: infrastructure
enforced_by: code-review
affects:
  - infrastructure
---

# ADR-08200 – Terraform / Infrastructure as Code

## Entscheidungstreiber
- Reproduzierbare, versionierte Infrastruktur
- Klare Trennung zwischen Applikation und Infrastruktur
- Multi-Environment- und Multi-Tenant-Fähigkeit
- Governance, Security und Compliance
- Automatisierung und Reviewbarkeit über CI/CD

## Kontext
Das System wird in Azure betrieben und nutzt:
- Multi-Tenancy mit separaten Datenbanken pro Tenant
- CI/CD Pipelines
- Security über Entra ID, Key Vault und Managed Identities
- Observability (Logging, Telemetry)

Infrastruktur darf nicht manuell gepflegt werden und muss
vollständig nachvollziehbar, wiederherstellbar und reviewbar sein.

## Entscheidung

---

### 1) Scope & Verantwortung
Terraform verwaltet **die gesamte Infrastruktur**:

- Resource Groups, Networking
- App Services / Container Apps
- Azure SQL
- Key Vault
- Storage, Service Bus
- Entra ID App Registrations, Rollen, Permissions
- Monitoring (App Insights, Log Analytics)

Terraform ist die **Single Source of Truth** für Infrastruktur.

---

### 2) Repository- & Modulstruktur
- Terraform liegt in einem **separaten Infrastructure-Repository**
- Wiederverwendbare Komponenten werden als **eigene Module** gepflegt
- Root-Konfigurationen binden Module pro Environment ein

Beispiel:
infra/
  ├─ modules/
  │ ├─ sql/
  │ ├─ app/
  │ ├─ keyvault/
  │ └─ monitoring/
  └─ environments/
    ├─ dev/
    ├─ test/
    └─ prod/

---

### 3) Environments & State
**Environments:**
- mehrere Environments (z. B. dev, test, prod, ggf. weitere)

**Terraform State:**
- Remote State in Azure Storage
- State Locking aktiviert

**State-Trennung:**
- getrennt **pro Environment**
- zusätzlich **pro Infrastruktur-Komponente**, wo sinnvoll

---

### 4) Secrets & Konfiguration
- Secrets werden primär im **Azure Key Vault** verwaltet
- Terraform darf Secrets setzen oder referenzieren (kontrolliert)

**App Settings & Connection Strings:**
- Mischung aus Terraform (Infrastruktur-nahe Settings)
- und CI/CD (deploy-spezifische Werte)

Keine Secrets im Repository.

---

### 5) Multi-Tenancy & Tenant Provisioning
Tenant-Infrastruktur wird über ein **kombiniertes Modell** erstellt:

- Basis-Infrastruktur über Terraform
- Tenant-spezifische Ressourcen (z. B. DBs) können:
  - infra-getrieben (Terraform)
  - oder app-getrieben (Onboarding-Prozess)
  erstellt werden

Secrets & Keys:
- Mischung aus globalen und tenant-spezifischen Secrets
- konsistent über Key Vault

---

### 6) Governance & Compliance
- Einheitliche **Naming- und Tagging-Standards** sind verpflichtend
- Azure Policies / Guardrails werden berücksichtigt
- Infrastruktur-Drift ist nicht erlaubt

---

### 7) Terraform CI/CD
Terraform Pipeline enthält:

- `terraform fmt`
- `terraform validate`
- `terraform plan` (Pull Request)
- `terraform apply` (Main Branch)

**Produktiv-Änderungen erfordern Approval.**

---

## Begründung
- Terraform als IaC ermöglicht Wiederholbarkeit und Reviewbarkeit
- Modulstruktur reduziert Duplication
- Remote State + Locking verhindert Konflikte
- Trennung von Infra und App erhöht Sicherheit
- Kombiniertes Tenant-Modell erlaubt Flexibilität

## Konsequenzen

### Positiv
- Vollautomatisierte Infrastruktur
- Nachvollziehbare Änderungen
- Saubere Trennung von Verantwortlichkeiten
- Gute Skalierbarkeit

### Negativ / Trade-offs
- Höherer Initialaufwand
- Terraform-Know-how erforderlich
- Koordination zwischen App- und Infra-Teams notwendig

## Verweise
- ADR-06000 (Multi-Tenancy)
- ADR-06100 (Tenant-aware Migrations & Seed Data)
- ADR-08300 (CI/CD Pipelines)
- ADR-00001 (Clean Architecture)
