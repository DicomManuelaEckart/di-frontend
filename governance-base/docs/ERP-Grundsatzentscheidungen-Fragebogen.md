# ERP-System Grundsatzentscheidungen

> **Zweck:** Dieses Dokument dient als Leitfaden für das Kickoff-Meeting mit CEO und Product Owner, um alle fundamentalen Architektur- und Business-Entscheidungen zu treffen, die nachträglich nur schwer oder gar nicht änderbar sind.

---

## Legende

| Status | Bedeutung |
|--------|-----------|
| `OFFEN` | Noch nicht entschieden |
| `IN DISKUSSION` | Wird aktuell evaluiert |
| `ENTSCHIEDEN` | Finale Entscheidung getroffen |
| `VALIDIERT` | Entscheidung wurde in Implementierung bestätigt |

| Kritikalität | Bedeutung |
|--------------|-----------|
| `KRITISCH` | Später praktisch nicht mehr änderbar |
| `HOCH` | Änderung sehr aufwändig (Monate) |
| `MITTEL` | Änderung aufwändig, aber machbar |

---

# Teil 1: Kritische Grundsatzentscheidungen (praktisch unveränderbar)

Diese Entscheidungen prägen das gesamte System. Fehler hier führen zu kompletten Rewrites oder massiven Migrationen.

---

## 1. Multi-Tenancy-Modell

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `KRITISCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 1.1 Tenant-Isolation-Modell

Welches Isolationsmodell für Mandantendaten?

- [ ] **Single-Tenant** - Ein System pro Kunde (maximale Isolation, höchste Kosten)
- [ ] **Shared DB, Shared Schema** - Eine DB, TenantID in jeder Tabelle (günstig, Datenleck-Risiko)
- [ ] **Shared DB, Separate Schema** - Eine DB, Schema pro Mandant (gute Isolation, Migrations-Komplexität)
- [x] **Database-per-Tenant** - Eigene DB pro Mandant (beste Isolation, Azure Elastic Pools senkt Kosten)
- [ ] **Hybrid** - Shared für kleine, Dedicated für Enterprise-Kunden

### 1.2 Tenant Resolution

Wie wird der aktive Mandant identifiziert?

- [x] **JWT Token-Claim** - TenantId im Access Token (sicherste Option)
- [ ] **HTTP-Header** - Custom Header (X-Tenant-Id)
- [ ] **Subdomain** - tenant.app.com
- [ ] **URL-Pfad** - /api/{tenantId}/...
- [ ] **Query-Parameter** - ?tenantId=...

### 1.3 Tenant-Filterung (Datenzugriff)

Wie wird sichergestellt, dass jede Query mandantengefiltert ist?

- [x] **EF Core Global Query Filter** - Automatisch auf alle Queries angewendet
- [ ] **Repository-Pattern** - Manuelle Filterung in Repositories
- [ ] **Middleware-basiert** - Request-Level Filterung

### 1.4 Tenant-Onboarding

Wie werden neue Mandanten provisioniert?

- [ ] **Self-Service** - Kunde registriert sich selbst
- [x] **Admin-gesteuert** - Internes Team legt Mandant an
- [ ] **Automatisiert via API** - Partner/Reseller können Mandanten anlegen

### 1.5 Weitere Fragen

- [ ] Werden wir das System als SaaS anbieten?
- [ ] Wie viele Mandanten erwarten wir in 5 Jahren? 500-600
- [ ] Gibt es Kunden, die dedizierte Infrastruktur verlangen? nein
- [ ] Müssen Daten in unterschiedlichen Azure-Regionen liegen können? nein, Europa

#### Entscheidung

> reines Cloudprodukt, 

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 2. Domain-Schnitt und Bounded Contexts (DDD)

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `KRITISCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 2.1 Initiale Bounded Contexts

Welche Domänen werden initial definiert? (Mehrfachauswahl)

- [x] **Identity / Access Management** - User, Rollen, Berechtigungen
- [x] **Master Data** - Stammdaten (Geschäftspartner, Artikel)
- [x] **Organization** - Mandantenstruktur, Companies, Kostenstellen
- [x] **Finance / Accounting** - Hauptbuch, Kreditoren, Debitoren
- [ ] **Controlling** - Kostenrechnung, Budgetierung
- [x] **Sales** - Angebote, Aufträge, CRM (light)
- [x] **Purchasing** - Anfragen, Bestellungen, Lieferanten
- [x] **Inventory / Warehouse** - Bestände, Lager, Chargen
- [ ] **Production** - Stücklisten, Fertigung
- [ ] **HR / Payroll** - Mitarbeiter, Abwesenheiten
- [x] **Document Management** - Dokumente, Vorlagen (List&Label, light)
- [x] **Audit / Compliance** - Protokollierung, Änderungshistorie
- [x] **Reporting / BI** - Berichte, Dashboards (nur rudimentär)

### 2.2 Kommunikation zwischen Bounded Contexts

- [ ] **Synchron (API-Calls)** - Direkte Service-Aufrufe
- [ ] **Asynchron (Events)** - Nur über Domain/Integration Events
- [x] **Hybrid** - Queries synchron, Commands asynchron via Events

### 2.3 Event-Strategie

- [x] **Domain Events** - Innerhalb eines BC, In-Process
- [x] **Integration Events** - Zwischen BCs, via Message Bus
- [ ] **Event Sourcing** - Alle Zustandsänderungen als Events

### 2.4 ID-Strategie für Aggregate

- [ ] **Auto-Increment (Long)** - Einfach, aber schwer zu migrieren
- [ ] **GUID** - Universell eindeutig, keine DB-Abhängigkeit
- [ ] **Sequential GUID** - Performance-optimiert für SQL Server
- [ ] **Composite Keys** - Mehrere Felder als Schlüssel
- [x] **Hybrid (GUID + Fachliche ID)** - Technische GUID als PK/FK, fachliche Composite-ID für Anzeige/Suche

> **Beispiel Hybrid:**
> ```
> Order.Id = GUID (PK, für FK-Referenzen, APIs, Events)
> Order.OrderNumber = "RE-2026-00001" (für Anzeige, Suche, Druck)
> Order.Year / Order.Type / Order.SequenceNumber (Composite für Unique Constraint)
> ```

### 2.5 Referenzen zwischen Aggregaten

- [ ] **Nur via ID** - Lose Kopplung, keine Navigation Properties zwischen BCs
- [ ] **Navigation Properties** - Direkte Objektreferenzen (nur innerhalb eines BC)

Referenzierung bei Hybrid-ID-Strategie:
- [x] **DB / Infrastructure**: Technische ID (GUID) für Foreign Keys
- [x] **Domain / Aggregates**: Fachliche ID für Domänenlogik und Value Objects

> **Beispiel:**
> ```
> // Infrastructure (DB)
> OrderLine.ProductId = GUID (FK zu Product)
> 
> // Domain (Aggregate)
> OrderLine.ProductNumber = new ArticleNumber("ART-2026-00042")
> ```

### 2.6 Ubiquitous Language

- [x] Glossar/Fachbegriffe definiert?
- [x] Code verwendet durchgängig Fachsprache (nicht technische Begriffe)?

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 3. Authentifizierung und Identity-Modell

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `KRITISCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 3.1 Identity Provider

- [ ] **Eigener STS** - IdentityServer, Duende (volle Kontrolle, Sicherheitsrisiko)
- [x] **Azure Entra ID (B2B)** - Enterprise SSO, Integration mit M365
- [ ] **Azure AD B2C** - Consumer/B2C-Szenarien
- [ ] **Keycloak** - Open Source, Self-hosted
- [ ] **Auth0** - Identity as a Service
- [ ] **Hybrid** - Entra + eigene User-DB für spezielle Fälle

### 3.2 Claims im Token

Welche Claims werden im JWT transportiert? (Mehrfachauswahl)

- [x] **sub** - User ID
- [x] **tenant_id** - Mandanten-ID
- [x] **company_id** - Firma/Buchungskreis (falls Multi-Company)
- [ ] **org_unit** - Organisationseinheit
- [x] **roles** - Rollen des Benutzers
- [ ] **permissions** - Detaillierte Berechtigungen
- [x] **user_type** - Full User / Limited User / Portal User

### 3.3 Token-Strategie

Access Token Lifetime:
- [ ] 5 Minuten
- [x] 15-30 Minuten
- [ ] 1 Stunde
- [ ] Länger

Refresh Token:
- [x] **Sliding Expiration** - Verlängert sich bei Nutzung
- [ ] **Absolute Expiration** - Festes Ablaufdatum
- [ ] **Kein Refresh Token** - Nur Access Token

### 3.4 Multi-Tenant-User

- [x] **Ja** - Ein User kann zu mehreren Mandanten gehören
- [ ] **Nein** - User ist fest einem Mandanten zugeordnet

Falls ja:
- [x] **Tenant-Wechsel zur Laufzeit** - User wählt aktiven Mandanten
- [ ] **Separater Login pro Tenant**

### 3.5 API-Authentifizierung

- [x] **OAuth 2.0 / OpenID Connect** - Standard für User-Auth
- [x] **Client Credentials** - Machine-to-Machine (M2M)
- [x] **API Keys** - Zusätzlich für einfache Integrationen
- [ ] **mTLS** - Mutual TLS für hochsichere Szenarien

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 4. Autorisierungsmodell (AuthZ)

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `KRITISCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 4.1 Autorisierungsmodell

