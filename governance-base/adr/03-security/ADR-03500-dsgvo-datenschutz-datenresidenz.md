---
id: ADR-03500
title: DSGVO, Datenschutz und Datenresidenz
status: accepted
date: 2026-02-25
scope: global
enforced_by: code-review
affects:
  - backend
  - frontend
  - infrastructure
---

# ADR-03500 – DSGVO, Datenschutz und Datenresidenz

## Entscheidungstreiber
- DSGVO (EU-Verordnung 2016/679) ist für ein SaaS-ERP mit EU-Kunden zwingend – Verstöße bis 4% des Jahresumsatzes
- Tenant-Daten enthalten personenbezogene Daten (Kunden, Lieferanten, Mitarbeiter, Ansprechpartner)
- GoBD-Aufbewahrungspflichten (10 Jahre) kollidieren mit DSGVO-Löschpflichten – klarer Lösungsansatz nötig
- Privacy by Design (Art. 25 DSGVO) muss in der Architektur verankert sein, nicht nachträglich aufgesetzt
- Datenresidenz (EU-only, ADR-00008) vereinfacht Compliance, ersetzt sie aber nicht

## Kontext
Das ERP-System verarbeitet als Auftragsverarbeiter (Art. 28 DSGVO) personenbezogene Daten im Auftrag der Kunden (Tenants). Jeder Tenant ist datenschutzrechtlich der Verantwortliche (Art. 4 Nr. 7). Die technische Architektur muss die Betroffenenrechte (Art. 15–22) technisch ermöglichen und Privacy by Design (Art. 25) systemisch umsetzen. Gleichzeitig unterliegen bestimmte Daten steuerrechtlichen Aufbewahrungspflichten (§147 AO, §257 HGB), die eine sofortige Löschung verhindern.

Basis-Entscheidungen zu Datenresidenz und Verschlüsselung sind bereits in ADR-00008 getroffen. PII-Handling in Audit-Logs ist in ADR-05800 geregelt. Tenant-Löschung/Anonymisierung ist in ADR-06200 definiert. Dieses ADR konsolidiert alle DSGVO-relevanten Architekturentscheidungen und schließt die verbleibenden Lücken.

## Entscheidung

### 1) Personenbezogene Daten – Klassifikation

Alle Entities, die personenbezogene Daten enthalten, werden mit einem `[PersonalData]`-Attribut annotiert. PII-Felder innerhalb dieser Entities werden mit `[PiiField]` markiert.

| Kategorie | Beispiel-Entities | PII-Felder |
|-----------|-------------------|-----------|
| **Kundendaten** | Customer, Contact, CustomerAddress | Name, E-Mail, Telefon, Adresse, Steuernummer |
| **Lieferantendaten** | Supplier, SupplierContact | Name, E-Mail, Telefon, Adresse, Bankverbindung |
| **Mitarbeiterdaten** | User (Entra ID), UserProfile | Name, E-Mail, Telefon, Rolle |
| **Belegdaten** | Invoice, CreditNote, Order | Ansprechpartner-Name, Lieferadresse, E-Mail (als denormalisierte Kopie) |
| **Audit-Daten** | AuditEntry (ADR-05800) | Vorher/Nachher-Werte, wenn PII-Felder betroffen |
| **Log-Daten** | Structured Logs (ADR-04000) | UserId, IP-Adresse, CorrelationId |

```csharp
[PersonalData]                    // Entity enthält PII
public class Customer : Entity, ITenantScoped
{
    [PiiField]                    // Feld ist personenbezogen
    public string Name { get; private set; }
    
    [PiiField]
    public Email Email { get; private set; }
    
    [PiiField]
    public PhoneNumber? Phone { get; private set; }
    
    [PiiField]
    public Address BillingAddress { get; private set; }
    
    public CustomerNumber Number { get; private set; }  // Fachliche ID, kein PII
    public TaxId? TaxId { get; private set; }           // Steuernummer → PII
}
```

**Regeln:**
- `[PersonalData]` und `[PiiField]` sind Custom Attributes im `SharedKernel.Domain`
- ArchTest: Jede Entity mit String-Properties, die typischerweise PII sind (Name, Email, Phone, Address), muss `[PersonalData]` haben
- Die Attribute steuern das Verhalten bei Anonymisierung, Datenexport und Zugriffskontrolle

