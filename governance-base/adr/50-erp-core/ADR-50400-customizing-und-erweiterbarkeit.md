---
id: ADR-50400
title: Customizing und Erweiterbarkeit – Custom Fields, Validations, Webhooks, Grenzen
status: accepted
date: 2026-02-25
scope: fullstack
enforced_by: code-review
affects:
  - backend
  - frontend
---

# ADR-50400 – Customizing und Erweiterbarkeit

## Entscheidungstreiber
- ERP-Mandanten haben branchenspezifische Datenanforderungen (z.B. CE-Kennzeichen, UN-Nummern, Allergene) (Fragebogen §20)
- Balance zwischen Flexibilität und Wartbarkeit: Mandanten sollen Felder ergänzen können, ohne das Datenmodell zu ändern
- Multi-Tenant: Custom Fields sind pro Tenant definiert, optional mit Company-Override (ADR-06300)
- Integrationsfähigkeit: externe Systeme müssen angebunden werden können (REST API, Webhooks)
- Klare Grenzen: keine Custom Entities, keine Custom Workflows, kein Plugin-System, kein Marketplace
- Performance: JSON-Spalten mit SQL Server JSON-Support für Suchbarkeit

## Kontext
Das ERP-System wird als **SaaS-Plattform** für 500–600 Tenants betrieben (ADR-00008). Jeder Tenant hat branchenspezifische Anforderungen an Datenstrukturen, die sich nicht alle durch das Standard-Datenmodell abbilden lassen. Gleichzeitig muss die Architektur wartbar bleiben – ein unkontrolliertes Customizing würde die Codebasis und das Deployment massiv verkomplizieren.

Der Fragebogen entscheidet sich für einen **kontrollierten Ansatz**: Custom Fields via JSON-Spalten (ja), regelbasierte Custom Validations (ja), REST API + Webhooks (ja) – aber explizit **keine** Custom Entities, Custom Workflows (ADR-50200 deckt konfigurierbare Standard-Workflows ab), Plugin-Architektur oder Marketplace.

Branchenspezifische Erweiterungen, die über Custom Fields hinausgehen, werden als **Extensions** (eigene Bounded Contexts, ADR-01600 §2b) implementiert – durch das Entwicklungsteam, nicht durch Mandanten.

## Entscheidung

### 1) Custom Fields via JSON-Spalten

| Aspekt | Entscheidung |
|--------|-------------|
| **Speicherung** | JSON-Spalte (`CustomFields NVARCHAR(MAX)`) pro Entity-Tabelle in der Tenant-DB |
| **SQL-Support** | Azure SQL JSON-Funktionen (`JSON_VALUE`, `JSON_QUERY`, `OPENJSON`) für Queries und Indizierung |
| **Scope** | Pro Tenant definiert, mit optionalem Company-Override (ADR-06300 Override-Pattern) |
| **Verworfene Alternativen** | EAV-Modell (Performance, Komplexität), separate Erweiterungstabellen (Schema-Änderungen pro Tenant) |

**Custom-Field-Definition (Aggregate Root):**

