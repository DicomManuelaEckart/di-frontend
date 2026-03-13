---
id: ADR-05700
title: Feature Flags & Toggles (Azure App Configuration, Tenant-basiert)
status: accepted
date: 2026-02-24
scope: fullstack
enforced_by: code-review
affects:
  - backend
  - frontend
  - operations
---

# ADR-05700 – Feature Flags & Toggles

## Entscheidungstreiber
- Graduelle Rollouts neuer Features ohne Deployment (Fragebogen §11.5)
- Tenant-spezifische Feature-Aktivierung als Basis für Lizenzmodule (Fragebogen §21.3)
- Kill Switches für schnelle Deaktivierung problematischer Features in Produktion
- Entkopplung von Deployment und Release: Code deployen ≠ Feature aktivieren
- SaaS-Modell mit 500–600 Tenants erfordert flexible Feature-Steuerung (ADR-00008)
- Bounded-Context-Module pro Tenant aktivierbar (ADR-01600)

## Kontext
Das System ist ein Multi-Tenant-SaaS-ERP, bei dem nicht alle Tenants denselben Funktionsumfang nutzen. Features müssen pro Tenant, pro Modul oder global steuerbar sein. Der Fragebogen entscheidet sich für **Azure App Configuration** als Feature-Flag-Provider mit **tenant-basierten Flags**. Feature Flags sind auch die technische Basis für das Feature-Entitlement-Modell (Lizenzierung, ADR-50500).

## Entscheidung

### 1) Provider: Azure App Configuration

| Aspekt | Entscheidung |
|--------|-------------|
| **Provider** | Azure App Configuration (Feature Management) |
| **Begründung** | Native Azure-Integration, .NET SDK, kein externer Service nötig |
| **SDK** | `Microsoft.FeatureManagement.AspNetCore` |
| **Konfigurationsspeicher** | Azure App Configuration (zentral, nicht in der Tenant-DB) |
| **Verworfene Alternativen** | LaunchDarkly (Kosten, externer Service), Unleash (Self-Hosting-Aufwand) |

**Regeln:**
- Azure App Configuration wird als **zentrale Konfigurationsquelle** für Feature Flags verwendet – neben bestehenden App Settings.
- Pro Umgebung (Dev, Test, Prod) existiert eine eigene App Configuration-Instanz (ADR-08300).
- Connection via **Managed Identity** (keine Connection Strings in Secrets, ADR-08200).

### 2) Flag-Typen und Kategorien

| Typ | Zweck | Lebensdauer | Beispiel |
|-----|-------|-------------|---------|
| **Release Toggle** | Graduelle Freischaltung neuer Features | Kurzlebig (Tage bis Wochen) | `Feature.Invoice.EInvoiceV2` |
| **Ops Toggle** | Kill Switch für operative Steuerung | Dauerhaft | `Ops.Camt.ImportEnabled` |
| **Entitlement Toggle** | Modul-/Lizenz-Freischaltung pro Tenant | Dauerhaft | `Entitlement.Module.Mahnwesen` |
| **Experiment Toggle** | A/B-Test für UX oder Logik | Kurzlebig | `Experiment.Dashboard.NewLayout` |

**Regeln:**
- Jeder Flag hat einen **Typ** (Release, Ops, Entitlement, Experiment) als Präfix in der Benennung.
- Release Toggles werden nach vollständigem Rollout **entfernt** (kein Flag-Friedhof).
- Entitlement Toggles sind langlebig und dürfen **nicht** manuell entfernt werden (Lifecycle an Lizenzmodell gebunden).

### 3) Tenant-basierte Feature Flags

Feature Flags sind **tenant-aware** – dasselbe Feature kann für Tenant A aktiviert und für Tenant B deaktiviert sein.

**Auflösungshierarchie (Reihenfolge):**

| Priorität | Ebene | Beschreibung |
|-----------|-------|-------------|
| 1 (höchste) | Tenant-Override | Explizite Aktivierung/Deaktivierung für einen bestimmten Tenant |
| 2 | Tenant-Gruppe | Gruppe von Tenants (z.B. „Beta-Tester", „Enterprise-Plan") |
| 3 | Prozentsatz | Prozentualer Rollout (z.B. 10% aller Tenants) |
| 4 (niedrigste) | Global Default | Standardwert für alle Tenants |

**Implementierung:**
- Azure App Configuration Feature Filters werden genutzt, um Tenant-ID als **Targeting-Kontext** zu übergeben.
- Der `TenantId` wird aus dem Request Context (ADR-05300) in den Feature-Management-Filter injiziert.
- Für Background Jobs (ADR-05500) wird der Tenant-Kontext explizit gesetzt.