---

### 2) Betroffenenrechte – Technische Umsetzung

#### Art. 15 – Auskunftsrecht (Data Subject Access Request, DSAR)

| Aspekt | Entscheidung |
|--------|-------------|
| **Auslöser** | Tenant-Admin löst DSAR für eine betroffene Person aus (Self-Service im Admin-Bereich) |
| **Identifikation** | Suche über E-Mail-Adresse oder Kunden-/Lieferantennummern |
| **Scope** | Alle `[PersonalData]`-Entities des Tenants, die zur betroffenen Person gehören |
| **Ausgabeformat** | JSON + CSV (maschinenlesbar, Art. 20) |
| **Zeitrahmen** | Innerhalb 30 Tagen (Art. 12 Abs. 3) – technisch innerhalb Minuten |
| **Implementierung** | `IDataSubjectAccessService.GenerateReport(TenantId, SubjectIdentifier)` |

**Ablauf:**
1. Admin gibt E-Mail oder Identifikator ein
2. System durchsucht alle `[PersonalData]`-Entities nach Übereinstimmung
3. Ergebnis wird als ZIP-Datei generiert (JSON pro Entity-Typ + zusammenfassende CSV)
4. ZIP wird verschlüsselt im Blob Storage gespeichert (ADR-08500), Download-Link per E-Mail an Admin
5. Download-Link ist 7 Tage gültig, danach automatische Löschung

#### Art. 16 – Recht auf Berichtigung

Wird durch die reguläre Bearbeitungsfunktion abgedeckt – Kunden-/Lieferantenstammdaten sind editierbar. Änderungen werden im Audit-Log (ADR-05800) protokolliert.

#### Art. 17 – Recht auf Löschung (Right to be Forgotten)

| Aspekt | Entscheidung |
|--------|-------------|
| **Strategie** | **Anonymisierung** statt physischer Löschung (wegen GoBD-Aufbewahrungspflichten) |
| **Auslöser** | Tenant-Admin löst Anonymisierung für eine betroffene Person aus |
| **Scope** | Alle `[PiiField]`-Felder der betroffenen Person werden anonymisiert |
| **Anonymisierungsmethode** | Deterministisch: `Name → "ANONYMISIERT"`, `Email → "anon-{hash}@deleted.local"`, `Phone → null`, `Address → "ANONYMISIERT"` |
| **Ausnahme GoBD** | Belege/Buchungen, die der GoBD-Aufbewahrungspflicht unterliegen: PII wird anonymisiert, Beleg-Struktur und Beträge bleiben erhalten |
| **Ausnahme laufende Geschäftsbeziehung** | Löschung kann abgelehnt werden, wenn offene Forderungen/Verbindlichkeiten existieren (Art. 17 Abs. 3 lit. b) |

**Anonymisierungs-Service:**

```csharp
public interface IPersonalDataAnonymizer
{
    /// Anonymisiert alle PII-Felder einer betroffenen Person
    Task<AnonymizationResult> AnonymizeSubject(
        TenantId tenantId, 
        SubjectIdentifier subject,
        AnonymizationReason reason);
}

public sealed record AnonymizationResult(
    int EntitiesProcessed,
    int FieldsAnonymized,
    int EntitiesSkipped,          // wegen Aufbewahrungspflicht (nur PII anonymisiert, nicht Beleg)
    IReadOnlyList<string> Warnings
);
```

**Regeln:**
- Anonymisierung ist **irreversibel** – Admin muss in einem zweistufigen Dialog bestätigen
- Vor Anonymisierung: automatische DSAR-Generierung (Nachweis, was anonymisiert wurde)
- Audit-Eintrag: `PersonalDataAnonymized`-Event mit Subject-Hash (nicht den PII-Daten selbst)
- Anonymisierung in Audit-Tabellen: PII-Felder in Vorher/Nachher-Werten werden ebenfalls maskiert (ADR-05800)

#### Art. 20 – Recht auf Datenportabilität