- [ ] **Role-Based (RBAC)** - Berechtigungen über Rollen
- [ ] **Permission-Based** - Direkte Berechtigung-zu-User-Zuordnung
- [ ] **Attribute-Based (ABAC)** - Kontextabhängige Regeln
- [x] **Hybrid (RBAC + Permission-Based + feldbasiert)** - Rollen als Basis, ergänzt um feinere Permissions

### 4.2 Berechtigungsgranularität

- [x] **Feature-Level** - Modul ein/aus (z.B. "Einkauf nutzen")
- [x] **Entity-Level** - CRUD pro Entity (z.B. "Bestellungen lesen")
- [x] **Field-Level** - Einzelne Felder ausblenden (z.B. "Einkaufspreis nicht sehen")
- [x] **Row-Level** - Datensatz-spezifisch (z.B. "nur eigene Kostenstelle")

### 4.3 Berechtigungsspeicherung

- [ ] **Vollständig im Token** - Alle Permissions als Claims
- [ ] **Vollständig in DB** - Runtime-Lookup bei jedem Request
- [x] **Hybrid** - Rollen im Token, Detail-Permissions per DB-Lookup (gecached)

### 4.4 Mandanten-Hierarchie (Berechtigungsvererbung)

Welche Ebenen gibt es?
- [x] **Tenant** - Vertragsnehmer/Lizenznehmer
- [x] **Company** - Firma/Buchungskreis (rechtliche Einheit)
- [ ] **Branch/Location** - Standort
- [ ] **Department** - Abteilung
- [ ] **Cost Center** - Kostenstelle

Berechtigungsvererbung:
- [x] **Top-Down** - Höhere Ebene vererbt automatisch
- [ ] **Explizit** - Jede Ebene separat berechtigen

#### Entscheidung

> TODO: Recherchieren, wie sich das mit Tenant und Company gut realisieren lässt.

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 5. API-Kontraktstrategie

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `KRITISCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 5.1 API-Versionierung

- [x] **URL-Pfad** - /api/v1/orders, /api/v2/orders
- [ ] **HTTP-Header** - api-version: 1.0
- [ ] **Query-Parameter** - ?api-version=1.0
- [ ] **Content Negotiation** - Accept: application/vnd.company.v1+json

### 5.2 Fehlerformat

- [x] **RFC 7807 (Problem Details)** - Standardisiertes JSON-Format
- [ ] **Eigenes Format** - Custom Error Response

### 5.3 Pagination

- [ ] **Cursor-based** - Skalierbar, konsistent bei Änderungen
- [x] **Offset-based** - Einfacher, für ERP-Szenarien ausreichend (siehe ADR-07300)

### 5.4 Filtering und Sorting

- [ ] **OData** - Standard-Syntax ($filter, $orderby, $select)
- [ ] **GraphQL** - Flexible Abfragen (zusätzlich zu REST)
- [x] **Eigene Konventionen** - Kontrollierte Query-Parameter mit Whitelist (siehe ADR-07300)

### 5.5 Idempotenz

- [x] **Idempotency-Key Header** - Bei POST/PATCH für Retry-Safety
- [ ] **Keine spezielle Behandlung**

Wie werden doppelte Requests erkannt?
- [x] **Request-ID in DB speichern** - Mit TTL
- [ ] **In-Memory Cache** - Kurzfristig

### 5.6 HATEOAS

- [ ] **Ja** - Links zu verwandten Ressourcen in Responses
- [x] **Nein** - Nur Daten, keine Hypermedia-Links

### 5.7 API-Dokumentation

- [x] **OpenAPI/Swagger** - Auto-generiert aus Code
- [ ] **Manuell gepflegt**

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 6. Event-Kontrakte und Messaging

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `KRITISCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 6.1 Message Broker

- [x] **Azure Service Bus** - Enterprise-ready, Queues + Topics
- [ ] **Azure Event Grid** - Event Routing, Serverless
- [ ] **Azure Event Hubs** - High-Throughput Streaming
- [ ] **RabbitMQ** - Self-hosted, flexibel
- [ ] **Kafka** - Event Streaming, hoher Durchsatz

### 6.2 Event-Schema

- [x] **CloudEvents Standard** - CNCF-Standard, interoperabel
- [ ] **Eigenes Schema** - Anwendungsspezifisch

### 6.3 Event-Versionierung

- [x] **Schema Registry** - Zentrale Schema-Verwaltung
- [ ] **Versionsnummer im Event-Type** - OrderCreated.v1, OrderCreated.v2
- [ ] **Backward Compatible Evolution** - Nur additive Änderungen

### 6.4 Delivery-Garantien

- [x] **At-least-once** - Idempotenz im Consumer erforderlich
- [ ] **Exactly-once** - Via Transactional Outbox + Idempotenz
- [ ] **At-most-once** - Keine Retry (nur für unkritische Events)

### 6.5 Outbox-Pattern

- [x] **Ja** - Events transaktional mit Businessdaten speichern
- [ ] **Nein** - Direkt auf Message Bus publishen

Falls Outbox:
- [x] **Background Service Dispatcher** - Polling der Outbox-Tabelle
- [ ] **Change Data Capture (CDC)** - DB-Trigger-basiert

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 7. Revisionssicherheit und Datenintegrität

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `KRITISCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 7.1 Audit-Logging

- [x] **Vollständiges Audit-Log** - Jede Änderung protokolliert (Wer, Wann, Was, Vorher/Nachher)
- [ ] **Selektives Audit-Log** - Nur für kritische Entitäten

Speicherung:
- [x] **Append-only Tabellen** - Unveränderbare Protokolle
- [ ] **Temporal Tables (SQL Server)** - Automatische Historisierung
- [ ] **Event Sourcing** - Alle Änderungen als Events

### 7.2 Finanzrelevante Daten (GoBD-Konformität)

- [x] **Keine Überschreibung** - Belege niemals überschreiben, nur stornieren + neu
- [x] **Periodenabschlüsse** - Sperrmechanismus für abgeschlossene Perioden
- [x] **Unveränderbare Speicherung** - Nach Buchung keine Änderung möglich

### 7.3 Stammdaten-Historisierung

#### 7.3.1 Preisrelevante / Konditionen-Stammdaten
(Preise, Rabatte, Steuersätze, Zahlungskonditionen)

- [ ] **Validity From/To** - Gültigkeitszeitraum (empfohlen für Preislisten)
- [ ] **Snapshot-basiert** - Kopie bei Änderung
- [x] **Keine Historisierung** - Werte werden bei Belegstellung in Beleg kopiert (Denormalisierung)

#### 7.3.2 Beschreibende Stammdaten
(Artikeltext, Bezeichnungen, Adressen, Kontaktdaten)

- [ ] **Validity From/To** - Gültigkeitszeitraum
- [ ] **Snapshot-basiert** - Kopie bei Änderung
- [x] **Keine Historisierung** - Nur aktueller Stand; relevante Texte werden in Belege kopiert

> **Hinweis:** Durch Denormalisierung (Kopieren von Preis, Text, Adresse in den Beleg bei Erstellung) ist keine Stammdaten-Historisierung erforderlich. Die Belege enthalten immer die zum Zeitpunkt der Erstellung gültigen Werte.

### 7.4 Soft Delete

- [x] **Ja** - IsDeleted Flag + DeletedAt Timestamp
- [ ] **Nein** - Physische Löschung

### 7.5 Belegnummernkreise

Pro Buchungskreis/Company:
- [x] **Ja** - Separater Nummernkreis pro Company
- [ ] **Global**

Pro Belegart:
- [x] **Ja** - RE-2026-00001, BE-2026-00001, etc.
- [ ] **Einheitlich**

Lückenlose Nummerierung:
- [x] **Ja** - Pflicht für Rechnungen (GoBD)
- [ ] **Nicht erforderlich**

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 8. Internationalisierung und Lokalisierung

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `KRITISCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 8.1 Zielregionen

Architektur auslegen für:
- [ ] **DACH-only** - Deutschland, Österreich, Schweiz
- [ ] **EU-weit** - Alle EU-Mitgliedsstaaten
- [x] **Global** - Weltweiter Einsatz (Architektur-ready, Rollout phasenweise)

