---
id: ADR-10600
title: Authentifizierung & Autorisierung im Frontend
status: proposed
date: 2026-02-16
scope: frontend
enforced_by: code-review
affects:
  - frontend
---

# ADR-10600 – Authentifizierung & Autorisierung im Frontend

## Entscheidungstreiber
- Sichere Integration mit dem Identity Provider (ADR-03000)
- Konsistente Berechtigungsprüfung in der UI
- Token-Management (Refresh, Expiry, Logout)
- Schutz vor unbefugtem Zugriff auf Routen und UI-Elemente
- Developer Experience (Dev-Auth, ADR-03300)

## Kontext
Die Authentifizierung erfolgt über einen externen Identity Provider mittels OIDC Authorization Code Flow mit PKCE (ADR-03000).
Die API akzeptiert JWT Bearer Tokens.

Das Frontend muss:
- den OIDC-Flow steuern (Login, Logout, Token-Refresh)
- Access Tokens an API-Requests anhängen (ADR-10300)
- Berechtigungen aus dem Token/Claims auswerten
- UI-Elemente und Routen basierend auf Berechtigungen ein-/ausblenden

Die Autorisierung im Backend (ADR-03100) ist die **Source of Truth**.
Das Frontend filtert nur die UI – es verhindert keine Zugriffsversuche auf API-Ebene.

## Entscheidung

### 1) OIDC-Client
Die Anwendung nutzt eine **etablierte OIDC-Client-Bibliothek** für die Integration mit dem Identity Provider.

Anforderungen an die Bibliothek:
- Unterstützung von Authorization Code Flow mit PKCE
- Integrierter Token-Cache und Silent-Refresh
- Gute Integration mit dem eingesetzten SPA-Framework

---

### 2) Token-Management

#### Access Token
- Token wird im Arbeitsspeicher gecached (In-Memory)
- Silent-Refresh vor Ablauf (OIDC-Bibliothek übernimmt dies)
- **Kein Speichern in LocalStorage oder SessionStorage** (Security Best Practice)

#### Token-Ablauf
- Bei abgelaufenem Token: Silent-Refresh
- Bei Fehlschlag: Redirect zur Login-Seite
- 401-Responses vom API lösen ebenfalls Token-Refresh oder Re-Login aus (ADR-10300)

---

### 3) Auth-Service
Ein zentraler **Auth-Service** kapselt die Authentifizierungslogik:

- Exponiert den aktuellen Benutzer (reaktiv)
- Exponiert den Login-Status (reaktiv)
- Stellt `login()`, `logout()` Methoden bereit
- Extrahiert Claims (Benutzer-ID, Tenant-ID, Permissions) aus dem Token

---

### 4) Berechtigungen (Permissions)
Berechtigungen werden aus den Token-Claims extrahiert:

- Permission-Claims gemäß ADR-03200
- Der Auth-Service stellt eine Methode `hasPermission(permission: string)` bereit
- Permissions werden als String-Array aus dem Token gelesen

---

### 5) Route-Guards
Zugriffskontrolle auf Routing-Ebene:

#### a) Auth Guard
- Schützt Routen vor nicht-authentifizierten Benutzern
- Leitet zur Login-Seite weiter

#### b) Permission Guard
- Eigener Guard, der den Auth-Service zur Berechtigungsprüfung nutzt
- Permission wird über Routen-Metadaten konfiguriert
- Bei fehlender Berechtigung: Weiterleitung zur "Access Denied"-Seite

---

### 6) UI-Berechtigungssteuerung
UI-Elemente werden basierend auf Berechtigungen gesteuert:

- Eine **Direktive oder Utility-Komponente** zum Ein-/Ausblenden von Elementen basierend auf Permissions
- Menüeinträge werden über Permissions gefiltert (ADR-10100)
- Buttons (z. B. Erstellen, Bearbeiten, Löschen) werden bei fehlender Berechtigung ausgeblendet

**Wichtig:** UI-Hiding ist **kein Sicherheitsmechanismus**. Die API prüft Berechtigungen unabhängig (ADR-03100).

---

### 7) Tenant-Kontext
Der aktuelle Tenant wird aus dem Token-Claim extrahiert:

- Tenant-ID wird reaktiv im Auth-Service bereitgestellt
- Wird für API-Requests genutzt (falls Tenant-Header nötig)
- Wird in der UI angezeigt (z. B. im Header, ADR-10100)

---

### 8) Dev-Auth (Lokale Entwicklung)
Für lokale Entwicklung wird ein **Dev-Auth-Modus** unterstützt (ADR-03300):

- Die OIDC-Bibliothek wird durch einen Fake-Auth-Service ersetzt
- Fake-User mit konfigurierbaren Claims (User-ID, Tenant-ID, Permissions)
- Aktivierung über Umgebungskonfiguration
- **Niemals in Production-Builds aktivierbar**

## Begründung
- Eine etablierte OIDC-Bibliothek reduziert Security-Risiken und Eigenimplementierung.
- Reaktiver Auth-Service integriert sich nahtlos mit dem State-Management (ADR-10200).
- UI-Berechtigungssteuerung über wiederverwendbare Direktive ist deklarativ und einfach einsetzbar.
- Dev-Auth beschleunigt die lokale Entwicklung erheblich.

## Alternativen
1) Eigene OIDC-Implementierung
   - Vorteile: Volle Kontrolle
   - Nachteile: Hoher Aufwand, Security-Risiko, Wartung

2) BFF-Pattern (Token im Backend halten)
   - Vorteile: Kein Token im Browser, höhere Sicherheit
   - Nachteile: Zusätzliche Backend-Komponente, mehr Infrastruktur

## Konsequenzen

### Positiv
- Sicheres Token-Management (In-Memory, Silent-Refresh)
- Deklarative Berechtigungsprüfung in UI und Routing
- Dev-Auth ermöglicht schnelle lokale Entwicklung
- Konsistenz mit Backend-Auth-Strategie (ADR-03000, ADR-03100)

### Negativ / Trade-offs
- Abhängigkeit von einer externen OIDC-Bibliothek
- Dev-Auth muss strikt gesichert sein (keine Production-Leaks)
- UI-Permission-Hiding kann bei falscher Verwendung falsche Sicherheit suggerieren

### Umsetzungshinweise
- Auth-Service liegt im `core/`-Bereich
- Permission-Direktive liegt im `shared/`-Bereich
- Permission-Guard liegt im `core/`-Bereich
- Login-Redirect-URI muss im Identity Provider konfiguriert sein
- Logout leitet zur Post-Logout-URI weiter

## Verweise
- ADR-03000 (Authentifizierung – OIDC, JWT)
- ADR-03100 (Autorisierung – Permissions, Tenant-aware)
- ADR-03200 (Permission-Katalog & Claim-Schema)
- ADR-03300 (Dev-Auth)
- ADR-10000 (Frontend-Architektur)
- ADR-10100 (UI-Layout – Menü-Berechtigungen)
- ADR-10300 (REST-API-Kommunikation – Auth-Header)
- ADR-10400 (Routing – Route Guards)
