---
id: ADR-00002
title: Abhängigkeitsregeln und Architektur-Gates (ArchTests)
status: accepted
date: 2026-01-20
scope: backend
enforced_by: archtests
affects:
  - backend
---

# ADR-00002 – Abhängigkeitsregeln und Architektur-Gates (ArchTests)

## Entscheidungstreiber
- Vermeidung von Architektur-Drift
- Reproduzierbarkeit und Konsistenz bei wachsendem Team
- Unterstützung von Agenten durch maschinenprüfbare Regeln

## Kontext
Ohne automatisierte Durchsetzung werden Layer-Grenzen erfahrungsgemäß im Alltag verletzt
(Quick Fixes, “nur kurz”, Copy-Paste). Das führt zu schwieriger Wartung.

## Entscheidung
Wir implementieren Architektur-Gates in CI:
- Architekturt tests (z. B. NetArchTest o. ä.) prüfen Layer-Abhängigkeiten
- Build schlägt fehl, wenn Regeln verletzt werden

## Begründung
- Regeln werden objektiv durchgesetzt (nicht nur “Coding Guidelines”)
- Agenten können sicherer Scaffold erzeugen, weil Verstöße sofort sichtbar sind
- Reduziert Review-Last

## Alternativen
1) Nur Code Reviews
   - Vorteile: Keine Zusatztechnik
   - Nachteile: Nicht zuverlässig, abhängig von Reviewer-Aufmerksamkeit

2) Dokumentation/Wiki-Regeln ohne Tests
   - Vorteile: Schnell geschrieben
   - Nachteile: Wird schnell ignoriert oder vergessen

## Konsequenzen
### Positiv
- Architektur bleibt stabil über Zeit
- Schnellere Reviews (weniger Grundsatzdiskussionen)

### Negativ / Trade-offs
- Initialer Aufwand für Tests und Paketwahl
- Regeln müssen gepflegt werden, wenn Struktur sich ändert

### Umsetzungshinweise
- Regelset mindestens:
  - Domain → keine Referenzen auf Application/Infrastructure/Presentation
  - Application → keine Referenzen auf Infrastructure/Presentation
  - Presentation → keine Referenzen auf Infrastructure (außer Composition Root, falls überhaupt)
- Zusätzlich optional:
  - “No EF Core in Domain/Application”
  - “No DTOs in Domain”
- CI Pipeline bricht bei Verletzung

## Verweise
- ADR-00001 (Clean Architecture)
- ADR-00003 (CQRS)