### 8.2 UI-Lokalisierung

- [x] **Ressourcen-Dateien** - JSON pro Sprache
- [x] **Fallback-Sprache** - Deutsch

Initiale Sprachen:
- [x] Deutsch
- [x] Englisch
- [ ] Französisch
- [ ] Weitere: _____

### 8.3 Datenbank-Lokalisierung (mehrsprachige Stammdaten)

- [ ] **Separate Übersetzungstabellen** - Article → ArticleTranslation
- [x] **JSON-Spalten** - {"de": "...", "en": "..."}
- [ ] **Keine** - Nur eine Sprache pro Mandant

### 8.4 Benutzer-Locale

Speicherung von:
- [x] **Datumsformat** - Pro User konfigurierbar
- [x] **Zahlenformat** - Pro User konfigurierbar
- [x] **Zeitzone** - Pro User konfigurierbar
- [x] **Sprache** - Pro User konfigurierbar

### 8.5 Mehrwährungsfähigkeit

- [x] **Company-Leitwährung** - Jede Company (Buchungskreis) hat eigene Bilanzwährung
- [x] **Konzern-Berichtswährung** - Optionale Währung auf Tenant-Ebene für Konsolidierung
- [x] **Transaktionswährung** - Beleg in Fremdwährung erfassen
- [x] **Wechselkurs-Management** - Kurse pflegen, historische Kurse speichern

> **Beispiel:** Tenant "Contoso Holding" hat:
> - Company "Contoso DE GmbH" → Leitwährung EUR
> - Company "Contoso CH AG" → Leitwährung CHF
> - Konzern-Berichtswährung: EUR (für konsolidierte Auswertungen)

### 8.6 Zeitzonen

- [x] **UTC-Speicherung** - Alle Timestamps in UTC in DB
- [x] **Lokale Darstellung** - Konvertierung im Frontend

### 8.7 Kulturempfindliche Operationen

- [x] **String-Vergleiche Culture-aware** - Sortierung nach Locale
- [x] **Date/Time Parsing locale-aware** - Eingabeformate pro Region

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

# Teil 2: Wichtige Architekturentscheidungen (schwer änderbar)

---

## 9. Persistenz und Datenbankstrategie

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `HOCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 9.1 Datenbank-Technologie

- [x] **Azure SQL Database** - Managed SQL Server
- [ ] **PostgreSQL** - Open Source Alternative
- [ ] **Cosmos DB** - Für spezielle Workloads (Event Store, etc.)

### 9.2 ORM und Data Access

- [x] **Entity Framework Core** - Full ORM
- [ ] **Dapper** - Micro-ORM für Performance-kritische Queries
- [x] **Hybrid** - EF Core für CRUD, Dapper für komplexe Queries

### 9.3 Migrations-Strategie

- [x] **Code-First Migrations** - Migrations aus Entity-Änderungen generieren
- [ ] **Database-First** - DB-Schema führend

Migrations pro Tenant:
- [x] **Ja** - Jede Tenant-DB wird separat migriert
- [ ] **Shared Migration** - Alle DBs gleichzeitig

Zero-Downtime Migrations:
- [x] **Ja** - Expand/Contract-Pattern, keine Breaking Changes
- [ ] **Mit Wartungsfenster**

### 9.4 Soft Deletes

- [x] **EF Core Global Query Filter** - Automatisch gelöschte ausblenden
- [ ] **Manuell im Repository**

### 9.5 Optimistic Concurrency

- [x] **RowVersion / Timestamp** - Automatische Konfliktprüfung
- [ ] **Manuell prüfen**

### 9.6 Read Replicas

- [ ] **Ja** - Separate Read-Datenbank für Queries
- [x] **Nein (initial)** - Später bei Bedarf

> **Was ist ein Read Replica?**
> 
> Ein Read Replica ist eine **1:1-Kopie der Produktiv-Datenbank**, die automatisch synchronisiert wird (meist mit Sekunden Verzögerung). Es ist **kein Data Warehouse**, sondern hat das gleiche Schema wie die Produktiv-DB.
> 
> **Vorteile:**
> - Entlastet Produktiv-DB erheblich (alle Reports laufen gegen Replica)
> - Einfach zu aktivieren (Azure SQL bietet das nativ)
> - Minimale zusätzliche Kosten (~50% der Primary DB)
> - Keine Schema-Änderungen oder ETL-Prozesse nötig
> - Daten fast in Echtzeit (Sekunden Verzögerung)
> 
> **Wann aktivieren?**
> - Bei Performance-Problemen durch viele gleichzeitige Reports
> - Wenn Query-Last > 30% der DB-Kapazität
> - Typischerweise ab 50+ aktiven Usern oder bei häufigen komplexen Reports
> 
> **Azure SQL Geo-Replication:**
> - Primary DB (Read-Write) → Produktiv
> - Secondary DB (Read-Only) → Reports
> - Connection String einfach umschalten im Code

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 10. Architekturschichten und Clean Architecture

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `HOCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 10.1 Deployment-Modell

- [ ] **Monolith** - Eine Deployment-Einheit
- [x] **Modularer Monolith** - Ein Deployment, strikte Bounded Contexts
- [ ] **Microservices** - Separate Services pro BC

### 10.2 Schichtentrennung

- [x] **Domain Layer** - Entities, Value Objects, Domain Events, Domain Services
- [x] **Application Layer** - Use Cases, Commands, Queries, DTOs
- [x] **Infrastructure Layer** - Persistence, External Services, Messaging
- [x] **Presentation Layer** - API Controllers, Middleware

### 10.3 CQRS (Command Query Responsibility Segregation)

- [x] **Ja** - Strikte Trennung Commands/Queries
- [ ] **Nein** - Unified Model

Falls ja:
- [ ] **Separate Read-Models** - Eigene Projektionen für Queries
- [x] **Shared Model** - Gleiche Entities, unterschiedliche Zugriffspfade

### 10.4 MediatR für Commands/Queries

- [x] **Ja** - Lose Kopplung, Pipeline Behaviors
- [ ] **Nein** - Direkte Service-Aufrufe

### 10.5 ArchTests (Architektur-Tests)

- [x] **Ja** - Automatisierte Tests für Schicht-Abhängigkeiten
- [ ] **Nein**

CI-Integration:
- [x] **Build bricht ab bei Verletzung**
- [ ] **Nur Warnung**

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 11. Hosting und Deployment

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `HOCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 11.1 Compute-Plattform

- [x] **Azure App Service** - PaaS, einfach
- [x] **Azure Container Apps** - Serverless Container, auto-scaling
- [ ] **Azure Kubernetes (AKS)** - Volle Kontrolle
- [ ] **Azure Functions** - Serverless Functions

### 11.2 Deployment-Strategie

- [x] **Blue/Green** - Zero-Downtime, schnelles Rollback
- [ ] **Canary** - Schrittweises Rollout
- [ ] **Rolling Update** - Pods nacheinander ersetzen

### 11.3 Environments

- [x] **Development** - Auto-Deploy bei Commit
- [x] **Test/QA** - Auto-Deploy bei PR-Merge
- [ ] **Staging** - Pre-Production, manueller Trigger
- [x] **Production** - Geplanter Release

### 11.4 Infrastructure as Code

- [ ] **Bicep** - Azure-native, einfacher als ARM
- [x] **Terraform** - Multi-Cloud
- [ ] **Pulumi** - Programmierbare IaC

### 11.5 Feature Flags

- [x] **Azure App Configuration** - Native Azure-Integration
- [ ] **LaunchDarkly** - Feature-Management-Plattform
- [ ] **Unleash** - Open Source

Tenant-basierte Flags:
- [x] **Ja** - Features pro Mandant aktivierbar
- [ ] **Nein**

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 12. Logging, Monitoring und Observability

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `HOCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 12.1 Logging-Framework

- [x] **Serilog** - Structured Logging, flexibel
- [ ] **Microsoft.Extensions.Logging** - Standard .NET Logging
- [ ] **NLog**

### 12.2 Log-Aggregation

- [x] **Azure Log Analytics** - Zentrale Auswertung
- [ ] **Elasticsearch/Kibana** - Self-hosted
- [ ] **Seq** - Structured Log Server

### 12.3 Telemetrie

- [x] **Azure Application Insights** - APM, Traces, Metrics
- [x] **OpenTelemetry** - Vendor-agnostic, Standardisierung
- [ ] **Jaeger** - Distributed Tracing

### 12.4 Korrelation

Standard-IDs in jedem Log/Request:
- [x] **Correlation ID** - Request-übergreifende Nachverfolgung
- [x] **Tenant ID** - Mandant identifizieren
- [x] **User ID** - Benutzer identifizieren

### 12.5 Dashboards und Alerts

