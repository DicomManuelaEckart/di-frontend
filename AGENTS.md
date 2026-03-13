# AGENTS.md

> Rules for coding agents working in this repository.

## Repository Context

This is the **di-frontend** Angular SPA application.
Architecture decisions are documented in `governance-base/adr/10-frontend/`.

## Allowed

- Implement tasks from the playbook
- Write and extend tests (unit & component tests)
- Refactoring within the explicit task scope
- Bug fixes based on GitHub Issues
- Generate components using Angular CLI (`ng generate`)
- Add navigation entries for new features

## Forbidden

- Create or modify files in `governance-base/` (read-only submodule)
- Make architecture decisions without ADR reference
- Implicit refactoring beyond the task scope
- Add new dependencies without explicit approval
- Suppress TypeScript or ESLint warnings (`@ts-ignore`, `eslint-disable`)
- Use NgModules (use standalone components only)
- Place business logic in templates or layout components
- Call HTTP endpoints directly from components (use services)
- Mix multiple UI component libraries

## Structure Rules

- Components use **OnPush** change detection
- Features go under `src/app/features/<feature-name>/`
- Each feature has: `models/`, `services/`, `pages/`, `<feature>.routes.ts`
- Shared components go under `src/app/shared/`
- Core singletons go under `src/app/core/`
- Layout components go under `src/app/layout/`
- Tests are placed next to source files (`*.spec.ts`)
- API models are TypeScript interfaces, not classes
- All styles use CSS Custom Properties (design tokens) from `styles.scss`

## On Uncertainty

> **Stop, state assumptions explicitly, or escalate to a human.**

- Requirements unclear → ask
- Architecture decision needed → escalate
- Scope extension needed → request new task
- Multiple solutions possible → document options, don't guess
