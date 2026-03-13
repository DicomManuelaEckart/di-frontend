# DI Frontend

Angular SPA frontend for the DI ERP system.

## Tech Stack

- **Angular** 21 (latest stable) with standalone components
- **TypeScript** (strict mode)
- **SCSS** for styling
- **Vitest** for unit & component testing
- **ESLint** + **Prettier** for linting & formatting

## Prerequisites

- Node.js >= 22 (see `.nvmrc`)
- npm >= 10

```bash
# Use the correct Node version (if using nvm)
nvm use
```

## How to Build

```bash
npm run build
```

This runs `ng build` and produces a production bundle in `dist/di-frontend/`.

## How to Test

```bash
npm test
```

This runs `ng test` using Vitest. Test files are placed next to source files (`*.spec.ts`).

## How to Run

```bash
npm start
```

This starts the Angular development server at `http://localhost:4200`.

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm start
# → http://localhost:4200

# Build for production
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## Project Structure

```
src/
├── app/
│   ├── core/              # Singletons: Guards, Interceptors, central Services
│   ├── shared/            # Reusable: Components, Pipes, Directives
│   ├── layout/            # Shell, Header, Footer, Sidenav
│   └── features/          # Feature areas (folders-by-feature)
│       ├── blueprint/     # Reference feature (template for new features)
│       └── errors/        # Error pages (404, 403)
├── environments/          # Environment configuration
├── i18n/                  # Localization files
├── styles.scss            # Global styles & design tokens
└── main.ts                # Application entry point
```

## Architecture

- **ADR-10000** – SPA Architecture & Project Structure
- **ADR-10100** – UI Layout & Component Structure
- **ADR-10400** – Routing & Navigation
- **ADR-10900** – Frontend Testing Strategy

All ADRs are available in the `governance-base/` submodule.

## Conventions

- **Standalone Components** (no NgModules)
- **OnPush Change Detection** for all components
- **Signals** for reactive state management
- **Lazy Loading** for feature routes
- **CSS Custom Properties** for design tokens (see `styles.scss`)
- **Testfiles** placed next to source files (`*.spec.ts`)
- Test naming: `should <expected behavior> when <scenario>`

## Adding a New Feature

1. Create a folder under `src/app/features/<feature-name>/`
2. Add sub-folders: `models/`, `services/`, `pages/`
3. Create route config: `<feature-name>.routes.ts`
4. Register lazy route in `src/app/app.routes.ts`
5. Add navigation entry in `src/app/layout/sidenav/sidenav.ts`

See `src/app/features/blueprint/` as reference implementation.