---
id: ADR-08500
title: File Storage und Dokumentenmanagement (Azure Blob Storage, Tenant-isoliert)
status: accepted
date: 2026-02-24
scope: backend
enforced_by: code-review
affects:
  - backend
  - infrastructure
---

# ADR-08500 – File Storage und Dokumentenmanagement

## Entscheidungstreiber
- ERP-Systeme verarbeiten große Mengen an Dokumenten (Belege, Rechnungen, Anhänge, Exportdateien)
- Strikte Mandantentrennung: kein Cross-Tenant-Zugriff auf Dateien (ADR-06000)
- Kosteneffizienter, skalierbarer Speicher für 500–600 Tenants (ADR-00008)
- Sicherheit: kein direkter Blob-Zugriff durch Clients ohne Berechtigungsprüfung
- Revisionssicherheit: GoBD-relevante Dokumente müssen unveränderbar archivierbar sein (ADR-50000)
- Datenresidenz: EU-only (ADR-00008)
- Tenant Lifecycle: Container-Löschung bei Tenant-Deaktivierung (ADR-06200)

## Kontext
Das System benötigt File Storage für:
- **Beleganhänge** (PDF-Rechnungen, Lieferscheine, Verträge)
- **Import-/Exportdateien** (DATEV-Export, CAMT-Import, CSV/Excel, ADR-50100)
- **E-Rechnungen** (ZUGFeRD/XRechnung XML/PDF, ADR-50100)
- **Report-Outputs** (generierte PDFs, Excel-Exporte)
- **Audit-Archivierung** (Cold Storage für alte Audit-Daten, ADR-05800)
- **Mandanten-Assets** (Logos, Briefkopf-Templates, ADR-10100)

Der Fragebogen (§14) entscheidet sich für **Azure Blob Storage** mit **Container per Tenant**, **Blob Versioning** und einem **Hybrid-Zugriffsmuster** (Backend-Proxy + SAS Tokens).

## Entscheidung

### 1) Storage-Technologie: Azure Blob Storage

| Aspekt | Entscheidung |
|--------|-------------|
| **Service** | Azure Blob Storage (General Purpose v2, StorageV2) |
| **Redundanz** | ZRS (Zone-Redundant Storage) – EU-Region |
| **Region** | West Europe (Amsterdam) – konsistent mit ADR-00008 |
| **Access Tier** | Hot (Standard), Cool für Archiv-Daten (> 90 Tage), Archive für Langzeit (> 1 Jahr) |
| **Zugriff** | Private Endpoint (VNet), kein Public Access |
| **Authentifizierung Backend** | Managed Identity (Azure RBAC: `Storage Blob Data Contributor`) |
| **Verschlüsselung** | Azure SSE (At Rest), TLS 1.2+ (In Transit) |

**Regeln:**
- **Keine Connection Strings** in Production – nur Managed Identity (ADR-08200).
- Storage Account pro Umgebung (Dev, Test, Prod).
- Blob Service properties: Soft Delete aktiviert (14 Tage), Versioning aktiviert.

### 2) Tenant-Isolation: Container per Tenant

| Aspekt | Entscheidung |
|--------|-------------|
| **Isolationsmodell** | Ein Blob Container pro Tenant |
| **Naming** | `tenant-{TenantId}` (lowercase, GUID ohne Hyphens) |
| **Erstellung** | Automatisch bei Tenant-Onboarding (ADR-06200) |
| **Löschung** | Bei Tenant Hard-Delete: Container löschen (ADR-06200) |

**Container-Struktur (virtuelle Ordner):**
```
tenant-{TenantId}/
├── documents/
│   ├── invoices/          # Eingangs-/Ausgangsrechnungen
│   ├── delivery-notes/    # Lieferscheine
│   ├── contracts/         # Verträge
│   └── attachments/       # Allgemeine Anhänge
├── imports/
│   ├── camt/              # CAMT053 Bank-Imports
│   └── csv/               # CSV/Excel-Imports
├── exports/
│   ├── datev/             # DATEV-Exporte
│   ├── e-invoices/        # ZUGFeRD/XRechnung
│   └── reports/           # Generierte Reports
├── assets/
│   ├── logos/             # Mandanten-Logos
│   └── templates/         # Briefkopf-Templates
└── archive/
    └── audit/             # Archivierte Audit-Daten (Cold Storage)
```

