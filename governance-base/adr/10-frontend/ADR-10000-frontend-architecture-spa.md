---
id: ADR-10000
title: Frontend-Architektur (SPA, Grundstruktur)
status: proposed
date: 2026-02-16
scope: frontend
enforced_by: code-review
affects:
  - frontend
---

# ADR-10000 – Frontend-Architektur: SPA & Grundstruktur

## Entscheidungstreiber
- Konsistente, wartbare Codebasis für das Frontend
- Wiederverwendbare Komponenten und klare Projektstruktur
- Gute Integration mit REST API (ADR-07000) und Authentifizierung (ADR-03000)
- Teamproduktivität und Onboarding-Geschwindigkeit
- Langfristige Wartbarkeit und Erweiterbarkeit

## Kontext
Das System benötigt eine webbasierte Benutzeroberfläche für das Erstellen, Bearbeiten und Einsehen von Datensätzen.
Die Daten werden über eine REST API bereitgestellt (ADR-07000).
Die Authentifizierung erfolgt über Entra ID / OIDC (ADR-03000).

Die Anwendung soll als **Single Page Application (SPA)** umgesetzt werden,
um eine flüssige Benutzererfahrung ohne vollständige Seitenreloads zu bieten.

## Entscheidung

### 1) Anwendungstyp
Die Frontend-Anwendung wird als **Single Page Application (SPA)** umgesetzt.

- Kein Server-Side Rendering (SSR) im initialen Scope
- Kein Backend-for-Frontend (BFF) im initialen Scope
- Die SPA kommuniziert direkt mit der REST API

---

### 2) Framework-Entscheidung: Angular

Das SPA-Framework ist **Angular** (aktuelle LTS-Version).

#### Begründung der Framework-Wahl

| Kriterium | Bewertung |
|-----------|-----------|
| **Enterprise-Reife** | Sehr ausgereiftes Ökosystem, bewährt in großen Business-Anwendungen |
| **Entwickler-Verfügbarkeit** | Großer Talent-Pool, hohe Marktdurchdringung |
| **Performance** | Native Browser-Performance (Client-Side Rendering), kein WASM-Overhead |
| **Skalierbarkeit** | Client-Side Rendering – keine Server-Ressourcen pro User |
| **TypeScript** | TypeScript ist Erstklassensprache in Angular (strict-Mode) |
| **Komponentenbibliothek** | Infragistics Ignite UI for Angular ist sehr ausgereift (ADR-10100) |
| **Dependency Injection** | Built-in DI-System für Testbarkeit und Modularität |
| **Tooling** | Angular CLI, Schematics, integriertes Testing (Karma/Jest, Protractor/Cypress) |
| **Langfristige Wartung** | Google-backed, halbjährliche Major-Releases, vorhersagbarer Update-Pfad |

#### Verworfene Alternativen

1) **Blazor WebAssembly**
   - Vorteile: C#-Code-Sharing (DTOs, Validation), nur ein Skillset
   - Nachteile: Größere Initial Load Time (~2-3 MB WASM), noch wachsendes Ökosystem, weniger Entwickler am Markt
   - Bewertung: Nicht geeignet für Enterprise-SaaS-ERP mit hohen Performance-Anforderungen

2) **Blazor Server**
   - Vorteile: Minimale Bundle-Größe, serverseitiges Rendering
   - Nachteile: Server-Ressourcen pro User (nicht skalierbar für Multi-Tenant SaaS), keine Offline-Fähigkeit, Latenz
   - Bewertung: Nicht geeignet für SaaS mit 500-600 Mandanten

#### Angular-spezifische Regeln
- **Standalone Components** bevorzugt (Angular 17+)
- **Signals** für reaktive State-Verwaltung (Angular 17+)
- **Lazy Loading** für Feature-Module (Route-basiert)
- **Strict Mode** (`strictTemplates`, `strictInjectionParameters`)
- **OnPush Change Detection** als Standard für alle Komponenten
- **RxJS** für asynchrone Datenströme (HTTP, WebSocket/SignalR)

---

### 3) Technologie-Anforderungen
Angular erfüllt alle folgenden Kriterien:

