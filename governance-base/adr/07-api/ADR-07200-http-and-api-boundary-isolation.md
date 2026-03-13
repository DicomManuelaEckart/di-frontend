---
id: ADR-07200
title: HTTP & API Boundary Isolation
status: accepted
date: 2026-01-27
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-07200 – HTTP & API Boundary Isolation

## Kontext
Wir entwickeln ein System mit klarer Clean Architecture (Domain / Application / Infrastructure / Presentation).  
Damit Domain- und Application-Logik langfristig wartbar, testbar und unabhängig bleibt, müssen Transport- und Framework-Details (HTTP, ASP.NET Core) strikt an der API-Grenze bleiben.

Ohne diese Trennung entstehen:
- Kopplung von Business-Logik an HTTP/ASP.NET Core
- schlechtere Testbarkeit (HTTP-Kontext in Unit Tests)
- vermischte Verantwortlichkeiten und „Leakage“ von API-Details in Kernschichten
- erschwerte Weiterentwicklung (z. B. zusätzliche Adapter wie Messaging/Jobs)

## Entscheidung
**HTTP- und API-spezifische Concerns sind ausschließlich in der API-Schicht erlaubt.**  
**Domain und Application bleiben transportagnostisch.**

Das bedeutet:

### Nicht erlaubt in Domain und Application
- Abhängigkeiten zu `Microsoft.AspNetCore.*`
- Abhängigkeiten zu `System.Net.Http`
- Typen wie `HttpContext`, `HttpRequest`, `HttpResponse`, `ControllerBase`, `IActionResult`, `Results`, etc.
- API-spezifische Fehler- und Response-Typen, insbesondere:
  - `ProblemDetails`
  - `HttpValidationProblemDetails`
  - andere HTTP- oder Controller-nahe DTOs/Contracts

### Erlaubt/erwartet in Domain und Application
- Domänenspezifische Fehler-/Ergebnis-Modelle (z. B. Domain Errors, Result-Typen, Exceptions nach ADR/Standard)
- Use-Case-orientierte Requests/Commands/Queries und Responses (ohne HTTP-Semantik)
- Interfaces/Ports, die von der API/Infrastructure implementiert werden

### Erlaubt in API
- ASP.NET Core Controller/Minimal APIs
- `ProblemDetails` (RFC7807) und Mapping von internen Fehlern/Results auf HTTP
- AuthN/AuthZ Mechanismen (sofern in ADRs definiert)
- Routing/Versionierung (z. B. `/v1`), OpenAPI

## Konsequenzen
### Positive Konsequenzen
- Domain/Application sind sauber testbar und unabhängig von Transport
- klarer Adapter-Ansatz: API mappt interne Ergebnisse auf HTTP
- geringeres Risiko für Architekturerosion, besonders bei Agentenbetrieb
- einfache Durchsetzung per ArchTests (ArchUnitNET)

### Negative Konsequenzen / Kosten
- zusätzlicher Mapping-Aufwand an der API-Grenze (DTO/Result → HTTP)
- Teams müssen diszipliniert bleiben (wird durch ArchTests unterstützt)

## Durchsetzung
Diese Entscheidung wird technisch durchgesetzt mittels ArchTests (ArchUnitNET):
- Domain/Application dürfen keine Referenzen auf `Microsoft.AspNetCore.*` oder `System.Net.Http` enthalten
- `ProblemDetails` und API-spezifische Error/DTO-Typen dürfen nur in der API-Schicht vorkommen
- Test-Fehlermeldungen müssen die ADR-ID enthalten: `ADR-07200`

## Notizen
Diese ADR ergänzt Layering (ADR-00001), ist aber orthogonal dazu:
- ADR-00001: **Abhängigkeitsrichtung zwischen Layern**
- ADR-07200: **Transport-/Framework-Isolation an der API Boundary**