**Regeln:**
- Jeder Blob-Pfad beginnt mit einer **definierten Kategorie** (documents, imports, exports, assets, archive).
- Keine flachen Blob-Namen – immer mit Ordnerstruktur (logische Organisation).
- CompanyId als optionaler Sub-Ordner bei Company-scoped Dokumenten: `documents/invoices/{CompanyId}/`.

### 3) Blob Versioning und Immutability

| Aspekt | Entscheidung |
|--------|-------------|
| **Blob Versioning** | Aktiviert – automatische Versionierung bei Überschreibung |
| **Soft Delete** | 14 Tage Retention (versehentliche Löschung wiederherstellbar) |
| **Immutability Policies** | Für GoBD-relevante Dokumente: Legal Hold oder Time-based Retention (WORM) |
| **Lifecycle Management** | Automatische Tier-Migration (Hot → Cool → Archive) nach definierten Tagen |

**Lifecycle-Regeln:**
```
Hot Tier:        0 – 90 Tage    (aktive Dokumente)
Cool Tier:       90 – 365 Tage  (selten zugegriffen)
Archive Tier:    > 365 Tage     (Langzeitarchivierung, GoBD 10 Jahre)
Löschung:        nach Retention  (nur wenn keine gesetzliche Aufbewahrungspflicht)
```

**Regeln:**
- GoBD-relevante Belege (Rechnungen, Buchungsbelege) erhalten **Immutability Policy** (Time-based, 10 Jahre).
- Import-Dateien (CAMT, CSV) dürfen nach erfolgreicher Verarbeitung in Cool Tier verschoben werden.
- Temporäre Export-Dateien (Report-PDFs) haben eine **TTL von 7 Tagen** – danach automatisch gelöscht.

### 4) Zugriffsmuster: Hybrid (Backend-Proxy + SAS Tokens)

#### 4a) Uploads – Immer über Backend-Proxy

```
Client → Backend API → Validierung → Blob Storage
```

| Schritt | Beschreibung |
|---------|-------------|
| 1. **Upload-Request** | Client sendet Datei via `multipart/form-data` an Backend API |
| 2. **Berechtigungsprüfung** | Permission-Check: `Documents.Upload` (ADR-03100) |
| 3. **Validierung** | Dateityp (Allowlist), Dateigröße (Max 50 MB), MIME-Type-Prüfung |
| 4. **Malware-Scan** | Optional: Azure Defender for Storage oder ClamAV |
| 5. **Metadaten-Erfassung** | TenantId, CompanyId, UserId, Dokumenttyp, Timestamp |
| 6. **Blob-Write** | Backend schreibt via Managed Identity in Tenant-Container |
| 7. **DB-Eintrag** | Metadaten-Record in Tenant-DB (Referenz auf Blob-Pfad) |
| 8. **Audit-Log** | Daten-Audit für Upload (ADR-05800) |

**Regeln:**
- Uploads gehen **immer** über das Backend – kein direkter Client-zu-Blob-Upload.
- Erlaubte Dateitypen (Allowlist): PDF, PNG, JPG, JPEG, TIFF, XML, CSV, XLSX, DOCX, ZIP.
- Maximale Dateigröße: **50 MB** (konfigurierbar pro Tenant).
- Dateinamen werden **sanitized** (Sonderzeichen entfernt, UUID-Prefix für Eindeutigkeit).

#### 4b) Downloads – Hybrid (Proxy + SAS)

| Dateigröße | Methode | Beschreibung |
|------------|---------|-------------|
| **< 5 MB** | Backend-Proxy | Backend liest Blob, streamt an Client |
| **≥ 5 MB** | SAS Token | Backend generiert zeitlich begrenzte SAS-URL, Client lädt direkt |

**Proxy-Download (< 5 MB):**
```
Client → Backend API (Permission-Check) → Blob Storage → Stream → Client
```

**SAS-Download (≥ 5 MB):**
```
Client → Backend API (Permission-Check) → SAS-URL generieren → Client → Blob Storage (direkt)
```

**SAS Token Konfiguration:**

| Parameter | Wert |
|-----------|------|
| **TTL** | 5 Minuten (kurz, einmalig) |
| **Permissions** | Read-only (`r`) |
| **Scope** | Einzelner Blob (nicht Container) |
| **IP-Restriction** | Optional: Client-IP binden (falls technisch verlässlich) |
| **Protocol** | HTTPS only |

**Regeln:**
- Jeder Download erfordert eine **Berechtigungsprüfung** im Backend (`Documents.Read`, ADR-03100).
- SAS Tokens werden **nicht gecacht** – jeder Download-Request generiert einen neuen Token.
- SAS Tokens werden mit **User Delegation Key** (Managed Identity) generiert, nicht mit Storage Account Key.
- Download wird im Audit-Log erfasst (ADR-05800).

