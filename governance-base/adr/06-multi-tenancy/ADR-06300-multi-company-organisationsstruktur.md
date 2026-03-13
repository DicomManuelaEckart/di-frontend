---
id: ADR-06300
title: Multi-Company / Organisationsstruktur (Tenant → Company)
status: accepted
date: 2026-02-24
scope: backend
enforced_by: archtests
affects:
  - backend
  - frontend
  - infrastructure
---

# ADR-06300 – Multi-Company / Organisationsstruktur (Tenant → Company)

## Entscheidungstreiber
- ERP-System muss Konzernstrukturen abbilden (mehrere Firmen/Buchungskreise)
- Klare Daten-Isolation zwischen Companies bei gleichzeitiger Konzernkonsolidierung
- Wiederverwendung von Stammdaten über Company-Grenzen hinweg
- Konsistenz mit bestehender Tenant-Isolation (ADR-06000)
- Rechtliche Anforderungen: Steuernummer, Währung, Kontenplan pro Company

## Kontext

### Terminologie-Klarstellung
In den bisherigen ADRs wird „Tenant" als oberste Organisationsebene verwendet (ADR-06000, ADR-05300, ADR-03100). Diese Verwendung ist **korrekt**:

| Begriff | Bedeutung | Beispiel |
|---------|-----------|---------|
| **Tenant** | Vertragsnehmer / Lizenznehmer. Besitzt eine eigene Datenbank (ADR-06000). | „Müller Holding GmbH" als Kundenvertrag |
| **Company** | Firma / Buchungskreis. Rechtliche Einheit innerhalb eines Tenants. | „Müller DE GmbH", „Müller AT GmbH" |

Ein Tenant kann **mehrere Companies** besitzen. Dies ist die zweite Organisationsebene, die in den bisherigen ADRs nicht adressiert wird.

### Problem
ADR-06000 definiert Tenant-Isolation (Database-per-Tenant), aber innerhalb einer Tenant-Datenbank fehlt die Abgrenzung zwischen Firmen:
- Belege, Buchungen und Nummernkreise müssen pro Company getrennt sein
- Stammdaten (Artikel, Kunden, Lieferanten) sollen konzernweit nutzbar sein
- Preise sollen zentral pflegbar sein, aber pro Company überschreibbar
- Konsolidierungsberichte müssen über alle Companies eines Tenants möglich sein

## Entscheidung

---

### 1) Hierarchie: genau zwei Ebenen

```
Tenant (Vertrag/Lizenz, = 1 Datenbank)
  └── Company 1 (Buchungskreis / rechtliche Einheit)
  └── Company 2
  └── Company N
```

- Es gibt **keine** weiteren Hierarchie-Ebenen (Branch, Department, Cost Center) als Scoping-Dimension.
- Organisatorische Untergliederungen (Standorte, Abteilungen, Kostenstellen) sind **fachliche Stammdaten**, keine Isolation-Ebenen.

---

### 2) Company als Entity

Company ist ein **Aggregate Root** im Domain-Modell:

- Besitzt eine eindeutige `CompanyId` (Guid, wie alle IDs – vgl. ID-Strategie)
- Pflichtfelder: Name, Steuernummer, Firmenleitwährung (ISO 4217), Land
- Konfigurierbar: Kontenplan-Erweiterungen, Nummernkreis-Definitionen
- Einem Tenant zugeordnet (über Tenant-DB-Isolation implizit)

---

### 3) Daten-Scoping: Tenant-weit vs. Company-spezifisch

| Daten-Ebene | `CompanyId` in Tabelle? | Beispiele |
|-------------|------------------------|-----------|
| **Tenant-weit** | ❌ Nein | Artikel, Kunden, Lieferanten, Artikelgruppen, User, Lager-Stammdaten (Lagerorte), Company-Stammdaten |
| **Company-spezifisch** | ✅ Ja (EF Core Global Query Filter) | Belege, Buchungen, Konten, Nummernkreise, Lagerbestände |
| **Tenant-weit mit Company-Override** | ✅ Ja, optional (`CompanyId = NULL` = Tenant-Default) | Preise/Konditionen, Kontenrahmen-Erweiterungen |

---

### 4) `ICompanyScoped` Interface

Entities mit Company-Bezug implementieren das `ICompanyScoped`-Interface:

```csharp
public interface ICompanyScoped
{
    CompanyId CompanyId { get; }
}
```

**Regeln:**
- `CompanyId` wird aus dem **Request Context** gesetzt (nicht aus Request-DTOs) – analog zu `TenantId` (ADR-06000 §4)
- EF Core Global Query Filter filtert automatisch nach `CompanyId` aus dem aktuellen Context
- Entities, die `ICompanyScoped` implementieren, sind **immer** company-gefiltert (außer explizite Ausnahmen)

