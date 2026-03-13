---
id: ADR-10200
title: State Management
status: proposed
date: 2026-02-16
scope: frontend
enforced_by: code-review
affects:
  - frontend
---

# ADR-10200 – State Management

## Entscheidungstreiber
- Vorhersagbarer, konsistenter Zustand der Anwendung
- Klare Trennung zwischen UI-State, Feature-State und Server-State
- Testbarkeit und Nachvollziehbarkeit von Zustandsänderungen
- Geringer Boilerplate bei gleichzeitiger Skalierbarkeit

## Kontext
Die Anwendung ist eine SPA (ADR-10000) zum Erstellen, Bearbeiten und Einsehen von Datensätzen.
Die Daten stammen aus einer REST API (ADR-07000).

Es gibt verschiedene Arten von Zustand:
- **Server-State**: Daten aus der API (Entitäten, Listen, Paginierdaten)
- **UI-State**: z. B. Menü offen/geschlossen, aktiver Tab, Ladeindikator
- **Auth-State**: aktueller Benutzer, Berechtigungen, Tenant
- **Form-State**: Eingabefelder, Validierungsstatus

## Entscheidung

### 1) Grundprinzip
Die Anwendung unterscheidet explizit zwischen:

- **Server-State** → wird über Services mit API-Kommunikation verwaltet
- **UI-State** → wird lokal in Komponenten oder Services verwaltet
- **Auth-State** → wird zentral im Auth-Service verwaltet

Es wird **kein globaler Store** für den gesamten Anwendungsstatus eingesetzt.

---

### 2) Server-State
Server-State wird über **Feature-Services** verwaltet:

- Services kapseln API-Aufrufe und halten gecachte Daten
- Jedes Feature hat einen eigenen Service
- Daten werden bei Navigation oder Aktion neu geladen (kein globaler Cache)
- Für Listen: Pagination-State wird im Service gehalten

---

### 3) Reaktivität
Zustandsänderungen werden **reaktiv** an die UI propagiert:

- Services exponieren Daten über ein reaktives Modell (z. B. Observables, Signals, Stores)
- Computed/Derived State wird deklarativ aus bestehenden Daten abgeleitet
- Side-Effects (z. B. API-Aufrufe) werden klar von Zustandsänderungen getrennt

---

### 4) UI-State
UI-State verbleibt **lokal**:

- Komponenteninterner State (z. B. Toggle, Tab-Index) über lokale Properties
- Kein UI-State in einem globalen Store
- Shared UI-State (z. B. Sidenav-Status) über dedizierte Services

---

### 5) Auth-State
Auth-State wird über einen **zentralen Auth-Service** bereitgestellt:

- Aktueller Benutzer (reaktiv)
- Berechtigungen (reaktiv)
- Tenant-Kontext (reaktiv)
- Siehe ADR-10600

---

### 6) Form-State
Formular-Zustand wird über das **Formular-Framework** des eingesetzten Frameworks verwaltet:

- Typisierte Formular-Gruppen und -Kontrollelemente
- Validierung über das Formular-Framework (siehe ADR-10500)
- Kein externer State-Management für Formulare

## Begründung
- Kein globaler Store reduziert Boilerplate und Komplexität für eine CRUD-dominierte Anwendung.
- Feature-Services als State-Holder sind einfach testbar und verständlich.
- Klare Trennung der State-Arten vereinfacht das Nachvollziehen des Datenflusses.
- Bei wachsender Komplexität kann ein globaler Store nachträglich eingeführt werden.

## Alternativen
1) Globaler Store (Redux-Pattern)
   - Vorteile: Vorhersagbarer State, DevTools, gute Testbarkeit
   - Nachteile: Hoher Boilerplate, Overhead für CRUD-Anwendungen

2) Server-State-Bibliotheken (z. B. TanStack Query)
   - Vorteile: Automatisches Caching, Refetching, Mutation-Management
   - Nachteile: Zusätzliche Abhängigkeit, Lernkurve

## Konsequenzen

### Positiv
- Einfaches, verständliches State-Management ohne Framework-Overhead
- Klare Trennung der State-Arten vereinfacht Reasoning über Datenfluss
- Feature-Services sind unabhängig testbar

### Negativ / Trade-offs
- Kein globaler Store erschwert Feature-übergreifendes State-Sharing (muss über Services gelöst werden)
- Bei wachsender Komplexität könnte ein Store-Pattern nachträglich nötig werden

### Umsetzungshinweise
- Jeder Feature-Service exponiert Daten als reaktive, readonly-Werte
- Mutation nur über definierte Methoden im Service (kein direktes Setzen von außen)
- Kein State in Komponenten, der über die Lebensdauer der Komponente hinaus relevant ist
- Services sind Singletons (eine Instanz pro Anwendung oder Feature-Scope)

## Verweise
- ADR-10000 (Frontend-Architektur)
- ADR-10300 (REST-API-Kommunikation)
- ADR-10500 (Formulare & Validierung)
- ADR-10600 (Authentifizierung & Autorisierung im Frontend)
