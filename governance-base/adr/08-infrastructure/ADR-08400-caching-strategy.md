---
id: ADR-08400
title: Caching-Strategie (Redis, In-Memory Hybrid, Tenant-isoliert)
status: accepted
date: 2026-02-24
scope: backend
enforced_by: code-review
affects:
  - backend
  - infrastructure
---

# ADR-08400 – Caching-Strategie

## Entscheidungstreiber
- Performance-Anforderungen eines Multi-Tenant-SaaS-ERP mit 500–600 Tenants (ADR-00008)
- Vermeidung redundanter DB-Zugriffe für häufig gelesene, selten geänderte Daten
- Tenant-Isolation: kein Cross-Tenant-Data-Leak über den Cache (ADR-06000)
- Stateless Backend: kein Session State, nur expliziter Cache (ADR-05300)
- CQRS-Read-Seite (Dapper, ADR-08000 §10) profitiert von vorgelagerten Caches
- Bestehende ADRs referenzieren bereits Caching (ADR-06200 Tenant-Registry, ADR-03100 Permission-Lookup, ADR-05400 Idempotency)

## Kontext
Mehrere bestehende ADRs setzen Caching voraus, ohne dass eine zentrale Caching-Strategie definiert war:
- **ADR-06200:** Tenant-Status aus gecachtem Tenant-Registry (Redis oder In-Memory), TTL 1 Min, event-basierte Invalidierung
- **ADR-03100:** Permission-Lookup gecacht, Invalidierung via Integration Event
- **ADR-05400:** Idempotency-Keys in Cache (Redis) für schnelle Duplikat-Erkennung
- **ADR-05700:** Feature Flags mit SDK-eigenem Caching (30s Polling) + event-basierte Invalidierung für Kill Switches

Der Fragebogen (§13) entscheidet sich für **Azure Cache for Redis** als Distributed Cache mit **In-Memory Hybrid** für Hot Data. Jeder Cache ist **per Tenant isoliert**.

## Entscheidung

### 1) Cache-Technologien: Hybrid-Modell

| Schicht | Technologie | Zweck |
|---------|-------------|-------|
| **L1 – In-Memory** | `IMemoryCache` (.NET) | Hot Data, extrem schneller Zugriff, Instanz-lokal |
| **L2 – Distributed** | Azure Cache for Redis (Premium) | Shared State über Instanzen, Tenant-isoliert |

**Lookup-Reihenfolge:**
```
Request → L1 (In-Memory) → L2 (Redis) → Datenquelle (DB/Service)
```

**Regeln:**
- L1 ist **optional** und wird nur für hochfrequente, selten geänderte Daten eingesetzt.
- L2 (Redis) ist der **primäre Cache** für alle Tenant-spezifischen Daten.
- Bei Write-Through: L1 und L2 werden gemeinsam invalidiert.
- L1 hat **immer kürzere TTL** als L2 (Stale-Prevention bei Multi-Instance-Deployments).
- L1 darf **nie Tenant-übergreifende Daten** enthalten, die nicht explizit global sind.

### 2) Azure Cache for Redis – Infrastruktur

| Aspekt | Entscheidung |
|--------|-------------|
| **Service** | Azure Cache for Redis, **Premium Tier** |
| **Begründung Premium** | VNet-Integration, Geo-Replikation (optional), Persistence, 99.95% SLA |
| **Region** | EU-Region (West Europe / North Europe), konsistent mit ADR-00008 |
| **Zugriff** | Via Private Endpoint (VNet), kein Public Access |
| **Authentifizierung** | Managed Identity (AAD-Auth), keine Access Keys in Production (ADR-08200) |
| **Verschlüsselung** | TLS 1.2+ In-Transit, At-Rest via Azure-managed Keys |
| **Instanzen** | Eine Redis-Instanz pro Umgebung (Dev, Test, Prod) |

### 3) Tenant-Isolation im Cache

Alle Cache-Keys enthalten den **TenantId** als Pflicht-Präfix:

**Key-Schema:**
```
{TenantId}:{CacheRegion}:{EntityType}:{Identifier}
```

**Beispiele:**
```
tenant-abc:permissions:user:user-123
tenant-abc:masterdata:customer:cust-456
tenant-abc:config:tax-rates
global:tenant-registry:tenant-abc
```

**Regeln:**
- Jeder Cache-Zugriff **muss** den TenantId aus dem Request Context (ADR-05300) verwenden.
- **Globale Daten** (Tenant-Registry, Feature Flags) haben das Präfix `global:`.
- Es gibt **keine Wildcard-Löschung** über andere Tenants (`DEL tenant-xyz:*` nur für eigenen Tenant).
- Bei Tenant-Deaktivierung (ADR-06200): alle Cache-Einträge des Tenants werden invalidiert.
- Bei Tenant-Löschung (ADR-06200): `DEL {TenantId}:*` als Teil des Cleanup-Workflows.