### 5) Metadaten-Schema

Für jedes Dokument wird ein Metadaten-Record in der **Tenant-DB** gespeichert:

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `Id` | `Guid` | Primärschlüssel |
| `TenantId` | `Guid` | Tenant-Zuordnung |
| `CompanyId` | `Guid?` | Company-Zuordnung (falls `ICompanyScoped`) |
| `BlobPath` | `string` | Relativer Pfad im Tenant-Container |
| `OriginalFileName` | `string` | Ursprünglicher Dateiname |
| `ContentType` | `string` | MIME-Type (`application/pdf`, etc.) |
| `FileSizeBytes` | `long` | Dateigröße in Bytes |
| `Category` | `enum` | `Invoice`, `DeliveryNote`, `Contract`, `Attachment`, `Import`, `Export`, `Asset` |
| `UploadedBy` | `string` | UserId des Uploaders |
| `UploadedAt` | `DateTimeOffset` | Upload-Zeitpunkt (UTC) |
| `Description` | `string?` | Optionale Beschreibung |
| `RelatedEntityType` | `string?` | Verknüpfte Entität (z. B. `Finance.Invoice`) |
| `RelatedEntityId` | `Guid?` | ID der verknüpften Entität |
| `IsArchived` | `bool` | In Archive Tier verschoben |
| `RetentionUntil` | `DateTimeOffset?` | Aufbewahrungsfrist (GoBD) |

**Blob-Metadaten (Azure Blob Metadata):**
Zusätzlich werden als Azure Blob Metadata gespeichert:
- `tenantId` – für Storage-Level-Zugriffskontrolle
- `companyId` – falls Company-scoped
- `category` – Dokumentkategorie
- `uploadedBy` – UserId
- `contentHash` – SHA256 des Dateiinhalts (Integritätsprüfung)

**Regeln:**
- Die Tenant-DB ist **führend** für Metadaten – Blob Metadata dient als Redundanz/Backup.
- `BlobPath` enthält nur den relativen Pfad (Container-Name wird aus TenantId abgeleitet).
- `RelatedEntityType` + `RelatedEntityId` ermöglichen die Verknüpfung mit fachlichen Entitäten.
- Metadaten-Record wird in derselben Transaktion wie der fachliche Use Case geschrieben.

### 6) Abstraktion und API

#### 6a) Interface-basierter Zugriff

```csharp
public interface IFileStorageService
{
    Task<FileUploadResult> UploadAsync(FileUploadRequest request, CancellationToken ct);
    Task<Stream> DownloadAsync(Guid documentId, CancellationToken ct);
    Task<string> GenerateDownloadUrlAsync(Guid documentId, TimeSpan ttl, CancellationToken ct);
    Task DeleteAsync(Guid documentId, CancellationToken ct);
    Task<bool> ExistsAsync(Guid documentId, CancellationToken ct);
}
```

**Regeln:**
- `IFileStorageService` Interface im **Application Layer**.
- Implementierung im **Infrastructure Layer** (ADR-00001).
- TenantId wird automatisch aus Request Context (ADR-05300) injiziert.
- Kein direkter `BlobServiceClient`-Zugriff in Application oder Domain Layer.

#### 6b) Permissions

| Permission | Beschreibung |
|------------|-------------|
| `Documents.Upload` | Dateien hochladen |
| `Documents.Read` | Dateien lesen/herunterladen |
| `Documents.Delete` | Dateien löschen |
| `Documents.Admin` | Alle Dokument-Operationen + Archivierung |

Permissions werden im Permission-Katalog registriert (ADR-03200).

### 7) Sicherheit

| Aspekt | Maßnahme |
|--------|----------|
| **Keine Public Access** | Storage Account: `AllowBlobPublicAccess = false` |
| **Network** | Private Endpoint (VNet), keine Public IPs |
| **Authentication** | Managed Identity (RBAC), keine Access Keys in Production |
| **SAS Generation** | User Delegation Key (AAD-basiert, nicht Storage Key) |
| **Upload-Validierung** | Allowlist für Dateitypen, Größenlimit, MIME-Type-Check |
| **Malware** | Azure Defender for Storage (optional) oder ClamAV-Scan bei Upload |
| **Encryption** | SSE at Rest (Azure-managed Keys), TLS 1.2+ in Transit |
| **Content-Hash** | SHA256 bei Upload → Integritätsprüfung bei Download möglich |
| **CORS** | Deaktiviert (kein Browser-zu-Blob-Zugriff) |

