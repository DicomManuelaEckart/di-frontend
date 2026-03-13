---
id: ADR-01500
title: Domain Errors & Ergebnis-Modelle
status: accepted
date: 2026-01-20
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-01500 – Domain Errors & Ergebnis-Modelle

## Entscheidungstreiber
- Klare fachliche Fehlerkommunikation
- Trennung von fachlichen und technischen Fehlern
- Testbarkeit und Vorhersagbarkeit
- Einheitliches Verhalten über Domain, Application und Presentation hinweg
- Agentenfähige, reproduzierbare Patterns

## Kontext
Fachliche Regeln können verletzt werden (z. B. “Kunde existiert bereits”,
“Limit überschritten”, “Status erlaubt diese Aktion nicht”).
Ohne klare Regeln entstehen häufig:
- generische Exceptions
- technische Exceptions für fachliche Probleme
- inkonsistente Fehlercodes/Responses
- schwer testbare Fehlerpfade

Wir wollen fachliche Fehler **explizit modellieren** und sie sauber von
technischen Fehlern trennen.

## Entscheidung
Wir unterscheiden strikt zwischen **Domain Errors** und **Technical Errors**
und verwenden **explizite Ergebnis-Modelle**:

1) **Domain Errors**
   - repräsentieren fachliche Regelverletzungen
   - sind Teil der Domain
  - enthalten:
    - stabilen, lokalisierbaren **Message Key** (kein übersetzter Klartext)
    - fachliche Bedeutung (keine UI-Texte, keine Sprach-abhängigen Strings)
    - optional: Kontextdaten (IDs, Werte) als Parameter für Interpolation

2) **Domain Errors werden nicht als technische Exceptions behandelt**
   - Domain wirft keine Framework- oder Infrastruktur-Exceptions
   - Domain Errors werden gezielt ausgelöst

3) **Use Cases (Application) arbeiten mit Result-/Outcome-Modellen**
   - Ein Command/Query liefert:
     - Success(Result)
     - oder Failure(DomainError)

4) **Presentation übersetzt Domain Errors in API/UI-Responses**
   - Mapping zu HTTP Status Codes / ProblemDetails / UI-Messages
   - Localization erfolgt außerhalb der Domain (siehe ADR-00500)

## Begründung
- Fachliche Fehler sind Teil des Fachmodells und keine Ausnahmen
- Ergebnis-Modelle sind explizit, testbar und vorhersagbar
- Klare Trennung verhindert Exception-Missbrauch
- Agenten können Failure-Pfade standardisiert generieren

## Alternativen
1) Exceptions für alles
   - Vorteile: wenig Code
   - Nachteile: Kontrollfluss über Exceptions, schwer testbar, uneinheitlich

2) Rückgabe von `null` / bool
   - Vorteile: simpel
   - Nachteile: keine Information, fehleranfällig

3) Nur technische Fehler unterscheiden
   - Vorteile: einfach
   - Nachteile: fachliche Bedeutung geht verloren

## Konsequenzen
### Positiv
- Einheitliches Fehlerverhalten
- Saubere Tests für Failure-Szenarien
- Klare Verträge zwischen Schichten
- Gute Basis für Localization & API-Standards

### Negativ / Trade-offs
- Mehr Typen (Error, Result, Outcome)
- Initialer Implementierungsaufwand
- Disziplin bei konsequenter Nutzung nötig

## Umsetzungshinweise

### A) Domain Errors
- Domain Errors sind eigene Typen (z. B. `CustomerAlreadyExists`)
- Jeder Domain Error besitzt:
  - stabilen Code (string/enum)
  - optionale Parameter (z. B. `CustomerId`)
- Keine UI-Texte, keine Localization

### B) Result / Outcome Modell
- Einheitlicher Result-Typ (z. B. `Result<T>`):
  - `IsSuccess`
  - `Value`
  - `Error`

### C) Verwendung im Domain-Modell
- Aggregate-Methoden:
  - liefern DomainError oder
  - erzwingen Fehler bewusst (z. B. Factory-Methode)
- Keine “stille” Fehlerbehandlung

### D) Application Layer
- Commands/Queries geben Result-Modelle zurück
- Orchestrierung mehrerer Domain-Operationen aggregiert Errors bewusst

### E) Presentation
- Mapping DomainError → HTTP Status / ProblemDetails
- Error Codes sind Teil des API-Vertrags
- Localization erfolgt anhand des Error Codes
- Bis zur Lokalisierungs-Implementierung (F0019) wird der Message Key direkt als `detail` im ProblemDetails-Response ausgegeben – kein Übersetzungsaufwand initial nötig

### F) Architekturtests (ArchTests)
Mindestens:
1) Domain Errors liegen ausschließlich im Domain-Projekt
2) Domain referenziert keine HTTP/Framework/Localization-Typen
3) Application/Presentation behandeln Domain Errors, erzeugen sie aber nicht neu
4) Technische Exceptions werden nicht als Domain Errors gemappt

### G) Message Keys & Lokalisierbarkeit

> **Domain Errors dürfen KEINE übersetzten Klartexte enthalten.**
> Sie verwenden ausschließlich stabile **Message Keys**.

**Key-Konvention:**
{bounded-context}.{aggregate}.{field}.{rule}

**Beispiele:**
| Message Key | Bedeutung |
|-------------|-----------|
| `customer.name.required` | Kundenname ist Pflichtfeld |
| `customer.email.invalid` | E-Mail-Adresse hat ungültiges Format |
| `order.total.must-be-positive` | Bestellsumme muss positiv sein |
| `customer.already.exists` | Kunde mit dieser Nummer existiert bereits |

**Regeln:**
- Keys sind `lower-kebab-case`, hierarchisch mit `.` getrennt
- Keys sind **stabil** – sie ändern sich nicht nach Einführung (Breaking Change für Clients)
- Keys werden als `string`-Konstanten in statischen Klassen oder als `const` im Aggregate definiert
- Die Übersetzung der Keys erfolgt in `F0019` (Localization) außerhalb der Domain
- Bis F0019 aktiv ist, gibt die API den Key direkt aus – das ist akzeptierter Zwischenzustand

**Implementierungsbeispiel:**
```csharp
// Im Aggregate oder separater ErrorCodes-Klasse
public static class CustomerErrorCodes
{
    public const string NameRequired     = "customer.name.required";
    public const string EmailInvalid     = "customer.email.invalid";
    public const string AlreadyExists   = "customer.already.exists";
}

// Verwendung
DomainError.Validation(CustomerErrorCodes.NameRequired)
DomainError.Validation(CustomerErrorCodes.EmailInvalid, email)  // Parameter für Interpolation

## Verweise
- ADR-00001 (Clean Architecture)
- ADR-00002 (ArchTests)
- ADR-00003 (CQRS)
- ADR-05000 (Localization / i18n)
- ADR-01000 (DDD Ansatz)
- ADR-01200 (Domain Events)
- ADR-01400 (Value Objects)
