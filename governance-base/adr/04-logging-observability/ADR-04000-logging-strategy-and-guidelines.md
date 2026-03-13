---
id: ADR-04000
title: Logging Strategy & Guidelines
status: accepted
date: 2026-01-21
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-04000 – Logging Strategy & Guidelines

## Entscheidungstreiber
- Operatives Debugging und Fehleranalyse
- Laufzeitbeobachtung ohne Log-Noise
- Klare Abgrenzung zu Audit- und Business-Events
- Strukturierte, korrelierbare Logs
- Agenten- und CI-fähige Governance über ArchTests

## Kontext
Das System benötigt technisches und operatives Logging, um:
- Fehler zuverlässig zu analysieren
- Systemverhalten im Betrieb nachvollziehen zu können
- Support und Betrieb zu unterstützen

Gleichzeitig gelten folgende Abgrenzungen:
- **Audit & Security Logging** ist separat geregelt (ADR-03400)
- **Business Events** (z. B. `OrderPlaced`) sind keine Logs
- Logs dürfen keine fachlichen Zustände oder Prozesse ersetzen

## Entscheidung

### 1) Ziel des Loggings
Logging dient:
- operativem Debugging
- Laufzeitbeobachtung
- Fehler- und Warnanalyse

Es dient **nicht**:
- der fachlichen Ereignisabbildung
- der Autorisierungs- oder Compliance-Dokumentation

---

### 2) Log-Level & Semantik
Folgende Log-Level sind erlaubt und verbindlich semantisch definiert:

- **Trace**  
  Sehr feingranulare Ablaufdetails (nur lokal/Dev relevant)

- **Debug**  
  Diagnoseinformationen für Entwickler

- **Information**  
  Erwartete, normale Systemereignisse (sparsam einsetzen)

- **Warning**  
  Unerwartete, aber beherrschte Situationen

- **Error**  
  Fehlgeschlagene Operationen / Exceptions

- **Critical**  
  Systemweit kritische Fehler (System nicht funktionsfähig)

---

### 3) Erlaubte Schichten
Logging ist erlaubt in:
- **Presentation**
- **Application**
- **Infrastructure**

Logging ist **verboten in der Domain**.

---

### 4) Structured Logging
- Logging erfolgt **strukturiert** (Key/Value), keine String-Interpolation
- Log-Nachrichten sind stabil und maschinenlesbar
- Kontext wird über strukturierte Properties ergänzt

---

### 5) Korrelation & Context
- **CorrelationId** ist verpflichtend pro Request
- **UserId** (`oid`) und **TenantId** (`tid`) werden als Log-Scopes geführt
- Scopes werden automatisch gesetzt und müssen nicht manuell in jedem Log ergänzt werden

---

### 6) Umgang mit PII & Payloads
- **PII ist strikt verboten** (keine Namen, E-Mails, Freitexte)
- Payload-Logging:
  - erlaubt nur bei **Debug** oder **Trace**
  - niemals bei Information/Warnung/Error
- Keine vollständigen Request-/Response-Bodies in Logs

---

### 7) Exception Logging (Regel B)
Exception Logging erfolgt nach dem Prinzip:

**Zentral + lokal (nur mit Mehrwert)**

- Jede Exception wird **zentral** geloggt:
  - z. B. Middleware (Presentation) oder Pipeline (Application)
- Zusätzliches **lokales Logging** ist nur erlaubt, wenn:
  - zusätzlicher fachlicher Kontext beigefügt wird (z. B. `CustomerId`)
  - kein Duplicate Logging entsteht

**Verboten:**
- Mehrfaches Logging derselben Exception ohne Zusatzkontext
- Catch-and-log-and-throw ohne Mehrwert

---

### 8) Noise Control & Umgebungsstrategie
Logging folgt einer **umgebungsabhängigen Strategie**:

- **Development**
  - mehr Logs (Debug/Trace erlaubt)
  - kein Sampling

- **Production**
  - fokussierte Logs
  - Debug/Trace standardmäßig deaktiviert
  - Sampling erlaubt (siehe unten)

---

### 9) Sampling
Sampling ist **erlaubt**, mit folgenden Regeln:

- Sampling **nur** für:
  - Trace
  - Debug
  - Information
- **Kein Sampling** für:
  - Warning
  - Error
  - Critical
- Sampling ist **umgebungsabhängig konfigurierbar**
- Audit Logs sind **nie** Bestandteil von Sampling

---

### 10) Tests
- Logging wird in Tests **nicht generell geprüft**
- Tests dürfen Logging prüfen:
  - bei Errors
  - bei sicherheits- oder betriebskritischen Szenarien
- Tests verwenden Fake-/In-Memory-Logger
- Keine Tests gegen konkrete Log-Backends

---

### 11) Governance & ArchTests
ArchTests erzwingen verbindlich:

1) Keine Logger-Abhängigkeiten im Domain-Layer
2) Keine Logging-Aufrufe im Domain-Layer
3) Keine PII-Typen im Logging
4) Logging erfolgt nur in erlaubten Schichten

CI schlägt fehl, wenn eine dieser Regeln verletzt wird.

---

## Begründung
- Klare Trennung von Logging, Audit und Business Events verhindert Zweckentfremdung
- Zentrales Exception Logging vermeidet Duplikate
- Lokales Logging mit Mehrwert verbessert Debuggability
- Structured Logging ermöglicht Auswertung und Telemetry
- Sampling reduziert Kosten und Noise ohne Informationsverlust
- ArchTests sichern langfristige Einhaltung