| Aspekt | Entscheidung |
|--------|-------------|
| **Format** | JSON (primär) + CSV (sekundär) – maschinenlesbar |
| **Scope** | Stammdaten (Kunden, Lieferanten, Artikel) + Belegarchiv |
| **Implementierung** | Gleicher Mechanismus wie DSAR (§2 Art. 15), erweitertes Datenset |
| **Bulk-Export** | Tenant-weiter Export bei Kündigung (ADR-06200) |

---

### 3) Privacy by Design (Art. 25)

| Prinzip | Umsetzung |
|---------|-----------|
| **Datensparsamkeit** | Nur notwendige PII erfassen; optionale Felder (Telefon, Fax) als `nullable` |
| **Zweckbindung** | PII wird nur im fachlichen Kontext des Tenants verarbeitet; kein Cross-Tenant-Zugriff (ADR-06000) |
| **Speicherbegrenzung** | Aufbewahrungsfristen definiert; automatische Löschung/Archivierung nach Ablauf |
| **Pseudonymisierung** | Log-Daten: UserId statt Name; Structured Logs enthalten keine PII (ADR-04000) |
| **Tenant-Isolation** | Database-per-Tenant (ADR-06000) – physische Isolation personenbezogener Daten |
| **Verschlüsselung** | At Rest (Azure SSE) + In Transit (TLS 1.3) – ADR-00008 §5 |
| **Zugriffskontrolle** | Permission-basiert (ADR-03100); PII-Zugriff nur mit fachlicher Berechtigung |
| **Audit-Trail** | Alle Zugriffe auf und Änderungen an PII werden protokolliert (ADR-05800, ADR-03400) |

**Technische Umsetzung im Code:**

```csharp
// Middleware: PII-Felder nie in Logs
public class PiiRedactionEnricher : ILogEventEnricher
{
    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory factory)
    {
        // Redact properties marked as PII
        // Email-Patterns, Phone-Patterns etc. werden maskiert
    }
}

// EF Core Convention: [PiiField]-Felder automatisch als "sensitive" markieren
public class PiiFieldConvention : IModelFinalizingConvention
{
    public void ProcessModelFinalizing(IConventionModelBuilder modelBuilder, ...)
    {
        // Alle Properties mit [PiiField] werden als IsSensitive() markiert
        // → erscheinen nicht in EF Core Logs / Exception Messages
    }
}
```

---

### 4) Aufbewahrungsfristen und Löschkonzept

| Datenkategorie | Aufbewahrungsfrist | Rechtsgrundlage | Löschmethode |
|----------------|-------------------|-----------------|-------------|
| **Buchungen / Journal Entries** | 10 Jahre | §147 AO, §257 HGB | Nach Fristablauf: physische Löschung (Partitions-Drop) |
| **Belege (Rechnungen, Gutschriften)** | 10 Jahre | §147 AO | Nach Fristablauf: physische Löschung |
| **Geschäftsbriefe** | 6 Jahre | §257 HGB | Nach Fristablauf: physische Löschung |
| **Kundenstammdaten (ohne Belege)** | Ende der Geschäftsbeziehung + 3 Jahre | Verjährungsfristen BGB | Anonymisierung auf Anfrage, Löschung nach Frist |
| **Lieferantenstammdaten** | Ende der Geschäftsbeziehung + 3 Jahre | Verjährungsfristen BGB | Anonymisierung auf Anfrage, Löschung nach Frist |
| **Audit-Log-Einträge** | 10 Jahre | GoBD | Anonymisierung von PII nach DSAR, Struktur bleibt (ADR-05800 §6) |
| **Security-Audit-Logs** | 2 Jahre | Best Practice | Automatische Löschung |
| **Application Logs** | 90 Tage | Best Practice | Automatische Rotation (ADR-04000) |
| **Blob Storage (Dokumente)** | Individuell + GoBD | §147 AO | Immutability Policy (ADR-08500), danach Löschung |
| **Tenant-Daten bei Kündigung** | 90 Tage Karenz + Aufbewahrungsfristen | DSGVO + GoBD | ADR-06200 §5 (Anonymisierung, DB-Löschung) |

**Automatisierte Umsetzung:**

