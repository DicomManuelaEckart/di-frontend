---
id: ADR-03200
title: Permission-Katalog & Claim-Schema
status: accepted
date: 2026-01-21
scope: backend
enforced_by: archtests
affects:
  - backend
  - frontend
---

# ADR-03200 – Permission-Katalog & Claim-Schema

## Entscheidungstreiber
- Single Source of Truth für Permissions
- Reflection-basierte Generierung (Frontend Matrix, Doku, Agenten)
- Tenant-spezifische Autorisierung
- Saubere Trennung zwischen Rollen und Permissions
- Vollständigkeit und Konsistenz über ArchTests erzwingen

## Kontext
Mit ADR-03100 ist festgelegt, dass:
- Autorisierung ausschließlich in der Application durchgesetzt wird
- jede Command- und Query-Operation eine Permission benötigt
- Permissions Use-Case-orientiert sind (`Feature.Action`)
- Frontend eine Permission-Matrix nutzt
- Multi-Tenancy integraler Bestandteil der Autorisierung ist

Damit dies konsistent, wartbar und generierbar bleibt, müssen:
- Permissions zentral definiert sein
- Permissions deklarativ an Use Cases hängen
- Claims, Rollen und Tenant-Zuordnung klar geregelt sein
- Reflection und ArchTests zur Durchsetzung genutzt werden

## Entscheidung

### 1) Form des Permission-Katalogs
Permissions werden als **immutable Records mit Value Semantics** modelliert.

- Jede Permission ist ein eigenständiger `record`-Typ:
  - z. B. `Permission("Customers.Create")`
- Permissions sind **keine DDD Value Objects** im Sinne von ADR-01400
  (diese liegen in der Domain und werden von Aggregates verwendet).
  Permissions sind **Application-Level Security Types**, die strukturell
  ähnliche Eigenschaften besitzen (immutable, equality by value),
  aber architektonisch in der Application-Schicht verortet sind.

### 2) Deklaration an Use Cases
Jede Command- und Query-Klasse deklariert ihre Permission über ein **Attribut**.

- Beispiel: `[RequiresPermission("Customers.Create")]`
- Jede Command/Query hat **genau eine** Permission
- Keine impliziten oder konventionsbasierten Permissions

### 3) Claims & Herkunft der Permissions
Die Application verarbeitet Permissions aus mehreren Quellen:

- **Direkte Permissions im Token** (Claim `permissions`)
- **Rollen im Token** (Claim `roles`)
- Rollen werden **in der Application** auf Permissions gemappt

Claims-Modell:
- `permissions`: Liste einzelner Permissions (optional)
- `roles`: Liste von Rollen (optional)

Die effektiven Permissions ergeben sich aus:
- direkten Permission-Claims
- + Rollen → Permission-Mapping

### 4) Rollen-zu-Permissions-Mapping
Das Mapping Rolle → Permissions ist **kombiniert** umgesetzt:

- Default-Mapping im Code (Application)
- Überschreib-/Erweiterbarkeit über Konfiguration oder Datenbank
- Mapping ist **tenant-spezifisch**

Beispiel:
- Rolle `Admin` (Tenant A) → `Customers.*`, `Orders.*`
- Rolle `Admin` (Tenant B) → andere Permission-Menge möglich

### 5) Canonical Security Claims
Die Application abstrahiert Claims über ein `ICurrentUserContext`.

Verbindliche Claims:
- **UserId**: `oid`
- **TenantId**: `tid`

Optional (nicht autorisierungsrelevant):
- DisplayName / Email (nur falls nötig, PII-sensitiv)

### 6) Tenant-Spezifität
- Permissions und Rollen sind **tenant-spezifisch**
- Jeder Request muss einen `TenantId`-Claim enthalten
- Alle Permission-Berechnungen erfolgen im Kontext eines Tenants

### 7) Reflection & Export

#### a) User Permissions Endpoint
Die API stellt einen Endpoint bereit:
- `GET /me/permissions`

Dieser liefert:
- die effektiven Permissions des aktuellen Users
- tenant-spezifisch
- geeignet für Frontend Permission-Matrix

#### b) Permission-Katalog Endpoint
Zusätzlich existiert ein Katalog-Endpoint:
- `GET /permissions`

Dieser liefert:
- alle bekannten Permissions
- inklusive Beschreibung/Metadaten
- tenant-unabhängig (strukturell)

### 8) Permission-Beschreibungen
Permissions besitzen **Beschreibungen als Resource Keys**.

- Keine fixen Texte im Code
- Beschreibung referenziert einen Localization-Key
- Ermöglicht spätere Mehrsprachigkeit ohne Codeänderung

### 9) Architektur- & Konsistenzregeln (ArchTests)
ArchTests erzwingen verbindlich:

1) Jede Command- und Query-Klasse hat **genau ein** `RequiresPermission`-Attribut
2) Jede deklarierte Permission existiert im zentralen Permission-Katalog
3) Permission-Naming folgt strikt `Feature.Action`
4) Keine Permission-Strings außerhalb des Katalogs
5) Keine Use Cases ohne Permission (Ausnahmen nur per explizitem ADR)

CI schlägt fehl, wenn eine dieser Regeln verletzt wird.

## Begründung
- Typisierte, immutable Records verhindern "stringly typed security"
- Attribute + Reflection ermöglichen vollständige Automatisierung
- Rollen bleiben flexibel, ohne die Autorisierung zu dominieren
- Tenant-Spezifität ist explizit und erzwingbar
- ArchTests verhindern schleichende Sicherheitslücken

## Alternativen
1) Permission-Strings überall direkt verwenden
   - Vorteile: wenig Code
   - Nachteile: hohe Fehleranfälligkeit, kein zentrales Governance

2) Nur Rollen verwenden
   - Vorteile: simpel
   - Nachteile: unpräzise, schlecht skalierend

3) Permissions nur im Token, nicht im Code
   - Vorteile: IdP-zentriert
   - Nachteile: keine Code-Transparenz, schwer testbar

## Konsequenzen

### Positiv
- Vollständig generierbare Permission-Matrix
- Klare, testbare Autorisierungsregeln
- Gute Basis für Agenten und Code-Generatoren
- Mandantenfähigkeit sauber integriert

### Negativ / Trade-offs
- Mehr initiale Modellierung (Permission Records, Katalog, Attribute)
- Reflection- und ArchTest-Setup nötig
- Pflege von Rollen-Mappings erforderlich

## Verweise
- ADR-03000 (Authentifizierung)
- ADR-03100 (Autorisierung)
- ADR-02000–ADR-02200 (Testing & CI Gates)
- ADR-00001 (Clean Architecture)
- ADR-06000 (Multi-Tenancy) (geplant)
- ADR-04000 (Logging) (geplant)
- ADR-09000 (Telemetry) (geplant)