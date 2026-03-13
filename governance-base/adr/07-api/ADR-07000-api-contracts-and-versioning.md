---
id: ADR-07000
title: API Contracts & Versioning
status: accepted
date: 2026-01-21
scope: backend
enforced_by: code-review
affects:
  - backend
  - frontend
---

# ADR-07000 – API Contracts & Versioning

## Entscheidungstreiber
- Stabile API-Verträge für Frontend und externe Clients
- Kontrollierte Evolution ohne ungewollte Breaking Changes
- Klare Trennung zwischen Application-Use-Cases und API-Verträgen
- Unterstützung von OpenAPI, Tests und Generatoren
- Agenten- und CI-fähige Durchsetzung

## Kontext
Das System stellt APIs bereit für:
- Frontend-Anwendungen
- interne Services
- potenziell externe Clients

API-Verträge müssen:
- langfristig stabil sein
- explizit versioniert werden
- unabhängig von internen Application-Details evolvieren
- klar von Domain- und Application-Modellen getrennt sein

Error Handling ist standardisiert (ADR-05200),
Localization ebenfalls (ADR-05000).

## Entscheidung

---

### 1) Scope & Ziel
Dieses ADR gilt für:

- **öffentliche APIs**
- **interne APIs**

API-Stabilität ist ein explizites Ziel.
Breaking Changes sind nur kontrolliert und bewusst erlaubt.

---

### 2) Vertragsdefinition (Contracts)
Die API nutzt ein **Mischmodell**:

- Code-first als primärer Entwicklungsansatz
- OpenAPI als explizite Vertragsrepräsentation

**Source of Truth:**  
Die **OpenAPI-Spezifikation** ist die verbindliche Beschreibung des API-Vertrags.

Code und OpenAPI müssen konsistent bleiben.

---

### 3) DTOs, Models & Layer-Grenzen
Es gilt eine **strikte Trennung der Datenmodelle**:

#### Application Layer
- verwendet `*Dto`
- repräsentiert Use-Case-Daten
- ist nicht API-stabil

Beispiel:
Application.Customers.CreateCustomer.CreateCustomerDto

#### Presentation Layer (API)
- verwendet `*Model`
- repräsentiert **API Contracts**
- ist versioniert und stabil

Beispiel:
Presentation.Customers.Models.CreateCustomerRequestModel

#### Regeln
- **Kein DTO-Sharing** zwischen Application und Presentation
- **Mapping ist verpflichtend**:
  Application.*Dto → Presentation.*Model
- Domain-Modelle dürfen niemals direkt im API verwendet werden

---

### 4) Versionierungsstrategie
APIs werden über **URL-Versionierung** versioniert:
/api/v1/customers
/api/v2/customers

Neue API-Versionen entstehen **ausschließlich bei Breaking Changes**.

---

### 5) Breaking vs. Non-Breaking Changes

#### Non-Breaking Changes
Ohne neue Version erlaubt sind:

- Hinzufügen optionaler Felder
- Hinzufügen neuer Endpoints
- Erweiterung von Enums

#### Breaking Changes
Ohne neue Version **verboten** sind:

- Entfernen von Feldern
- Umbenennen von Feldern
- Änderung der Semantik bestehender Felder

---

### 6) Evolution & Deprecation
Deprecation erfolgt über ein **kombiniertes Modell**:

- Deprecation-Hinweise (Header + Dokumentation)
- Zeitlich unbegrenzter Parallelbetrieb

Alte Versionen werden unterstützt:
- **solange produktive Clients existieren**

Abkündigungen sind explizite Produktentscheidungen.

---

### 7) Error Contracts
Error Responses sind **Teil des API Contracts**:

- stabil
- versioniert
- konsistent zu **ADR-05200**

Clients dürfen sich auf:
- Error Codes
- Struktur
- Semantik

verlassen.

---

### 8) OpenAPI & Dokumentation
- OpenAPI ist **verpflichtend**
- Spezifikation wird **hauptsächlich aus Code generiert**
- Manuelle Ergänzungen (Beschreibungen, Beispiele) sind erlaubt

OpenAPI dient als:
- Dokumentation
- Vertragsgrundlage
- Basis für Tests und Generatoren

---

### 9) Tests
Tests stellen sicher:

- API-Verträge bleiben stabil
- Non-Breaking Changes sind kompatibel
- Error Contracts entsprechen ADR-05200

Contract-Tests zwischen API und Clients sind erlaubt und empfohlen.

---

### 10) Governance & ArchTests
ArchTests erzwingen:

1) Keine Domain-Modelle im Presentation Layer
2) Keine Application DTOs im Presentation Layer
3) Keine Presentation Models im Application Layer
4) Einhaltung der Versionierungsregeln
5) Stabilität der Error Contracts

CI schlägt fehl, wenn Regeln verletzt werden.

---

## Begründung
- Klare Trennung von API- und Application-Modellen verhindert Kopplung
- URL-Versionierung ist einfach, explizit und gut kommunizierbar
- OpenAPI als Vertragsquelle verbessert Tooling und Automatisierung
- Stabile Error Contracts erhöhen Client-Robustheit
- Namenskonventionen erleichtern Orientierung für Menschen und Agenten

## Konsequenzen

### Positiv
- Vorhersagbare API-Evolution
- Saubere Layer-Grenzen
- Gute Unterstützung für Frontend, externe Clients und Generatoren
- Hohe Test- und Governance-Fähigkeit

### Negativ / Trade-offs
- Mehr Mapping-Code
- Höherer initialer Aufwand
- Disziplin bei Modellpflege notwendig

## Umsetzungshinweise
- Pro API-Version eigener Controller-Scope
- Presentation-Models klar versioniert
- Mapping explizit und testbar halten
- OpenAPI-Checks in CI integrieren
- Deprecated APIs sichtbar kennzeichnen

## Verweise
- ADR-05200 (Error Handling & API Error Model)
- ADR-05000 (Localization / i18n)
- ADR-05300 (Request Context)
- ADR-02000–02200 (Testing & CI)
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests / Gates)