```csharp
public interface IRetentionPolicyService
{
    /// Prüft alle Daten eines Tenants gegen die Aufbewahrungsfristen
    Task<RetentionReport> EvaluateRetention(TenantId tenantId);
    
    /// Führt fällige Löschungen/Anonymisierungen durch (Background Job)
    Task<RetentionExecutionResult> ExecuteRetention(TenantId tenantId);
}
```

- **Background Job** (ADR-05500): Monatlicher Retention-Check pro Tenant
- Retention-Report wird dem Tenant-Admin im Dashboard angezeigt
- Löschung erfolgt nur nach explizitem Admin-Approval (kein automatisches Löschen ohne Freigabe)
- Ausnahme: Application Logs und Security-Audit-Logs werden automatisch rotiert (keine Admin-Freigabe nötig)

---

### 5) Auftragsverarbeitung (Art. 28 DSGVO)

| Aspekt | Entscheidung |
|--------|-------------|
| **Rolle** | Wir sind **Auftragsverarbeiter** – der Tenant (Kunde) ist Verantwortlicher |
| **AVV (Auftragsverarbeitungsvertrag)** | Pflicht für jeden Tenant – wird bei Tenant-Onboarding akzeptiert (ADR-06200) |
| **Unterauftragsverarbeiter** | Microsoft (Azure) als Sub-Processor → EU-Standardvertragsklauseln liegen vor |
| **Technisch-Organisatorische Maßnahmen (TOMs)** | In der AVV referenziert, technisch durch dieses ADR + ADR-00008 + ADR-03000 + ADR-06000 umgesetzt |
| **Weisungsgebundenheit** | System verarbeitet Daten nur im Auftrag des Tenants – kein Cross-Tenant-Zugriff, keine eigene Nutzung |
| **Meldepflicht bei Datenpanne** | Art. 33/34: Erkennung via Monitoring (ADR-04100), Benachrichtigung via Alert-Pipeline, 72h-Frist |

**TOMs-Übersicht (Verweis auf bestehende ADRs):**

| TOM | Umsetzung | ADR |
|-----|-----------|-----|
| Zutrittskontrolle | Azure Data Center Security | Azure-Vertrag |
| Zugangskontrolle | Entra ID, MFA, OAuth 2.0 | ADR-03000 |
| Zugriffskontrolle | Permission-basiert, Tenant-isoliert | ADR-03100, ADR-06000 |
| Weitergabekontrolle | TLS 1.3, Private Endpoints | ADR-00008 §5 |
| Eingabekontrolle | Audit-Log (Wer, Wann, Was) | ADR-05800, ADR-03400 |
| Auftragskontrolle | AVV, Weisungsgebundenheit | Vertragsdokument |
| Verfügbarkeitskontrolle | Backups, Geo-Redundanz, SLOs | ADR-09100 |
| Trennungskontrolle | Database-per-Tenant | ADR-06000 |

---

### 6) Datenpannen-Management (Art. 33/34)

| Aspekt | Entscheidung |
|--------|-------------|
| **Erkennung** | Azure Defender for SQL + Custom Alerts (ADR-04100, ADR-09100) |
| **Klassifizierung** | Severity-Levels: Critical (PII-Breach) / High / Medium / Low |
| **Meldekette** | Alert → On-Call → Security Team → DPO → Betroffene Tenants → Aufsichtsbehörde (bei Critical) |
| **Frist** | 72 Stunden an Aufsichtsbehörde (Art. 33), unverzüglich an Betroffene (Art. 34) |
| **Dokumentation** | Breach-Log in zentraler Admin-DB (nicht in Tenant-DB) |
| **Technische Nachweise** | Audit-Logs + Telemetry-Daten (ADR-05800, ADR-04100) als Beweismittel |

**Incident-Response-Schritte:**

1. **Detect**: Monitoring-Alert oder manuelle Meldung
2. **Contain**: Betroffene Tenant(s) isolieren (Suspension, ADR-06200)
3. **Assess**: Umfang der Datenpanne bewerten (welche PII, wie viele Betroffene)
4. **Notify**: Tenant-Admins informieren (In-App + E-Mail), ggf. Aufsichtsbehörde
5. **Remediate**: Schwachstelle beheben, Lessons Learned
6. **Document**: Vollständige Dokumentation im Breach-Log