### 8) Tenant Lifecycle Integration

| Event | Aktion |
|-------|--------|
| **Tenant Onboarding** (ADR-06200) | Blob Container `tenant-{TenantId}` erstellen, Ordnerstruktur anlegen |
| **Tenant Suspension** | Kein Upload/Download (Berechtigungsprüfung blockiert), Daten bleiben |
| **Tenant Reactivation** | Upload/Download wieder erlaubt |
| **Tenant Hard-Delete** (ADR-06200) | Container `tenant-{TenantId}` komplett löschen |

### 9) Monitoring und Observability

| Metrik | Beschreibung |
|--------|-------------|
| **Upload Count / Size** | Anzahl und Volumen der Uploads pro Tenant |
| **Download Count / Size** | Anzahl und Volumen der Downloads pro Tenant |
| **Storage Usage** | Speicherverbrauch pro Tenant-Container |
| **SAS Token Generation** | Anzahl generierter SAS Tokens |
| **Upload Failures** | Fehlgeschlagene Uploads (Validierung, Quota) |
| **Latency** | Blob-Operation-Latenz (p50, p95, p99) |

Metriken über **OpenTelemetry** (ADR-04100) an Application Insights.

### 10) Quotas und Limits

| Limit | Wert | Konfigurierbar |
|-------|------|----------------|
| **Max. Dateigröße** | 50 MB | Ja, pro Tenant |
| **Max. Storage pro Tenant** | 10 GB (Default) | Ja, pro Tier/Lizenz |
| **Erlaubte Dateitypen** | PDF, PNG, JPG, TIFF, XML, CSV, XLSX, DOCX, ZIP | Ja, global |
| **Max. Dateien pro Upload-Request** | 10 | Ja |
| **SAS Token TTL** | 5 Minuten | Nein (sicherheitskritisch) |

**Regeln:**
- Quota-Überschreitung liefert `HTTP 413 Payload Too Large` oder `HTTP 429` (Storage Quota).
- Storage-Verbrauch pro Tenant wird für Metering/Billing erfasst (ADR-50500).
- Quota-Erhöhung ist eine administrative Aktion (kein Self-Service).

### 11) Tests

| Testart | Prüfung |
|---------|---------|
| **Unit Tests** | `IFileStorageService`-Mock, Upload-Validierung, Metadaten-Erstellung |
| **Unit Tests** | Dateityp-Allowlist, Größenlimit, Filename-Sanitization |
| **Integration Tests** | Azurite (Azure Storage Emulator), Upload/Download Round-Trip |
| **Integration Tests** | SAS Token Generation und Blob-Zugriff via SAS |
| **Integration Tests** | Tenant-Isolation (Container-Trennung) |
| **Integration Tests** | Lifecycle (Hot → Cool → Archive Tier-Migration) |
| **ArchTests** | Kein direkter `BlobServiceClient`-Zugriff außerhalb Infrastructure |

### 12) Governance & ArchTests

ArchTests erzwingen:

1. Kein direkter `BlobServiceClient`- oder `BlobContainerClient`-Zugriff in Application oder Domain Layer.
2. Alle Blob-Zugriffe gehen über `IFileStorageService`.
3. Upload-Validierung ist nicht umgehbar (zentrale Middleware/Service).
4. Metadaten-Record wird bei jedem Upload in der DB persistiert.

CI schlägt fehl, wenn eine dieser Regeln verletzt wird.

## Begründung
- **Azure Blob Storage** statt Azure Files/SharePoint: native REST-API, günstiger, besser skalierbar, programmatisch steuerbar.
- **Container per Tenant** statt Präfix-basiert: stärkere Isolation, einfacheres Quota-Management, saubere Löschung bei Tenant-Delete.
- **Hybrid-Zugriff** (Proxy + SAS): Upload-Kontrolle (Validierung, Malware-Scan) bei gleichzeitiger Backend-Entlastung für große Downloads.
- **User Delegation SAS** statt Storage Account Key SAS: sicherer, kein geteilter Secret, AAD-basiert, automatisch rotiert.
- **Metadaten in Tenant-DB** statt nur Blob Metadata: relationale Verknüpfung mit fachlichen Entitäten, Such- und Filterbarkeit, Transaktionskonsistenz.
- **Immutability Policies** für GoBD: WORM-Speicherung für revisionssichere Belege ohne eigene Implementierung.

## Alternativen