| Eigenschaft | Beschreibung |
|-------------|-------------|
| `Id` | Guid (technische ID) |
| `TenantId` | Tenant-Zugehörigkeit (ADR-06000) |
| `CompanyId` | Nullable – `NULL` = Tenant-weit, Wert = Company-Override (ADR-06300) |
| `EntityType` | Zielentität (z.B. `Article`, `Customer`, `SalesOrder`) |
| `FieldName` | Technischer Name (PascalCase, alphanumerisch, max. 50 Zeichen) |
| `DisplayName` | Anzeigename (lokalisierbar, ADR-05000) |
| `DataType` | `String` \| `Number` \| `Decimal` \| `Boolean` \| `Date` \| `DateTime` \| `Enum` |
| `IsRequired` | Pflichtfeld (Custom Validation, §3) |
| `IsSearchable` | Für Suche/Reports aktiviert (Computed Column + Index) |
| `DefaultValue` | Optionaler Standardwert (JSON-skalarer Wert) |
| `EnumValues` | Bei `DataType = Enum`: erlaubte Werte als JSON-Array |
| `MaxLength` | Bei `String`: maximale Zeichenlänge |
| `MinValue` / `MaxValue` | Bei `Number` / `Decimal`: Gültigkeitsbereich |
| `SortOrder` | Reihenfolge in der UI |
| `GroupName` | Optionale Gruppierung in der UI (z.B. „Branchenspezifisch") |

**Regeln:**
- Custom Fields werden in einer **`CustomFieldDefinition`-Tabelle** in der Tenant-DB gespeichert.
- Die Custom-Field-Werte werden als **JSON-Objekt** in der `CustomFields`-Spalte der jeweiligen Entity-Tabelle gespeichert.
- Pro `EntityType` sind maximal **50 Custom Fields** erlaubt (Performance-Schutz).
- Custom-Field-Definitionen folgen dem **Override-Pattern** (ADR-06300): `CompanyId = NULL` gilt als Tenant-Default, Company-spezifische Definitionen überschreiben den Default.
- Änderungen an Custom-Field-Definitionen werden im Daten-Audit protokolliert (ADR-05800).
- Custom Fields dürfen **keine** Standard-Feldnamen überschreiben (Validierung bei Erstellung).

**JSON-Spalten-Beispiel:**

```sql
-- Entity-Tabelle (z.B. Article)
ALTER TABLE Article ADD CustomFields NVARCHAR(MAX) NULL;

-- Gespeicherter Wert:
-- {"CeNumber": "CE-2024-001", "UnNumber": "1234", "IsHazardous": true}

-- Abfrage:
SELECT * FROM Article
WHERE JSON_VALUE(CustomFields, '$.CeNumber') = 'CE-2024-001';
```

### 2) IsSearchable – Computed Columns und Indizierung

| Aspekt | Entscheidung |
|--------|-------------|
| **Mechanismus** | Computed Column + Index für als `IsSearchable` markierte Custom Fields |
| **Limit** | Max. **5 durchsuchbare Custom Fields** pro EntityType (Index-Performance) |
| **Erstellung** | Automatische Migration bei Erstellung/Änderung eines `IsSearchable`-Feldes |

**Regeln:**
- Für jedes `IsSearchable`-Feld wird eine **Computed Column** auf der Entity-Tabelle angelegt:
  ```sql
  ALTER TABLE Article ADD CF_CeNumber AS JSON_VALUE(CustomFields, '$.CeNumber');
  CREATE INDEX IX_Article_CF_CeNumber ON Article(CF_CeNumber) WHERE CF_CeNumber IS NOT NULL;
  ```
- Computed Columns verwenden die Namenskonvention `CF_{FieldName}`.
- Die Erstellung der Computed Column + Index erfolgt als **EF Core Migration** (ADR-08000), ausgelöst durch einen Background Job nach Custom-Field-Definition-Änderung.
- Bei Löschung eines `IsSearchable`-Feldes wird die Computed Column + Index entfernt.
- Die 5-Felder-Grenze wird in der Application Validation (ADR-05100) geprüft.

### 3) Custom Validations (regelbasiert)

| Aspekt | Entscheidung |
|--------|-------------|
| **Mechanismus** | Konfigurierbare Validierungsregeln pro Feld (Standard + Custom Fields) |
| **Engine** | Regelbasiert (kein Scripting, kein Sandboxed Code) |
| **Scope** | Pro Tenant, mit Company-Override |

**CustomValidationRule (Entity):**

| Eigenschaft | Beschreibung |
|-------------|-------------|
| `Id` | Guid |
| `TenantId` | Tenant-Zugehörigkeit |
| `CompanyId` | Nullable – Company-Override |
| `EntityType` | Zielentität |
| `FieldName` | Standard-Feld oder Custom-Field-Name |
| `RuleType` | `Required` \| `Regex` \| `Range` \| `MaxLength` \| `MinLength` \| `InList` \| `Unique` \| `ConditionalRequired` |
| `RuleConfig` | JSON mit regelspezifischen Parametern |
| `ErrorMessageKey` | Lokalisierungsschlüssel für die Fehlermeldung (ADR-05000) |
| `IsActive` | Aktiv/Inaktiv |

**RuleType-Konfigurationen:**

| RuleType | RuleConfig-Beispiel | Beschreibung |
|----------|---------------------|-------------|
| `Required` | `{}` | Pflichtfeld |
| `Regex` | `{"pattern": "^CE-\\d{4}-\\d{3}$"}` | Formatprüfung |
| `Range` | `{"min": 0, "max": 9999}` | Wertebereich |
| `MaxLength` | `{"max": 100}` | Maximale Zeichenlänge |
| `InList` | `{"values": ["A", "B", "C"]}` | Werteliste |
| `Unique` | `{"scope": "Company"}` | Eindeutigkeit (innerhalb Company oder Tenant) |
| `ConditionalRequired` | `{"condition": {"field": "IsHazardous", "eq": true}}` | Pflicht, wenn Bedingungsfeld einen bestimmten Wert hat |

**Regeln:**
- Custom Validations werden zur **Laufzeit** evaluiert – nicht als kompilierte FluentValidation-Regeln.
- Die Evaluierung erfolgt in einem **`CustomValidationBehavior`** (MediatR Pipeline Behavior), der nach der Standard-Application-Validation (ADR-05100) läuft.
- Custom Validations können **Standard-Felder** betreffen (z.B. „Artikelname ist Pflicht für bestimmte Artikelgruppen") und **Custom Fields**.
- Validation Errors aus Custom Validations werden im selben Format wie Standard-Validation-Errors zurückgegeben (ADR-05200, RFC 7807).
- `ConditionalRequired` unterstützt nur **einfache Bedingungen** (ein Feld, ein Operator: `eq`, `ne`, `gt`, `lt`, `in`). Keine verschachtelten Bedingungen.
- `Unique`-Prüfung erfolgt als **optimistic check** in der Validation (kein DB-Lock) – die finale Eindeutigkeit wird durch Unique Index + Constraint gewährleistet.

### 4) Explizite Grenzen des Customizing

| Customizing-Bereich | Entscheidung | Begründung |
|---------------------|-------------|-----------|
| **Custom Fields** | ✅ Ja | JSON-Spalten, flexibel, suchbar |
| **Custom Validations** | ✅ Ja (regelbasiert) | Branchenanforderungen ohne Code-Änderung |
| **Custom Entities** | ❌ Nein | Unkontrolliertes Schema-Wachstum, Migration-Komplexität, Testing unmöglich |
| **Custom Workflows** | ❌ Nein | Standard-Workflows sind konfigurierbar (ADR-50200), reicht für v1 |
| **Custom Code / Scripting** | ❌ Nein | Sicherheitsrisiko, Performance-Risiko, Debugging-Albtraum in Multi-Tenant |
| **Plugin-Architektur** | ❌ Nein | Komplexität, Versionierung, Security – unverhältnismäßig für v1 |
| **Marketplace** | ❌ Nein | Erfordert Plugin-System, das es nicht gibt |

**Regeln:**
- Diese Grenzen sind **bewusste Entscheidungen**, nicht Lücken.
- Branchenspezifische Anforderungen, die über Custom Fields + Validations hinausgehen, werden als **Extensions** (ADR-01600 §2b) vom Entwicklungsteam implementiert.
- Die Grenzen werden regelmäßig evaluiert – wenn >20% der Mandanten dieselbe Erweiterung brauchen, wird sie als Core-Feature oder Extension entwickelt.

### 5) REST API für Integrationen

| Aspekt | Entscheidung |
|--------|-------------|
| **API-Stil** | RESTful JSON API (ADR-07000) |
| **Versionierung** | URL-Pfad-Versionierung (`/api/v1/...`, ADR-07000) |
| **Authentifizierung** | OAuth 2.0 (Entra ID, ADR-03000) + API Keys für einfache Integrationen (ADR-03000 §7) |
| **Custom Fields in API** | Custom Fields werden als `customFields`-Objekt in Entity-DTOs exponiert |

**Custom Fields in API-Responses:**

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "articleNumber": "ART-001",
  "name": "Widget Pro",
  "customFields": {
    "ceNumber": "CE-2024-001",
    "unNumber": "1234",
    "isHazardous": true
  }
}
```

**Regeln:**
- Custom Fields sind über die Standard-Entity-Endpunkte erreichbar – keine separaten Custom-Fields-API.
- Custom Fields in Create/Update-Requests werden gegen die `CustomFieldDefinition` validiert (Typ, Pflicht, Regex etc.).
- Die API exponiert **alle** API-Ressourcen für CRUD (ADR-07000) – keine separaten „Integration-APIs".
- Rate Limiting (ADR-07400 geplant) schützt die API vor Missbrauch.

### 6) Webhooks für Event-basierte Integrationen

| Aspekt | Entscheidung |
|--------|-------------|
| **Modell** | Outbound Webhooks – das System ruft registrierte Endpunkte bei Events auf |
| **Trigger** | Integration Events (ADR-01200, ADR-00006) als Webhook-Trigger |
| **Registrierung** | Pro Tenant, über Admin-API |
| **Delivery** | At-least-once, asynchron via Background Job (ADR-05500) |

**WebhookSubscription (Entity):**

| Eigenschaft | Beschreibung |
|-------------|-------------|
| `Id` | Guid |
| `TenantId` | Tenant-Zugehörigkeit |
| `Name` | Bezeichnung (z.B. „ERP → WMS Sync") |
| `TargetUrl` | HTTPS-Endpunkt des Empfängers |
| `Secret` | HMAC-SHA256 Secret für Signatur-Verifizierung |
| `EventTypes` | Liste der abonnierten Event-Typen (z.B. `["SalesOrder.Created", "Article.Updated"]`) |
| `IsActive` | Aktiv/Inaktiv |
| `Headers` | Optionale Custom HTTP-Headers (z.B. API-Key des Zielsystems) |

**Webhook-Payload (CloudEvents-Format, ADR-08100):**

```json
{
  "specversion": "1.0",
  "type": "di.erp.salesorder.created",
  "source": "/tenants/{tenantId}/sales",
  "id": "evt-12345",
  "time": "2026-02-25T10:30:00Z",
  "datacontenttype": "application/json",
  "data": {
    "salesOrderId": "3fa85f64-...",
    "orderNumber": "SO-2026-0001",
    "totalAmount": 1250.00,
    "customFields": { "priority": "express" }
  }
}
```

**Delivery-Regeln:**
- Webhooks werden über einen **Background Job** (ADR-05500) versendet – nicht synchron im Request.
- **Retry-Strategie**: 3 Retries mit Exponential Backoff (1 Min, 5 Min, 30 Min).
- Bei 3 aufeinanderfolgenden Fehlern wird die Subscription **automatisch deaktiviert** (Admin-Notification).
- Der Empfänger muss innerhalb von **5 Sekunden** mit HTTP 2xx antworten (Timeout).
- Jeder Webhook-Request enthält einen **HMAC-SHA256 Signature-Header** (`X-Webhook-Signature`) zur Verifizierung.
- Webhook-Delivery wird protokolliert (ADR-05800): Event-Type, Target-URL, HTTP-Status, Dauer.
- Max. **10 aktive Webhook-Subscriptions** pro Tenant.

### 7) Custom-Field-Verwaltung (Admin-UI)

| Aspekt | Entscheidung |
|--------|-------------|
| **Zugriff** | Admin-Bereich im Frontend (ADR-10000) |
| **Permission** | `CustomFields.Admin` (ADR-03200) |
| **Funktionen** | CRUD für Custom-Field-Definitionen, Validierungsregeln, Webhook-Subscriptions |

**API-Endpunkte:**

| Endpunkt | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/v1/custom-fields/definitions` | GET | Alle Custom-Field-Definitionen (nach EntityType filterbar) |
| `/api/v1/custom-fields/definitions` | POST | Neue Definition erstellen |
| `/api/v1/custom-fields/definitions/{id}` | PUT | Definition aktualisieren |
| `/api/v1/custom-fields/definitions/{id}` | DELETE | Definition löschen (Soft Delete) |
| `/api/v1/custom-validations` | GET/POST/PUT/DELETE | Validierungsregeln verwalten |
| `/api/v1/webhooks` | GET/POST/PUT/DELETE | Webhook-Subscriptions verwalten |
| `/api/v1/webhooks/{id}/test` | POST | Test-Event an Webhook senden |
| `/api/v1/webhooks/{id}/deliveries` | GET | Delivery-Log für Subscription |

**Permissions (ADR-03200):**

| Permission | Beschreibung |
|-----------|-------------|
| `CustomFields.Admin` | Custom-Field-Definitionen verwalten |
| `CustomValidations.Admin` | Validierungsregeln verwalten |
| `Webhooks.Admin` | Webhook-Subscriptions verwalten |
| `Webhooks.TestSend` | Test-Webhooks versenden |

## Begründung
- **JSON-Spalten** statt EAV: bessere Performance bei Reads (ein SELECT statt JOIN), SQL Server JSON-Support für Indexierung, einfachere API (ein Objekt statt separate Calls).
- **Computed Columns für IsSearchable**: ermöglicht echte Index-basierte Suche auf Custom Fields, ohne den gesamten JSON-Blob zu scannen.
- **Regelbasierte Validations** statt Scripting: kein Sicherheitsrisiko, vorhersagbare Performance, einfach testbar, keine Sandbox erforderlich.
- **Explizite Grenzen**: Custom Entities, Plugins und Marketplace würden die Architektur fundamental verkomplizieren (Schema-Migrations pro Tenant, Versionierung, Security Isolation) – unverhältnismäßig für den Nutzen.
- **Webhooks**: Standard-Integrationsmuster, einfach zu implementieren und zu konsumieren, CloudEvents-Format (ADR-08100) für Interoperabilität.
- **Company-Override**: Mandanten mit mehreren Companies (z.B. DE braucht CE-Kennzeichen, CH nicht) können Custom Fields differenziert steuern.

## Alternativen

1) **EAV-Modell (Entity-Attribute-Value)**
   - Vorteile: Kein JSON nötig, relationale Abfragen
   - Nachteile: Extreme Join-Komplexität, sehr schlechte Lese-Performance, schwer zu cachen, schwer in DTOs zu mappen