---

### 7) Cookie- und Consent-Management

| Aspekt | Entscheidung |
|--------|-------------|
| **Cookies** | Nur technisch notwendige Cookies (Session, Auth Token) – kein Consent nötig |
| **Tracking** | Kein Third-Party-Tracking, kein Analytics außer Application Insights (Microsoft, EU-Data-Boundary) |
| **Consent** | Kein Cookie-Banner nötig (nur technisch notwendige Cookies, kein Marketing) |
| **Telemetrie** | Application Insights mit IP-Anonymisierung (ADR-04100) |

**Regeln:**
- Keine Marketing-Cookies, keine Third-Party-Scripts
- Application Insights: `DisableTelemetry` für PII-sensitive Daten, IP-Anonymisierung aktiv
- Falls zukünftig Analytics gewünscht: Consent-Banner erforderlich → Feature Flag `Release.CookieConsent`

---

### 8) Datenresidenz und Sub-Processor-Register

Die Datenresidenz ist in ADR-00008 §3 festgelegt (EU-only). Hier die Ergänzung um das Sub-Processor-Register:

| Sub-Processor | Dienst | Datentyp | Region | Vertragsbasis |
|---------------|--------|----------|--------|--------------|
| **Microsoft (Azure)** | Compute, Storage, SQL, Service Bus | Alle Tenant-Daten | West Europe / Germany West Central | EU-Standardvertragsklauseln, EU Data Boundary |
| **Microsoft (Entra ID)** | Authentifizierung | User-Identitäten (E-Mail, Name) | EU | EU Data Boundary |
| **SendGrid / Azure Communication Services** | E-Mail-Versand | Empfänger-E-Mail, Name | EU | AVV |

**Regeln:**
- Neue Sub-Processors erfordern vorherige Benachrichtigung aller Tenants (30 Tage Einspruchsfrist)
- Sub-Processor-Register wird öffentlich gepflegt (Teil der Datenschutzdokumentation)
- Kein Sub-Processor außerhalb der EU/EWR (oder ohne angemessenes Datenschutzniveau)

---

### 9) Keine Branchenspezifische Compliance (v1)

| Standard | Status | Begründung |
|----------|--------|-----------|
| FDA 21 CFR Part 11 | ❌ Nicht geplant | Kein Pharma-/Medizinprodukt-Fokus |
| ISO 13485 | ❌ Nicht geplant | Kein Medizinprodukt |
| TISAX | ❌ Nicht geplant | Kein Automotive-Fokus |
| ISO 27001 | ⏳ Perspektivisch | Sinnvoll für Enterprise-Kunden, aber nicht in v1 |
| SOC 2 | ⏳ Perspektivisch | Internationaler Standard, evaluieren nach Go-Live |

**Regeln:**
- Die Architektur ist so gestaltet, dass ISO 27001 und SOC 2 nachträglich erreichbar sind (TOMs bereits umgesetzt)
- Branchenspezifische Compliance wird nur bei konkretem Kundenbedarf evaluiert
- „Keine Zertifizierung" ist eine bewusste Entscheidung, um Kosten in der Startup-Phase zu begrenzen

---

## Begründung
- **Anonymisierung statt Löschung** löst den GoBD/DSGVO-Konflikt elegant – Beleg-Integrität bleibt erhalten, PII wird entfernt
- **`[PersonalData]`/`[PiiField]`-Attribute** machen PII im Code sichtbar und steuerbar – automatisierte Compliance statt manueller Listen
- **Database-per-Tenant** (ADR-06000) ist der stärkste Privacy-by-Design-Mechanismus – physische Trennung statt logischer Filter
- **Self-Service für Betroffenenrechte** (DSAR, Anonymisierung) reduziert operativen Aufwand und beschleunigt Reaktionszeiten
- **EU-only-Datenresidenz** (ADR-00008) eliminiert Schrems-II-Problematik und vereinfacht die AVV
- **Kein Cookie-Banner** nötig – bewusster Verzicht auf Tracking vereinfacht UX und Compliance gleichzeitig
- **Retention-Automatisierung** verhindert, dass Daten "vergessen" werden und ewig gespeichert bleiben