- [x] **Azure Monitor Dashboards** - Native Integration
- [ ] **Grafana** - Flexibel, Multi-Source
- [x] **Automatische Alerts** - Bei Fehlern, Performance-Problemen

### 12.6 Error Handling

- [x] **Zentrale Exception Middleware** - Einheitliche Fehlerbehandlung
- [x] **RFC 7807 Problem Details** - Standardisierte Error-Responses
- [ ] **Sentry/Raygun** - Error Tracking Service

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 13. Caching und Performance

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `HOCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 13.1 Caching-Technologie

- [x] **Azure Cache for Redis** - Distributed Cache
- [ ] **In-Memory Cache** - Nur für einzelne Instanzen
- [x] **Hybrid** - In-Memory für Hot Data, Redis für Shared State

### 13.2 Cache-Strategie

- [x] **Per Tenant isoliert** - Cache-Keys enthalten TenantId
- [ ] **Global** - Shared Cache

Cache Invalidation:
- [x] **TTL-basiert** - Automatisches Ablaufen
- [x] **Event-basiert** - Invalidierung bei Datenänderung

### 13.3 Session Management

- [x] **Stateless Backend** - Keine Server-Session
- [ ] **Redis Session Store** - Distributed Sessions

### 13.4 Query Performance

- [x] **Indexing-Strategie** - Wichtige Queries analyzed, Indexes geplant
- [x] **N+1 Query Prevention** - Eager Loading, Projections
- [ ] **Read Replicas** - Separate DB für Queries

### 13.5 Background Jobs

- [x] **Azure Functions** - Serverless, Event-driven
- [ ] **Hangfire** - In-Process Job Scheduler
- [x] **Hosted Services** - Für Outbox Dispatcher etc.

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 14. Dokumenten- und Dateimanagement

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `HOCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 14.1 Storage-Technologie

- [x] **Azure Blob Storage** - Günstig, skalierbar
- [ ] **Azure Files** - SMB-Shares (Legacy)
- [ ] **SharePoint** - Collaboration-Features

### 14.2 Mandantentrennung

- [x] **Container per Tenant** - Strikte Isolation
- [ ] **Virtuelle Ordner** - Pfad-basierte Trennung
- [ ] **Präfix-basiert** - TenantId im Blob-Namen

### 14.3 Versionierung

- [x] **Azure Blob Versioning** - Native Unterstützung aktiviert
- [ ] **Eigene Versionsverwaltung** - Separate Metadaten-Tabelle

### 14.4 Zugriffskontrolle

- [x] **SAS Tokens** - Zeitlich begrenzte, signierte URLs
- [x] **Proxy durch Backend** - Keine direkten Blob-URLs
- [ ] **Managed Identity** - Nur für Backend-Zugriff

**Hybrid-Ansatz:**

**Uploads:**
- Immer über Backend-Proxy
- Validierung (Dateityp, Größe, Malware-Scan)
- Metadaten-Erfassung und Berechtigungsprüfung
- Audit-Logging

**Downloads:**
- **Kleine Dateien (< 5 MB)**: Proxy durch Backend
  - Einfachere Handhabung
  - Vollständige Kontrolle und Logging
- **Große Dateien (≥ 5 MB)**: SAS Token nach Berechtigungsprüfung
  - Backend prüft Permission-basierte Berechtigung
  - Generiert zeitlich begrenzte SAS-URL (TTL: 5-15 Minuten)
  - Client lädt direkt von Blob Storage (entlastet Backend)
  - Optional: IP-Binding falls technisch umsetzbar

**Backend-Kommunikation:**
- Backend → Blob Storage via **Managed Identity** (keine Connection Strings)

### 14.5 Metadaten

Pflichtfelder für alle Dokumente:
- [x] **Tenant ID**
- [x] **Ersteller / Erstelldatum**
- [x] **Änderungsdatum**
- [x] **Dokumenttyp / Kategorie**
- [ ] **Schlagworte / Tags**

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

# Teil 3: Fachliche Grundsatzentscheidungen (ERP-spezifisch)

---

## 15. Organisationsstruktur und Mandantenhierarchie

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `KRITISCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 15.1 Hierarchie-Ebenen

- [x] **Tenant** - Vertragsnehmer, Lizenznehmer
- [x] **Company** - Firma/Buchungskreis (rechtliche Einheit)
- [ ] **Branch/Location** - Standort
- [ ] **Department** - Abteilung
- [ ] **Cost Center** - Kostenstelle

### 15.2 Multi-Company Support

- [x] **Ja** - Mehrere Firmen (Company) pro Mandant (Tenant) (Konzernstrukturen)
- [ ] **Nein** - Ein Mandant = Eine Firma

Falls ja:
- [ ] **Company-übergreifende Transaktionen** - Intercompany-Buchungen
- [x] **Konzernkonsolidierung** - Übergreifende Auswertungen

> **Technischer Hinweis:** Für Konzernauswertungen muss der EF Core Global Query Filter für `CompanyId` temporär deaktivierbar sein (z.B. via `IgnoreQueryFilters()` oder speziellem Consolidation-DbContext).

### 15.3 Daten-Sharing zwischen Ebenen

**Stammdaten:**
- [x] **Stammdaten auf Tenant-Ebene** - Artikel, Kunden, Lieferanten (company-übergreifend nutzbar)
- [ ] **Stammdaten pro Company** - Jede Firma eigene Stammdaten

**Preise und Konditionen:**
- [x] **Tenant-Preise mit Company-Overrides** - Best-of-Both

> **Implementierung:**  
> Preise werden standardmäßig auf **Tenant-Ebene** gepflegt (zentrale Preisliste).  
> Jede Company kann diese Preise bei Bedarf **überschreiben** (Company-spezifischer Preis).  
> 
> **Vorteile:**
> - Weniger Pflegeaufwand bei einheitlichen Konzernpreisen
> - Flexibilität für Company-spezifische Konditionen (z.B. regionale Preisunterschiede)
> - Preisänderungen können zentral erfolgen, Overrides bleiben erhalten
> 
> **Technische Umsetzung:**  
> Price-Entity mit optionalem `CompanyId`:
> - `CompanyId = NULL` → Tenant-weiter Standard-Preis
> - `CompanyId = <Wert>` → Company-Override (höhere Priorität)

**Lager/Bestände:**
- [x] **Lager-Stammdaten auf Tenant-Ebene, Bestände pro Company**

> **Implementierung:**  
> **Lager-Stammdaten** (Lagerorte, Lagerplätze, Konfiguration) werden auf **Tenant-Ebene** gepflegt.  
> **Lagerbestände** sind **company-spezifisch** (jede Company verwaltet eigene Bestände im jeweiligen Lager).
> 
> **Vorteile:**
> - Zentrale Lagerverwaltung (einmalige Pflege der Lagerorte)
> - Companies können gemeinsame Lager nutzen (z.B. Konzern-Zentrallager)
> - Bestände bleiben trotzdem sauber getrennt (Bilanzierung pro Company)
> 
> **Technische Umsetzung:**  
> - `Warehouse`-Entity: Keine `CompanyId` (Tenant-weit)
> - `StockLevel`-Entity: Mit `CompanyId` (Company-spezifisch)
> - Eine Company kann Bestände in mehreren Lagern führen

> **Technische Umsetzung – CompanyId-Filterung:**
> 
> | Daten-Ebene | CompanyId in Tabelle? | Beispiele |
> |-------------|----------------------|-----------|
> | **Tenant-weit** | ❌ Nein | Artikel, Kunden, Lieferanten, Artikelgruppen, User |
> | **Company-spezifisch** | ✅ Ja (EF Core Global Query Filter) | Belege, Buchungen, Konten, Nummernkreise, Preise, Lager |
> 
> Entities mit `CompanyId` implementieren `ICompanyScoped` und werden automatisch gefiltert.

### 15.4 Rechtliche Einheiten

- [x] **Steuernummer pro Company** - Pflicht
- [x] **Währung pro Company** - Firmenleitwährung
- [x] **Kontenplan: Tenant-weit mit Company-spezifischen Konten**

> **Implementierung:**  
> Der **Kontenrahmen** (Chart of Accounts) wird auf **Tenant-Ebene** verwaltet.  
> Jede Company kann **zusätzliche, eigene Konten** ergänzen oder Standard-Konten für ihre Company spezifisch konfigurieren.
> 
> **Vorteile:**
> - Einheitlicher Kontenrahmen über alle Companies (erleichtert Konsolidierung)
> - Flexibilität für Company-spezifische Anforderungen (z.B. länderspezifische Konten)
> - Zentrale Pflege des Standard-Kontenrahmens
> - Konsistente Berichterstattung auf Konzern-Ebene
> 
> **Technische Umsetzung:**  
> `Account`-Entity mit optionalem `CompanyId`:
> - `CompanyId = NULL` → Konzern-Standard-Konto (für alle Companies verfügbar)
> - `CompanyId = <Wert>` → Company-spezifisches Konto
> 
> **Beispiel:**
> ```
> Account { Id = 1, Number = "1000", Name = "Bank", CompanyId = NULL }           // Alle Companies
> Account { Id = 2, Number = "1001", Name = "Bank EUR", CompanyId = DE-ID }      // Nur DE GmbH
> Account { Id = 3, Number = "1001", Name = "Bank CHF", CompanyId = CH-ID }      // Nur CH AG
> Account { Id = 4, Number = "1200", Name = "Forderungen", CompanyId = NULL }    // Alle Companies
> ```
> 
> Bei Auswahl des Kontenplans für eine Company werden automatisch gefiltert:
> - Alle Konten mit `CompanyId = NULL` (Konzern-Standard)
> - Plus alle Konten mit `CompanyId = <aktuelle Company>`

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 16. Finanz- und Rechnungswesen

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `KRITISCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 16.1 Kontenrahmen