### 4) Cache-Regionen und TTLs

| Cache-Region | Daten | Schicht | TTL | Invalidierung |
|-------------|-------|---------|-----|---------------|
| **Permissions** | User-Permissions pro Tenant | L2 (Redis) | 5 Min | Event-basiert (`PermissionsChanged`) |
| **Tenant-Registry** | Tenant-Status (Active/Suspended) | L1 + L2 | L1: 15s, L2: 1 Min | Event-basiert (`TenantStatusChanged`) |
| **Feature-Flags** | Feature-Flag-Werte pro Tenant | SDK-Cache | 30s (Polling) | Event-basiert für Kill Switches |
| **Stammdaten** | Kunden, Artikel, Konten (Read-Model) | L2 (Redis) | 10 Min | Event-basiert (`MasterDataChanged`) |
| **Konfiguration** | Steuersätze, Nummernkreise, Settings | L1 + L2 | L1: 30s, L2: 15 Min | Event-basiert (`ConfigurationChanged`) |
| **Idempotency** | Idempotency-Keys | L2 (Redis) | 24h (ADR-05400) | TTL-only (Auto-Expire) |
| **Aggregierte Werte** | Saldos, Zähler, KPIs | L2 (Redis) | 1–5 Min | Event-basiert + TTL |

**Regeln:**
- Jede Cache-Region hat eine **definierte TTL** – keine unbegrenzten Caches.
- TTL-Werte sind **konfigurierbar** (nicht hard-coded), Default-Werte wie oben.
- Kurzlebige L1-TTLs (15–30s) begrenzen Stale-Risiko bei Multi-Instance-Deployments.

### 5) Cache-Invalidierung

#### 5a) TTL-basierte Invalidierung (Standard)
- Jeder Cache-Eintrag hat eine TTL – nach Ablauf wird bei nächstem Zugriff neu geladen.
- Einfachster Mechanismus, ausreichend für Daten mit akzeptabler Stale-Toleranz.

#### 5b) Event-basierte Invalidierung (Near-Realtime)
Für Daten, die sofort konsistent sein müssen:

```
State-Änderung (Command)
  → Domain Event (ADR-01200)
  → Integration Event via Outbox (ADR-08100)
  → Cache-Invalidierung Consumer
  → DEL {TenantId}:{CacheRegion}:{Key}
```

**Regeln:**
- Event-basierte Invalidierung nutzt den **bestehenden Outbox-/Messaging-Mechanismus** (ADR-08100, Azure Service Bus).
- Der Cache-Invalidierung-Consumer ist ein **Background Job** (ADR-05500).
- Invalidierung löscht den Cache-Key – kein proaktives Re-Population (Lazy Load beim nächsten Zugriff).
- Bei Fehler im Consumer: TTL fungiert als **Safety Net** (Daten werden spätestens nach TTL-Ablauf aktuell).

#### 5c) Explizite Invalidierung (Selten)
Für administrative Aktionen (z. B. Tenant-Deaktivierung, Config-Reload):
- Explizites `DEL` oder `FLUSH` für eine Cache-Region eines Tenants.
- Nur aus Ops-Tools oder Admin-Commands – nicht aus normalen Use Cases.

### 6) Abstraktion und API

#### 6a) Interface-basierter Zugriff

```csharp
public interface ICacheService
{
    Task<T?> GetAsync<T>(string region, string key, CancellationToken ct);
    Task SetAsync<T>(string region, string key, T value, TimeSpan? ttl, CancellationToken ct);
    Task RemoveAsync(string region, string key, CancellationToken ct);
    Task RemoveByRegionAsync(string region, CancellationToken ct);
}
```

**Regeln:**
- `ICacheService` sitzt im **Application Layer** (Interface-Definition).
- Die Implementierung (Redis + In-Memory) sitzt im **Infrastructure Layer** (ADR-00001).
- Der TenantId wird **automatisch** aus dem Request Context (ADR-05300) injiziert – nicht als Parameter übergeben.
- Kein direkter `IDistributedCache`- oder `IMemoryCache`-Zugriff in Application oder Domain Layer.

#### 6b) Cache-Aside Pattern (Standard)

```
1. Prüfe Cache (Get)
2. Falls Cache-Miss: Lade aus DB
3. Schreibe in Cache (Set)
4. Return Ergebnis
```

- **Cache-Aside** ist das Standard-Pattern für alle Reads.
- Kein Write-Through oder Write-Behind (zu komplex, Fehleranfällig in Multi-Tenant-Setup).
- Caching liegt in der **Application Layer** (in Query-Handlers oder Services), nicht im Repository.

### 7) HTTP Response Caching

