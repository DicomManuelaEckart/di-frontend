# ERP-System Grundsatzentscheidungen

> **Zweck:** Dieses Dokument dient als Leitfaden für das Kickoff-Meeting mit CEO und Product Owner, um alle fundamentalen Architektur- und Business-Entscheidungen zu treffen, die nachträglich nur schwer oder gar nicht änderbar sind.

---

## 1. Mandantenfähigkeit (Multi-Tenancy)

### Fragestellung
Soll das System mehrere Kunden/Mandanten in einer Installation bedienen können?

### Optionen

| Option | Beschreibung | Vorteile | Nachteile |
|--------|--------------|----------|-----------|
| **Single-Tenant** | Ein System pro Kunde | Maximale Isolation, einfache Anpassungen | Hohe Betriebskosten, schwierige Wartung |
| **Multi-Tenant (Shared DB, Shared Schema)** | Eine DB, Tenant-ID in jeder Tabelle | Kosteneffizient, einfaches Deployment | Komplexe Queries, Datenleck-Risiko |
| **Multi-Tenant (Shared DB, Separate Schema)** | Eine DB, Schema pro Mandant | Gute Isolation, moderate Kosten | Migrations-Komplexität |
| **Multi-Tenant (Separate DB)** | Eigene DB pro Mandant | Beste Isolation, einfache Backups | Höhere Kosten, komplexeres Management |

### Empfehlung
**Multi-Tenant mit Separate DB** - Bietet die beste Balance zwischen Isolation (wichtig für ERP-Daten), Compliance-Anforderungen und trotzdem zentrale Code-Basis. Azure SQL Elastic Pools machen dies kosteneffizient.

### Zu klärende Fragen
- [ ] Werden wir das System auch als SaaS anbieten?
- [ ] Wie viele Mandanten erwarten wir in 5 Jahren?
- [ ] Gibt es Kunden, die dedizierte Infrastruktur verlangen werden?
- [ ] Müssen Mandanten-Daten in unterschiedlichen Regionen liegen können?

---

## 2. Internationalisierung & Lokalisierung

### Fragestellung
In welchen Ländern/Regionen soll das System einsetzbar sein?

### Optionen

| Option | Beschreibung |
|--------|--------------|
| **DACH-only** | Deutschland, Österreich, Schweiz |
| **EU-weit** | Alle EU-Mitgliedsstaaten |
| **Global** | Weltweiter Einsatz |

### Architektonische Implikationen

| Aspekt | Anforderung bei Global |
|--------|------------------------|
| **Zeitzonen** | UTC-Speicherung, lokale Darstellung |
| **Währungen** | Multi-Currency mit Wechselkursen |
| **Sprachen** | i18n-Framework von Anfang an |
| **Zahlenformate** | Locale-abhängige Formatierung |
| **Datumsformate** | Locale-abhängige Formatierung |
| **Rechtsformen** | Länderspezifische Stammdaten |
| **Steuern** | Länderspezifische Steuerlogik |

### Empfehlung
**Architektur für Global, Rollout DACH-first** - Die Architektur von Anfang an international auslegen (UTC, Multi-Currency, i18n), aber initial nur DACH implementieren. Nachträgliche Internationalisierung ist extrem aufwendig.

### Zu klärende Fragen
- [ ] Welche Länder sind in der initialen Roadmap?
- [ ] Welche Länder sind mittelfristig (3-5 Jahre) geplant?
- [ ] Gibt es bereits Kunden mit internationalen Standorten?
- [ ] Welche Sprachen müssen unterstützt werden?

---

## 3. Rechtliche & Gesetzliche Anforderungen

### Fragestellung
Welche gesetzlichen Rahmenbedingungen müssen von Anfang an berücksichtigt werden?

### Kritische Bereiche

#### 3.1 Datenschutz
| Anforderung | Beschreibung | Architektur-Impact |
|-------------|--------------|-------------------|
| **DSGVO/GDPR** | EU-Datenschutz | Art. 17 Löschrecht, Art. 20 Portabilität, Privacy by Design |
| **Datenresidenz** | Wo dürfen Daten gespeichert werden? | Multi-Region Deployment |
| **Aufbewahrungsfristen** | Wie lange müssen/dürfen Daten aufbewahrt werden? | Retention Policies, Archivierung |

#### 3.2 Buchführung & Finanzen
| Anforderung | Beschreibung | Architektur-Impact |
|-------------|--------------|-------------------|
| **GoBD (DE)** | Grundsätze ordnungsmäßiger Buchführung | Unveränderbarkeit, Nachvollziehbarkeit |
| **Revisionssicherheit** | Änderungen müssen nachvollziehbar sein | Audit-Trail, keine physischen Löschungen |
| **E-Rechnung** | ZUGFeRD, XRechnung, Peppol | Strukturierte Datenformate |
| **Kassensicherheit** | TSE-Anbindung (falls Kasse) | Hardware-Integration |

