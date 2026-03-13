---
id: ADR-03100
title: Autorisierung (Permissions/Policies, Tenant-aware, Application-enforced)
status: accepted
date: 2026-01-21
scope: backend
enforced_by: archtests
affects:
  - backend
  - frontend
  - admin
---

# ADR-03100 – Autorisierung (Permissions/Policies, Tenant-aware, Application-enforced)

## Entscheidungstreiber
- Use-Case-orientierte Berechtigungen (klar & wartbar)
- Single Source of Truth (keine doppelte Pflege)
- Durchsetzung unabhängig von Eintrittspunkten (API, Jobs, Message Handler)
- Multi-Tenancy und Multi-Company als integraler Bestandteil
- Granularität: Feature-Level, Entity-Level, Field-Level und Row-Level
- Frontend Permission-Matrix (generierbar)
- Auditierbarkeit

## Kontext
Wir benötigen eine Autorisierung, die:
- Use-Case-spezifische Berechtigungen (Permissions) nutzt
- Multi-Tenancy berücksichtigt (TenantId als Claim)
- konsistent enforced wird, ohne dass Presentation-Attribute gepflegt werden müssen
- vom Frontend für UI-Freigaben über eine Permission-Matrix genutzt werden kann
- Audit-Informationen bereitstellt

Zusätzlich sollen weiterhin **Custom Rollen** möglich sein, jedoch nicht als primäres Autorisierungsmodell.

## Entscheidung

### 1) Autorisierungsmodell (Permissions first)
Wir verwenden ein **Permission-basiertes** Modell (Use-Case-Permissions).

- Naming-Schema: `Feature.Action`  
  Beispiele: `Customers.Read`, `Customers.Create`, `Orders.Approve`

Rollen können existieren, werden aber ausschließlich als **Mapping** auf Permissions betrachtet:
- Rolle → Menge von Permissions  
(Details zur technischen Realisierung/Claims in ADR-03200.)

### 2) Enforcement: ausschließlich Application (verbindlich)
Autorisierung wird **ausschließlich in der Application-Schicht** durchgesetzt.

- Presentation (API/UI) enthält **keine** `[Authorize]` Attribute als Quelle der Wahrheit.
- Jeder Eintrittspunkt, der Use Cases ausführt, muss zwingend durch den Application-Authorization-Guard laufen.

### 3) Pflicht-Permissions für alle Use Cases
**Jede** Command- und Query-Operation (CQRS) hat genau **eine** zugehörige Permission.

- Keine “unguarded” Use Cases (Ausnahmen nur über explizite Entscheidung/ADR).
- Health-/Liveness-/Readiness-Endpunkte sind keine Use Cases und fallen nicht unter diese Regel.

### 4) Multi-Tenancy und Multi-Company (Tenant-/Company-aware AuthZ)
- `TenantId` ist verpflichtender Bestandteil des Security Contexts.
- `CompanyId` ist verpflichtender Bestandteil des Security Contexts (ADR-06300).
- Jeder Request/Use-Case muss einem Tenant **und** einer Company zugeordnet werden.
- Application/Infrastructure müssen Tenant- **und** Company-Scoping erzwingen:
  - Reads: Tenant Filter + Company Filter (via EF Core Global Query Filters)
  - Writes: TenantId und CompanyId müssen gesetzt/validiert sein

### 4b) Berechtigungshierarchie Tenant → Company

Berechtigungen werden in einer **2-stufigen Hierarchie** verwaltet:

| Ebene | Scope | Beispiel |
|-------|-------|----------|
| **Tenant** | Gilt für alle Companies des Tenants | Globaler Admin, Sicherheitseinstellungen |
| **Company** | Gilt nur für eine bestimmte Company | Buchhalter Company DE, Einkäufer Company AT |

**Vererbungsregel: Top-Down**
- Permissions auf **Tenant-Ebene** gelten automatisch für **alle Companies** des Tenants.
- Permissions auf **Company-Ebene** gelten nur für die jeweilige Company.
- Keine Aufhebung/Einschränkung von Tenant-Permissions auf Company-Ebene (kein Deny auf niedrigerer Ebene).