| Aspekt | Entscheidung |
|--------|-------------|
| **Server-seitiges Response Caching** | Nein – aufgrund von Tenant-Isolation und Personalisierung |
| **HTTP Cache Headers** | `Cache-Control: private, no-cache` für API-Responses (Standard) |
| **Statische Assets** | `Cache-Control: public, max-age=31536000, immutable` (Frontend, ADR-10000) |
| **ETag Support** | Ja, für Read-Endpoints – ETag aus `RowVersion` (ADR-08000 §12) |

**Regeln:**
- API-Responses werden **nicht** server-seitig gecacht (Tenant-Kontext, Permissions, Personalisierung).
- HTTP `ETag` + `304 Not Modified` wird für häufig gelesene Ressourcen unterstützt.
- ETag-Wert wird aus dem `RowVersion`/`ConcurrencyToken` der Entität abgeleitet.
- Frontend darf Client-seitig cachen (z. B. Stammdaten-Dropdown-Liste), gesteuert durch API-Response-Header.

### 8) Serialisierung

| Aspekt | Entscheidung |
|--------|-------------|
| **Format** | JSON (System.Text.Json) |
| **Kompression** | Für Einträge > 1 KB: GZip-Kompression vor Redis-Write |
| **Versioning** | Cache-Key enthält Version-Suffix bei Schema-Änderungen (z. B. `v2:`) |

**Regeln:**
- Nur serialisierbare DTOs/Read-Models cachen – keine Domain-Entities.
- Bei Schema-Änderung des Cached-Objekts: Versions-Suffix im Key ändern → alter Cache läuft per TTL ab.
- Keine Binary-Serialisierung (Debugging, Portabilität).

### 9) Monitoring und Observability

| Metrik | Beschreibung |
|--------|-------------|
| **Cache Hit Rate** | Prozentsatz erfolgreicher Cache-Treffer pro Region |
| **Cache Miss Rate** | Fehlzugriffe → Indikator für TTL-Tuning |
| **Latency** | Redis-Roundtrip-Zeit (p50, p95, p99) |
| **Eviction Rate** | Verdrängungen wegen Speichermangel |
| **Memory Usage** | Redis-Speicherauslastung pro Instanz |
| **Connection Pool** | Aktive/wartende Connections |

**Regeln:**
- Metriken werden über **OpenTelemetry** (ADR-04100) an Application Insights gemeldet.
- Alerts bei Cache Hit Rate < 70% oder Redis-Latency > 10ms p99 (ADR-09100).
- Cache-Region und TenantId als Dimensions in Metriken.

### 10) Fehlerbehandlung und Resilienz

| Szenario | Verhalten |
|----------|-----------|
| **Redis nicht erreichbar** | Graceful Degradation – Requests gehen direkt zur DB, kein Error für den User |
| **Redis Timeout** | Circuit Breaker (5s Timeout, 30s Open-State) |
| **Serialisierungsfehler** | Cache-Entry ignorieren, aus DB laden, Fehler loggen (Warning) |
| **Hoher Speicherverbrauch** | LRU Eviction Policy (Redis Default) |

**Regeln:**
- Redis ist **kein kritischer Pfad** – bei Ausfall funktioniert das System mit höherer DB-Last, aber ohne Fehler.
- Circuit Breaker verhindert Request-Staus bei Redis-Problemen.
- Retry-Policy: 1 Retry mit 100ms Delay, dann Skip.
- Alle Cache-Fehler werden geloggt (ADR-04000), aber lösen **keinen Error-Response** aus.

### 11) Tests

| Testart | Prüfung |
|---------|---------|
| **Unit Tests** | `ICacheService`-Mock, Cache-Aside-Logik in Handlers |
| **Integration Tests** | Redis-Testcontainer, TTL-Verhalten, Tenant-Isolation |
| **Integration Tests** | Event-basierte Invalidierung (Event → Cache-Key gelöscht) |
| **Integration Tests** | Graceful Degradation bei Redis-Ausfall |
| **ArchTests** | Kein direkter `IDistributedCache`/`IMemoryCache`-Zugriff außerhalb Infrastructure |

### 12) Governance & ArchTests

ArchTests erzwingen:

1. Kein direkter `IDistributedCache`- oder `IMemoryCache`-Zugriff in Application oder Domain Layer.
2. Alle Cache-Zugriffe gehen über `ICacheService`.
3. Domain-Entities werden nicht direkt gecacht (nur DTOs/Read-Models).
4. Cache-Keys enthalten TenantId (über `ICacheService`-Implementierung sichergestellt).

CI schlägt fehl, wenn eine dieser Regeln verletzt wird.