## Konsequenzen

### Positiv
- Hohe Signalqualität der Logs
- Gute Skalierbarkeit im Betrieb
- Klare Regeln für Entwickler und Agenten
- Vorbereitung für Telemetry & Observability

### Negativ / Trade-offs
- Erfordert Disziplin bei lokalem Exception Logging
- Weniger “alles ist geloggt”-Sicherheit
- Initialer Setup-Aufwand (Scopes, Middleware)

### 12) Logging-Framework: Serilog (hinter Abstraktion)

Als konkretes Logging-Framework wird **Serilog** eingesetzt – ausschließlich als **Infrastruktur-Detail hinter einer Abstraktion**.

#### Abstraktion: `ILoggerService`
- Die gesamte Anwendung loggt ausschließlich über ein eigenes **`ILoggerService`-Interface**
- `ILoggerService` wird im **Application Layer** definiert (Port)
- Die Implementierung (`SerilogLoggerService`) lebt ausschließlich im **Infrastructure Layer**
- Auch Infrastructure-Klassen loggen über `ILoggerService` – **nicht** direkt über Serilog-APIs
- Serilog ist damit ein **austauschbares Implementierungsdetail** an genau einer Stelle

#### Dependency-Regeln

| Layer | Erlaubt | Verboten |
|-------|---------|----------|
| **Domain** | Kein Logging | `ILoggerService`, Serilog, `ILogger<T>` |
| **Application** | `ILoggerService` | Serilog-Namespaces, direkte Serilog-APIs |
| **Infrastructure** | `ILoggerService` | Direkte Serilog-APIs (außer in `SerilogLoggerService`) |
| **Presentation** | `ILoggerService` | Direkte Serilog-APIs |
| **Composition Root** | Serilog-Konfiguration, DI-Registrierung | – |

> **Single Point of Replacement:** Serilog kann durch ein anderes Framework ersetzt werden, indem ausschließlich die `SerilogLoggerService`-Implementierung im Infrastructure Layer ausgetauscht wird. Kein anderer Layer ist betroffen.

#### ArchTest-Regeln (ergänzend zu §11)
- Keine Serilog-Namespaces (`Serilog.*`) außerhalb von Infrastructure
- Keine direkte Serilog-Nutzung in Infrastructure-Klassen (außer `SerilogLoggerService`)
- Alle Logger-Injektionen verwenden `ILoggerService`
- CI schlägt fehl bei Verletzung

#### Begründung der Framework-Wahl
- Nativer Support für **Structured Logging** (Message Templates statt String-Interpolation)
- Umfangreiches **Sink-Ökosystem** für verschiedene Ziele
- Enricher-Konzept für automatische Context-Anreicherung (CorrelationId, TenantId, UserId)
- Breite Community und langfristige Wartung

#### Konfiguration
- Serilog wird im **Composition Root** (`Program.cs`) via `UseSerilog()` registriert
- `ILoggerService` → `SerilogLoggerService` wird per DI registriert
- Konfiguration erfolgt über `appsettings.json` (nicht per Code)

---

### 13) Log-Sinks & Zielinfrastruktur

#### Produktionsumgebung
- **Azure Log Analytics** (via Serilog Sink `Serilog.Sinks.AzureAnalytics`)
  - Zentraler Sink für alle Umgebungen (Test, QA, Production)
  - Integration mit Azure Monitor Dashboards und Alerts (ADR-09100)
  - KQL-Abfragen für Analyse und Troubleshooting
  - Retention gemäß Umgebungskonfiguration

#### Entwicklungsumgebung
- **Console Sink** – Echtzeit-Ausgabe während der Entwicklung
- **Seq** (optional) – lokale Structured-Log-Analyse mit Such- und Filterfunktion
- Debug/Trace-Level standardmäßig aktiviert

#### Sink-Regeln
- Jede Umgebung hat **mindestens einen** konfigurierten Sink
- Sinks werden **umgebungsabhängig** konfiguriert (`appsettings.{Environment}.json`)
- **Audit-Logs** (ADR-03400) nutzen denselben Sink-Pfad, aber separate Log-Tabellen/Kategorien
- Kein File-Sink in Production (nur über zentrale Log-Aggregation)

---

## Umsetzungshinweise
- Zentrale Exception Middleware / Pipeline implementieren
- CorrelationId früh setzen (Ingress)
- Log-Scopes für UserId/TenantId zentral konfigurieren
- Payload-Logging strikt auf Debug/Trace begrenzen
- Sampling-Konfiguration umgebungsabhängig pflegen
- `ILoggerService`-Interface im Application Layer definieren
- `SerilogLoggerService` als einzige Serilog-Implementierung im Infrastructure Layer
- Serilog via `UseSerilog()` im Composition Root (`Program.cs`) registrieren
- DI-Registrierung: `ILoggerService` → `SerilogLoggerService`
- Enricher für `CorrelationId`, `TenantId`, `UserId` zentral in `SerilogLoggerService` konfigurieren
- Sink-Konfiguration pro Umgebung in `appsettings.{Environment}.json`
- ArchTest: Serilog-Namespaces nur in Infrastructure erlaubt

## Verweise
- ADR-03400 (Security Audit & Authorization Logging)
- ADR-04100 (Telemetry & Observability)
- ADR-09100 (SLOs & Alerts)
- ADR-03000 (Authentifizierung)
- ADR-03100 (Autorisierung)
- ADR-03200 (Permission-Katalog & Claim-Schema)
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests / Gates)
- ADR-04100 (Telemetry & Observability)