- [x] **Vordefinierte Kontenrahmen** - SKR03, SKR04 als Templates
- [x] **Frei definierbar** - Mandant kann eigenen Kontenrahmen anlegen
- [ ] **Nur Standard** - Keine individuellen Anpassungen

### 16.2 Buchungslogik

- [x] **Doppelte Buchführung** - Soll an Haben
- [x] **Automatische Gegenbuchungen** - System generiert Gegenkonto

### 16.3 Periodenabschlüsse

- [x] **Monatsabschluss** - Sperre für abgeschlossene Monate
- [x] **Jahresabschluss** - Sperre für abgeschlossene Jahre
- [x] **Nachbuchungsperiode** - Temporäre Öffnung mit Berechtigung

### 16.4 Steuerverwaltung

- [x] **Mehrwertsteuerverwaltung** - Steuersätze pflegen
- [x] **Länderspezifische Steuerregeln** - Steuerlogik pro Land
- [x] **Automatische Steuerberechnung** - Basierend auf Artikel/Kunde/Land

### 16.5 Zahlungsverkehr

- [x] **SEPA-Integration** - SEPA-Lastschriften, SEPA-Überweisungen
- [x] **CAMT-Import** - Elektronische Kontoauszüge
- [ ] **EBICS/HBCI** - Banking-Anbindung (online)
- [x] **Offene Posten** - OP-Verwaltung
- [x] **Mahnwesen** - Automatische Mahnläufe

### 16.6 Schnittstellen

- [x] **DATEV-Export** - Buchungsexport für Steuerberater
- [x] **E-Rechnung** - ZUGFeRD, XRechnung

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 17. Workflows und Genehmigungen

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `HOCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 17.1 Workflow-Engine

- [x] **Eigene Implementierung** - State Machine Pattern, flexibel
- [ ] **Azure Logic Apps** - Low-Code, Microsoft-Integration
- [ ] **Externe Engine** - Camunda, Elsa Workflows

### 17.2 Genehmigungsprozesse

- [x] **Mehrstufige Freigaben** - Mehrere Genehmigungsebenen
- [x] **Stellvertreterregelungen** - Vertretung bei Abwesenheit
- [x] **Eskalationen** - Automatisch bei Timeout
- [x] **Wertgrenzen** - Freigabe ab bestimmtem Betrag

### 17.3 Workflow-Konfiguration

- [x] **Pro Mandant konfigurierbar** - Eigene Workflows pro Kunde
- [ ] **Global vordefiniert** - Gleicher Prozess für alle

> **Flexibilität für unterschiedliche Kundengrößen:**
> 
> **Kleine Mandanten:**
> - Workflow-System kann **komplett deaktiviert** werden
> - Belege werden direkt freigegeben (ohne Genehmigungsschritt)
> - Reduziert Komplexität und vereinfacht Bedienung
> - Feature-Flag: `WorkflowsEnabled = false`
> 
> **Große Mandanten:**
> - Mehrstufige Workflows mit komplexen Regeln
> - Wertgrenzen, Eskalationen, Stellvertreter
> - Unterschiedliche Workflows pro Belegart
> - Unterschiedliche Workflows pro Company
> 
> **Technische Umsetzung:**
> - `Tenant.WorkflowsEnabled` (Boolean)
> - Falls deaktiviert: Workflow-Middleware überspringt Genehmigungsprüfung
> - Belegstatus springt automatisch von `Draft` → `Approved`

### 17.4 Benachrichtigungen

- [x] **E-Mail** - Bei Genehmigungsanfragen
- [x] **In-App Notifications** - Bell-Icon im Frontend
- [ ] **Push Notifications** - Mobile App
- [ ] **Teams/Slack Integration**

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 18. Reporting und Business Intelligence

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `HOCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 18.1 Reporting-Strategie

**Phasen-Ansatz (evolutionär):**

**Phase 1 - OLTP Only (MVP):**
- [x] **Alle Reports direkt aus Produktiv-DB**
- Einfach, keine zusätzliche Infrastruktur
- Ausreichend für kleine bis mittlere Mandanten
- Performance-Risiko bei vielen gleichzeitigen Reports

**Phase 2 - Read Replica (Performance-Optimierung):**
- [x] **Read Replica aktivieren bei Bedarf**
- 1:1-Kopie der Produktiv-DB, automatisch synchronisiert
- Reports laufen gegen Replica → Produktiv-DB entlastet
- Azure SQL Geo-Replication (Read Scale-Out)
- **Kein Data Warehouse** - gleiche Tabellenstruktur
- Kosten: ~50% zusätzlich, schnell aktivierbar

**Phase 3 - Data Warehouse (Analytics):**
- [ ] **DW für komplexe Analysen (später, optional)**
- Nur wenn Read Replica nicht mehr ausreicht
- Dediziertes Schema (Star/Snowflake), denormalisiert
- Historische Daten über Jahre, vorberechnete Kennzahlen
- ETL-Prozesse (nightly sync), Power BI Integration
- Für: Trend-Analysen, Konsolidierung, Machine Learning

> **Entscheidungsbaum:**
> 
> ```
> Reports langsam?
>   └─ Nein → Bleibe bei OLTP-only
>   └─ Ja → Read Replica aktivieren
>        └─ Noch zu langsam? → Data Warehouse erwägen
>        └─ Ausreichend schnell → Fertig
> 
> Historische Analysen über Jahre?
>   └─ Ja → Data Warehouse erforderlich
>   └─ Nein → Read Replica ausreichend
> ```
> 
> **Empfehlung:** Start mit Phase 1 (OLTP-only), Phase 2 (Read Replica) bei Performance-Problemen, Phase 3 (DW) nur bei echten Analytics-Anforderungen.

### 18.2 BI-Technologie

- [ ] **Power BI** - Microsoft-Integration, Self-Service
- [ ] **Azure Synapse** - Enterprise Analytics
- [x] **Custom Dashboards** - Im ERP integriert (Charts.js etc.)

### 18.3 Datenextraktion für BI

- [ ] **OData Endpoints** - Power BI kann direkt abfragen
- [ ] **ETL-Prozesse** - Nightly Sync ins DW
- [ ] **Change Data Capture** - Real-time Sync

### 18.4 Mandantentrennung in BI

- [ ] **Row-Level Security** - Mandantenfilter in Power BI
- [ ] **Separate Datasets pro Mandant**

### 18.5 Standard-Reports (Built-in)

- [x] **Offene Posten Liste**
- [x] **Umsatzübersicht**
- [x] **Bestandsliste**
- [ ] **Kostenstellenbericht**
- [ ] **Weitere: _____**

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

# Teil 4: Zusätzliche kritische Fragestellungen

---

## 19. Rechtliche & Compliance-Anforderungen

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `KRITISCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 19.1 Datenschutz (DSGVO)

- [x] **Auskunftsrecht** - Data Export für Betroffene
- [x] **Löschrecht** - Right to be Forgotten (Anonymisierung)
- [x] **Datenportabilität** - Export in maschinenlesbarem Format
- [x] **Privacy by Design** - Datenschutz in Architektur verankert

### 19.2 Datenresidenz

- [x] **EU-only** - Daten nur in EU-Rechenzentren
- [ ] **Mandant wählt Region** - Konfigurierbar pro Tenant
- [ ] **Global** - Keine Einschränkung

Azure-Regionen:
- [x] **West Europe (Amsterdam)**
- [x] **Germany West Central (Frankfurt)**
- [ ] **Weitere: _____**

### 19.3 Verschlüsselung

- [x] **At Rest** - Azure Storage Encryption
- [x] **In Transit** - TLS 1.3
- [ ] **Customer-managed Keys** - Kunde verwaltet eigene Schlüssel

### 19.4 Branchenspezifische Compliance

- [ ] **FDA 21 CFR Part 11** - Pharma, Medizinprodukte
- [ ] **ISO 13485** - Medizinprodukte
- [ ] **TISAX** - Automotive
- [ ] **Keine speziellen Anforderungen**

### 19.5 Zertifizierungen

- [ ] **ISO 27001** - Informationssicherheit
- [ ] **SOC 2** - Security, Availability, Confidentiality
- [ ] **Keine geplant**

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 20. Customizing und Erweiterbarkeit

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `KRITISCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 20.1 Custom Fields