---

### 5) CompanyId im Request Context

Der Request Context (ADR-05300) wird um `CompanyId` erweitert:

- **Quelle:** JWT-Claim (`company_id`) oder explizite Auswahl bei Multi-Company-Usern
- **Pflichtfeld** für alle Commands und Queries mit company-spezifischen Daten
- Optional für rein tenant-weite Operationen (z.B. Stammdatenpflege)
- Zugriff über `ICurrentCompanyContext` (analog zu `ICurrentTenantContext`)

**Multi-Company-User:**
- Ein User kann Zugriff auf mehrere Companies haben
- Company-Wechsel erfolgt explizit (z.B. Company-Selektor im Frontend)
- Aktive `CompanyId` wird pro Session/Request gesetzt

---

### 6) Company-aware Authorization

Die Autorisierung (ADR-03100) wird um Company-Scoping erweitert:

- Permissions gelten **pro Company** (ein User kann in Company A andere Rechte haben als in Company B)
- `CompanyId` ist Bestandteil des Authorization-Checks
- **Berechtigungsvererbung:** Tenant-Admin-Rechte gelten für alle Companies (Top-Down)
- Company-spezifische Rollen können die Tenant-Defaults einschränken oder erweitern

---

### 7) Tenant-weite Stammdaten mit Company-Override (Override-Pattern)

Für Daten, die zentral pflegbar sein sollen, aber pro Company überschrieben werden können:

**Muster:** Entity mit optionalem `CompanyId`:
- `CompanyId = NULL` → Tenant-weiter Default (gilt für alle Companies)
- `CompanyId = <Wert>` → Company-Override (höhere Priorität)

**Beispiele:**

```
// Preise
Price { ArticleId = A1, Amount = 100, CompanyId = NULL }       // Tenant-Default
Price { ArticleId = A1, Amount = 95,  CompanyId = DE-Company }  // Override DE

// Kontenrahmen
Account { Number = "1000", Name = "Bank", CompanyId = NULL }          // Alle Companies
Account { Number = "1001", Name = "Bank CHF", CompanyId = CH-Company } // Nur CH
```

**Auflösungslogik:**
1. Suche Company-spezifischen Eintrag → wenn vorhanden, verwenden
2. Fallback auf Tenant-Default (`CompanyId = NULL`)

---

### 8) Konzernkonsolidierung

Für Company-übergreifende Auswertungen innerhalb eines Tenants:

- **Mechanismus:** `IgnoreQueryFilters()` für den CompanyId-Filter (nicht für den TenantId-Filter!)
- **Konsolidierungs-Queries** werden über spezielle Read-Services / Query-Handler realisiert
- Zugriff erfordert explizite Consolidation-Permission (z.B. `Reporting.Consolidation`)
- Konsolidierung ist **read-only** – cross-Company-Writes sind nicht erlaubt (keine Intercompany-Buchungen in Phase 1)

**Wichtig:** Der Tenant-Filter (DB-Isolation, ADR-06000) wird **niemals** deaktiviert. Nur der Company-Filter kann für Konsolidierung umgangen werden.

---

### 9) Lager und Bestände

- **Lager-Stammdaten** (Lagerorte, Lagerplätze): Tenant-weit (kein `CompanyId`)
- **Lagerbestände** (`StockLevel`): Company-spezifisch (`ICompanyScoped`)
- Eine Company kann Bestände in mehreren Lagern führen
- Mehrere Companies können dasselbe Lager nutzen (z.B. Konzern-Zentrallager)

---

### 10) Intercompany-Transaktionen

In Phase 1 werden **keine** Intercompany-Buchungen unterstützt:
- Keine automatischen Gegenbuchungen zwischen Companies
- Konsolidierung nur auf Report-Ebene

Intercompany-Buchungen können in einem Folge-ADR adressiert werden, wenn fachlich erforderlich.

## Begründung
- Zwei-Ebenen-Hierarchie (Tenant → Company) ist der De-facto-Standard in ERP-Systemen und deckt Konzernstrukturen ab, ohne unnötige Komplexität
- `ICompanyScoped` + Global Query Filter ist konsistent mit dem bestehenden Tenant-Scoping-Pattern (ADR-06000)
- Das Override-Pattern (`CompanyId = NULL` als Default) minimiert Pflegeaufwand bei einheitlichen Konzernpreisen, ermöglicht aber Flexibilität
- Tenant-weite Stammdaten vermeiden redundante Datenpflege über Companies hinweg
- Konsolidierung über `IgnoreQueryFilters()` ist technisch einfach und sicher (Tenant-Filter bleibt aktiv)

