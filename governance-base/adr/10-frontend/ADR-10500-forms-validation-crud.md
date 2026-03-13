---
id: ADR-10500
title: Formulare, Validierung & CRUD-Operationen
status: proposed
date: 2026-02-16
scope: frontend
enforced_by: code-review
affects:
  - frontend
---

# ADR-10500 – Formulare, Validierung & CRUD-Operationen

## Entscheidungstreiber
- Konsistente Formularerstellung über alle Features
- Klare Validierungsregeln (Client- und Server-Side)
- Einheitliche CRUD-Patterns (Create, Read, Update, Delete)
- Gute User Experience (sofortiges Feedback, Fehlerzuordnung)
- Wartbarkeit und Wiederverwendbarkeit

## Kontext
Die Anwendung dient dem Erstellen, Bearbeiten und Einsehen von Datensätzen (ADR-10000).
Jedes Feature bietet typischerweise CRUD-Operationen:
- **List**: Übersichtstabelle mit Pagination, Sorting, Filtering
- **Detail**: Detailansicht eines Datensatzes (read-only)
- **Create / Edit**: Gemeinsame Formularansicht zum Erstellen und Bearbeiten

Validierung erfolgt sowohl im Frontend als auch im Backend (ADR-05100).
Fehler aus der API werden im ProblemDetails-Format zurückgeliefert (ADR-05200).

## Entscheidung

### 1) Formulare
Formulare werden mit einem **modellgetriebenen Ansatz** (Reactive / Model-Driven Forms) umgesetzt.

- Formulare werden im Code definiert (nicht rein template-getrieben)
- Typisierte Formulargruppen und -kontrollelemente
- Klare Trennung zwischen Formularstruktur und Template

---

### 2) Client-seitige Validierung
Validierung im Frontend dient der **User Experience**, nicht der Sicherheit:

- Standard-Validatoren (Pflichtfeld, E-Mail-Format, Min/Max-Länge, etc.)
- Eigene Validatoren für projektspezifische Regeln
- Validierungsfehler werden **sofort am Feld** angezeigt (nach Interaktion oder Submit)
- Fehlermeldungen werden über i18n-Keys aufgelöst (ADR-10800)

---

### 3) Server-seitige Validierungsfehler
Server-Validierungsfehler (HTTP 400, ProblemDetails mit Field Errors) werden:

- Vom zentralen Fehler-Interceptor geparsed (ADR-10300)
- An die Formular-Komponente weitergeleitet
- **Feld-genau zugeordnet** (Fehler wird am entsprechenden Formularfeld angezeigt)
- Zusätzlich als Zusammenfassung über dem Formular angezeigt (optional)

---

### 4) CRUD-Seitenstruktur
Jedes Feature implementiert folgende Seiten-Typen:

#### a) List-Seite
- Tabelle mit den wichtigsten Feldern
- Pagination (seitenweise Navigation)
- Sortierung (klickbare Spaltenköpfe)
- Filterung (Suchfeld oder erweiterte Filter)
- Aktionen pro Zeile: Ansehen, Bearbeiten, Löschen
- "Neu erstellen"-Button

#### b) Detail-Seite
- Read-only-Darstellung aller Felder
- Zurück-Navigation
- Aktionen: Bearbeiten, Löschen

#### c) Create/Edit-Seite (gemeinsame Ansicht)
Erstellen und Bearbeiten nutzen **dieselbe Seiten-Komponente und Ansicht**:

- Eine einzige Seite mit einem Modus-Parameter (`create` / `edit`)
- Im **Create-Modus**: Formular ist leer, Speichern löst einen POST-Request aus
- Im **Edit-Modus**: Formular wird mit bestehenden Daten vorausgefüllt (geladen via ID aus Route), Speichern löst einen PUT-Request aus
- Seitentitel passt sich dem Modus an (z. B. "Kunde erstellen" / "Kunde bearbeiten")
- Speichern-Button (disabled bei ungültigem Formular)
- Abbrechen-Button (mit Navigation Guard, ADR-10400)
- Der Modus wird über die Route bestimmt (siehe ADR-10400)

---

### 5) Keine Duplikation durch gemeinsame Ansicht
Durch die gemeinsame Create/Edit-Ansicht wird Duplikation vollständig vermieden:

- **Eine** Seiten-Komponente für beide Modi
- **Ein** Formular mit identischen Feldern und Validierungsregeln
- **Eine** Stelle für Änderungen (Felder, Validierung, Layout)
- Der Modus steuert lediglich: Datenladung, API-Methode (POST vs. PUT), Seitentitel

