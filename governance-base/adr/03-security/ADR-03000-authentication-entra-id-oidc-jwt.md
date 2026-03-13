---
id: ADR-03000
title: Authentifizierung (Entra ID, OIDC, JWT)
status: accepted
date: 2026-01-21
scope: backend
enforced_by: code-review
affects:
  - backend
  - frontend
  - admin
---

# ADR-03000 – Authentifizierung (Entra ID, OIDC, JWT)

## Entscheidungstreiber
- Standardkonforme Authentifizierung (OIDC)
- Sicherheit und Wartbarkeit
- Gute Unterstützung für SPA + API
- Reproduzierbarkeit (Dev-Auth)
- Vorbereitung für Multi-Tenancy (Tenant Claim) und Multi-Company (Company Claim)
- Verschiedene Client-Typen: SPA, M2M-Dienste, einfache Integrationen

## Kontext
Das System besteht aus einer Webanwendung (typischerweise SPA) und einer REST API.
Authentifizierung soll über einen externen Identity Provider erfolgen, um keine eigene
Passwort-/User-Verwaltung betreiben zu müssen. Zusätzlich soll eine Dev-Authentifizierung
für lokale Entwicklung verfügbar sein.

## Entscheidung

### 1) Identity Provider
Wir verwenden **Microsoft Entra ID** als Identity Provider über **OpenID Connect (OIDC)**.

### 2) Client-Typ & Flow
Für Web (SPA) verwenden wir den OIDC **Authorization Code Flow mit PKCE**.
Die API wird als Resource Server betrieben.

### 3) Token
Die API akzeptiert **JWT Bearer Access Tokens**:
- Requests an die API enthalten `Authorization: Bearer <access_token>`
- Tokenvalidierung erfolgt in der API (Issuer, Audience, Signature, Lifetime)

### 4) Claims (Minimum)
Das Token muss mindestens enthalten:
- Subject/User Identifier (z. B. `sub` oder `oid`)
- Tenant Identifier (custom oder standard claim, z. B. `tid` oder `tenant_id`)
- Company Identifier (`company_id`) – aktive Company/Buchungskreis im Kontext des Requests (ADR-06300)
- User Type (`user_type`) – Klassifikation des Benutzers: `full`, `limited`, `portal`, `device`
- Permissions/Roles (siehe ADR-03100)

### 5) Token-Lifetime und Refresh-Strategie
- **Access Token Lifetime:** 15–30 Minuten (konfigurierbar über Entra ID Token Configuration)
- **Refresh Token:** Sliding Expiration – verlängert sich bei aktiver Nutzung
- **Absolute Refresh Token Lifetime:** max. 24 Stunden (danach Re-Authentication erforderlich)
- **Inactivity Timeout:** nach 2 Stunden Inaktivität wird der Refresh Token ungültig
- Token-Lifetime ist **nicht** im Anwendungscode konfiguriert, sondern in der Entra ID App Registration

### 6) Multi-Tenant-User und Tenant-Wechsel
- Ein Benutzer kann **mehreren Tenants** zugeordnet sein (z. B. Berater, Konzern-Admin)
- Nach der Authentifizierung wählt der Benutzer den **aktiven Tenant** (Tenant-Picker)
- Der aktive Tenant wird als `tenant_id` Claim im Token geführt
- **Tenant-Wechsel** erfolgt zur Laufzeit über Token-Refresh mit neuem Tenant-Kontext (kein Re-Login)
- Die verfügbaren Tenants eines Users werden aus einer zentralen Zuordnungstabelle gelesen (nicht aus dem IdP-Token)
- Analog wird die aktive `company_id` innerhalb des Tenants gewählt (Company-Picker, ADR-06300)

### 7) M2M-Authentifizierung (Client Credentials)
Für Machine-to-Machine-Kommunikation (Backend-Dienste, Scheduler, externe Systeme):
- **OAuth 2.0 Client Credentials Flow** – kein Benutzerkontext, nur Application Identity
- Client-App wird in Entra ID als Service Principal registriert
- Token enthält `tenant_id` (der Ziel-Tenant) und Application Roles/Scopes
- Kein `company_id` oder `user_type` – M2M-Operationen arbeiten **tenant-weit** (nicht company-scoped)

### 8) API Keys (einfache Integrationen)
Für einfache externe Integrationen (z. B. Webhook-Empfänger, Import-Skripte):
- **API Keys** als zusätzliche Authentifizierungsmethode (nicht als Ersatz für OIDC)
- API Key ist an einen Tenant + eine Berechtigung gebunden
- API Keys haben eine begrenzte Laufzeit und müssen rotiert werden
- Übertragung ausschließlich über `X-Api-Key` Header (kein Query-Parameter)
- API Key Auth wird in der API als separates Authentication Scheme registriert
- API Key-basierte Requests erhalten eingeschränkte Permissions (kein Vollzugriff)

