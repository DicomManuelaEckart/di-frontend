---
id: ADR-10400
title: Routing & Navigation
status: proposed
date: 2026-02-16
scope: frontend
enforced_by: code-review
affects:
  - frontend
---

# ADR-10400 – Routing & Navigation

## Entscheidungstreiber
- Vorhersagbare, konsistente URL-Struktur
- Berechtigungsbasierter Zugriff auf Seiten
- Lazy Loading für Performance-Optimierung
- SPA-typische Navigation ohne Seitenreloads
- Tiefe Verlinkbarkeit (Deep Linking)

## Kontext
Die Anwendung ist eine SPA (ADR-10000) mit einer Shell-Komponente (ADR-10100),
die Header, Menü, Footer und einen dynamischen Content-Bereich enthält.

Die Navigation erfolgt über ein Seitenmenü (ADR-10100) und
der Content-Bereich wird über den Router gesteuert.

Verschiedene Feature-Bereiche (z. B. Kunden, Bestellungen) haben jeweils:
- eine Listenansicht
- eine Detailansicht
- eine Erstell-/Bearbeitungsansicht

## Entscheidung

### 1) Client-Side Routing
Die Anwendung nutzt **Client-Side Routing** (HTML5 History API).

- Zentrale Routenkonfiguration
- Unterstützung für Lazy Loading, Guards und Resolver
- Kein Hash-basiertes Routing

---

### 2) URL-Schema
Die URL-Struktur folgt einem **ressourcenorientierten Schema**:

```
/<feature>                    → Listenansicht
/<feature>/create             → Erstellen
/<feature>/:id                → Detailansicht
/<feature>/:id/edit           → Bearbeiten
```

Beispiel:
```
/customers                    → Kundenliste
/customers/create             → Neuen Kunden erstellen
/customers/abc-123            → Kundendetail
/customers/abc-123/edit       → Kunden bearbeiten
```

---

### 3) Lazy Loading
Feature-Bereiche werden per **Lazy Loading** geladen:

- Jedes Feature wird als eigenständige Route konfiguriert und erst bei Navigation geladen
- Reduziert die initiale Bundle-Größe
- Verbessert die Startzeit der Anwendung

---

### 4) Route Guards
Zugriffskontrolle erfolgt über **Route Guards** (oder äquivalenten Mechanismus):

#### a) Auth Guard
- Prüft, ob der Benutzer authentifiziert ist
- Leitet nicht-authentifizierte Benutzer zum Login weiter
- Wird auf alle geschützten Routen angewendet

#### b) Permission Guard
- Prüft, ob der Benutzer die notwendige Berechtigung für die Route hat
- Berechtigungen werden pro Route konfiguriert
- Bei fehlender Berechtigung: Weiterleitung auf eine "Zugriff verweigert"-Seite

---

### 5) Navigationsregeln
- Interne Links nutzen **den Router** (kein `window.location`, kein `<a href>` für interne Links)
- Aktive Routen werden visuell hervorgehoben (aktiver Menüpunkt)
- Breadcrumbs werden über Routen-Metadaten erzeugt (optional)

---

### 6) Nicht gespeicherte Änderungen
Formulare mit ungespeicherten Änderungen werden über einen **Navigation Guard** geschützt:

- Der Guard fragt den Benutzer, ob er die Seite wirklich verlassen möchte
- Wird auf Create- und Edit-Routen angewendet
- Verhindert versehentlichen Datenverlust

---

### 7) Fehlerseiten
Folgende Fehlerseiten werden bereitgestellt:

- **404 Not Found**: für unbekannte Routen (Wildcard-Route)
- **403 Access Denied**: bei fehlenden Berechtigungen

## Begründung
- Client-Side Routing ist der Standard für SPAs und ermöglicht flüssige Navigation.
- Ressourcenorientiertes URL-Schema ist intuitiv und konsistent mit REST-API-Struktur.
- Lazy Loading verbessert die initiale Ladezeit signifikant bei wachsender Feature-Anzahl.
- Route Guards ermöglichen deklarative Zugriffskontrolle ohne Logik in Komponenten.

## Alternativen
1) Hash-basiertes Routing (`#/customers`)
   - Vorteile: Keine Server-Konfiguration nötig
   - Nachteile: Unübliche URLs, wirkt technisch

2) Zentraler Permission-Check in Komponenten statt Guards
   - Vorteile: Flexibler pro Komponente
   - Nachteile: Duplikation, inkonsistente Zugriffskontrolle, leichter zu vergessen

## Konsequenzen

### Positiv
- Konsistente, vorhersagbare URL-Struktur
- Deep Linking funktioniert zuverlässig
- Berechtigungsprüfung ist zentral und deklarativ
- Lazy Loading optimiert Performance

### Negativ / Trade-offs
- Route-Konfiguration wächst mit Anzahl der Features
- Navigation Guard für ungespeicherte Änderungen erfordert Logik in Formular-Komponenten (Dirty-Check)
- Server muss für HTML5-Routing konfiguriert sein (Fallback auf `index.html`)

### Umsetzungshinweise
- Routen-Konfiguration liegt zentral und wird pro Feature ergänzt
- Guards liegen im `core/`-Bereich
- Permission-Guard nutzt den Auth-Service (ADR-10600) zur Berechtigungsprüfung
- Routen-Metadaten enthalten Informationen wie `permission`, `breadcrumb`, `title`
- Seitentitel werden bei Navigation automatisch aktualisiert

## Verweise
- ADR-10000 (Frontend-Architektur)
- ADR-10100 (UI-Layout & Komponentenstruktur)
- ADR-10500 (Formulare & Validierung)
- ADR-10600 (Authentifizierung & Autorisierung im Frontend)