- Komponentenbasierte Architektur
- Typsicherheit (TypeScript, `strict`-Mode)
- Integrierte oder etablierte Lösungen für Routing, HTTP-Kommunikation und Formulare
- Dependency Injection oder vergleichbares Mittel für Testbarkeit
- Aktive Community und langfristiger Support

---

### 4) Projektstruktur
Die Anwendung folgt einer **feature-basierten Struktur**:

```
src/
├── app/
│   ├── core/              # Singletons, Guards, Interceptors, zentrale Services
│   ├── shared/            # Wiederverwendbare Komponenten, Pipes, Utilities
│   ├── layout/            # Header, Footer, Menü, Shell-Komponente
│   └── features/          # Feature-Bereiche (je Domäne/Entität)
│       ├── customers/
│       ├── orders/
│       └── ...
├── assets/                # Statische Dateien (Icons, Bilder)
├── environments/          # Umgebungskonfiguration
└── i18n/                  # Lokalisierungsdateien
```

---

### 5) Layer-Trennung im Frontend
Auch im Frontend gilt eine klare Trennung:

- **Presentation** (Komponenten, Templates): reine UI-Logik, keine API-Aufrufe
- **Service** (Services, Facades): Datenlogik, API-Kommunikation, State
- **Model** (Interfaces, Types): Datentypen, API-Models

Komponenten rufen keine HTTP-Endpunkte direkt auf.

---

### 6) Build & Tooling
- **Linting**: Einheitliche Linting-Regeln (z. B. ESLint)
- **Formatting**: Automatische Code-Formatierung (z. B. Prettier)
- **Styling**: CSS-Preprocessor (z. B. SCSS) oder vergleichbar
- **Umgebungskonfiguration**: Umgebungsspezifische Variablen (API-URLs, Feature-Flags) ohne Secrets

## Begründung
- Komponentenbasierte Architektur fördert Wiederverwendbarkeit und Testbarkeit.
- Feature-basierte Struktur skaliert gut bei wachsender Anzahl von Domänenobjekten.
- Strikte Typisierung verhindert Typfehler frühzeitig.
- Layer-Trennung im Frontend verhindert, dass UI-Komponenten zu "Fat Components" werden.

## Alternativen
1) Server-Side Rendering (SSR)
   - Vorteile: Bessere SEO, schnelleres initiales Laden
   - Nachteile: Nicht nötig für interne CRUD-Anwendung, zusätzliche Infrastruktur

2) Multi-Page Application (MPA)
   - Vorteile: Einfachere Architektur, kein Client-Side Routing
   - Nachteile: Langsame Navigation, schlechtere User Experience

3) Micro-Frontends
   - Vorteile: Team-Autonomie, unabhängige Deployments
   - Nachteile: Hohe Komplexität, Overhead für kleine Anwendungen

## Konsequenzen

### Positiv
- Klare Projektstruktur erleichtert Onboarding und agentengesteuerte Entwicklung
- Strikte Typisierung reduziert Laufzeitfehler
- Feature-basierte Struktur ermöglicht parallele Arbeit an verschiedenen Features

### Negativ / Trade-offs
- SPA erfordert Client-Side Routing und Token-Management im Browser
- Initiale Bundle-Größe muss durch Lazy Loading kontrolliert werden
- Umgebungskonfiguration darf keine Secrets enthalten

### Umsetzungshinweise
- Jedes Feature bekommt einen eigenen Ordner unter `features/`
- Shared-Komponenten werden nur erstellt, wenn sie in mindestens zwei Features genutzt werden
- Zentrale Services sind Singletons (eine Instanz pro Anwendung)
- Keine Geschäftslogik in Templates (maximal einfache Bedingungen/Schleifen)
- Alle API-Models werden als TypeScript Interfaces definiert, nicht als Klassen
- Umgebungskonfiguration enthält keine Secrets

## Verweise
- ADR-03000 (Authentifizierung – OIDC)
- ADR-07000 (API Contracts & Versioning)
- ADR-05000 (Localization / i18n)
- ADR-10100 (UI-Layout & Komponentenstruktur)
- ADR-10300 (REST-API-Kommunikation)