### 4) Flag-Benennung und Konventionen

| Konvention | Regel | Beispiel |
|------------|-------|---------|
| **Format** | `{Typ}.{BoundedContext}.{Feature}` | `Entitlement.Finance.Mahnwesen` |
| **Groß-/Kleinschreibung** | PascalCase | `Release.Inventory.BatchTracking` |
| **Maximale Tiefe** | 3 Segmente | – |
| **Dokumentation** | Jeder Flag muss in einer zentralen Übersicht dokumentiert sein | Feature-Flag-Register (Markdown im Repo) |

**Verpflichtende Metadaten pro Flag:**

| Feld | Pflicht | Beschreibung |
|------|---------|-------------|
| Name | Ja | Eindeutiger Flag-Name (Konvention oben) |
| Typ | Ja | Release / Ops / Entitlement / Experiment |
| Beschreibung | Ja | Was macht der Flag? |
| Owner | Ja | Team oder Person |
| Erstellt am | Ja | Datum |
| Geplantes Entfernen | Nur Release/Experiment | Wann wird der Flag entfernt? |
| Default-Wert | Ja | true / false |

### 5) Backend-Integration

**Abfrage im Application Layer:**

Feature Flags werden über das `IFeatureManager`-Interface von `Microsoft.FeatureManagement` geprüft. Die Abfrage erfolgt im **Application Layer** (Use Cases, Command/Query Handlers), nicht im Domain Layer.

| Ort | Erlaubt? | Begründung |
|-----|----------|-----------|
| Application Layer (Handlers) | ✅ Ja | Feature-Entscheidung ist ein Application-Concern |
| API Controller / Middleware | ✅ Ja | Für Routing, Endpunkt-Sichtbarkeit |
| Domain Layer | ❌ Nein | Domain kennt keine Feature Flags (Clean Architecture) |
| Infrastructure Layer | ⚠️ Nur Ops Toggles | Kill Switches für technische Integrationen |

**Regeln:**
- Feature Flags werden **nicht** in Domain-Entities oder Value Objects geprüft.
- Wenn ein Feature deaktiviert ist, antwortet der Endpunkt mit `404 Not Found` (Feature existiert nicht für diesen Tenant) oder `403 Forbidden` (Entitlement fehlt).
- Feature-Status wird im Request Context angereichert, damit nachgelagerte Services nicht erneut prüfen müssen.

### 6) Frontend-Integration

| Aspekt | Entscheidung |
|--------|-------------|
| **Datenquelle** | Backend-API liefert aktive Features als Liste an das Frontend (kein direkter Zugriff auf Azure App Configuration) |
| **Endpunkt** | `GET /api/v1/features` → gibt aktivierte Feature-Keys für den aktuellen Tenant zurück |
| **Caching** | Frontend cached die Feature-Liste für die Dauer der Session (oder bis manueller Refresh) |
| **UI-Auswirkung** | Deaktivierte Features werden im Menü/Navigation ausgeblendet, nicht nur disabled |
| **Guard** | Angular Route Guards prüfen Feature-Flags vor Navigation |

### 7) Caching und Aktualisierung

| Aspekt | Entscheidung |
|--------|-------------|
| **Backend-Polling** | Azure App Configuration SDK pollt alle **30 Sekunden** nach Änderungen (Sentinel Key) |
| **Sofortige Änderung** | Für Kill Switches (Ops Toggles): Cache-Invalidierung event-basiert über Azure Event Grid |
| **Konsistenz** | Feature-Status gilt für die gesamte Dauer eines Requests (kein Mid-Request-Toggle) |
| **Startup** | Beim Applikationsstart werden alle Flags geladen; bei Nichterreichbarkeit von App Configuration startet die App mit den zuletzt bekannten Werten (Graceful Degradation) |

### 8) Verwaltung über das Admin-Portal

Feature Flags werden **ausschließlich über das interne Admin-Portal** verwaltet – nicht direkt über das Azure Portal oder CLI.