- [x] **Ja** - Mandanten können eigene Felder anlegen
- [ ] **Nein** - Nur Standardfelder

**Technische Umsetzung:**
- [x] **JSON-Spalten** - Flexibel, suchbar mit SQL Server JSON-Support
- [ ] **EAV-Modell** - Entity-Attribute-Value Tabellen
- [ ] **Separate Erweiterungstabellen**

**Scope:**
- [x] **Pro Tenant mit Company-Override Option**
- [ ] **Nur pro Tenant** - Alle Companies sehen gleiche Custom Fields
- [ ] **Nur pro Company** - Jede Company völlig unabhängig

**Suchbarkeit:**
- [x] **IsSearchable Flag** - Custom Fields können für Suche/Reports aktiviert werden
- [ ] **Alle durchsuchbar** - Performance-Risiko
- [ ] **Nicht durchsuchbar** - Nur Anzeige

**Limitierungen:**
- [x] **Max. 50 Custom Fields pro Entität** - Balance zwischen Flexibilität und Performance
- [x] **Max. 2 GB JSON-Spalte** - SQL Server Limit
- [x] **Performance-Tests Pflicht** - Bei > 30 Custom Fields


### 20.2 Custom Entities

- [ ] **Ja** - Mandanten können eigene Tabellen definieren
- [ ] **Eingeschränkt** - Vordefinierte Erweiterungs-Entitäten
- [x] **Nein** - Nur Standardentitäten

### 20.3 Custom Workflows

- [ ] **Grafischer Designer** - Low-Code Workflow-Builder
- [ ] **Nur Konfiguration** - Vordefinierte Prozesse parametrisieren
- [x] **Keine** - Nur Standardworkflows

### 20.4 Custom Validations

- [x] **Regelbasiert** - Validierungsregeln per Konfiguration
- [ ] **Scripting** - JavaScript/C# Sandboxed
- [ ] **Keine** - Nur Standardvalidierungen

> **Ermöglicht:**
> 
> Mandanten können **eigene Pflichtfelder und Validierungsregeln** für Standard-Felder und Custom Fields (20.1) definieren - pro Tenant oder Company-spezifisch.
> 
> **Beispiele:**
> - Medizintechnik: "CE-Zertifizierungsnummer" = Pflichtfeld mit Format-Prüfung
> - Chemie: "UN-Nummer" = Pflichtfeld für Gefahrstoffe
> - Lebensmittel: "Allergene" = Pflichtfeld, "Bio-Zertifikat" für Bio-Artikel
> - Automotive: "TISAX Assessment Level" = Pflichtfeld für Lieferanten
> 
> **Vorteile:** Branchenspezifische Anforderungen ohne Code-Änderung abbildbar, Company-Overrides möglich (z.B. DE braucht CE-Kennzeichen, CH nicht).

### 20.5 Integrations-API

- [x] **REST API** - Vollständige CRUD-API für alle Entitäten
- [x] **Webhooks** - Event-basierte Benachrichtigungen
- [ ] **SDK/Client Libraries** - .NET, TypeScript SDKs
- [ ] **SOAP** - Legacy-Unterstützung

### 20.6 Plugin-Architektur

- [ ] **Ja** - Kunden/Partner können Plugins entwickeln
- [ ] **Eingeschränkt** - Erweiterungspunkte (Extension Points) definiert
- [x] **Nein** - Nur Core-Entwicklung

### 20.7 Marketplace