---

### 6) Löschen (Delete)
Löschaktionen erfordern einen **Bestätigungsdialog**:

- Dialog-Komponente für Löschbestätigung
- Kein Löschen ohne explizite Bestätigung
- Nach erfolgreichem Löschen: Navigation zurück zur Liste
- Bei Fehler: Fehlermeldung anzeigen (ADR-10700)

---

### 7) Ladeindikator & Pessimistic Updates
- **Pessimistic Updates**: Daten werden erst nach erfolgreicher API-Antwort in der UI aktualisiert
- Während API-Aufrufen: **Ladeindikator** (Spinner oder Progress Bar)
- Speichern-Button wird während des API-Calls **deaktiviert** (Prevent Double Submit)

---

### 8) Formular-Validierung UX-Regeln
- Validierungsfehler werden **nach erster Interaktion** mit dem Feld angezeigt
- Bei Submit: alle Felder als interagiert markieren und Fehler anzeigen
- Fehlertext erscheint **unter dem Feld**
- Maximal eine Fehlermeldung pro Feld gleichzeitig (Prioritätsreihenfolge)

## Begründung
- Modellgetriebene Formulare bieten volle Kontrolle, Typsicherheit und Testbarkeit.
- Gemeinsame Create/Edit-Ansicht vermeidet jegliche Duplikation – eine Seite, ein Formular, ein Ort für Änderungen.
- Pessimistic Updates sind einfacher und sicherer für eine CRUD-Anwendung.
- Konsistente Validierungs-UX verbessert die Benutzererfahrung.

## Alternativen
1) Template-getriebene Formulare
   - Vorteile: Weniger Boilerplate für einfache Formulare
   - Nachteile: Weniger Kontrolle, schwerer testbar, keine Typsicherheit

2) Optimistic Updates
   - Vorteile: Schnellere wahrgenommene Performance
   - Nachteile: Komplexer bei Fehlerbehandlung, Rollback-Logik nötig

3) Separate Seiten für Create und Edit
   - Vorteile: Unabhängige Anpassbarkeit pro Modus
   - Nachteile: Code-Duplikation, inkonsistente Formulare, doppelter Wartungsaufwand

4) Dynamische / konfigurationsgesteuerte Formulare
   - Vorteile: Formulare aus Konfiguration generierbar
   - Nachteile: Zusätzliche Komplexität, eingeschränkte Kontrolle

## Konsequenzen

### Positiv
- Einheitliches CRUD-Pattern über alle Features
- Konsistente User Experience bei Formularen und Validierung
- Gute Testbarkeit durch modellgetriebene Formulare
- Gemeinsame Create/Edit-Ansicht eliminiert Duplikation vollständig

### Negativ / Trade-offs
- Modellgetriebene Formulare haben mehr Boilerplate als template-getriebene
- Pessimistic Updates fühlen sich bei langsamer API träge an
- Feld-genaues Mapping von Server-Fehlern erfordert Konvention zwischen API und Frontend

### Umsetzungshinweise
- Formular-Komponente liegt im `components/`-Bereich des jeweiligen Features
- Seiten-Komponenten liegen im `pages/`-Bereich des jeweiligen Features
- Validierungsmeldungen werden über i18n-Keys aufgelöst
- Server-Fehler-Mapping: API-Feldname muss mit dem Formularfeld-Namen übereinstimmen
- Jedes Feature folgt dem gleichen Ordnerschema:
  ```
  features/<feature>/
  ├── components/        # UI-Komponenten (Form, etc.)
  ├── models/            # API-Models (Interfaces)
  ├── pages/             # Seiten-Komponenten (List, Detail, CreateEdit)
  └── services/          # API- und State-Services
  ```
- Modus-Erkennung über Route: `/create` → Create-Modus, `/:id/edit` → Edit-Modus (ID vorhanden)
- Delete-Bestätigungsdialog als wiederverwendbare Shared-Komponente

## Verweise
- ADR-10000 (Frontend-Architektur)
- ADR-10200 (State Management)
- ADR-10300 (REST-API-Kommunikation)
- ADR-10400 (Routing & Navigation)
- ADR-10700 (Fehlerbehandlung im Frontend)
- ADR-10800 (Lokalisierung im Frontend)
- ADR-05100 (Validation Strategy)
- ADR-05200 (Error Handling & API Error Model)