| Aspekt | Entscheidung |
|--------|-------------|
| **Steuerung** | Admin-Portal ist die einzige Benutzeroberfläche für Feature-Flag-Verwaltung |
| **Zielgruppe** | Interne Admins, Product Owner, Support (nicht Tenant-Admins) |
| **Funktionen** | Flags anzeigen, aktivieren/deaktivieren, Tenant-Overrides setzen, Rollout-Prozentsatz ändern, Tenant-Gruppen zuweisen |
| **Schreibweg** | Admin-Portal → Backend Admin-API → Azure App Configuration (App Config wird nie direkt beschrieben) |
| **Leseweg** | Applikation liest Flags direkt aus Azure App Configuration (SDK-Polling) |
| **Validierung** | Admin-API validiert Flag-Typ-Regeln (z.B. Entitlement Toggles können nicht manuell gelöscht werden) |
| **Audit** | Änderungen erzeugen Domain Events (z. B. `FeatureFlagChanged`) in der Admin-DB, die über Outbox (ADR-08100) zuverlässig persistiert werden (Benutzer, Zeitstempel, Flag-Name, alter/neuer Wert, Grund) |

**Regeln:**
- Direkter Zugriff auf Azure App Configuration (Azure Portal, CLI, REST API) ist für Feature-Flag-Änderungen in Produktion **nicht zulässig** – nur über die Admin-API.
- Ausnahme: Notfall-Kill-Switches dürfen im Incident-Fall direkt über Azure Portal gesetzt werden (dokumentierter Notfallprozess).
- In Dev/Test-Umgebungen ist direkter Zugriff erlaubt.

### 9) Feature-Flag-Lifecycle

| Phase | Beschreibung | Verantwortlich |
|-------|-------------|----------------|
| **Erstellen** | Flag in Azure App Configuration anlegen (via Admin-Portal) + Feature-Flag-Register aktualisieren | Entwickler |
| **Implementieren** | Code mit `IFeatureManager`-Abfrage ergänzen | Entwickler |
| **Testen** | Flag in Test-Umgebung aktivieren/deaktivieren, beide Pfade testen | QA |
| **Rollout** | Schrittweise Aktivierung über Admin-Portal (Beta-Gruppe → Prozentsatz → Global) | Product Owner + Ops |
| **Aufräumen** | Nach vollständigem Rollout: Flag entfernen, Code aufräumen, Register aktualisieren | Entwickler |

**Regeln für das Aufräumen:**
- Release Toggles, die älter als **4 Wochen nach Global-Aktivierung** sind, werden im Sprint-Review als „aufzuräumen" markiert.
- Ein ArchTest prüft, dass keine Flag-Referenzen auf gelöschte Flags im Code existieren (Dead Flag Detection).
- Entitlement Toggles werden **nicht** aufgeräumt (Lebensdauer = Lizenzmodell-Lebensdauer).

### 10) Entitlement Toggles und Lizenzierung

Entitlement Toggles bilden die technische Brücke zwischen Feature Flags und dem Lizenzmodell (ADR-50500):

| Aspekt | Entscheidung |
|--------|-------------|
| **Quellsystem** | Tenant-Konfiguration in der zentralen Admin-DB (ADR-06200) bestimmt den Lizenzplan |
| **Synchronisation** | Beim Onboarding und bei Planänderungen werden Entitlement Toggles in Azure App Configuration geschrieben |
| **Granularität** | Pro Modul (z.B. `Entitlement.Module.Mahnwesen`, `Entitlement.Module.EInvoice`) |
| **Enforcement** | Backend prüft Entitlement vor Ausführung; Verstoß → `403 Forbidden` mit `ProblemDetails` |
| **Überschreibungen** | Nur über Admin-Portal möglich (z.B. für Trial-Aktivierung, zeitlich begrenzt) |

### 11) Monitoring und Audit

| Aspekt | Entscheidung |
|--------|-------------|
| **Telemetrie** | Jede Feature-Flag-Auswertung wird als Custom Event in Application Insights geloggt (ADR-04100) |
| **Audit** | Änderungen an Feature Flags erzeugen Domain Events in der Admin-DB (via Outbox, ADR-08100) – garantiert keine verlorenen Audit-Einträge (wer, wann, welcher Flag, alter/neuer Wert) |
| **Dashboards** | Azure Monitor Dashboard zeigt: aktive Flags pro Umgebung, Flag-Änderungen der letzten 7 Tage, Tenants pro Feature |
| **Alerts** | Alert bei Kill-Switch-Aktivierung (Ops Toggle → disabled) |

## Begründung
- **Azure App Configuration** ist der native Azure Feature-Management-Service mit erstklassiger .NET-Unterstützung – kein externer Vendor nötig.
- **Tenant-basierte Flags** ermöglichen differenzierte Feature-Steuerung pro Mandant, was für ein Multi-Tenant-SaaS essenziell ist.
- **Entitlement Toggles** verknüpfen Feature Flags mit dem Lizenzmodell, sodass ein einheitlicher Mechanismus für Rollouts und Lizenzierung existiert.
- **Strikte Trennung Typ/Lifecycle** verhindert Flag-Friedhöfe: Release Toggles werden aufgeräumt, Entitlement Toggles leben dauerhaft.
- **Domain Layer bleibt sauber**: Feature Flags sind Application/Infrastructure-Concerns, nicht Domain-Logik.