#### 3.3 Branchenspezifisch
| Anforderung | Branchen | Architektur-Impact |
|-------------|----------|-------------------|
| **FDA 21 CFR Part 11** | Pharma, Medizin | Elektronische Signaturen, Validierung |
| **ISO 13485** | Medizinprodukte | Rückverfolgbarkeit |
| **TISAX** | Automotive | Informationssicherheit |
| **SOX** | Börsennotierte Unternehmen | Interne Kontrollen |

### Empfehlung
**GoBD und DSGVO sind Pflicht** - Diese von Anfang an architektonisch verankern. Audit-Trail als Core-Feature, nicht als Addon. Soft-Delete-Pattern statt physischer Löschungen mit DSGVO-konformer Anonymisierung.

### Zu klärende Fragen
- [ ] Welche Branchen werden primär adressiert?
- [ ] Gibt es Kunden mit besonderen Compliance-Anforderungen?
- [ ] Ist eine Zertifizierung geplant (ISO 27001, SOC 2)?
- [ ] Müssen elektronische Signaturen unterstützt werden?
- [ ] Ist eine Kassenfunktion geplant?

---

## 4. Sicherheitsarchitektur

### Fragestellung
Wie soll das System abgesichert werden?

### 4.1 Authentifizierung

| Option | Beschreibung | Vorteile | Nachteile |
|--------|--------------|----------|-----------|
| **Eigene Identity** | Selbst entwickeltes User-Management | Volle Kontrolle | Sicherheitsrisiko, Wartungsaufwand |
| **Azure AD B2C** | Microsoft Identity Platform | Enterprise-ready, MFA out-of-box | Vendor Lock-in, Kosten |
| **Keycloak** | Open-Source Identity Provider | Flexibel, keine Lizenzkosten | Self-hosted, Wartungsaufwand |
| **Auth0** | Identity as a Service | Schnelle Integration | Kosten bei Skalierung |

### Empfehlung
**Azure AD B2C** - Integration mit Azure-Stack, Enterprise-Features (MFA, Conditional Access), SSO mit Microsoft 365. Für B2B-Szenarien zusätzlich Azure AD B2B.

### 4.2 Autorisierung

| Option | Beschreibung | Use Case |
|--------|--------------|----------|
| **RBAC** | Role-Based Access Control | Standard, einfache Hierarchien |
| **ABAC** | Attribute-Based Access Control | Komplexe, kontextabhängige Regeln |
| **PBAC** | Policy-Based Access Control | Feingranular, auditierbar |
| **Hybrid** | RBAC + ABAC für Spezialfälle | ERP-typisch |

### Empfehlung
**Hybrid (RBAC + feldbasierte Einschränkungen)** - RBAC für Grundstruktur (Module, Funktionen), ergänzt um feldbasierte Einschränkungen (z.B. "sieht nur eigene Kostenstelle").

### 4.3 Weitere Sicherheitsaspekte

- [ ] **Row-Level Security:** Sollen Benutzer nur bestimmte Datensätze sehen?
- [ ] **Field-Level Security:** Sollen bestimmte Felder ausgeblendet werden können?
- [ ] **IP-Whitelisting:** Soll Zugriff auf bestimmte IPs beschränkt werden können?
- [ ] **Audit-Logging:** Welche Aktionen müssen protokolliert werden?
- [ ] **Encryption at Rest:** Ist Verschlüsselung der Daten erforderlich?
- [ ] **Encryption in Transit:** TLS 1.3 als Minimum?
- [ ] **Data Loss Prevention:** Müssen Downloads/Exports eingeschränkt werden?

---

## 5. Architektur & Skalierbarkeit

### Fragestellung
Wie soll das System technisch aufgebaut sein?

### 5.1 Deployment-Modell

| Option | Beschreibung | Vorteile | Nachteile |
|--------|--------------|----------|-----------|
| **Monolith** | Eine Deployment-Einheit | Einfach, schneller Start | Skalierung nur vertikal |
| **Modularer Monolith** | Ein Deployment, strikte Modulgrenzen | Balance, spätere Aufteilung möglich | Disziplin erforderlich |
| **Microservices** | Viele kleine Services | Unabhängige Skalierung | Komplexität, DevOps-Overhead |

### Empfehlung
**Modularer Monolith mit Domain-Driven Design** - Clean Architecture mit strikten Bounded Contexts. Kann später bei Bedarf in Microservices aufgeteilt werden. Vermeidet initiale Komplexität.

### 5.2 Datenbank-Strategie

| Option | Beschreibung | Use Case |
|--------|--------------|----------|
| **Single DB** | Eine Datenbank für alles | Einfach, ACID garantiert |
| **DB per Module** | Eigene DB pro Bounded Context | Lose Kopplung |
| **Polyglot Persistence** | Verschiedene DB-Typen | Spezialisierte Anforderungen |

### Empfehlung
**Single DB initial, mit klarer Schema-Trennung per Modul** - Ermöglicht spätere Aufteilung. Azure SQL mit Elastic Pools für Mandantentrennung.

### 5.3 Skalierungsanforderungen