## Alternativen

1) **Flat: kein Company-Konzept (1 Tenant = 1 Firma)**
   - Vorteile: einfacher, weniger Filter/Scoping
   - Nachteile: keine Konzernstrukturen, jede Firma ein eigener Tenant → keine geteilten Stammdaten, keine Konsolidierung

2) **Tiefe Hierarchie (Tenant → Company → Branch → Department → CostCenter)**
   - Vorteile: maximale Flexibilität
   - Nachteile: enorme Komplexität bei Scoping/Filterung, Global Query Filters werden unhandlich, kaum echte Anforderung für ERP

3) **Company als eigene Datenbank (Database-per-Company)**
   - Vorteile: maximale Company-Isolation
   - Nachteile: Stammdaten-Sharing unmöglich ohne Cross-DB-Sync, Konsolidierung sehr aufwändig, exponentiell mehr Datenbanken

## Konsequenzen

### Positiv
- Konzernstrukturen mit geteilten Stammdaten und company-spezifischen Belegen
- Einheitliches Scoping-Pattern (analog Tenant-Scoping)
- Zentrale Preispflege mit Company-Override → weniger Pflegeaufwand
- Konsolidierungsberichte ohne separate Data Pipelines
- Saubere rechtliche Trennung (Steuernummer, Währung pro Company)

### Negativ / Trade-offs
- Jede Query bei company-spezifischen Daten muss CompanyId berücksichtigen
- Request Context wird komplexer (CompanyId zusätzlich zu TenantId)
- Company-Wechsel im Frontend erfordert UX-Pattern (Company-Selektor)
- Override-Pattern (CompanyId = NULL vs. Wert) erfordert Auflösungslogik in Queries
- Intercompany-Buchungen sind in Phase 1 nicht möglich

### Umsetzungshinweise

#### A) Domain
- `ICompanyScoped`-Interface in Shared Kernel / Domain Building Blocks
- `CompanyId` als strongly-typed Value Object (analog `TenantId`)
- Company als Aggregate Root mit Pflichtfeldern (Name, Steuernummer, Leitwährung, Land)

#### B) Infrastructure / Persistence
- EF Core Global Query Filter für `CompanyId` (analog zum Tenant-Filter, aber innerhalb der Tenant-DB)
- `ICompanyScoped`-Entities erhalten automatischen Filter via `HasQueryFilter(e => e.CompanyId == currentCompanyId)`
- Override-Pattern: Queries mit `CompanyId = NULL OR CompanyId = currentCompanyId`, sortiert nach Spezifität
- Konsolidierungs-Queries nutzen `IgnoreQueryFilters()` explizit und auditiert

#### C) Request Context (ADR-05300)
- `CompanyId` als neues Feld im Request Context
- `ICurrentCompanyContext`-Interface für typisierte Zugriffe
- Middleware setzt `CompanyId` aus JWT-Claim oder Session-Kontext
- Validierung: `CompanyId` muss zu einer Company des aktuellen Tenants gehören

#### D) Authorization (ADR-03100)
- Permission-Checks um `CompanyId`-Dimension erweitern
- Tenant-Admin hat impliziten Zugriff auf alle Companies
- Company-spezifische Rollen/Permissions in Permission-Store

#### E) Frontend
- Company-Selektor (Dropdown/Picker) für User mit Zugriff auf mehrere Companies
- Aktive Company wird in Session gespeichert und bei jedem Request mitgesendet
- UI filtert automatisch nach aktiver Company

#### F) ArchTests
1. Entities mit `ICompanyScoped` müssen einen Global Query Filter für `CompanyId` haben
2. `CompanyId` darf nicht aus Request-DTOs übernommen werden (nur aus Context)
3. `IgnoreQueryFilters()` für CompanyId nur in explizit markierten Consolidation-Services
4. Kein Write-Zugriff über Company-Grenzen hinweg (außer explizit markierte Ausnahmen)

## Verweise
- ADR-06000 (Multi-Tenancy – Tenant Isolation & Data Scoping)
- ADR-06100 (Tenant-aware Migrations & Seed Data)
- ADR-05300 (Request Context – wird um CompanyId erweitert)
- ADR-03100 (Autorisierung – wird um Company-Scoping erweitert)
- ADR-03000 (Authentifizierung – company_id als JWT-Claim)
- ADR-01300 (Aggregatgrenzen & Konsistenzregeln)
- ADR-08000 (Persistenz – EF Core Global Query Filters)