```
Effective Permissions = Tenant-Permissions ∪ Company-Permissions(activeCompanyId)
```

**Beispiel:**
```
User: Max Mustermann
  Tenant-Permissions:  [Settings.Read]
  Company DE-Permissions: [Invoices.Create, Invoices.Read]
  Company AT-Permissions: [Invoices.Read]
  
→ Aktive Company = DE: {Settings.Read, Invoices.Create, Invoices.Read}
→ Aktive Company = AT: {Settings.Read, Invoices.Read}
```

### 4c) Field-Level Security

Einzelne Felder einer Entity können pro Rolle/Permission **ausgeblendet** werden:

- Field-Level Permissions folgen dem Naming-Schema: `Feature.Field.Read` (z. B. `Articles.PurchasePrice.Read`)
- Felder ohne Field-Level-Berechtigung werden im API-Response als `null` oder nicht enthalten zurückgegeben
- Enforcement erfolgt im **Application Layer** (Response-Mapping), nicht in der Domain
- Die Frontend Permission-Matrix enthält Field-Level-Permissions zur UI-Steuerung
- Typische Anwendungsfälle: Einkaufspreise, Margen, Gehaltsdaten, Deckungsbeiträge

### 4d) Row-Level Security

Datensätze können pro Benutzer/Rolle auf bestimmte **Organisationseinheiten** eingeschränkt werden:

- Row-Level Security filtert Datensätze basierend auf Zuordnungen wie Kostenstelle, Abteilung oder Lagerort
- Implementierung über **EF Core Global Query Filters** mit Werten aus dem Security Context
- Der Security Context enthält die erlaubten Organisationseinheiten des Benutzers (z. B. `allowed_cost_centers`)
- Row-Level Security ist **optional** und wird nur für Entities aktiviert, die eine Org-Einheiten-Zuordnung besitzen
- Typische Anwendungsfälle: „Nur eigene Kostenstelle sehen“, „Nur Aufträge des eigenen Standorts“

**Granularitätsstufen Übersicht:**

| Stufe | Scope | Enforcement | Beispiel |
|-------|-------|-------------|----------|
| **Feature-Level** | Modul ein/aus | Application Guard (Permission) | `Purchasing.Access` |
| **Entity-Level** | CRUD pro Entity | Application Guard (Permission) | `Orders.Create` |
| **Field-Level** | Felder pro Rolle | Application (Response-Mapping) | `Articles.PurchasePrice.Read` |
| **Row-Level** | Datensätze pro Org-Einheit | Infrastructure (EF Query Filter) | Cost Center, Branch |

### 5) Frontend Permission Matrix
Das Frontend nutzt eine **Permission-Matrix**, um UI-Funktionen konsistent ein-/auszublenden.

- Quelle der Wahrheit bleibt Application Enforcement (Frontend ist nur Convenience).
- Permissions werden über Reflection/Export generierbar bereitgestellt (ADR-03200).

### 6) Audit
Autorisierungsrelevante Aktionen werden auditierbar gemacht:
- Wer (UserId), welcher Tenant (TenantId), was (Operation/Permission), wann, Ergebnis (allowed/denied)
- Ohne PII-Leaks (Details in Logging/Telemetry ADRs)

## Begründung
- Permissions passen besser zu Use Cases als Rollen.
- Single Source of Truth reduziert Drift und doppelte Pflege.
- Application-enforced funktioniert auch für Background Jobs/Message Handler.
- Tenant- und Company-aware Enforcement verhindert Datenlecks zwischen Mandanten und Buchungskreisen.
- Top-Down-Vererbung (Tenant → Company) ist einfach verständlich und vermeidet Konflikte.
- Field-Level Security schützt sensible Daten (Einkaufspreise, Margen) ohne eigene Views/Endpoints.
- Row-Level Security ermöglicht Organisations-basierte Einschränkungen ohne manuelle Filter im Code.
- Permission-Matrix ist konsistent und generierbar.