- [ ] **Ja** - Marketplace für Erweiterungen geplant
- [ ] **Später** - Architektur vorbereiten, Marketplace später
- [x] **Nein**

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 21. Lizenzierung und Abrechnung

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `HOCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 21.1 Lizenzmodell

- [x] **Named User** - Lizenz pro benanntem Benutzer
- [ ] **Concurrent User** - Lizenz pro gleichzeitigem Benutzer
- [x] **Modul-basiert** - Zusätzliche Kosten pro Modul
- [x] **Transaktions-basiert** - Pay-per-Use
- [ ] **Flat Fee** - Pauschale pro Mandant

> **Hybrid-Modell:**
> 
> **Basis-Lizenzierung: Named User + Module**
> - Grundlizenz pro benanntem Benutzer (Full/Limited/Portal User)
> - Module buchbar als Add-ons (z.B. Lagerverwaltung, Produktion, CRM)
> - Kalkulierbare Kosten für Standard-Nutzung
> 
> **Transaktionsbasiert (Pay-per-Use) für spezielle Funktionen:**
> - **Zahlungsverkehr:** Pro SEPA-Lastschrift/Überweisung, CAMT-Import
> - **EDI/Schnittstellen:** Pro verarbeitetem EDI-Dokument (ORDERS, DESADV, INVOIC)
> - **Externe APIs:** Pro API-Call zu Drittsystemen (DATEV-Export, E-Rechnung-Versand)
> - **Datenvolumen:** Bei File-Transfer, Blob Storage über Inklusivkontingent hinaus
> - **Document-Services:** OCR-Verarbeitung, PDF-Generierung (hochvolumig)
> 
> **Vorteile:**
> - **Faire Abrechnung:** Kleine Mandanten zahlen weniger (wenig Transaktionen)
> - **Skalierbar:** Kosten wachsen proportional zur Nutzung
> - **Transparenz:** Klare Kostenverursacher erkennbar
> 
> **Beispiel-Kalkulation:**
> - 10 Full User à €50/Monat = €500
> - Modul Warehouse Management = €200
> - 500 SEPA-Transaktionen à €0,05 = €25
> - 200 EDI-Dokumente à €0,10 = €20
> - **Total: €745/Monat**

### 21.2 User-Typen

- [x] **Full User** - Vollzugriff auf alle Module und Funktionen
- [x] **Limited User** - Eingeschränkte Funktionen (günstiger)
  - Z.B. nur Zeiterfassung, nur Bestellfreigaben, nur Lesezugriff
- [x] **Portal User** - Nur Self-Service (sehr günstig / kostenlos)
  - Externe Nutzer: Lieferanten, Kunden
  - Self-Service: Bestellungen einsehen, Rechnungen herunterladen, Lieferscheine bestätigen
- [x] **Device User** - Lizenz pro Gerät (POS, Mobile)
  - Point-of-Sale (Kassen-Terminals)
  - Mobile Geräte (Lager-Scanner, Servicetechniker-Tablets)
  - Mehrere Personen können dasselbe Gerät nutzen
  - Geräte-basierte Authentifizierung + optionale Benutzer-PIN

> **Beispiel-Preisgestaltung:**
> - **Full User:** €50/Monat - Vollzugriff für Office-Mitarbeiter
> - **Limited User:** €15-30/Monat - Je nach Funktionsumfang
> - **Portal User:** €0-5/Monat - Externe Nutzer
> - **Device User:** €20/Monat - Pro Gerät (unbegrenzt Nutzer am Gerät)

### 21.3 Feature-Entitlement

- [x] **Feature Flags** - Module über Feature Flags aktivieren
- [ ] **Lizenzschlüssel** - Klassische Lizenzdateien

### 21.4 Metering und Usage Tracking

Was wird gezählt?
- [x] **Aktive User** - Monatlich aktive Benutzer
- [x] **Storage** - Genutzter Speicherplatz
- [x] **API Calls** - Anzahl API-Aufrufe
- [x] **Transaktionen** - Anzahl Belege etc.

### 21.5 Deployment-Optionen

- [x] **SaaS (Shared)** - Multi-Tenant, wir betreiben
- [x] **SaaS (Dedicated)** - Single-Tenant, wir betreiben (Aufpreis)
- [ ] **Private Cloud** - Kunde betreibt in seiner Cloud
- [ ] **On-Premise** - Kunde betreibt lokal

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 22. Agenten-basierte Entwicklung

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `MITTEL` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 22.1 Basis-LLM

- [x] **Claude (Anthropic)** - Starke Code-Generierung
- [ ] **GPT-4 (OpenAI)** - Breit einsetzbar
- [ ] **Codestral (Mistral)** - Code-spezialisiert
- [ ] **Gemini (Google)** - Alternative
- [x] **Mix** - Verschiedene Modelle für verschiedene Tasks
″
### 22.2 Agent-Typen im Einsatz

- [x] **Code Agent** - Implementiert Features
- [x] **Review Agent** - Prüft Code
- [x] **Test Agent** - Generiert Tests
- [x] **Documentation Agent** - Erstellt Dokumentation
- [ ] **Migration Agent** - Datenmigration
- [ ] **Ops Agent** - Incident-Analyse

### 22.3 Governance für Agent-Code

- [x] **Menschliches Review Pflicht** - Jeder Agent-Code wird gereviewed
- [x] **ArchTests als Gate** - Architektur-Compliance automatisch geprüft
- [x] **Security-Scan vor Merge** - Keine Secrets, keine Vulnerabilities
- [ ] **Agent-Code markiert** - Kennzeichnung im Commit

### 22.4 Repository-Zugriff

- [ ] **Direkter Push-Zugriff** - Agent kann direkt committen
- [x] **Nur via PR** - Agent erstellt Pull Requests
- [x] **Branch-Protection** - Main/Production geschützt

### 22.5 Budget

- [ ] **Unbegrenzt** - Keine API-Limits
- [x] **Budget pro Monat** - Festgelegtes Limit
- [ ] **Budget pro Projekt** - Projektbasiert

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 23. UX und Frontend

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `MITTEL` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 23.1 Frontend-Framework

**Entscheidung: Angular vs. Blazor**

| Kriterium | Angular | Blazor (WebAssembly) | Blazor (Server) |
|-----------|---------|----------------------|-----------------|
| **Sprache** | TypeScript | C# | C# |
| **Performance** | ⭐⭐⭐⭐ Native Browser | ⭐⭐⭐ WASM (Größere Initial Load) | ⭐⭐⭐⭐ Server-rendered |
| **Offline-Fähigkeit** | ⭐⭐⭐⭐ PWA möglich | ⭐⭐⭐⭐ PWA möglich | ❌ Server-abhängig |
| **Code-Sharing Backend** | ❌ Nein | ⭐⭐⭐⭐⭐ Vollständig C# | ⭐⭐⭐⭐⭐ Vollständig C# |
| **Ökosystem/Reife** | ⭐⭐⭐⭐⭐ Sehr ausgereift | ⭐⭐⭐ Wachsend | ⭐⭐⭐⭐ Stabil |
| **Entwickler-Verfügbarkeit** | ⭐⭐⭐⭐⭐ Sehr hoch | ⭐⭐ Noch wenig | ⭐⭐ Noch wenig |
| **Bundle-Größe** | ⭐⭐⭐⭐ ~200-500 KB | ⭐⭐ ~2-3 MB Initial | ⭐⭐⭐⭐⭐ Minimal (Server-Side) |
| **SEO** | ⭐⭐⭐ SSR möglich | ⭐⭐⭐ Pre-rendering | ⭐⭐⭐⭐⭐ Server-rendered |
| **Debugging** | ⭐⭐⭐⭐ Browser DevTools | ⭐⭐⭐ WASM Debugging | ⭐⭐⭐⭐ Visual Studio |
| **Hot Reload** | ⭐⭐⭐⭐⭐ Sehr gut | ⭐⭐⭐⭐ Gut | ⭐⭐⭐⭐⭐ Sehr gut |
| **Skalierbarkeit** | ⭐⭐⭐⭐⭐ Client-Side | ⭐⭐⭐⭐⭐ Client-Side | ⭐⭐ Server-Ressourcen pro User |
| **Infragistics Support** | ⭐⭐⭐⭐⭐ Ignite UI | ⭐⭐⭐⭐⭐ Ignite UI for Blazor | ⭐⭐⭐⭐⭐ Ignite UI for Blazor |

**Empfehlung für ERP-System:**

- [x] **Angular** - Bewährte Enterprise-Technologie
  - Sehr ausgereiftes Ökosystem
  - Große Entwickler-Verfügbarkeit
  - Exzellente Performance (Client-Side)
  - Infragistics Ignite UI for Angular sehr ausgereift
  - Klare Trennung Frontend/Backend (API-First)
  - Bessere Skalierbarkeit (Client-Side Rendering)
  - Geringere Einstiegshürde für Frontend-Entwickler

- [ ] **Blazor WebAssembly** - Moderner C#-basierter Ansatz
  - Code-Sharing zwischen Backend und Frontend (DTOs, Validation)
  - Nur ein Team-Skillset (C#)
  - Größere Initial Load Time (kritisch für ERP)
  - Noch wachsendes Ökosystem
  - Weniger Entwickler am Markt

- [ ] **Blazor Server** - Für kleine Deployments
  - Nicht geeignet für Multi-Tenant SaaS (Server-Ressourcen pro User)
  - Keine Offline-Fähigkeit
  - Latenz bei langsamer Verbindung

> **Fazit:**  
> Für ein **Enterprise-SaaS-ERP mit hohen Performance-Anforderungen** ist **Angular die sicherere Wahl**:
> - Bewährte Technologie mit großem Talent-Pool
> - Bessere Client-Side Performance und Skalierbarkeit
> - Infragistics Ignite UI for Angular ist sehr ausgereift
> - Klare API-Architektur (kann später auch von Mobile Apps genutzt werden)
> 
> **Blazor WASM** wäre interessant für:
> - Interne Anwendungen mit wenigen Power-Usern
> - Teams mit reinem .NET-Fokus
> - Wenn Code-Sharing (DTOs, Validierung) Priorität hat
> 
> **Für MVP:** Angular + Infragistics Ignite UI

### 23.2 Component Library

- [ ] **Angular Material** - Basis-Design-System
- [ ] **PrimeNG** - Enterprise-Components
- [ ] **Custom-only** - Komplett eigene Components
- [x] **Infragistics Ignite UI for Angular** - Enterprise-Grade Components
  - Data Grid mit Virtualisierung, Filtering, Grouping
  - Charts, Pivots, Excel Export
  - Enterprise-Support
  - Kommerziell lizenziert

### 23.2 Responsive Design

- [x] **Desktop-first** - Optimiert für Desktop, funktioniert auf Tablets
- [ ] **Mobile-first** - Optimiert für Mobile
- [ ] **Adaptive** - Separate Versionen

### 23.3 Theming

- [x] **Mandanten-Branding** - Logo, Farben pro Tenant/Company
- [ ] **User-Themes** - Benutzer wählt Theme
- [ ] **Standard-only** - Ein einheitliches Design

### 23.4 Accessibility

- [x] **WCAG 2.1 Level AA** - Ziel
- [ ] **WCAG 2.1 Level AAA** - Höchste Stufe
- [x] **Keyboard Navigation** - Pflicht
- [x] **Screen Reader Support** - Pflicht

### 23.5 Offline-Fähigkeit

- [x] **Online-only** - Initial keine Offline-Funktion
- [ ] **Offline-read** - Lesezugriff offline (PWA)
- [ ] **Offline-write** - Vollständig offline mit Sync

### 23.6 Mobile

- [x] **Responsive Web** - Funktioniert auf allen Geräten
- [ ] **PWA** - Installierbar als App
- [ ] **Native App** - iOS/Android

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 24. Migration und Go-Live

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `HOCH` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 24.1 Migrationsstrategie

- [ ] **Big Bang** - Kompletter Umstieg an einem Tag
- [ ] **Parallel Run** - Beide Systeme parallel
- [x] **Pilot + Phased** - Test-Company → Prod-Company

> **Migrationsprozess: Test-Company → Prod-Company**
> 
> **Konzept:**  
> Jeder Mandant erhält zuerst eine **Test-Company**, um das System kennenzulernen und mit migrierten Daten zu experimentieren. Nach erfolgreicher Testphase wird eine **Prod-Company** mit den Stammdaten erstellt.
> 
> **Phase 1: Test-Company (4-6 Wochen)**
> - Stammdaten und Bewegungsdaten (12-24 Monate) migrieren
> - Kunde testet Geschäftsprozesse und Workflows
> - Schulungen durchführen
> - Anpassungen vornehmen
> 
> **Phase 2: Go-Live**
> - Prod-Company anlegen (gleicher Tenant)
> - Stammdaten aus Test-Company kopieren
> - **Keine Bewegungsdaten** übernehmen (sauberer Start)
> - Anfangsbestände manuell buchen (Offene Posten, Lager, Bank)
> - Altsystem stilllegen
> 
> **Phase 3: Hypercare (4 Wochen)**
> - Intensive Betreuung nach Go-Live
> - Test-Company bleibt als Sandbox verfügbar
> 
> **Vorteile:**
> - ✅ Test-Company bleibt dauerhaft für Schulungen und Tests
> - ✅ Sauberer Produktivstart ohne Test-Altlasten
> - ✅ Geringeres Risiko durch schrittweise Einführung
> - ✅ User können in beiden Companies arbeiten (Dropdown im UI)

### 24.2 Datenimport

- [x] **Standardisierte Import-Schnittstellen** - CSV, Excel Templates
- [x] **Validierung und Fehlerbehebung** - Prüfung vor Import
- [ ] **Mapping-Tool** - Grafisches Mapping von Fremddaten

> **Migrationsautomatisierung für eigene Legacy-Systeme**
> 
> **Vision:**  
> Für unsere eigenen Legacy-Systeme (**gesoft, terra, bsi, dicommerce**) wird ein **Ein-Klick-Migrationsmechanismus** entwickelt. Da wir beide Systeme (Legacy + Neues ERP) genau kennen, kann die Migration weitgehend automatisiert werden.
> 
> **Vorteile:**
> - ✅ **Minimale Migrationszeit** für Bestandskunden (Stunden statt Tage/Wochen)
> - ✅ **Fehlerminimierung** durch automatisierte Validierung
> - ✅ **Wiederholbar** - Test-Migration kann beliebig oft durchgeführt werden
> - ✅ **Konsistente Qualität** - Gleicher Prozess für alle Kunden
> 
> **Ablauf:**
> 
> 1. **Systemverbindung herstellen** (Legacy-System → Migrations-Service)
>    - Read-Only Zugriff auf Legacy-Datenbank
>    - Oder Export-API des Legacy-Systems
> 
> 2. **"Migrate"-Button** im neuen ERP-System
>    - Admin wählt Legacy-System (gesoft/terra/bsi/dicommerce)
>    - Kunde wird automatisch erkannt (über Mandantennummer/Stammdaten)
>    - Ziel: Test-Company
> 
> 3. **Automatischer Datenabgleich**
>    - DDD-basiertes Mapping (Domain-Modell → Domain-Modell)
>    - Artikel, Kunden, Lieferanten, Kontenrahmen
>    - Bewegungsdaten (optional: letzte 12 Monate)
>    - Offene Posten, Lagerbestände
> 
> 4. **Validierung & Reporting**
>    - Automatische Prüfung auf Vollständigkeit
>    - Delta-Report: "Was wurde migriert? Was fehlt?"
>    - Warnungen bei Datenqualitätsproblemen
> 
> 5. **Kunde prüft Test-Company**
>    - Kunde kann migrierte Daten validieren
>    - Bei Bedarf: Migration zurücksetzen und neu starten
> 
> 6. **Go-Live** (siehe 24.1)
>    - Test-Company → Prod-Company (Stammdaten-Copy)
> 
> **DDD-basierter Migrations-Mechanismus:**
> 
> Da beide Systeme auf gleichen fachlichen Konzepten basieren (Bounded Contexts, Aggregates, Entities), kann die Migration **domänengetrieben** erfolgen:
> 
> - **Artikel-Aggregate** aus Legacy-System → Artikel-Aggregate im neuen System
> - **Kunden-Aggregate** aus Legacy → Neues System
> - **Belege** (Rechnungen, Aufträge) → Neues Belegformat
> 
> Unterschiede in der Implementierung werden durch **Anti-Corruption Layer** ausgeglichen.
> 
> **Entwicklungsaufwand pro Legacy-System:**
> - Initial: ~2-3 Wochen pro System (Mapping + Tests)
> - Wartung: Minimal (bei Änderungen am Legacy-System)
> 
> **Für Fremd-Systeme (z.B. Lexware, DATEV):**
> - Standardisierte CSV/Excel-Import-Templates
> - Manuelles Mapping erforderlich (siehe oben)

### 24.3 Historische Daten

Wie viel Historie migrieren?
- [ ] **Keine** - Nur offene Posten / aktuelle Stammdaten
- [x] **1-2 Jahre** - Wichtige Historie (empfohlen für Migration)
- [ ] **Vollständig** - Alle historischen Daten

> **DSGVO-konforme Archivierung**
> 
> **Aufbewahrungsfristen:**
> - Steuerrelevante Belege: **10 Jahre** (GoBD)
> - Personenbezogene Daten: **3 Jahre** nach Geschäftsbeziehungsende (DSGVO)
> 
> **Verdichtungsstrategie:**
> - **0-2 Jahre:** Volle Detaildaten in Produktiv-DB
> - **3-10 Jahre:** Verdichtete Daten im Archiv (Azure Blob Storage Cool Tier)
>   - Belegköpfe und PDF-Dokumente bleiben erhalten
>   - Detail-Positionen werden entfernt
>   - Buchungssätze für Jahresabschluss bleiben
> - **> 10 Jahre:** Automatische Löschung (DSGVO-Löschpflicht)
> 
> **Vorteile:**
> - Rechtssicher (GoBD + DSGVO-konform)
> - Performance (Produktiv-DB bleibt schlank)
> - Kostenoptimiert (Archiv in günstigem Cool Tier Storage)

### 24.4 Altsysteme

- [ ] Welche Systeme werden abgelöst? _____
- [ ] Gibt es Schnittstellen zu beachten?

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

## 25. Support und Betrieb

| Feld | Wert |
|------|------|
| **Status** | `OFFEN` |
| **Kritikalität** | `MITTEL` |
| **Verantwortlich** | - |
| **Entscheidungsdatum** | - |

### 25.1 Support-Modell

- [x] **Level 1** - Helpdesk (First Contact)
- [x] **Level 2** - Consultants (Fachliche Analyse)
- [x] **Level 3** - Development (Bugfixing)

### 25.2 Support-Zeiten

- [ ] **24/7** - Rund um die Uhr
- [x] **Business Hours** - Mo-Fr 8-18 Uhr
- [ ] **Mit Bereitschaft** - Basis + Notfall-Hotline

### 25.3 SLA-Ziele

| Severity | Reaktionszeit | Lösungszeit |
|----------|---------------|-------------|
| Critical | 30 min | 4h |
| High | 2h | 1 Tag |
| Medium | 8h | 3 Tage |
| Low | 2 Tage | 10 Tage |

### 25.4 Wartung

- [x] **Geplante Wartungsfenster** - Sonntag Nacht
- [x] **Zero-Downtime Updates** - Ziel

### 25.5 Schulungen

- [x] **Online-Dokumentation** - Self-Service Knowledge Base
- [x] **Video-Tutorials** - Aufgezeichnete Schulungen
- [ ] **Präsenz-Schulungen** - Vor Ort
- [ ] **Webinare** - Live-Schulungen

#### Entscheidung

> *Hier Entscheidung dokumentieren...*

#### Begründung

> *Hier Begründung dokumentieren...*

---

# Zusammenfassung: Kritische Entscheidungen

Die folgenden Entscheidungen haben den größten Einfluss auf die Architektur und sind nachträglich am schwersten zu ändern:

| # | Entscheidung | Kritikalität | Empfehlung |
|---|--------------|--------------|------------|
| 1 | Multi-Tenancy Modell | `KRITISCH` | Database-per-Tenant mit Elastic Pools |
| 2 | Bounded Contexts / Domain-Schnitt | `KRITISCH` | Initial Identity, MasterData, Organization, Audit |
| 3 | Identity Provider | `KRITISCH` | Azure Entra ID (B2B) |
| 4 | Autorisierungsmodell | `KRITISCH` | Hybrid RBAC + Permission-Based |
| 5 | API-Versionierung | `KRITISCH` | URL-Pfad (/api/v1/) |
| 6 | Event-Strategie | `KRITISCH` | Service Bus + CloudEvents + Outbox |
| 7 | Revisionssicherheit | `KRITISCH` | GoBD-konform, Audit-Trail, keine Überschreibung |
| 8 | Internationalisierung | `KRITISCH` | Architektur für Global, Rollout DACH-first |
| 9 | Organisationsstruktur | `KRITISCH` | Tenant > Company > Department > Cost Center |
| 10 | Deployment-Modell | `HOCH` | Modularer Monolith mit Clean Architecture |
| 11 | Compute-Plattform | `HOCH` | Azure Container Apps |
| 12 | Customizing | `KRITISCH` | Custom Fields via JSON, Low-Code Workflows |

---

# Entscheidungshistorie

| Datum | Entscheidung | Verantwortlich | ADR-Referenz |
|-------|--------------|----------------|--------------|
| - | - | - | - |

---

# Offene Fragen

1. MS-Graph-Integration für Outlook-Kalender, Kontakte, Teams-Integration?
2. ...
3. ...

---

# Nächste Schritte

Nach diesem Meeting:

1. [ ] Entscheidungen dokumentieren (ADRs erstellen)
2. [ ] Priorisierte Feature-Liste erstellen
3. [ ] MVP-Scope definieren
4. [ ] Technical Proof of Concept planen
5. [ ] Team-Struktur und -Größe definieren
6. [ ] Timeline skizzieren

---

*Dokument erstellt am: 11. Februar 2026*  
*Teilnehmer: ___________*  
*Version: 3.0*  
*Basiert auf: Fusion aus ERP-Grundsatzentscheidungen-Fragebogen und cloud-erp-architecture-decisions*