## Alternativen
1) **LaunchDarkly**
   - Vorteile: Mächtiges UI, A/B Testing, Segmentierung out-of-the-box
   - Nachteile: Externer Service (Kosten, Datenhaltung USA), zusätzliche Abhängigkeit
   - Entscheidung: nicht gewählt (Azure-nativer Stack bevorzugt)

2) **Unleash (Self-Hosted)**
   - Vorteile: Open Source, volle Kontrolle, kein Vendor Lock-in
   - Nachteile: Self-Hosting-Aufwand, eigene Infrastruktur, weniger .NET-Integration
   - Entscheidung: nicht gewählt (Betriebsaufwand)

3) **Feature Flags in Tenant-DB**
   - Vorteile: Kein externer Service, direkte Zuordnung
   - Nachteile: Keine zentrale Verwaltung, kein Cross-Tenant-Rollout, keine Echtzeit-Updates
   - Entscheidung: nicht gewählt (zentrale Steuerung erforderlich)

4) **Lizenzschlüssel statt Feature Flags**
   - Vorteile: Klassisches Modell, offline-fähig
   - Nachteile: Nicht dynamisch, kein graduelle Rollout, aufwändige Verwaltung
   - Entscheidung: nicht gewählt (SaaS erfordert dynamische Steuerung)

## Konsequenzen

### Positiv
- Deployment und Release sind entkoppelt – Code kann deployt werden, bevor ein Feature live geht
- Tenant-spezifische Feature-Steuerung ermöglicht differenziertes SaaS-Angebot
- Kill Switches erlauben sofortige Deaktivierung problematischer Features ohne Rollback
- Einheitlicher Mechanismus für Rollouts, Lizenzierung und operative Steuerung
- Azure-nativer Stack minimiert externe Abhängigkeiten

### Negativ / Trade-offs
- Azure App Configuration wird zum zentralen Infrastruktur-Baustein (Abhängigkeit, Verfügbarkeit)
- Feature-Flag-Code erhöht Komplexität (zwei Pfade pro Feature testen)
- Disziplin beim Aufräumen von Release Toggles erforderlich (sonst Flag-Friedhof)
- 30-Sekunden-Polling-Intervall bedeutet: Flag-Änderungen sind nicht sofort wirksam (außer Ops Toggles mit Event Grid)
- Jeder Entwickler muss die Flag-Konventionen kennen und einhalten

### Umsetzungshinweise

**A) NuGet-Pakete:**
- `Microsoft.Azure.AppConfiguration.AspNetCore`
- `Microsoft.FeatureManagement.AspNetCore`

**B) Feature-Flag-Register:**
- Markdown-Datei im Repository (`docs/feature-flag-register.md`)
- Enthält alle aktiven Flags mit Metadaten (Name, Typ, Owner, Default, Erstelldatum)
- Wird bei jeder Flag-Erstellung/-Löschung aktualisiert

**C) ArchTests:**
- Kein direkter Zugriff auf `IFeatureManager` im Domain Layer
- Keine Flag-Referenzen auf gelöschte Flags (Dead Flag Detection via Naming Convention)

**D) Permissions:**
- `Admin.FeatureFlags.Read` – Feature-Flag-Status einsehen
- `Admin.FeatureFlags.Write` – Feature Flags aktivieren/deaktivieren
- `Admin.FeatureFlags.Override` – Tenant-spezifische Überschreibungen setzen

## Verweise
- ADR-00008 – Plattform-Entscheidung (Azure, SaaS, 500–600 Tenants)
- ADR-01600 – Bounded-Context-Katalog (Module pro Tenant aktivierbar)
- ADR-05300 – Request Context (TenantId als Targeting-Kontext)
- ADR-05500 – Background Jobs (Tenant-Kontext für Flag-Auswertung)
- ADR-06200 – Tenant Lifecycle (Feature Flags in Tenant-Konfiguration)
- ADR-06000 – Multi-Tenancy (Tenant Isolation)
- ADR-08200 – Infrastructure as Code (App Configuration Provisioning)
- ADR-08300 – CI/CD (Umgebungen, Deployment)
- ADR-50500 – Lizenzierung und Abrechnung (Entitlement Toggles, geplant)
- Fragebogen §11.5 (Feature Flags), §21.3 (Feature Entitlement)
