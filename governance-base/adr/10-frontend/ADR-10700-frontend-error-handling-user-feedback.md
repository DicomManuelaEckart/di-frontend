---
id: ADR-10700
title: Fehlerbehandlung & Benutzer-Feedback
status: proposed
date: 2026-02-16
scope: frontend
enforced_by: code-review
affects:
  - frontend
---

# ADR-10700 – Fehlerbehandlung & Benutzer-Feedback

## Entscheidungstreiber
- Konsistente, benutzerfreundliche Fehlerkommunikation
- Klare Trennung zwischen fachlichen und technischen Fehlern
- Kompatibilität mit dem API-Fehlerformat (ProblemDetails, ADR-05200)
- Keine Exposition interner Details an den Benutzer
- Gute Developer Experience (klare Fehlerstruktur, Debugging)

## Kontext
Die API liefert Fehler im ProblemDetails-Format (ADR-05200) mit:
- Error Code
- Resource Key (für Localization)
- HTTP Status Code
- Field Errors (bei Validierung)
- Correlation ID

Das Frontend muss diese Fehler:
- einheitlich verarbeiten
- dem Benutzer verständlich anzeigen
- in passender Form darstellen (Feld-Fehler, Toasts, Fehlerseiten)

## Entscheidung

### 1) Fehlerkategorien im Frontend
Das Frontend unterscheidet folgende Fehlerarten:

#### a) Validierungsfehler (400)
- Feld-spezifische Fehler: werden am jeweiligen Formularfeld angezeigt
- Globale Validierungsfehler: werden über dem Formular angezeigt
- Quelle: Client-seitige Validierung ODER Server-Response

#### b) Authentifizierungsfehler (401)
- Werden vom Auth-Service behandelt (Token-Refresh oder Re-Login)
- Keine Benutzer-Benachrichtigung (automatischer Redirect)

#### c) Autorisierungsfehler (403)
- Weiterleitung zur "Zugriff verweigert"-Seite
- Oder: Toast-Meldung mit "Keine Berechtigung"

#### d) Not Found (404)
- Weiterleitung zur "Nicht gefunden"-Seite
- Oder: Toast-Meldung bei Einzelaktionen

#### e) Konflikte (409)
- Meldung an den Benutzer (z. B. "Datensatz wurde zwischenzeitlich geändert")
- Optionale Aktion: Daten neu laden

#### f) Technische Fehler (500, Netzwerkfehler)
- Generische Fehlermeldung: "Ein unerwarteter Fehler ist aufgetreten"
- Correlation ID anzeigen (für Support-Anfragen)
- Keine technischen Details

---

### 2) Zentraler Error-Handling-Service
Ein **Error-Handling-Service** verarbeitet alle Fehler zentral:

- Wird vom Fehler-Interceptor (ADR-10300) aufgerufen
- Entscheidet basierend auf HTTP-Status über die Darstellungsform
- Mappt Error Codes auf lokalisierte Meldungen (ADR-10800)
- Loggt Fehler in die Browser-Konsole (Development) oder an einen Telemetrie-Dienst

---

### 3) Benachrichtigungsformen

#### a) Toast / Snackbar
- Für **Erfolgs- und Fehlermeldungen** bei Aktionen (Erstellen, Bearbeiten, Löschen)
- Erscheint temporär am Bildschirmrand
- Automatisches Ausblenden nach konfigurierter Zeit (z. B. 5 Sekunden)
- Fehlermeldungen bleiben ggf. länger sichtbar oder erfordern manuelles Schließen

#### b) Inline-Fehlermeldungen
- Für **Formular-Validierungsfehler** direkt am Feld
- Für **globale Formularfehler** über dem Formular (z. B. Alert-Banner)

#### c) Fehlerseiten
- Für **404** und **403**: eigene Fehlerseiten
- Für **schwerwiegende Fehler**: optionale "Oops"-Seite

---

### 4) Erfolgsmeldungen
Erfolgreiche Aktionen werden über **Toast / Snackbar** bestätigt:

- "Datensatz erfolgreich erstellt"
- "Änderungen gespeichert"
- "Datensatz gelöscht"

Erfolgsmeldungen werden lokalisiert (ADR-10800).

---

### 5) Ladeindikator
Während API-Aufrufe laufen:

- **Spinner** oder **Progress Bar** im Content-Bereich
- Kein Blockieren der gesamten UI (nur des betroffenen Bereichs)
- Bei langen Ladezeiten: optionaler Hinweis ("Daten werden geladen…")

---

### 6) Global Error Handler
Ein **globaler Fehlerhandler** wird als Fallback registriert:

- Fängt unbehandelte Fehler (JavaScript-Fehler, Promise-Rejections)
- Loggt den Fehler (Konsole + optional Telemetrie)
- Zeigt eine generische Fehlermeldung über den Notification-Service
- Verhindert, dass die Anwendung in einen undefinierten Zustand gerät

## Begründung
- Zentrales Error Handling vermeidet Duplikation und Inkonsistenzen.
- Toast-Benachrichtigungen sind nicht-invasiv und für CRUD-Feedback etabliert.
- Trennung der Fehlerarten ermöglicht passgenaue Reaktionen.
- Global Error Handler verhindert unbehandelte Abstürze.

## Alternativen
1) Fehlerbehandlung in jeder Komponente individuell
   - Vorteile: Maximale Flexibilität
   - Nachteile: Duplikation, Inkonsistenz, leicht vergessen

2) Modal-Dialoge für Fehlermeldungen
   - Vorteile: Auffälliger, erzwingt Nutzer-Interaktion
   - Nachteile: Unterbricht den Workflow, störend bei häufigen Fehlern

## Konsequenzen

### Positiv
- Einheitliche Fehlerkommunikation über alle Features
- Benutzer erhält immer verständliches Feedback
- Correlation ID ermöglicht schnelles Debugging
- Keine technischen Details in der UI

### Negativ / Trade-offs
- Zentrales Error Handling muss alle Fehlerfälle korrekt routen
- Generische Fehlermeldungen sind weniger hilfreich als spezifische
- Toasts können bei schneller Abfolge von Aktionen überlappen

### Umsetzungshinweise
- Error-Handling-Service und Notification-Service liegen im `core/`-Bereich
- Global Error Handler wird beim Anwendungsstart registriert
- Fehlermeldungen werden über Resource Keys lokalisiert
- Correlation ID aus dem ProblemDetails-Response extrahieren und in der Fehlermeldung anzeigen
- Erfolgsmeldungen werden vom Feature-Service ausgelöst (nicht vom Interceptor)
- Toast-Konfiguration: Erfolg = kurze Anzeigedauer, Fehler = längere Anzeigedauer oder manuell

## Verweise
- ADR-05200 (Error Handling & API Error Model)
- ADR-10000 (Frontend-Architektur)
- ADR-10300 (REST-API-Kommunikation – Fehler-Interceptor)
- ADR-10500 (Formulare & Validierung – Feld-Fehler)
- ADR-10800 (Lokalisierung – Fehlertexte)
- ADR-04000 (Logging Strategy)
