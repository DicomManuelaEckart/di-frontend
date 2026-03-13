---
id: ADR-07300
title: Pagination, Filtering & Sorting
status: accepted
date: 2026-02-04
scope: backend
enforced_by: code-review
affects:
  - backend
  - frontend
---

# ADR-07300 – Pagination, Filtering & Sorting

## Entscheidungstreiber
- Vermeidung von Performance-Problemen durch unbegrenzte Datenmengen
- Konsistente API-Erfahrung für Frontend und externe Clients
- Vorhersagbare Antwortgrößen und Ladezeiten
- Skalierbarkeit bei wachsenden Datenmengen

## Kontext
Collection-Endpoints (Listen) können potenziell große Datenmengen zurückgeben.
Ohne Pagination würden:
- Antwortzeiten unpraktikabel
- Speicherverbrauch unkontrolliert
- Netzwerkbandbreite verschwendet
- Frontend-Performance degradiert

Das System muss von Anfang an mit Pagination und Sorting arbeiten,
um spätere Migrationen und Breaking Changes zu vermeiden.

## Entscheidung

---

### 1) Pflicht-Pagination für Collection-Endpoints

Alle Endpoints, die **Listen von Ressourcen** zurückgeben, **MÜSSEN** Pagination unterstützen.

Ausnahmen:
- Lookup-Endpoints (z.B. Enum-Werte, Konfigurationen)
- Endpoints mit garantiert kleinen, begrenzten Mengen (< 100 Einträge)

Ausnahmen müssen explizit dokumentiert und begründet werden.

---

### 2) Pagination-Parameter

#### Request-Parameter
| Parameter  | Typ     | Default | Beschreibung                     |
|------------|---------|---------|----------------------------------|
| `page`     | integer | 1       | 1-basierte Seitennummer          |
| `pageSize` | integer | 20      | Anzahl Einträge pro Seite        |

#### Limits
- **Minimum pageSize:** 1
- **Maximum pageSize:** 100
- **Default pageSize:** 20

Requests mit `pageSize > 100` werden auf 100 begrenzt (kein Fehler).

---

### 3) Response-Envelope

Paginierte Responses **MÜSSEN** folgende Struktur verwenden:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

#### Felder
| Feld              | Typ     | Pflicht | Beschreibung                        |
|-------------------|---------|---------|-------------------------------------|
| `data`            | array   | ja      | Die Ergebnisliste                   |
| `pagination.page` | integer | ja      | Aktuelle Seite (1-basiert)          |
| `pagination.pageSize` | integer | ja  | Angeforderte Seitengröße            |
| `pagination.totalCount` | integer | ja* | Gesamtanzahl der Einträge         |
| `pagination.totalPages` | integer | ja* | Gesamtanzahl der Seiten           |
| `pagination.hasNextPage` | boolean | ja | Gibt es eine nächste Seite?       |
| `pagination.hasPreviousPage` | boolean | ja | Gibt es eine vorherige Seite? |

*`totalCount` und `totalPages` können bei Performance-Problemen optional sein.
In diesem Fall muss die API-Dokumentation dies explizit ausweisen.

---

### 4) Sorting

#### Request-Parameter
| Parameter   | Typ    | Default              | Beschreibung                     |
|-------------|--------|----------------------|----------------------------------|
| `sortBy`    | string | ressourcenspezifisch | Feldname zum Sortieren           |
| `sortOrder` | string | `asc`                | Sortierrichtung: `asc` oder `desc` |

#### Regeln
- Nur explizit freigegebene Felder dürfen sortiert werden
- Unbekannte Sortierfelder führen zu **400 Bad Request**
- Default-Sortierung ist ressourcenspezifisch (z.B. `createdAt desc`)
- Sortierbare Felder werden in der OpenAPI-Dokumentation aufgelistet

---

### 5) Filtering

Filter werden als Query-Parameter übergeben:

```
GET /v1/customers?status=active&createdAfter=2026-01-01
```

#### Regeln
- Nur dokumentierte Filter-Parameter sind erlaubt
- Unbekannte Filter-Parameter werden ignoriert (kein Fehler)
- Filter-Semantik muss in OpenAPI dokumentiert sein
- Komplexe Filter (OR, Ranges) folgen einem konsistenten Schema

---

### 6) Kombiniertes Beispiel

Request:
```
GET /v1/customers?page=2&pageSize=25&sortBy=name&sortOrder=asc&status=active
```

Response:
```json
{
  "data": [
    { "id": "cust-26", "name": "Acme Corp", "status": "active" },
    { "id": "cust-27", "name": "Beta Inc", "status": "active" }
  ],
  "pagination": {
    "page": 2,
    "pageSize": 25,
    "totalCount": 73,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": true
  }
}
```

---

### 7) Application Layer

Im Application Layer werden standardisierte DTOs verwendet:

```csharp
public record PaginationRequest(int Page = 1, int PageSize = 20);
public record SortingRequest(string? SortBy = null, string SortOrder = "asc");

public record PaginatedResult<T>(
    IReadOnlyList<T> Data,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages,
    bool HasNextPage,
    bool HasPreviousPage
);
```

Query-Handler akzeptieren Pagination/Sorting als Teil der Query.

---

### 8) Governance & Durchsetzung

#### Code Review
- Collection-Endpoints ohne Pagination werden abgelehnt
- Response-Envelope-Struktur wird geprüft

#### OpenAPI
- Paginierte Endpoints müssen Parameter dokumentieren
- Sortierbare Felder müssen aufgelistet sein

#### Tests
- Integration-Tests prüfen Pagination-Verhalten
- Edge-Cases: leere Listen, letzte Seite, ungültige Parameter

---

## Begründung
- **Pflicht-Pagination** verhindert Performance-Probleme von Anfang an
- **Einheitliche Struktur** ermöglicht generische Frontend-Komponenten
- **Begrenzte pageSize** schützt vor DoS und Ressourcenerschöpfung
- **Konsistente Sortierung** verbessert UX und Vorhersagbarkeit
- **Dokumentierte Filter** machen APIs selbstbeschreibend

## Konsequenzen

### Positiv
- Vorhersagbare API-Antwortgrößen
- Bessere Frontend-Performance
- Skalierbarkeit bei wachsenden Daten
- Einheitliche Patterns für Agenten-Generierung

### Negativ / Trade-offs
- Leicht erhöhter Implementierungsaufwand
- Zusätzliche Query-Logik in Repositories
- Frontend muss Pagination-UI implementieren

## Umsetzungshinweise
- Shared DTOs für Pagination in Application.Common
- Extension Methods für IQueryable-Pagination
- Middleware oder Filter für Parameter-Validierung
- Konsistente Fehlerbehandlung bei ungültigen Parametern

## Verweise
- ADR-07000 (API Contracts & Versioning)
- ADR-00003 (CQRS – Queries)
- ADR-05200 (Error Handling)
- Standards: api-guidelines.md