2) **Separate Erweiterungstabellen pro Tenant**
   - Vorteile: Echte relationale Felder, volle SQL-Macht
   - Nachteile: Schema-Änderungen pro Tenant (Migrations-Albtraum), ddl-Berechtigungen zur Laufzeit, Testing unmöglich

3) **Plugin-System mit dynamischem Code**
   - Vorteile: Maximale Flexibilität
   - Nachteile: Security-Isolation (Sandbox), Performance, Versionierung, Debugging, Testing – für SaaS-ERP unverhältnismäßig

4) **Scripting (JavaScript/C# Sandboxed)**
   - Vorteile: Flexible Validierungen
   - Nachteile: Sicherheitsrisiko, Performance-Isolation pro Tenant, Debugging, Support-Aufwand

## Konsequenzen

### Positiv
- Mandanten können branchenspezifische Daten erfassen, ohne Code-Änderungen
- Regelbasierte Validations decken typische Branchenanforderungen ab (Pflichtfelder, Formate)
- Webhooks ermöglichen Integration mit externen Systemen ohne direkten DB-Zugriff
- Klare Grenzen verhindern unkontrolliertes Customizing-Wachstum
- Custom Fields sind über die Standard-API zugänglich (keine separate Integration nötig)

### Negativ / Trade-offs
- JSON-Spalten haben Limitierungen (keine Foreign Keys, kein Referential Integrity innerhalb JSON)
- Max. 50 Custom Fields pro Entity, max. 5 durchsuchbar – kann für Power-User einschränkend sein
- Regelbasierte Validations decken nicht alle Szenarien ab (keine komplexen Cross-Entity-Regeln)
- Computed Columns für IsSearchable erfordern Schema-Änderungen (Migration) – nicht instantan
- Keine Self-Service-Erweiterbarkeit jenseits der definierten Grenzen

### Umsetzungshinweise

#### A) Domain-Modell
- `CustomFieldDefinition` und `CustomValidationRule` sind Entities im Bounded Context „Organization" (ADR-01600) – sie beschreiben die Tenant-Konfiguration.
- `WebhookSubscription` lebt im Bounded Context „Integration" oder als Teil von „Organization".
- Custom-Field-Werte sind **kein** eigenes Aggregate – sie sind Teil der jeweiligen Entity (z.B. `Article.CustomFields`).

#### B) Persistenz
- Jede Entity-Tabelle, die Custom Fields unterstützt, erhält eine `CustomFields NVARCHAR(MAX)` Spalte.
- EF Core: `CustomFields`-Spalte wird als `string` gemappt und per `JsonSerializer` in ein `Dictionary<string, object?>` deserialisiert.
- Computed Columns für IsSearchable werden über **EF Core Migrations** (ADR-08000) verwaltet.
- Custom-Field-Definitionen werden im **L1/L2-Cache** gehalten (ADR-08400, TTL: 10 Min, Invalidierung event-basiert).

#### C) Validation Pipeline
```
Request → Standard FluentValidation (ADR-05100)
        → CustomValidationBehavior (Tenant-spezifische Regeln)
        → Handler
```
- Das `CustomValidationBehavior` lädt die aktiven `CustomValidationRule`s für den EntityType aus dem Cache.
- Validation Errors werden gesammelt (kein fail-fast) und im selben Format zurückgegeben.

#### D) Frontend
- Custom Fields werden als **dynamische Formularfelder** im Entity-Detail-View gerendert.
- Die Custom-Field-Definitionen werden einmalig pro Session geladen und im Frontend gecacht.
- Unterstützte Eingabetypen: Textfeld, Zahlenfeld, Checkbox, Datum, Dropdown (Enum), Textarea.
- Custom Fields erscheinen in einer eigenen **Gruppe/Sektion** im Formular (konfigurierbar via `GroupName`).

#### E) Testing
- Custom-Field-Serialisierung: **Unit Tests** (JSON-Roundtrip, Typ-Konvertierung).
- Custom Validations: **Integration Tests** (Regel-Evaluation gegen Testdaten).
- Webhooks: **Integration Tests** (Subscription → Event → HTTP-Call mit WireMock).
- IsSearchable: **Integration Tests** (Computed Column + Index + Query).

## Verweise
- ADR-01600 (Bounded-Context-Katalog – Extensions für branchenspezifische Erweiterungen)
- ADR-03000 (Authentication – API Keys für Webhook-Empfänger)
- ADR-03200 (Permission Catalog – CustomFields/Webhooks-Permissions)
- ADR-05000 (Lokalisierung – Custom-Field-DisplayNames, Validation-Messages)
- ADR-05100 (Validation Strategy – FluentValidation + Custom Validation Pipeline)
- ADR-05200 (Error Handling – RFC 7807 für Custom Validation Errors)
- ADR-05500 (Background Jobs – Webhook-Delivery, Computed-Column-Migration)
- ADR-05800 (Daten-Audit – Custom-Field-Definition-Änderungen, Webhook-Delivery-Log)
- ADR-06000 (Multi-Tenancy – Tenant-Isolation)
- ADR-06300 (Multi-Company – Override-Pattern für Custom Fields)
- ADR-07000 (API Design – REST API, Custom Fields in Entity-DTOs)
- ADR-08000 (Persistenz – JSON-Spalten, Computed Columns, EF Core Migrations)
- ADR-08100 (Integration Events – Webhook-Trigger via Outbox/CloudEvents)
- ADR-08400 (Caching – Custom-Field-Definitionen im Cache)
- ADR-50200 (Workflows – konfigurierbare Standard-Workflows statt Custom Workflows)
