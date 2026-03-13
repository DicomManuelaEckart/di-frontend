---
id: ADR-03300
title: Dev Authentication (Fake User) & Safety Rails
status: accepted
date: 2026-01-21
scope: backend
enforced_by: code-review
affects:
  - backend
---

# ADR-03300 – Dev Authentication (Fake User) & Safety Rails

## Entscheidungstreiber
- Reproduzierbarer lokaler Start ohne Entra ID Setup
- Schnelle Entwicklung und Debugging
- Strikte Sicherheit: Dev-Auth darf niemals außerhalb Development aktiv sein
- Konsistenz mit Permission-/Tenant-Modell (ADR-03100, ADR-03200)

## Kontext
In ADR-03000 ist Entra ID (OIDC) als Authentifizierung festgelegt.
Für lokale Entwicklung soll eine Dev-Authentifizierung verfügbar sein, die:
- keine externen Abhängigkeiten benötigt
- konsistente Claims liefert (UserId/TenantId/Permissions)
- sicher verhindert, dass sie in produktiven Umgebungen aktiv wird

## Entscheidung

### 1) Aktivierung (Launch Profile only)
Dev-Auth wird ausschließlich über ein **Launch Profile** (lokal) aktiviert.

- Ohne Launch Profile ist Dev-Auth niemals aktiv.
- Dev-Auth ist nur in `ASPNETCORE_ENVIRONMENT=Development` zulässig.

### 2) Zulässige Umgebungen
Dev-Auth ist nur in **lokaler Development-Umgebung** erlaubt.

- Nicht erlaubt in: Test, Staging, Production, CI.

### 3) Modus
Dev-Auth **ersetzt OIDC vollständig** (Fake User ist immer authentifiziert).

- Jeder Request in Dev-Auth-Modus gilt als authentifiziert.
- Es gibt keinen Fallback auf echte Tokens in diesem Modus.

### 4) Fake Claims (Default)
Dev-Auth setzt standardmäßig:

- `oid` (UserId): **fixed value**
- `tid` (TenantId): **fixed default tenant**
- `permissions`: initial **alle Permissions** (Admin-Default)

### 5) Permissions in Dev (konfigurierbar)
Permissions sind in Dev-Auth **konfigurierbar** über `appsettings.Development.json`
oder ein äquivalentes lokales Konfigurationsmittel.

- Default kann “alle Permissions” sein
- Für Debugging spezifischer Szenarien können Permissions auf eine Liste reduziert werden
- Keine Permission-Definition per Header/Query (keine “Runtime Injection”)

### 6) Marker (Transparenz)
Wenn Dev-Auth aktiv ist, setzt die API einen Response Header:

- `X-Dev-Auth: true`

### 7) `/me` Endpoint
Die API stellt einen Endpoint bereit:

- `GET /me`

Er liefert die effektive Security-Identität:
- `oid`
- `tid`
- effektive Permissions (nach Mapping/Policy-Auswertung)
- optional Roles (falls vorhanden)

### 8) Hard Fail (Safety Rail)
Wenn Dev-Auth außerhalb von `Development` aktiviert werden soll, gilt:

- **Startup-Fail** (die App startet nicht)

Dies ist ein verpflichtender Sicherheitsmechanismus.

### 9) Tests
Tests dürfen Dev-Auth nutzen (z. B. in API-/Integration-Test-Setups), sofern sie lokal laufen.

- Dev-Auth soll über Test-Host-Konfiguration (z. B. WebApplicationFactory) aktivierbar sein
- Die “Nur Development + Startup-Fail”-Regel bleibt bestehen

## Begründung
- Launch Profile Aktivierung verhindert versehentliche Aktivierung in CI/Prod.
- Nur Development reduziert Sicherheitsrisiken und Fehlkonfigurationen.
- Vollständiger Ersatz vermeidet gemischte Zustände und schwer nachvollziehbares Verhalten.
- Konfigurierbare Permissions ermöglichen realistische Szenarien ohne Runtime-Hacks.
- Marker + `/me` verbessern Debuggability und Frontend-Integration.
- Startup-Fail ist die sicherste Form von “Guardrail”.

## Alternativen
1) Aktivierung per Feature-Flag/Environment Variable
   - Vorteile: flexibler
   - Nachteile: höheres Risiko, versehentlich in falscher Umgebung aktiv

2) Fallback-Modus (Token wenn vorhanden, sonst Fake)
   - Vorteile: flexibler
   - Nachteile: schwer zu debuggen, unterschiedliche Pfade, erhöhtes Drift-Risiko

3) Tenant/Permissions per Header steuerbar
   - Vorteile: schnelle Experimente
   - Nachteile: unsicherer, schwer zu kontrollieren, kann Test-/Debug-Verhalten verfälschen

## Konsequenzen

### Positiv
- Sehr schneller lokaler Start ohne Entra-Abhängigkeit
- Einheitliche, vorhersagbare Auth-Identität in Dev
- Starke Sicherheitsgeländer gegen Fehlbetrieb
- Gute Unterstützung für Frontend (Matrix) und Debugging

### Negativ / Trade-offs
- Dev-Auth nicht in CI/Test verfügbar (bewusst)
- Vollständiger Ersatz verhindert “echte Token”-Tests im gleichen Modus
- Konfiguration muss gepflegt werden, wenn Permission-Katalog wächst

## Umsetzungshinweise
- Dev-Auth aktiv nur, wenn:
  - Launch Profile gesetzt ist UND
  - Environment == Development
- Startup-Fail, wenn Dev-Auth aktiv und Environment != Development
- Fake Claims:
  - `oid` und `tid` als feste Werte definieren (Konstanten)
  - Permissions aus Konfig laden, Default “alle”
- `GET /me` nutzt denselben `ICurrentUserContext` wie Application Enforcement
- Response Header `X-Dev-Auth: true` zentral (Middleware/Filter)

## Verweise
- ADR-03000 (Authentifizierung)
- ADR-03100 (Autorisierung, Application-enforced)
- ADR-03200 (Permission-Katalog & Claim-Schema)
- ADR-06000 (Multi-Tenancy) (geplant)
- ADR-04000 (Logging) (geplant)
- ADR-09000 (Telemetry) (geplant)