### 9) Dev-Auth (lokale Entwicklung)
Es gibt eine **Dev-Authentifizierung** (Fake User), die ausschließlich in Development-Umgebungen aktivierbar ist.
Sie dient:
- lokaler Entwicklung ohne Entra-Login
- reproduzierbaren lokalen Starts
- vereinfachten Tests für AuthZ-Flows

## Begründung
- OIDC + Entra ID ist ein etablierter Standard und reduziert Security-Risiken.
- Authorization Code + PKCE ist der empfohlene Flow für SPAs.
- JWT Bearer ist passend für REST APIs und skalierbar.
- `company_id` im Token ermöglicht Company-Scoping ohne zusätzlichen DB-Lookup pro Request (ADR-06300).
- `user_type` im Token erlaubt Feature-Entitlement-Prüfung ohne DB-Abfrage.
- Kurze Token-Lifetime (15–30 Min) + Sliding Refresh balanciert Sicherheit und UX.
- Multi-Tenant-User mit Tenant-Wechsel deckt Berater-/Konzern-Szenarien ab.
- Client Credentials für M2M und API Keys für einfache Integrationen ermöglichen alle typischen Integrationsszenarien.
- Dev-Auth beschleunigt Entwicklung und reduziert externe Abhängigkeiten.
- Tenant Claim ermöglicht früh eine klare Multi-Tenant-Linie.

## Alternativen
1) Eigene Benutzerverwaltung (ASP.NET Core Identity)
   - Vorteile: volle Kontrolle, kein externer IdP
   - Nachteile: hoher Security-/Betriebsaufwand (Passwörter, MFA, Recovery, Compliance)

2) Cookies/BFF Pattern
   - Vorteile: weniger Token im Browser
   - Nachteile: zusätzliche BFF-Komponente, mehr Infrastruktur/Architekturaufwand

## Konsequenzen

### Positiv
- Standardisierte, sichere Authentifizierung
- Geringer Betriebsaufwand (IdP ausgelagert)
- Gute Unterstützung für Angular + API
- Dev-Auth erhöht Geschwindigkeit und Reproduzierbarkeit
- Multi-Tenant-User ermöglicht Berater-/Konzern-Szenarien ohne mehrere Accounts
- Drei Auth-Methoden (OIDC, Client Credentials, API Keys) decken alle Integrationsfälle ab

### Negativ / Trade-offs
- Abhängigkeit von Entra-Konfiguration (App Registrations, Scopes, Consent)
- Token-/Session-Handling in SPA muss sauber umgesetzt werden
- Dev-Auth muss strikt auf Development begrenzt bleiben
- Tenant-/Company-Wechsel erfordert Token-Refresh-Logik im Frontend
- API Keys müssen rotiert und überwacht werden (Key Management)

## Umsetzungshinweise
- API: JWT Bearer Authentication konfigurieren (Issuer/Audience/Signing Keys)
- SPA: OIDC Client (z. B. MSAL) für Authorization Code + PKCE
- Dev-Auth:
  - nur aktiv bei `ASPNETCORE_ENVIRONMENT=Development`
  - klarer “EnableDevAuth”-Switch
  - Fake-Claims (UserId, TenantId, CompanyId, UserType, Permissions) definieren
- Keine Tokens in LocalStorage persistieren (bevorzugt Memory-Cache des OIDC Clients)
- Alle Requests sollen eine Correlation/Trace ID tragen (Audit/Telemetry, siehe spätere ADRs)
- Tenant-Picker: nach Login die verfügbaren Tenants laden und aktiven Tenant setzen
- Company-Picker: innerhalb eines Tenants die aktive Company wählen (ADR-06300 §5)
- M2M: Client Credentials in Azure Key Vault speichern, nicht in Code/Config
- API Keys: zentrale Verwaltung in DB, Hashing der Keys (nicht im Klartext), Rotation erzwingen

## Verweise
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests / Gates)
- ADR-03100 (Autorisierung)
- ADR-03200 (Permission Katalog & Claim-Schema)
- ADR-05300 (Request Context)
- ADR-06000 (Multi-Tenancy)
- ADR-06300 (Multi-Company / Organisationsstruktur)
- ADR-09000 (Telemetry)
- Fragebogen §3.2–§3.5
