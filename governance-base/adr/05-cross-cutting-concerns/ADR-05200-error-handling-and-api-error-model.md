---
id: ADR-05200
title: Error Handling & API Error Model
status: accepted
date: 2026-01-21
scope: backend
enforced_by: code-review
affects:
  - backend
  - frontend
---

# ADR-05200 – Error Handling & API Error Model

## Entscheidungstreiber
- Einheitliches und stabiles API-Fehlerverhalten
- Klare Trennung von fachlichen und technischen Fehlern
- Konsistentes Mapping von Domain-, Validation- und Security-Fehlern
- Unterstützung für Localization und Frontend-Fehlerdarstellung
- Agenten- und CI-fähige Governance

## Kontext
Das System nutzt:
- Domain Errors & Results (ADR-01500)
- Application Validation (ADR-05100)
- Localization über Resource Keys (ADR-05000)
- Zentrales Logging und Audit (ADR-04000, ADR-03400)

Fehler müssen:
- für Clients eindeutig interpretierbar sein
- stabil und versionierbar bleiben
- keine internen Details oder PII leaken
- konsistent über alle Endpoints auftreten

## Entscheidung

---

### 1) Scope
Dieses ADR regelt:

- API-Fehlerformat
- Mapping von Validation-, Domain-, Authorization- und Technical Errors
- Zentrales Exception Handling

**Nicht Teil dieses ADRs:**
- Logging (ADR-04000)
- Security Audit (ADR-03400)

---

### 2) Fehlerkategorien
Das System unterscheidet explizit folgende Fehlerarten:

- **Validation Errors**
- **Domain Errors**
- **Authentication / Authorization Errors**
- **Not Found / Conflict / Concurrency Errors**
- **Technical Errors (Exceptions)**

Domain Errors und Technical Errors sind **klar getrennt**.

---

### 3) API-Fehlerformat
Die API nutzt:

- **RFC 7807 ProblemDetails**
- erweitert um **stabile, versionierbare Extensions**

Kein eigenes Error-DTO außerhalb von ProblemDetails.

---

### 4) Versionierung
Das Error-Format ist **stabil und versioniert**.

- Änderungen am Format gelten als Breaking Change
- Error Codes bleiben stabil über Versionen hinweg

---

### 5) Inhalt des Error Responses
Ein API-Error enthält mindestens:

- `status` (HTTP Status Code)
- `type` (stabiler Fehler-Typ / URI)
- `title` (kurze Beschreibung)
- `errorCode` (fachlicher oder technischer Code)
- `resourceKey` (für Localization)
- `correlationId`
- `errors` (optional, z. B. Field Errors bei Validation)

**Nicht enthalten:**
- interne technische Details
- Stacktraces (außer Development, siehe unten)
- PII

---

### 6) Details & Entwicklungsmodus
Technische Details (z. B. Stacktraces):

- **nur in Development**
- niemals in Test, Staging oder Production

---

### 7) Mapping-Regeln

#### Validation Errors
- HTTP Status: **400 Bad Request**
- Ein Error Response mit:
  - Liste von Field Errors
  - stabilen Validation Error Codes
  - Resource Keys pro Feld

#### Domain Errors
- Mapping abhängig vom Error-Typ:
  - NotFound → 404
  - Conflict / Invariant Violation → 409
  - Business Rule Violation → 400
- Mapping erfolgt zentral und explizit

#### Authentication / Authorization
- **401 Unauthorized**: nicht authentifiziert
- **403 Forbidden**: authentifiziert, aber nicht berechtigt

#### Technical Errors
- HTTP Status: **500 Internal Server Error**
- Keine fachlichen Codes
- Kein Leaken interner Informationen

---

### 8) Exception Handling
Exception Handling erfolgt **zentral**:

- über Middleware (Presentation) oder Pipeline (Application)
- keine Exception-Behandlung in Controllern oder Handlern

Unbekannte Exceptions werden immer als **500** gemappt.

---

### 9) Localization
- Fehlertexte werden über **Resource Keys** aufgelöst (ADR-05000)
- API liefert:
  - Error Code
  - Resource Key
  - optional lokalisierte Message
- Sprache wird über Culture Resolution bestimmt (ADR-05000)

---

### 10) Tests
Tests stellen sicher:

- korrektes HTTP-Mapping je Fehlerart
- stabile Error Codes
- keine PII im Error Response
- konsistentes ProblemDetails-Format

---

### 11) Governance & ArchTests
ArchTests erzwingen:

1) Domain kennt kein HTTP, kein ProblemDetails
2) Presentation enthält kein Domain-Fehlerwissen
3) Error Mapping ist zentralisiert
4) Keine hardcodierten User-facing Texte in Domain/Application

CI schlägt fehl, wenn Regeln verletzt werden.

---

## Begründung
- ProblemDetails ist ein etablierter Standard
- Klare Fehlerkategorien verhindern Vermischung
- Zentrales Mapping vermeidet Inkonsistenzen
- Localization und stabile Codes verbessern Client-UX
- Governance verhindert schleichende Architekturverletzungen

## Konsequenzen

### Positiv
- Vorhersagbares, konsistentes API-Fehlerverhalten
- Gute Unterstützung für Frontend, Mobile und Integrationen
- Klare Debug- und Support-Prozesse
- Agenten können Fehler korrekt generieren und behandeln

### Negativ / Trade-offs
- Initialer Implementierungsaufwand
- Strikte Regeln erfordern Disziplin
- Mapping-Tabellen müssen gepflegt werden

## Umsetzungshinweise
- Zentrale Error-Mapping-Komponente in Application/Presentation
- Einheitliche ProblemDetails-Factory
- Validation Errors als strukturierte Liste (Field → Code → ResourceKey)
- CorrelationId immer beifügen
- Exception Middleware strikt vor Controllers platzieren

## Verweise
- ADR-01500 (Domain Errors & Results)
- ADR-05000 (Localization / i18n)
- ADR-05100 (Validation Strategy)
- ADR-04000 (Logging)
- ADR-03400 (Security Audit)
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests / Gates)
