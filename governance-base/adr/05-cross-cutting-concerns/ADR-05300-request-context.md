---
id: ADR-05300
title: Request Context (User, Tenant, Culture, Correlation)
status: accepted
date: 2026-01-21
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-05300 – Request Context (User, Tenant, Culture, Correlation)

## Entscheidungstreiber
- Einheitlicher Zugriff auf sicherheits- und kontextrelevante Informationen
- Klare Trennung von Transport (HTTP) und Application
- Unterstützung von Background Jobs und System-Accounts
- Konsistenz mit Auth, Localization, Logging, Audit und Telemetry
- Agenten- und CI-fähige Governance

## Kontext
Mehrere ADRs setzen implizit einen stabilen Kontext voraus:
- Authentifizierung & Autorisierung (03000–03200)
- Localization (ADR-05000)
- Logging (ADR-04000)
- Error Handling (ADR-05200)
- Security Audit (ADR-03400)

Ohne einen klar definierten Request Context entstehen:
- direkte Abhängigkeiten vom HttpContext
- inkonsistente Kontextauflösung
- schwer testbarer Code

## Entscheidung

---

### 1) Inhalt des Request Context
Der Request Context kapselt folgende Informationen:

- **UserId**
- **TenantId**
- **Culture**
- **CorrelationId**

Permissions sind **nicht** Teil des Request Contexts
(sie werden separat über Authorization/Policy ausgewertet).

---

### 2) Verwendung
Der Request Context darf verwendet werden in:

- **Application**
- **Infrastructure**

Er darf **nicht** verwendet werden in:
- Domain

---

### 3) Quelle der Context-Werte
Die Werte stammen primär aus:

- **UserId / TenantId**: Security Claims
- **Culture**: `Accept-Language` Header → User Profil → Default
- **CorrelationId**: Ingress (Gateway / Middleware)

---

### 4) Immutability
Der Request Context ist **immutable**:

- Werte werden beim Erstellen gesetzt
- Keine Mutation während der Request-Verarbeitung
- Neuer Context für jeden neuen Ausführungspfad

---

### 5) Lebenszyklus
- Es existiert **nicht zwingend genau ein Context pro HTTP-Request**
- Background Jobs und asynchrone Prozesse besitzen **eigene Context-Instanzen**
- Context ist ein Ausführungs-Kontext, kein Transport-Konzept

---

### 6) Zugriff & Abstraktion
Zugriff erfolgt **ausschließlich über Abstraktionen**:

- zentrales Interface: `ICurrentRequestContext`
- zusätzlich getrennte Interfaces:
  - `ICurrentUserContext`
  - `ICurrentTenantContext`
  - `ICurrentCultureContext`
  - `ICurrentCorrelationContext`

**Verboten:**
- direkter Zugriff auf `HttpContext` außerhalb der Presentation
- statische / globale Contexts (Ambient Context)

---

### 7) Pflichtfelder & Verhalten bei fehlenden Werten
Pflichtfelder:
- UserId
- TenantId
- CorrelationId
- Culture

Fehlende Werte werden **kontextabhängig** behandelt:

- HTTP Requests: Fehler (z. B. 400 / 401)
- Background Jobs: expliziter System-Context
- Technische Prozesse: explizite Entscheidung im Use Case

Kein stilles Defaulting ohne explizite Regel.

---

### 8) Background Jobs & System Accounts
Background Jobs nutzen:

- **System Accounts** (z. B. `SystemUser`)
- explizite `TenantId`
- eigene `CorrelationId`

System Accounts sind erlaubt und müssen:
- klar gekennzeichnet sein
- auditierbar bleiben
- keine PII enthalten

---

### 9) Integration
Der Request Context wird automatisch integriert in:

- **Logging** (Scopes)
- **Error Responses** (CorrelationId)
- **Audit Events**
- **Telemetry / Tracing**

Keine manuelle Weitergabe notwendig.

---

### 10) Tests
- Request Context ist **mock-/fake-bar**
- Tests können Context explizit setzen
- Keine Abhängigkeit zu HTTP oder Frameworks in Tests

---

### 11) Governance & ArchTests
ArchTests erzwingen:

1) Domain kennt keinen Request Context
2) Kein direkter Zugriff auf HttpContext außerhalb Presentation
3) Zugriff auf Context nur über definierte Interfaces
4) Keine statischen / globalen Context-Implementierungen

CI schlägt fehl, wenn Regeln verletzt werden.

---

## Begründung
- Abstrakter Context erhöht Testbarkeit und Entkopplung
- Immutability verhindert schwer nachvollziehbare Seiteneffekte
- Klare Regeln für Background Jobs vermeiden Sicherheitslücken
- Getrennte Interfaces reduzieren unnötige Kopplung
- Zentrale Integration reduziert Boilerplate

## Konsequenzen

### Positiv
- Einheitlicher Zugriff auf Kontextinformationen
- Saubere Trennung von HTTP und Application
- Gute Unterstützung für async Workflows und Jobs
- Konsistenz über Logging, Errors, Audit und Telemetry

### Negativ / Trade-offs
- Initialer Implementierungsaufwand
- Disziplin nötig bei System-/Job-Kontexten
- Mehr Interfaces erhöhen Komplexität geringfügig

## Umsetzungshinweise
- Context wird in Presentation erstellt und in Application injiziert
- Background Jobs erzeugen Context explizit beim Start
- Keine statischen Holder oder AsyncLocal-basierte Globals
- CorrelationId früh erzeugen (Ingress)
- Culture Resolution konsistent mit ADR-05000

## Verweise
- ADR-03000 (Authentifizierung)
- ADR-03100 (Autorisierung)
- ADR-03200 (Permission-Katalog)
- ADR-03400 (Security Audit)
- ADR-04000 (Logging)
- ADR-05000 (Localization / i18n)
- ADR-05200 (Error Handling & API Error Model)
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests / Gates)