## Alternativen
1) Presentation `[Authorize]` + Application Guard (Defense in depth)
   - Vorteile: frühere Abweisung, “self-documenting”
   - Nachteile: Doppelpflege/Drift-Risiko (ohne Generation)

2) Reines Rollenmodell
   - Vorteile: simpel
   - Nachteile: skaliert schlecht, unklar bei vielen Use Cases

3) Ressourcenbasierte AuthZ überall
   - Vorteile: sehr präzise
   - Nachteile: deutlich komplexer, braucht mehr Patterns/Infra

## Konsequenzen

### Positiv
- Einheitliche, testbare Autorisierung pro Use Case
- Kein Drift zwischen Endpoint-Attributen und Business-Regeln
- Mandanten- und Company-fähigkeit als Standard
- 4-stufige Granularität (Feature, Entity, Field, Row) deckt alle ERP-Anforderungen ab
- Gute Basis für Generatoren/Agenten (Reflection)

### Negativ / Trade-offs
- Autorisierung ist weniger "sichtbar" am Endpoint-Code (ohne `[Authorize]`)
- Strikte Disziplin nötig: alle Eintrittspunkte müssen Guard verwenden
- Initialer Aufwand für Permission-Katalog/Metadaten und Tests
- Field-Level Security erhöht Komplexität des Response-Mappings
- Row-Level Security erfordert zusätzliche Query Filter und Org-Einheiten-Zuordnung pro User

## Umsetzungshinweise
- Zentraler Permission-Katalog in Application (konstant/enum-artig), Naming `Feature.Action`
- Jede Command/Query deklariert Permission-Metadaten (Attribut/Interface/Metadata) (ADR-03200)
- Application Authorization Guard:
  - liest Claims/Permissions aus `ICurrentUserContext`
  - entscheidet Allow/Deny konsistent
  - liefert/ermappt standardisierte Forbidden/Unauthorized Fehler
- Tests:
  - jeder Handler: “Unauthorized/Forbidden → denied”, “Authorized → allowed”
- Tenant Enforcement:
  - `TenantId` ist Pflichtclaim (außer explizite System-Use-Cases per ADR)
  - `CompanyId` ist Pflichtclaim für company-scoped Operationen (ADR-06300)
  - DB Scoping: Query Filter + Write Guard (Details in Multi-Tenancy ADR)
- Company-Scoped Permissions:
  - Permissions werden pro User + Company in einer Mapping-Tabelle gespeichert
  - Effective Permissions = Union aus Tenant-Permissions und Company-Permissions
  - Permission-Lookup wird gecacht (Invalidierung bei Änderung via Integration Event)
- Field-Level Security:
  - Permission-Katalog enthält Field-Level-Permissions (`Feature.Field.Read`)
  - Response-Mapper prüft Field-Permissions und setzt nicht-berechtigte Felder auf `null`
  - Frontend erhält Field-Level-Permissions in der Permission-Matrix
- Row-Level Security:
  - User → Organisationseinheiten-Mapping in einer Zuordnungstabelle
  - EF Core Query Filter liest erlaubte Org-Einheiten aus `ICurrentUserContext`
  - Nur für Entities relevant, die `IOrgUnitScoped` implementieren
  - Admin-Rollen können Row-Level Filter umgehen (explizite Permission)

## Verweise
- ADR-03000 (Authentifizierung)
- ADR-03200 (Permission Katalog & Claim-Schema)
- ADR-02000–ADR-02200 (Testing & CI Gates)
- ADR-00001 (Clean Architecture)
- ADR-06000 (Multi-Tenancy)
- ADR-06300 (Multi-Company / Organisationsstruktur)
- ADR-04000 (Logging)
- ADR-04100 (Telemetry & Observability)
- Fragebogen §4.2, §4.4