## Alternativen

1) **Physische Löschung statt Anonymisierung**
   - Vorteile: Einfacher, eindeutiger „gelöscht = weg"
   - Nachteile: Verstößt gegen GoBD-Aufbewahrungspflichten für Buchungen/Belege, Audit-Trail wird beschädigt

2) **Customer-managed Keys (CMK) für Verschlüsselung**
   - Vorteile: Kunden behalten Kontrolle über Verschlüsselungsschlüssel
   - Nachteile: Deutlich höhere Komplexität, Key-Rotation-Pflicht, Risiko von Datenverlust bei Schlüsselverlust, kein Kundenwunsch aktuell

3) **Mandantenspezifische Regionswahl**
   - Vorteile: Kunden können Datenresidenz pro Land wählen
   - Nachteile: Multi-Region-Architektur deutlich komplexer, höhere Kosten, kein Kundenbedarf außerhalb EU (ADR-00008)

## Konsequenzen

### Positiv
- DSGVO-Compliance ist architektonisch verankert, nicht nachträglich aufgesetzt
- Betroffenenrechte sind Self-Service – minimaler manueller Aufwand für Support
- GoBD und DSGVO koexistieren durch Anonymisierungsstrategie
- PII ist im Code explizit annotiert → automatisierte Prüfungen und Reports möglich
- Database-per-Tenant als stärkste Form der Datentrennung
- Keine Cookie-Compliance-Probleme dank Verzicht auf Tracking

### Negativ / Trade-offs
- `[PersonalData]`/`[PiiField]`-Annotation erfordert Disziplin bei neuen Entities
- Anonymisierung ist irreversibel – Fehler bei der Zuordnung können nicht rückgängig gemacht werden
- DSAR-Generierung bei großen Tenants kann ressourcenintensiv sein (Background Job für Large Tenants)
- Retention-Automatisierung muss sorgfältig konfiguriert werden – zu aggressive Löschung kann Aufbewahrungspflichten verletzen
- AVV-Management ist ein organisatorischer Prozess, nicht rein technisch lösbar

### Umsetzungshinweise
- `[PersonalData]` und `[PiiField]` Attributes im `SharedKernel.Domain` definieren
- ArchTest: Alle Entities mit typischen PII-Feldnamen (Name, Email, Phone, Address) müssen `[PersonalData]` tragen
- ArchTest: Structured Logs dürfen keine `[PiiField]`-Werte enthalten (Serilog Destructuring Policy)
- EF Core Convention: `[PiiField]`-Properties werden automatisch als `.IsSensitive()` markiert
- PII-Redaction-Enricher für Serilog implementieren
- `IDataSubjectAccessService` und `IPersonalDataAnonymizer` als Application Layer Services
- Monthly Retention Check als Background Job (ADR-05500)
- Breach-Log-Tabelle in zentraler Admin-DB (nicht Tenant-DB)

## Verweise
- ADR-00008 (Plattform – Datenresidenz EU-only, Verschlüsselung)
- ADR-03000 (Authentifizierung – Entra ID, OAuth 2.0, MFA)
- ADR-03100 (Autorisierung – Permission-basiert, Tenant-isoliert)
- ADR-03400 (Security-Audit – Login-Events, Zugriffsprotokollierung)
- ADR-04000 (Logging – Structured Logs, keine PII in Logs)
- ADR-04100 (Telemetrie – Application Insights, IP-Anonymisierung)
- ADR-05800 (Daten-Audit – PII in Audit-Logs, Anonymisierung bei DSGVO-Löschung)
- ADR-06000 (Multi-Tenancy – Database-per-Tenant, physische Isolation)
- ADR-06200 (Tenant Lifecycle – Deaktivierung, Löschung, Anonymisierung, Karenzzeit)
- ADR-08500 (File Storage – Immutability Policies, Blob-Löschung)
- ADR-09100 (SLOs/Monitoring – Alerts für Datenpannen-Erkennung)
- ADR-50000 (Finanzwesen – GoBD-Aufbewahrungspflichten)