1. **Azure Files (SMB-Shares)**
   - Vorteile: SMB-kompatibel, einfache Einbindung für Legacy-Systeme
   - Nachteile: teurer, weniger programmatisch steuerbar, kein Versioning, keine Immutability Policies

2. **SharePoint / OneDrive for Business**
   - Vorteile: Collaboration-Features, Microsoft 365 Integration
   - Nachteile: API-Limitierungen, Lizenzkosten, kein geeignetes Backend-Storage-Pattern

3. **Präfix-basierte Tenant-Trennung (ein Container für alle)**
   - Vorteile: weniger Container-Management
   - Nachteile: kein echtes Quota pro Tenant, riskanter bei Löschung, schwächere logische Isolation

4. **Direkter Client-Upload (SAS für Uploads)**
   - Vorteile: Backend-Entlastung bei Uploads
   - Nachteile: keine serverseitige Validierung, kein Malware-Scan, kein Audit bei Upload, Metadaten-Inkonsistenz

5. **S3 / MinIO (Self-Hosted)**
   - Vorteile: Cloud-agnostisch, Self-Hosted möglich
   - Nachteile: kein Azure-managed-Service, höherer Ops-Aufwand, keine native Azure-Integration

## Konsequenzen

### Positiv
- Strikte Tenant-Isolation auf Storage-Ebene (Container per Tenant)
- Kosteneffizient durch automatische Tier-Migration (Hot → Cool → Archive)
- GoBD-konform durch Immutability Policies (WORM)
- Sichere Downloads über kurzlebige SAS Tokens (User Delegation)
- Einheitliche Abstraktion (`IFileStorageService`) für einfaches Testen

### Negativ / Trade-offs
- Container-Management bei 500+ Tenants (Automatisierung erforderlich)
- Upload-Proxy limitiert Throughput – für sehr große Dateien (> 50 MB) ggf. Anpassung nötig
- Zwei Speicherorte für Metadaten (DB + Blob Metadata) erfordern Konsistenz-Sicherung
- Azurite (Emulator) unterstützt nicht alle Features (Immutability, Lifecycle)
- SAS Tokens können geteilt werden (Mitigation: kurze TTL, IP-Binding)

### Umsetzungshinweise
- `IFileStorageService` Interface im Application Layer, Implementierung im Infrastructure Layer
- `Azure.Storage.Blobs` SDK für Blob-Operationen
- `BlobServiceClient` als Singleton via DI (Managed Identity)
- Container-Name: `tenant-{TenantId.ToString("N").ToLower()}` (32 Hex-Zeichen, keine Hyphens)
- Upload-Validierung als eigener Service: `IFileValidator` (Dateityp, Größe, MIME-Type)
- Filename-Sanitization: `{Guid:N}_{SanitizedOriginalName}.{ext}`
- SAS-Generation: `BlobSasBuilder` + `UserDelegationKey` (refreshed alle 6h)
- Lifecycle Management Rules über Terraform konfigurieren (ADR-08200)
- Azurite für lokale Entwicklung und Integration Tests
- Storage-Metriken über `Azure.Monitor.OpenTelemetry.Exporter` (ADR-04100)
- Quota-Prüfung: `BlobContainerClient.GetProperties()` für aktuelle Größe, Vergleich mit Tenant-Limit

## Verweise
- ADR-00008 (Plattform – EU-only, Azure, Datenresidenz)
- ADR-06000 (Multi-Tenancy – Tenant-Isolation)
- ADR-06200 (Tenant Lifecycle – Container-Erstellung/Löschung)
- ADR-06300 (Multi-Company – CompanyId-Scope für Dokumente)
- ADR-05300 (Request Context – TenantId für Container-Ableitung)
- ADR-05800 (Daten-Audit – Audit-Archivierung in Cold Storage)
- ADR-50000 (Finanzwesen / GoBD – Unveränderbare Belege, Aufbewahrungsfristen)
- ADR-50100 (Zahlungsverkehr – DATEV-Export, CAMT-Import, E-Rechnung)
- ADR-03100 (Authorization – Document-Permissions)
- ADR-03200 (Permission-Katalog – Documents.Upload/Read/Delete)
- ADR-08200 (Terraform – Lifecycle Rules, Storage Account Provisioning)
- ADR-04100 (Telemetry – Storage-Metriken via OpenTelemetry)
- ADR-10100 (UI Component Library – Mandanten-Assets/Logos)
- ADR-00001 (Clean Architecture – Interface in Application, Impl. in Infrastructure)