## Begründung
- **Hybrid (L1 + L2)** statt nur Redis: In-Memory-Cache für extrem häufige Lookups (Tenant-Registry, Config) vermeidet Netzwerk-Roundtrips; Redis für shared State über Instanzen.
- **Azure Cache for Redis Premium** statt Basic/Standard: VNet-Integration (Security), Persistence (Restart-Resilience), 99.95% SLA.
- **Cache-Aside** statt Write-Through: einfacher, fehlertoleranter, passt zu CQRS (Reads und Writes sind getrennt).
- **Event-basierte Invalidierung** statt Polling: Near-Realtime-Konsistenz für kritische Daten, nutzt bestehende Outbox-/Messaging-Infrastruktur.
- **Tenant-Präfix im Key** statt Redis-Databases: skalierbar, keine Begrenzung auf 16 DBs, einfacheres Monitoring.

## Alternativen

1. **Nur In-Memory Cache (kein Redis)**
   - Vorteile: keine zusätzliche Infrastruktur, einfach
   - Nachteile: nicht shared über Instanzen, Cache-Warmup nach Restart, Inkonsistenz bei Multi-Instance

2. **Redis Databases pro Tenant (SELECT 0–15)**
   - Vorteile: physische Isolation
   - Nachteile: maximal 16 DBs, skaliert nicht für 500+ Tenants, kein Monitoring pro DB

3. **Write-Through / Write-Behind Cache**
   - Vorteile: automatische DB-Aktualisierung
   - Nachteile: hohe Komplexität, Fehleranfällig, schwer zu debuggen in Multi-Tenant-Setup

4. **Server-seitiges HTTP Response Caching**
   - Vorteile: keine Code-Änderungen
   - Nachteile: Tenant-Kontext in Responses macht Caching unsicher, Personalisierung verhindert sinnvolles Caching

5. **NCache / Memcached**
   - Vorteile: alternative Distributed-Cache-Lösungen
   - Nachteile: kein Azure-managed-Service, höherer Ops-Aufwand, schlechtere .NET-Integration als Redis

## Konsequenzen

### Positiv
- Signifikante Performance-Verbesserung bei häufig gelesenen Daten (Permissions, Stammdaten, Config)
- Reduzierte DB-Last durch Cache-Aside auf Read-Seite
- Tenant-Isolation durch Key-Schema ohne zusätzliche Infrastruktur
- Graceful Degradation: Redis-Ausfall beeinträchtigt nicht die Korrektheit
- Einheitliche Abstraktion (`ICacheService`) ermöglicht einfaches Testen und Austauschen

### Negativ / Trade-offs
- Zusätzliche Infrastrukturkosten (Azure Cache for Redis Premium)
- Cache-Invalidierung erfordert sorgfältiges Design (Event-basiert + TTL als Safety Net)
- Stale Data möglich innerhalb der TTL-Fenster (akzeptabel, da kurze TTLs)
- Serialisierungs-Overhead (JSON → Redis, Kompression für große Objekte)
- Debugging erschwert: falsches Verhalten kann aus stale Cache resultieren

### Umsetzungshinweise
- `ICacheService` Interface im Application Layer, Implementierung im Infrastructure Layer
- TenantId automatisch aus `IRequestContext` (ADR-05300) in den Cache-Key injizieren
- Redis-Verbindung via `StackExchange.Redis` mit Connection Multiplexer (Singleton)
- Circuit Breaker über Polly (`Microsoft.Extensions.Http.Resilience`)
- Cache-Metriken über OpenTelemetry Custom Metrics (ADR-04100)
- Serialisierung: `System.Text.Json` mit `JsonSerializerOptions` aus Shared Config
- GZip-Kompression für Entries > 1 KB via `GZipStream`
- Redis Key-Format: `{TenantId}:{Region}:{Type}:{Id}` – Doppelpunkt als Trennzeichen (Redis-Konvention)
- Testcontainer für Redis in Integration Tests (`testcontainers-dotnet`)
- Konfigurations-Werte (TTLs, Compression-Threshold) über `IOptions<CacheOptions>`

## Verweise
- ADR-00008 (Plattform – SaaS, Azure, EU-Regions)
- ADR-06000 (Multi-Tenancy – Tenant-Isolation)
- ADR-06200 (Tenant Lifecycle – Cache-Invalidierung bei Deaktivierung/Löschung)
- ADR-05300 (Request Context – TenantId für Cache-Keys)
- ADR-08000 (Persistence – CQRS Read/Write, RowVersion für ETag)
- ADR-08100 (Outbox / Integration Events – Event-basierte Invalidierung)
- ADR-03100 (Authorization – Permission-Cache)
- ADR-05400 (Idempotency – Idempotency-Key-Cache)
- ADR-05700 (Feature Flags – Flag-Caching, Kill Switch Invalidierung)
- ADR-04100 (Telemetry – Cache-Metriken via OpenTelemetry)
- ADR-09100 (SLOs / Alerts – Cache Hit Rate, Redis Latency)
- ADR-00001 (Clean Architecture – Interface in Application, Impl. in Infrastructure)
