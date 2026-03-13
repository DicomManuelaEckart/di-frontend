---
id: ADR-05400
title: Idempotency & Request Deduplication
status: accepted
date: 2026-01-21
scope: backend
enforced_by: code-review
affects:
  - backend
---

# ADR-05400 – Idempotency & Request Deduplication

## Entscheidungstreiber
- Schutz vor doppelter Verarbeitung bei Retries und Mehrfachaufrufen
- Konsistentes Verhalten bei instabilen Netzwerken und verteilten Systemen
- Zusammenspiel mit Transactions, Outbox Pattern und Multi-Tenancy
- Vorhersagbares API-Verhalten für Clients
- Agenten- und CI-fähige Durchsetzung

## Kontext
Das System verarbeitet Requests über HTTP APIs sowie asynchron über Background Jobs
und Messaging. Wiederholte Requests können auftreten durch:
- Client-Retries
- Benutzerinteraktionen (z. B. Doppelklick)
- Netzwerk-Timeouts
- Wiederholte Message-Zustellung

Ohne Idempotency können dadurch:
- Duplikate entstehen
- fachliche Inkonsistenzen auftreten
- Nebenwirkungen mehrfach ausgeführt werden

## Entscheidung

---

### 1) Ziel & Scope
Idempotency wird eingesetzt für:

- HTTP APIs
- Background Jobs
- Message-basierte Verarbeitung

**Scope:**  
Idempotency gilt **ausschließlich für Commands**.  
Queries sind per Definition read-only und benötigen keine Idempotency.

---

### 2) Idempotency-Key
Idempotency wird über einen expliziten **Idempotency-Key** realisiert:

- z. B. HTTP Header `Idempotency-Key`
- technisch transparent, fachlich neutral

#### Verantwortung
- Clients **sollen** den Key setzen
- Die API **kann** einen Key generieren, falls keiner vorhanden ist

Client-Key hat Vorrang vor serverseitiger Generierung.

---

### 3) Gültigkeit & Lebensdauer
- Die Gültigkeit des Idempotency-Keys ist **konfigurierbar** (TTL)
- Typische Größenordnung: Minuten bis Stunden

Nach Ablauf:
- Ein neuer Request mit gleichem Key wird **normal verarbeitet**

---

### 4) Speicherung
Der Idempotency-Zustand wird gespeichert über:

- **Cache (z. B. Redis)** für schnelle Zugriffe
- **Datenbank** als Fallback / Persistenz

Diese Kombination gewährleistet:
- Performance
- Konsistenz
- Wiederherstellbarkeit

---

### 5) Gespeicherte Informationen
Es werden gespeichert:

- Marker „bereits verarbeitet“
- Ergebnis (Response / Result)

Somit können Duplikate deterministisch beantwortet werden.

---

### 6) Verhalten bei Duplikaten
Wenn ein Request mit identischem Idempotency-Key erneut eintrifft:

- Das **gespeicherte Ergebnis** wird zurückgegeben
- Es erfolgt **keine erneute Ausführung** des Commands

Wenn derselbe Key mit **abweichendem Payload** verwendet wird:

- Der Request wird **abgelehnt**
- Fehler (z. B. 400 oder 409) wird zurückgegeben

---

### 7) Fehlerfälle
Umgang mit Fehlern ist **konfigurierbar**:

- erfolgreiche Requests können gespeichert werden
- Fehler können optional ebenfalls gespeichert werden
- Konfiguration entscheidet pro Use Case

---

### 8) Transaktionen & Konsistenz
Idempotency ist **Teil derselben Transaktion** wie:

- fachliche Änderungen
- Outbox Events (falls vorhanden)

Damit ist sichergestellt:
- atomare Verarbeitung
- keine Duplikate bei partiellen Fehlern

---

### 9) Multi-Tenancy & Security
- Idempotency ist **tenant-spezifisch**
- Scope des Keys ist:  
  **Idempotency-Key + TenantId**

UserId ist **nicht** Teil des Scopes.

---

### 10) API-Verhalten & Dokumentation
- Idempotency ist **verpflichtend für ausgewählte Endpoints**
- Diese Endpoints sind explizit dokumentiert
- Idempotency-Verhalten wird in der **OpenAPI-Spezifikation** beschrieben

---

### 11) Tests
Tests stellen sicher:

- Duplikate werden korrekt erkannt
- identische Requests liefern identische Ergebnisse
- Payload-Abweichungen werden korrekt abgelehnt
- TTL-Verhalten ist korrekt

---

### 12) Governance & ArchTests
ArchTests erzwingen:

1) Idempotency-Logik liegt ausschließlich in Application
2) Keine Idempotency-Logik im Domain Layer
3) Kein direkter Storage-Zugriff in Controllern
4) Einheitlicher Idempotency-Mechanismus für alle Commands

CI schlägt fehl, wenn Regeln verletzt werden.

---

## Begründung
- Explizite Idempotency-Keys sind transparent und bewährt
- Kombination aus Cache und DB bietet Performance und Sicherheit
- Tenant-Scope verhindert Cross-Tenant-Leaks
- Speicherung von Ergebnissen ermöglicht saubere Duplikat-Antworten
- Transaktionale Einbindung verhindert Inkonsistenzen

## Konsequenzen

### Positiv
- Robustes Verhalten bei Retries
- Schutz vor doppelten Nebenwirkungen
- Klare API-Verträge
- Gute Grundlage für Messaging & Outbox Pattern

### Negativ / Trade-offs
- Zusätzlicher Speicherbedarf
- Komplexität bei TTL- und Error-Strategien
- Disziplin erforderlich bei Command-Definitionen

## Umsetzungshinweise
- Idempotency-Handling als Pipeline/Behavior in Application
- Schlüsselbildung: Idempotency-Key + TenantId
- Hash des Payloads zur Konsistenzprüfung
- Ergebnis serialisieren (technisch, nicht fachlich)
- Storage-Zugriffe kapseln (Repository / Service)
- Cleanup abgelaufener Keys regelmäßig durchführen

## Verweise
- ADR-05200 (Error Handling & API Error Model)
- ADR-05300 (Request Context)
- ADR-06000 (Multi-Tenancy)
- ADR-08100 (Outbox Pattern & Integration Events)
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests / Gates)
