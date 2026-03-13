---
id: ADR-00000
title: Architecture Decision Review Process
status: accepted
date: 2026-01-21
scope: global
enforced_by: convention
affects:
  - backend
  - frontend
  - admin
  - infrastructure
  - printservice
---

# ADR-00000 – Architecture Decision Review Process

## Zweck
Dieses ADR definiert **wie Architekturentscheidungen überprüft, weiterentwickelt und abgelöst werden**.  
Ziel ist es, Architektur **stabil, aber reviewbar** zu halten – transparent für Menschen und nutzbar für Agenten.

**Primäre Ziele:**
- Regelmäßige Überprüfung & Bestätigung bestehender ADRs
- Gesteuerte Weiterentwicklung / Ablösung von ADRs
- Transparenz & Nachvollziehbarkeit

---

## Architektur-Haltung
Die Architektur folgt einer **Mischform**:
- ADRs sind grundsätzlich **stabil**
- Änderungen sind **erwartet**, aber **kontrolliert**

ADRs sind kein Einmal-Dokument, sondern ein **lebendiges Entscheidungsprotokoll**.

---

## Review-Anlässe
Ein ADR-Review **MUSS** stattfinden bei:

- Größeren Releases
- Größeren Architektur-Spikes oder Refactorings
- Wiederkehrenden Incidents oder Produktionsproblemen
- Geänderten fachlichen oder organisatorischen Anforderungen
- Regelmäßig (z. B. jährlich)

Zusätzlich können Reviews **ereignisgetrieben** erfolgen.

---

## Review-Scope
Der Scope eines Reviews ist **anlassabhängig** und kann umfassen:

- Einzelne ADRs
- Thematische Blöcke (z. B. Security, Persistence, Operations)
- Die gesamte Architektur

---

## Mögliche Review-Ergebnisse
Ein Review kann zu folgenden Ergebnissen führen:

- **Bestätigung**: ADR bleibt gültig
- **Präzisierung**: ADR wird eingeschränkt oder ergänzt
- **Ersetzung**: ADR wird durch eine neue ADR ersetzt (*Superseded*)
- **Deprecation**: ADR ist nicht mehr empfohlen
- **Ergänzung**: Neue ADR wird hinzugefügt

### Änderungsregel
> **Bestehende ADRs werden nicht direkt geändert.**

Änderungen erfolgen ausschließlich über:
- neue ADRs
- Statusänderungen
- explizite Referenzen

---

## ADR-Status
Zulässige Statuswerte:

- **Proposed**
- **Accepted**
- **Deprecated**
- **Superseded**

Statusänderungen müssen dokumentiert und nachvollziehbar sein.

---

## Referenzen & Nachvollziehbarkeit
Referenzen werden **beidseitig** gepflegt:

- Alte ADRs verweisen auf neue
- Neue ADRs referenzieren ersetzte oder eingeschränkte ADRs

Der ADR-Index (`index.md`) wird entsprechend aktualisiert.

---

## Verantwortlichkeiten
### Initiierung
ADR-Reviews können initiiert werden durch:
- jedes Teammitglied
- Tech Leads / Architekten
- einen definierten Kreis  
(je nach Anlass)

### Entscheidung
Die **finale Entscheidungsverantwortung** liegt beim:
- **Tech Lead / Architekten**

Konsens wird angestrebt, ist aber nicht zwingend.

---

## Verbindung zu CI & ArchTests
Nach einer ADR-Änderung **müssen**:

- ArchTests überprüft und ggf. angepasst werden
- CI-Gates validiert werden
- Dokumentation aktualisiert werden

### Konfliktfall: ArchTests vs. ADR
- ArchTests dürfen ADRs **nur mit expliziter Dokumentation** temporär „überholen“
- Jede Abweichung erfordert eine klare Begründung und Nachverfolgung

---

## Agenten & Automatisierung
### ADR-Nutzung durch Agenten
- Agenten **müssen** ADR-Status berücksichtigen
  - `Deprecated` / `Superseded` ADRs dürfen nicht mehr als gültig angenommen werden

### Agenten-Rechte
Agenten dürfen:
- ADRs lesen
- **Vorschläge machen**
- **Draft-ADRs erzeugen**

Die finale Entscheidung bleibt menschlich.

---

## Formalität & Review-Zyklen
Der Review-Prozess ist **leichtgewichtig**:

- Checkliste + ADR-Dokumentation
- kein formales Gremium notwendig

Review-Zyklen:
- **ereignisgetrieben**
- **zusätzlich regelmäßig** (z. B. jährlich)

---

## Begründung
- Architektur bleibt konsistent und nachvollziehbar
- Änderungen werden sichtbar und kontrolliert
- Agenten können valide Entscheidungen treffen
- ArchTests bleiben mit Architektur synchron
- Vermeidet stille Erosion der Architektur

---

## Konsequenzen

### Positiv
- Lebendige, belastbare Architektur
- Klare Entscheidungswege
- Hohe Transparenz für Team & Stakeholder
- Gute Grundlage für Automatisierung und Agenten

### Negativ / Trade-offs
- Erfordert Disziplin in Dokumentation
- Initialer Aufwand für Reviews
- Entscheidungen müssen bewusst getroffen werden

---

## Verweise
- ADR-00001 (Clean Architecture)
- ADR-00002 (Architecture Tests & Governance)
- ADR-02000–02200 (Testing & CI)
- ADR-04000–04100 (Logging & Telemetry)
- ADR-09000 (Health Checks & Readiness)