| Frage | Antwort |
|-------|---------|
| Wie viele gleichzeitige Benutzer (Peak)? | _____ |
| Wie viele Mandanten in 5 Jahren? | _____ |
| Datenvolumen pro Mandant (GB/Jahr)? | _____ |
| Gibt es Batch-Prozesse (z.B. Monatsabschluss)? | _____ |
| Werden große Datenimporte benötigt? | _____ |

---

## 6. Kern-ERP vs. Branchen-Module

### Fragestellung
Was gehört zum Kern, was sind optionale Module?

### 6.1 Vorgeschlagene Kern-Module (immer enthalten)

| Modul | Funktionen |
|-------|------------|
| **Stammdaten** | Geschäftspartner, Artikel, Organisationsstruktur |
| **Benutzerverwaltung** | User, Rollen, Rechte |
| **Dokumentenmanagement** | Ablage, Versionierung, Vorlagen |
| **Workflow Engine** | Genehmigungen, Freigaben, Benachrichtigungen |
| **Reporting** | Standard-Berichte, Ad-hoc Auswertungen |
| **Audit & Compliance** | Protokollierung, Änderungshistorie |

### 6.2 Optionale Fachmodule

| Modul | Funktionen | Priorität |
|-------|------------|-----------|
| **Finanzbuchhaltung (FiBu)** | Hauptbuch, Kreditoren, Debitoren, Anlagen | [ ] Kern [ ] Addon |
| **Controlling** | Kostenrechnung, Budgetierung, BI | [ ] Kern [ ] Addon |
| **Einkauf/Beschaffung** | Anfragen, Bestellungen, Lieferantenbewertung | [ ] Kern [ ] Addon |
| **Vertrieb** | Angebote, Aufträge, CRM-Light | [ ] Kern [ ] Addon |
| **Lagerwirtschaft** | Bestände, Inventur, Chargen/Serien | [ ] Kern [ ] Addon |
| **Produktion/Fertigung** | Stücklisten, Arbeitspläne, Fertigungsaufträge | [ ] Kern [ ] Addon |
| **Projektmanagement** | Projekte, Ressourcen, Zeiterfassung | [ ] Kern [ ] Addon |
| **Personalwesen (HR)** | Mitarbeiter, Abwesenheiten, Lohn (Schnittstelle) | [ ] Kern [ ] Addon |
| **Service/Wartung** | Tickets, Wartungsverträge, Einsatzplanung | [ ] Kern [ ] Addon |

### 6.3 Branchen-Erweiterungen

| Branche | Spezifische Anforderungen |
|---------|---------------------------|
| **Handel** | Aktionspreise, Konditionssysteme, EDI |
| **Fertigung/Industrie** | MES-Integration, Qualitätssicherung |
| **Dienstleistung** | Projektabrechnung, Zeiterfassung |
| **Gesundheitswesen** | Patientenverwaltung, Terminplanung |
| **Bau** | GAEB, Aufmaße, Nachtragsmanagement |

### Empfehlung
**Kern minimal halten, Erweiterbarkeit maximieren** - Plugin-Architektur von Anfang an. Module als eigenständige Bounded Contexts, die über definierte Schnittstellen (Domain Events) kommunizieren.

### Zu klärende Fragen
- [ ] Was ist das MVP (Minimum Viable Product)?
- [ ] Welche Branchen werden zuerst adressiert?
- [ ] Gibt es einen Pilotkunden mit definierten Anforderungen?
- [ ] Sollen Module einzeln lizenzierbar sein?

---

## 7. Integration & Schnittstellen

### Fragestellung
Mit welchen externen Systemen muss das ERP kommunizieren?

### 7.1 Standard-Integrationen

| Integration | Zweck | Priorität |
|-------------|-------|-----------|
| **E-Mail (SMTP/Graph API)** | Benachrichtigungen, Dokumentenversand | Muss |
| **Dokumentenspeicher (SharePoint/Blob)** | Dateiablage | Muss |
| **Office 365** | Dokumentenerstellung | Soll |
| **Kalender (Outlook/Google)** | Terminierung | Soll |
| **BI (Power BI)** | Auswertungen | Soll |

### 7.2 Business-Integrationen

| Integration | Zweck | Priorität |
|-------------|-------|-----------|
| **DATEV** | Buchungsexport zum Steuerberater | [ ] Muss [ ] Soll [ ] Kann |
| **Banking (EBICS/HBCI)** | Zahlungsverkehr | [ ] Muss [ ] Soll [ ] Kann |
| **E-Rechnung (Peppol/ZUGFeRD)** | Elektronischer Rechnungsversand | [ ] Muss [ ] Soll [ ] Kann |
| **EDI/EDIFACT** | B2B-Datenaustausch | [ ] Muss [ ] Soll [ ] Kann |
| **Versanddienstleister** | Paketlabels, Tracking | [ ] Muss [ ] Soll [ ] Kann |
| **Webshop** | Auftragsimport, Bestandssync | [ ] Muss [ ] Soll [ ] Kann |
| **CRM** | Kundendaten-Sync | [ ] Muss [ ] Soll [ ] Kann |

### 7.3 API-Strategie

