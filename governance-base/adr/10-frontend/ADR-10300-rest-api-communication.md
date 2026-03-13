---
id: ADR-10300
title: REST-API-Kommunikation & HTTP-Client
status: proposed
date: 2026-02-16
scope: frontend
enforced_by: code-review
affects:
  - frontend
---

# ADR-10300 – REST-API-Kommunikation & HTTP-Client

## Entscheidungstreiber
- Konsistente, typsichere Kommunikation mit der REST API
- Zentrale Behandlung von Auth-Tokens, Fehlerhandling und Retry-Logik
- Einhaltung der API-Verträge (ADR-07000)
- Unterstützung von Pagination, Filtering, Sorting (ADR-07300)
- Wartbarkeit und Testbarkeit der API-Schicht

## Kontext
Die SPA kommuniziert direkt mit der REST API (ADR-10000).
Die API liefert Daten im JSON-Format und nutzt ProblemDetails für Fehler (ADR-05200).
Authentifizierung erfolgt über JWT Bearer Tokens (ADR-03000).

Alle API-Aufrufe müssen:
- ein gültiges Access Token mitschicken
- mit der korrekten API-Version arbeiten
- Fehler einheitlich behandeln
- den Correlation-ID-Header setzen

## Entscheidung

### 1) HTTP-Client
API-Aufrufe erfolgen über einen **zentralen HTTP-Client** (framework-integriert oder etablierte Bibliothek).

- Alle API-Aufrufe erfolgen über Feature-Services, nie direkt in Komponenten
- Der HTTP-Client muss Interceptor-/Middleware-Mechanismen unterstützen
- Responses werden typisiert (generisch, z. B. `get<T>(url): Promise<T>`)

---

### 2) API Base URL
Die API Base URL wird **zentral konfiguriert**:

- Definiert in der Umgebungskonfiguration (je Umgebung unterschiedlich)
- Zugreifbar über einen zentralen Konfigurationsservice
- Keine hardcodierten URLs in Services oder Komponenten

---

### 3) Middleware / Interceptors
Folgende Querschnittsbelange werden **zentral** als Interceptor oder Middleware behandelt:

#### a) Auth-Header
- Fügt `Authorization: Bearer <token>` an jeden API-Request an
- Token wird aus dem Auth-Service bezogen (ADR-10600)
- Requests an Drittanbieter-URLs werden ausgenommen

#### b) Correlation-ID
- Fügt `X-Correlation-Id` Header an jeden Request an
- Generiert eine UUID pro Request
- Ermöglicht End-to-End-Tracing (ADR-05300)

#### c) Fehlerbehandlung
- Fängt HTTP-Fehler zentral ab
- Parsed ProblemDetails-Responses (ADR-05200)
- Leitet an den zentralen Error-Handling-Service weiter (ADR-10700)
- 401-Fehler lösen Token-Refresh oder Redirect zum Login aus

#### d) Sprach-Header
- Setzt `Accept-Language` Header basierend auf der aktuellen Spracheinstellung (ADR-10800)

---

### 4) API-Service-Pattern
Jedes Feature hat einen eigenen **API-Service**:

- Ein API-Service pro Feature/Entität
- Typisierte Methoden für CRUD-Operationen (`getAll`, `getById`, `create`, `update`, `delete`)
- Der Feature-Service (State, ADR-10200) konsumiert den API-Service
- API-Services enthalten keine Business-Logik

---

### 5) API-Models (TypeScript Interfaces)
API-Models werden als **TypeScript Interfaces** definiert:

- Getrennt von internen UI-Models (sofern Unterschiede bestehen)
- Benennungskonvention: `*Request`, `*Response`, `*ListItem`, `*Detail`
- Liegen im `models/`-Bereich des jeweiligen Features
- Entsprechen den API-Contracts (ADR-07000)

---

### 6) Pagination, Filtering, Sorting
Für Listenendpunkte:

- Query-Parameter werden über ein typisiertes Objekt übergeben
- Pagination erfolgt über `page` / `pageSize` (analog zum Backend-Contract)
- Die API liefert eine paginierte Antwort mit Metadaten (`totalCount`, `page`, `pageSize`)
- Sorting- und Filter-Parameter werden aus der UI an den Service durchgereicht

---

### 7) Retry & Timeout
- Kein automatisches Retry bei mutativen Requests (POST, PUT, DELETE) – Idempotenz muss garantiert sein (ADR-05400)
- GET-Requests können bei Netzwerkfehlern mit begrenztem Retry versehen werden
- Ein globaler Timeout wird konfiguriert (z. B. 30 Sekunden)

## Begründung
- Ein zentraler HTTP-Client mit Interceptor-Mechanismus vermeidet Duplikation von Querschnittslogik.
- Typisierte API-Services vermeiden Fehler bei API-Aufrufen.
- Trennung von API-Service und Feature-Service folgt dem Single-Responsibility-Prinzip.
- Zentrale Fehlerbehandlung garantiert konsistentes Verhalten bei Fehlern.

## Alternativen
1) OpenAPI-Generator für TypeScript-Clients
   - Vorteile: Automatische Client-Generierung, Konsistenz mit API
   - Nachteile: Generierter Code ist schwerer zu debuggen, Anpassungen werden überschrieben

2) GraphQL statt REST
   - Vorteile: Flexiblere Queries, weniger Over-/Underfetching
   - Nachteile: Backend-Änderung nötig, Overhead für CRUD-Anwendung

## Konsequenzen

### Positiv
- Einheitliche API-Kommunikation über alle Features
- Zentrale Fehlerbehandlung und Auth-Token-Management
- Gute Testbarkeit (HTTP-Client kann gemockt werden)

### Negativ / Trade-offs
- Interceptor-Reihenfolge muss bewusst konfiguriert werden
- Manuelle API-Model-Pflege (ohne Code-Generator)

### Umsetzungshinweise
- API-Services liegen im `services/`-Bereich des jeweiligen Features
- API-Models liegen im `models/`-Bereich des jeweiligen Features
- API Base URL wird zentral injiziert, nicht importiert
- HTTP-Fehler werden nicht in API-Services gefangen (→ zentraler Interceptor)
- Bei Token-Ablauf: Silent-Refresh versuchen, bei Fehlschlag Redirect zum Login

## Verweise
- ADR-07000 (API Contracts & Versioning)
- ADR-05200 (Error Handling & API Error Model)
- ADR-05300 (Request Context / Correlation ID)
- ADR-03000 (Authentifizierung)
- ADR-10000 (Frontend-Architektur)
- ADR-10200 (State Management)
- ADR-10700 (Fehlerbehandlung im Frontend)