| Option | Beschreibung | Empfehlung |
|--------|--------------|------------|
| **REST API** | Standard HTTP/JSON | Ja, für alle CRUD-Operationen |
| **GraphQL** | Flexible Abfragen | Optional für komplexe Reporting-Anforderungen |
| **Webhooks** | Event-basierte Benachrichtigungen | Ja, für Integrationen |
| **OData** | Standardisierte Queries | Ja, für Power BI Integration |

### Empfehlung
**REST + Webhooks + OData** - REST als primäre API, Webhooks für Event-driven Integration, OData für Reporting-Tools.

### Zu klärende Fragen
- [ ] Welche Schnittstellen sind für den Go-Live kritisch?
- [ ] Gibt es bestehende Systeme, die abgelöst werden?
- [ ] Welche Daten müssen migriert werden?
- [ ] Soll eine öffentliche API für Drittanbieter bereitgestellt werden?

---

## 8. Customizing & Erweiterbarkeit

### Fragestellung
Wie flexibel soll das System anpassbar sein?

### 8.1 Customizing-Ebenen

| Ebene | Beschreibung | Wer? |
|-------|--------------|------|
| **Konfiguration** | Ein/Aus-Schalten von Features, Defaults | Admin |
| **Personalisierung** | Benutzeroberfläche anpassen | Endbenutzer |
| **Customizing** | Felder, Workflows, Validierungen anpassen | Power-User/Berater |
| **Entwicklung** | Neue Module, komplexe Logik | Entwickler |

### 8.2 Customizing-Features

| Feature | Beschreibung | Empfehlung |
|---------|--------------|------------|
| **Custom Fields** | Zusätzliche Felder ohne Programmierung | Ja |
| **Custom Entities** | Eigene Datenentitäten | Ja (eingeschränkt) |
| **Custom Workflows** | Grafischer Workflow-Designer | Ja |
| **Custom Reports** | Berichtsdesigner | Ja |
| **Custom Validations** | Geschäftsregeln per Config | Ja |
| **Scripting** | Eigener Code (JavaScript/C#) | Vorsichtig (Sandboxed) |

### Empfehlung
**"Low-Code first, Pro-Code possible"** - Maximales Customizing über Konfiguration, aber saubere Extension Points für komplexe Anforderungen. Niemals Core-Code modifizieren lassen.

### Zu klärende Fragen
- [ ] Sollen Kunden selbst customizen können?
- [ ] Wird es Partner/Systemhäuser geben, die implementieren?
- [ ] Wie werden Customizings bei Updates behandelt?
- [ ] Soll ein Marketplace für Erweiterungen entstehen?

---

## 9. Lizenz- & Geschäftsmodell

### Fragestellung
Wie wird das System vertrieben und lizenziert?

### 9.1 Lizenzmodelle

| Modell | Beschreibung | Vorteile | Nachteile |
|--------|--------------|----------|-----------|
| **Named User** | Lizenz pro benanntem Benutzer | Planbare Einnahmen | Limitiert Nutzung |
| **Concurrent User** | Lizenz pro gleichzeitigem Benutzer | Flexibel für Kunden | Schwer zu enforzen |
| **Modul-basiert** | Lizenz pro aktiviertem Modul | Flexibel, Upselling | Komplexe Preisstruktur |
| **Transaktions-basiert** | Zahlung pro Vorgang | Pay-per-Use | Unplanbar |
| **Flat Fee** | Pauschale pro Mandant | Einfach | Schwer skalierbar |

### Empfehlung
**Named User + Modul-basiert** - Basis-User-Lizenz plus optionale Module. Verschiedene User-Typen (Full, Limited, Portal) für Preisdifferenzierung.

### 9.2 Deployment-Optionen

| Option | Beschreibung | Anbieten? |
|--------|--------------|-----------|
| **SaaS (Shared)** | Multi-Tenant, wir betreiben | [ ] Ja [ ] Nein |
| **SaaS (Dedicated)** | Single-Tenant, wir betreiben | [ ] Ja [ ] Nein |
| **Private Cloud** | Kunde betreibt in seiner Cloud | [ ] Ja [ ] Nein |
| **On-Premise** | Kunde betreibt lokal | [ ] Ja [ ] Nein |

### Empfehlung
**SaaS-only initial** - Reduziert Komplexität massiv. On-Premise nur bei sehr klarem Business Case und entsprechendem Preisaufschlag.

### Zu klärende Fragen
- [ ] Wie ist die Preispositionierung (Premium/Mittelfeld/Budget)?
- [ ] Gibt es Mindestvertragslaufzeiten?
- [ ] Wie werden Updates/Upgrades abgerechnet?
- [ ] Soll es eine kostenlose Testversion geben?

---

## 10. DevOps & Betrieb

### Fragestellung
Wie wird das System entwickelt, deployed und betrieben?

### 10.1 Entwicklung

| Aspekt | Entscheidung | Empfehlung |
|--------|--------------|------------|
| **Source Control** | GitHub/Azure DevOps/GitLab | Azure DevOps (integriert) |
| **Branching** | GitFlow/Trunk-based/GitHub Flow | Trunk-based mit Feature Flags |
| **CI/CD** | Azure Pipelines/GitHub Actions | Azure Pipelines |
| **Code Review** | PR-Pflicht, Anzahl Reviewer | Mindestens 1 Reviewer |
| **Testing** | Unit/Integration/E2E | Alle drei Ebenen |

### 10.2 Environments

| Environment | Zweck | Auto-Deploy? |
|-------------|-------|--------------|
| **Development** | Entwicklung | Ja, bei Commit |
| **Test/QA** | Qualitätssicherung | Ja, bei PR-Merge |
| **Staging** | Abnahme, Pre-Production | Ja, manueller Release |
| **Production** | Live-System | Scheduled/Manual |

### 10.3 Operations

| Aspekt | Optionen | Empfehlung |
|--------|----------|------------|
| **Monitoring** | Azure Monitor, Application Insights | Application Insights |
| **Logging** | Structured Logging, zentralisiert | Serilog + Azure Log Analytics |
| **Alerting** | Automatische Benachrichtigung | Ja, PagerDuty/OpsGenie |
| **Backup** | Frequenz, Retention | Täglich, 30 Tage Retention |
| **DR** | Disaster Recovery Strategie | Geo-Redundanz, RTO < 4h |

### Zu klärende Fragen
- [ ] Wer ist für den Betrieb verantwortlich?
- [ ] Wie sind die SLAs (Verfügbarkeit)?
- [ ] Gibt es Wartungsfenster?
- [ ] Wie oft werden Updates eingespielt?

---

## 11. UX & Frontend

### Fragestellung
Wie soll die Benutzeroberfläche gestaltet sein?

### 11.1 Design-System

| Aspekt | Optionen | Empfehlung |
|--------|----------|------------|
| **Component Library** | Angular Material, PrimeNG, Custom | Angular Material (Basis) + Custom |
| **Design Tokens** | Eigenes System vs. Standard | Eigenes System für Branding |
| **Responsive** | Desktop-first vs. Mobile-first | Desktop-first (ERP-typisch) |
| **Theming** | Mandanten-Branding möglich? | Ja, via CSS Variables |

### 11.2 Accessibility

| Requirement | Standard | Umsetzen? |
|-------------|----------|-----------|
| **WCAG 2.1 Level A** | Minimum | Ja, Pflicht |
| **WCAG 2.1 Level AA** | Empfohlen | Ja |
| **WCAG 2.1 Level AAA** | Optional | Nach Bedarf |
| **Keyboard Navigation** | Tastatursteuerung | Ja, Pflicht |
| **Screen Reader** | Unterstützung | Ja |

### 11.3 Offline-Fähigkeit

| Option | Beschreibung | Empfehlung |
|--------|--------------|------------|
| **Online-only** | Keine Offline-Funktion | Initial ja |
| **Offline-read** | Lesezugriff offline | Später möglich |
| **Offline-write** | Vollständig offline-fähig | Hohe Komplexität |

### Empfehlung
**Online-only initial, PWA-ready bauen** - Service Worker vorbereiten, aber keine Offline-Sync-Logik initial.

### Zu klärende Fragen
- [ ] Muss das System auf Tablets nutzbar sein?
- [ ] Gibt es Corporate Design Vorgaben?
- [ ] Sind Barrierefreiheits-Zertifizierungen nötig?
- [ ] Wird eine Mobile App benötigt (nativ)?

---

## 12. AI & Automatisierung

### Fragestellung
Soll KI/ML von Anfang an eingeplant werden?

### 12.1 AI-Use Cases

| Use Case | Beschreibung | Priorität |
|----------|--------------|-----------|
| **Intelligent Search** | Semantische Suche in Daten | [ ] MVP [ ] Later [ ] Never |
| **Document Processing** | OCR, Rechnungserkennung | [ ] MVP [ ] Later [ ] Never |
| **Predictive Analytics** | Vorhersagen (Bedarf, Churn) | [ ] MVP [ ] Later [ ] Never |
| **Chatbot/Assistant** | Benutzerunterstützung | [ ] MVP [ ] Later [ ] Never |
| **Anomaly Detection** | Ungewöhnliche Transaktionen | [ ] MVP [ ] Later [ ] Never |
| **Process Automation** | RPA-ähnliche Automatisierung | [ ] MVP [ ] Later [ ] Never |

### 12.2 AI-Infrastruktur

| Aspekt | Option | Empfehlung |
|--------|--------|------------|
| **AI Services** | Azure OpenAI, Cognitive Services | Azure OpenAI + Form Recognizer |
| **Vector Database** | Für Embeddings/Semantic Search | Azure AI Search |
| **ML Platform** | Für Custom Models | Azure ML (wenn nötig) |

### Empfehlung
**AI-ready Architektur, selektive Implementierung** - Datenstrukturen und APIs so gestalten, dass AI-Features später hinzugefügt werden können. Document Processing (Rechnungen) als ersten AI-Use-Case.

---

## 13. Agenten-basierte Entwicklung

### Fragestellung
Wie sollen Custom Agenten (KI-gestützte Entwicklungs-Assistenten) in den Entwicklungsprozess integriert werden?

### 13.1 Agent-Typen und Einsatz

| Agent-Typ | Aufgabe | Beschreibung |
|-----------|---------|--------------|
| **Code Agent** | Code-Generierung | Implementiert Features basierend auf Spezifikationen |
| **Review Agent** | Code-Review | Prüft Code auf Architektur-Compliance, Security, Best Practices |
| **Test Agent** | Test-Generierung | Generiert Unit-, Integration- und E2E-Tests |
| **Documentation Agent** | Dokumentation | Erstellt und aktualisiert technische Dokumentation |
| **Migration Agent** | Datenmigration | Unterstützt bei Datenmigrationen und Transformationen |
| **Refactoring Agent** | Code-Verbesserung | Optimiert bestehenden Code, entfernt Technical Debt |

### 13.2 Governance für Agent-generierten Code

| Aspekt | Optionen | Empfehlung |
|--------|----------|------------|
| **Review-Pflicht** | Agent-Code ohne Review / Review erforderlich | Immer menschliches Review |
| **Architektur-Checks** | Manuell / Automatisiert via ArchTests | Automatisiert via CI/CD |
| **Test-Coverage** | Agent verantwortlich / Mensch verantwortlich | Agent generiert, Mensch validiert |
| **Security-Scan** | Vor Merge / Nach Merge | Vor Merge (Blocking) |

### 13.3 Agent-Konfiguration

| Aspekt | Zu klären |
|--------|-----------|
| **Basis-LLM** | GPT-4 / Claude / Codestral / Eigenes Fine-Tuned Model |
| **Context-Größe** | Wie viel Codebase-Kontext soll der Agent haben? |
| **ADR-Awareness** | Agent kennt und enforced ADRs automatisch |
| **Coding-Standards** | Agent folgt definierten Coding Guidelines |

### Empfehlung
**"Agent-Assisted, Human-Approved"** - Agenten generieren Code und Tests, aber:
- Jeder Agent-generierte Code durchläuft Human Review
- ArchTests und Security-Scans als automatische Gates
- Agenten haben Zugriff auf ADRs und Guidelines als Context
- Kein direkter Push auf Main/Production-Branches

### Zu klärende Fragen
- [ ] Welche Basis-LLMs sollen verwendet werden?
- [ ] Sollen Agenten direkten Repository-Zugriff haben?
- [ ] Wie werden Agent-Kosten (API-Calls) budgetiert?
- [ ] Müssen Agent-generierte Code-Abschnitte gekennzeichnet werden?
- [ ] Sollen Agenten auch im Betrieb eingesetzt werden (z.B. für Incident-Analyse)?

---

## 14. Azure-Architektur & Services

### Fragestellung
Welche Azure-Dienste sollen die Grundlage bilden?

### 14.1 Compute

| Option | Beschreibung | Vorteile | Nachteile |
|--------|--------------|----------|-----------|
| **Azure App Service** | PaaS für Web-Apps | Einfach, auto-scaling | Weniger Kontrolle |
| **Azure Container Apps** | Serverless Container | Flexibel, kosteneffizient | Neuere Technologie |
| **Azure Kubernetes (AKS)** | Managed K8s | Volle Kontrolle, portabel | Komplexität, Overhead |
| **Azure Functions** | Serverless | Pay-per-Use, Event-driven | Cold Start, Limits |

### Empfehlung
**Azure Container Apps** - Beste Balance zwischen Flexibilität und Einfachheit. Ermöglicht Container-basiertes Deployment ohne K8s-Komplexität. Skaliert automatisch auf 0.

### 14.2 Datenbank

| Option | Beschreibung | Use Case |
|--------|--------------|----------|
| **Azure SQL Database** | Managed SQL Server | Primäre Datenbank |
| **Azure SQL Elastic Pools** | Shared Resources für Multi-Tenant | Kostenoptimierung bei vielen Mandanten |
| **Cosmos DB** | NoSQL, global verteilt | Spezielle Workloads (z.B. Event Store) |
| **Azure Cache for Redis** | In-Memory Cache | Session, Performance |

### Empfehlung
**Azure SQL mit Elastic Pools** - Für Multi-Tenant ideal. Jeder Mandant eigene DB im Pool.

### 14.3 Messaging & Events

| Option | Beschreibung | Use Case |
|--------|--------------|----------|
| **Azure Service Bus** | Enterprise Message Broker | Zuverlässige Nachrichtenverarbeitung |
| **Azure Event Grid** | Event Routing | Systemweite Events |
| **Azure Event Hubs** | High-Throughput Streaming | Analytics, IoT |
| **Azure Queue Storage** | Einfache Queues | Background Jobs |

### Empfehlung
**Service Bus für Commands, Event Grid für Integration Events** - Service Bus für CQRS-Commands und interne Events, Event Grid für Cross-Service und externe Integration.

### 14.4 Storage

| Option | Beschreibung | Use Case |
|--------|--------------|----------|
| **Azure Blob Storage** | Objekt-Speicher | Dokumente, Backups |
| **Azure Files** | SMB-Shares | Legacy-Integration |
| **Azure Data Lake** | Analytics-Speicher | BI, Machine Learning |

### 14.5 Security & Identity

| Service | Zweck |
|---------|-------|
| **Azure Key Vault** | Secrets, Zertifikate, Encryption Keys |
| **Azure AD B2C / Entra ID** | Authentifizierung |
| **Azure Front Door** | WAF, DDoS-Schutz, Global Load Balancing |
| **Azure Private Link** | Private Netzwerk-Anbindung |

### Zu klärende Fragen
- [ ] Gibt es bestehende Azure-Subscriptions oder Enterprise Agreements?
- [ ] Welche Azure-Regionen sollen genutzt werden? (Datenresidenz)
- [ ] Ist ein Azure Landing Zone Setup bereits vorhanden?
- [ ] Budget-Limits für Azure-Kosten?

---

## 15. Feature Flags & Rollout-Strategien

### Fragestellung
Wie werden neue Features kontrolliert ausgerollt?

### 15.1 Feature Flag System

| Option | Beschreibung | Empfehlung |
|--------|--------------|------------|
| **Azure App Configuration** | Native Azure-Integration | Ja (primär) |
| **LaunchDarkly** | Feature-Management-Plattform | Für komplexe Szenarien |
| **Unleash** | Open Source | Budget-Alternative |
| **Custom** | Eigene Implementierung | Nicht empfohlen |

### 15.2 Rollout-Strategien

| Strategie | Beschreibung | Use Case |
|-----------|--------------|----------|
| **All-or-Nothing** | Feature für alle oder niemanden | Kleine Features |
| **Percentage Rollout** | Schrittweise % der User | Riskante Features |
| **Ring Deployment** | Interne → Beta-User → Alle | Größere Features |
| **Tenant-based** | Pro Mandant aktivierbar | B2B SaaS typisch |
| **User-based** | Pro Benutzer aktivierbar | A/B Testing |

### Empfehlung
**Tenant-based als Standard, Percentage für kritische Features** - Im B2B SaaS-Kontext ist Mandanten-basiertes Rollout am sinnvollsten. Ermöglicht kontrolliertes Testen mit Pilotkunden.

### 15.3 Feature Flag Lifecycle

| Phase | Beschreibung |
|-------|--------------|
| **Development** | Flag existiert, Feature in Entwicklung |
| **Testing** | Feature in QA-Umgebung aktiviert |
| **Pilot** | Feature für ausgewählte Mandanten aktiviert |
| **General Availability** | Feature für alle aktiviert |
| **Sunset** | Flag entfernen, Feature ist Standard |

### Zu klärende Fragen
- [ ] Sollen Mandanten selbst Features aktivieren können (Self-Service)?
- [ ] Wie lange dürfen Feature Flags maximal existieren?
- [ ] Wer entscheidet über Aktivierung pro Mandant?
- [ ] Sollen Features kostenpflichtig schaltbar sein (Upselling)?

---

## 16. Team-Struktur & Skills

### Fragestellung
Welche Team-Struktur und Skills werden benötigt?

### 16.1 Team-Modelle

| Modell | Beschreibung | Empfehlung |
|--------|--------------|------------|
| **Feature Teams** | Cross-funktionale Teams pro Feature-Bereich | Ja |
| **Component Teams** | Teams pro technischer Schicht | Nein |
| **Platform Team** | Infrastruktur und Developer Experience | Ja (ab 3 Feature Teams) |

### 16.2 Rollen im Team

| Rolle | Verantwortung | Anzahl (pro Team) |
|-------|---------------|-------------------|
| **Tech Lead** | Architektur, Code Quality | 1 |
| **Senior Developer** | Komplexe Features, Mentoring | 1-2 |
| **Developer** | Feature-Entwicklung | 2-4 |
| **QA Engineer** | Test-Strategie, Automatisierung | 1 |
| **UX Designer** | Frontend-Design | 0.5-1 (shared) |
| **Product Owner** | Anforderungen, Priorisierung | 1 (kann mehrere Teams) |

### 16.3 Skill-Anforderungen

| Bereich | Erforderliche Skills |
|---------|---------------------|
| **Backend** | C#, .NET 8+, Clean Architecture, DDD, EF Core |
| **Frontend** | Angular 17+, TypeScript, RxJS, NgRx |
| **DevOps** | Azure, Terraform/Bicep, CI/CD, Container |
| **Datenbank** | SQL Server, EF Core Migrations, Performance Tuning |
| **Security** | OAuth 2.0/OIDC, Azure AD, Security Best Practices |

### 16.4 Agent-Augmented Development

Mit Agent-Unterstützung verändert sich die Team-Zusammensetzung:

| Aspekt | Traditionell | Mit Agenten |
|--------|--------------|-------------|
| **Junior:Senior Ratio** | 3:1 | 2:1 (weniger Juniors nötig) |
| **Review-Kapazität** | Bottleneck | Agenten übernehmen First-Pass |
| **Dokumentation** | Oft vernachlässigt | Agenten generieren automatisch |
| **Test-Erstellung** | Zeitintensiv | Agenten generieren Basis-Tests |
| **Architektur-Compliance** | Manuell geprüft | Automatisch via Agenten + ArchTests |

### Empfehlung
**2-3 Feature Teams initial, Platform Team ab Team 3** - Starten mit kleiner, erfahrener Mannschaft. Agenten erhöhen Produktivität, ersetzen aber keine Senior-Skills.

### Zu klärende Fragen
- [ ] Wie viele Entwickler stehen initial zur Verfügung?
- [ ] Gibt es Budget für externes Recruiting/Contracting?
- [ ] Welche Skills sind bereits im Haus vorhanden?
- [ ] Ist Remote-Arbeit möglich/gewünscht?
- [ ] Gibt es Präferenzen für Nearshoring/Offshoring?

---

## 17. Migration & Go-Live

### Fragestellung
Wie werden bestehende Daten und Prozesse überführt?

### 17.1 Migrationsstrategie

| Strategie | Beschreibung | Risiko |
|-----------|--------------|--------|
| **Big Bang** | Kompletter Umstieg an einem Tag | Hoch |
| **Parallel Run** | Beide Systeme parallel | Mittel, teuer |
| **Phased** | Modul für Modul | Niedrig |
| **Pilot** | Erst ein Team/Standort | Niedrig |

### Empfehlung
**Pilot + Phased** - Mit einem Pilotteam starten, dann schrittweise ausrollen.

### 17.2 Datenmigration

| Aspekt | Fragen |
|--------|--------|
| **Altsysteme** | Welche Systeme werden abgelöst? |
| **Datenqualität** | Wie gut sind die Altdaten? |
| **Historische Daten** | Wie viel Historie muss migriert werden? |
| **Bereinigung** | Kann/soll vor Migration bereinigt werden? |

### Zu klärende Fragen
- [ ] Gibt es ein Altsystem? Wenn ja, welches?
- [ ] Wie viele Jahre Datenhistorie müssen migriert werden?
- [ ] Wer ist für die Datenbereinigung verantwortlich?
- [ ] Gibt es einen harten Termin für den Go-Live?

---

## 18. Support & Wartung

### Fragestellung
Wie wird das System nach Go-Live unterstützt?

### 18.1 Support-Modell

| Level | Beschreibung | Wer? |
|-------|--------------|------|
| **Level 1** | First Contact, FAQ, Known Issues | Helpdesk |
| **Level 2** | Fachliche Analyse, Workarounds | Consultants |
| **Level 3** | Technische Analyse, Bugfixing | Development |

### 18.2 SLA-Definition

| Severity | Reaktionszeit | Lösungszeit |
|----------|---------------|-------------|
| **Critical (System down)** | _____ min | _____ h |
| **High (Major function)** | _____ h | _____ h |
| **Medium (Workaround exists)** | _____ h | _____ d |
| **Low (Enhancement)** | _____ d | _____ d |

### Zu klärende Fragen
- [ ] Wird 24/7 Support benötigt?
- [ ] In welchen Sprachen wird Support angeboten?
- [ ] Wie werden Schulungen durchgeführt?
- [ ] Gibt es ein Self-Service-Portal?

---

## Zusammenfassung: Kritische Entscheidungen

Die folgenden Entscheidungen haben den größten Einfluss auf die Architektur und sind nachträglich am schwersten zu ändern:

| # | Entscheidung | Impact | Empfehlung |
|---|--------------|--------|------------|
| 1 | Multi-Tenancy Strategie | Sehr hoch | Separate DB per Tenant |
| 2 | Internationalisierung | Sehr hoch | Von Anfang an vorbereiten |
| 3 | Audit-Trail / Revisionssicherheit | Sehr hoch | Als Core-Feature |
| 4 | Identity Provider | Hoch | Azure AD B2C / Entra ID |
| 5 | Deployment-Modell | Hoch | Modularer Monolith |
| 6 | API-Strategie | Hoch | REST + Webhooks + OData |
| 7 | Customizing-Konzept | Hoch | Low-Code first |
| 8 | SaaS vs. On-Premise | Hoch | SaaS-only |
| 9 | Azure Compute | Hoch | Azure Container Apps |
| 10 | Agent-Governance | Mittel-Hoch | Agent-Assisted, Human-Approved |
| 11 | Feature Flag Strategie | Mittel | Tenant-based Rollout |

---

## Nächste Schritte

Nach diesem Meeting:

1. [ ] Entscheidungen dokumentieren (ADRs erstellen)
2. [ ] Priorisierte Feature-Liste erstellen
3. [ ] MVP-Scope definieren
4. [ ] Technical Proof of Concept planen
5. [ ] Team-Struktur und -Größe definieren
6. [ ] Timeline (ohne feste Deadlines) skizzieren

---

*Dokument erstellt am: 10. Februar 2026*
*Teilnehmer: ___________*
*Version: 2.0*
*Aktualisiert: Abschnitte 13-16 (Agent-Entwicklung, Azure-Architektur, Feature Flags, Team-Struktur) hinzugefügt*
