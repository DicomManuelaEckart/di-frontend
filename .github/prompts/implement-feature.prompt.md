# Implement Feature: `{{FEATURE_NAME}}`

> Reusable prompt for implementing a standard CRUD feature in the di-frontend Angular SPA.
> The feature consists of a **list page** (grid) and a **create/edit page** (form).

## Input

You will receive a **feature name** from the user (e.g. `countries`, `currencies`, `tax-rates`).
Use this name to:

1. **Search `openapi/erp-api.json`** for matching API paths and schemas.
   - Look in `paths` for endpoints whose path or `tags` match the feature name (case-insensitive, singular/plural).
   - Look in `components/schemas` for request/response DTOs matching the feature name.
   - If no match is found, **stop and ask the user** for the exact API tag or path prefix.

2. **Derive identifiers** from the feature name using these conventions:
   | Identifier | Example (`tax-rates`) |
   |---|---|
   | Feature folder | `src/app/features/tax-rates/` |
   | Route prefix | `tax-rates` |
   | Component class prefix | `TaxRate` (PascalCase, singular) |
   | File prefix | `tax-rate` (kebab-case, singular) |
   | Service class | `TaxRateService` |
   | Model interfaces | `TaxRate`, `TaxRateListItem`, etc. |
   | i18n key prefix | `taxRates` (camelCase) |
   | Permission prefix | `tax-rates` |
   | Nav label | User-friendly name (e.g. "Tax Rates") |

---

## Governance Rules

Before writing any code, internalize these rules from `governance-base/`:

- **Standalone components only** — no NgModules (`governance-base/agent/agent-governance.md`)
- **OnPush change detection** on every component
- **No `@ts-ignore` or `eslint-disable`** — fix root causes (`governance-base/agent/definition-of-done.md`)
- **No business logic in templates or layout components** — use services
- **No direct HTTP calls from components** — use feature services
- **No new dependencies** without explicit user approval
- **`governance-base/` is read-only** — never create or modify files there
- Architecture decisions require an ADR reference — escalate if needed
- On uncertainty: **stop, state assumptions, ask the user**

---

## Reference Implementation

The `blueprint` feature is the canonical reference. Mirror its structure exactly:

```
src/app/features/blueprint/
├── blueprint.routes.ts
├── models/
│   ├── blueprint-article.model.ts        # TypeScript interfaces (not classes)
│   └── blueprint-customer.model.ts
├── services/
│   ├── blueprint.service.ts              # Signal-based state service
│   ├── blueprint.service.spec.ts
│   ├── blueprint-customer.service.ts     # HTTP API service
│   └── blueprint-customer.service.spec.ts
├── utils/                                # Optional: mappers, domain validators
│   ├── blueprint-article.mapper.ts
│   └── blueprint-article.validators.ts
└── pages/
    ├── blueprint-list/
    │   ├── blueprint-list.ts
    │   ├── blueprint-list.html
    │   ├── blueprint-list.scss
    │   ├── blueprint-list.spec.ts
    │   └── blueprint-list.integration.spec.ts
    └── blueprint-create-edit/
        ├── blueprint-create-edit.ts
        ├── blueprint-create-edit.html
        ├── blueprint-create-edit.scss
        └── blueprint-create-edit.spec.ts
```

---

## Step-by-Step Implementation

### Step 1 — Analyze the OpenAPI Spec

1. Open `openapi/erp-api.json`.
2. Search `paths` for endpoints matching `{{FEATURE_NAME}}` (by path segment or `tags` array).
3. Identify:
   - **List endpoint** (GET returning a paged collection)
   - **Get-by-ID endpoint** (GET with path parameter)
   - **Create endpoint** (POST)
   - **Update endpoint** (PUT/PATCH)
   - **Delete endpoint** (DELETE, if present)
4. Collect all referenced `$ref` schemas from `components/schemas`.
5. **If the API spec does not contain matching endpoints or schemas, stop and ask the user.**

### Step 2 — Create Models (`models/`)

Create TypeScript **interfaces** (not classes) in `src/app/features/{{feature-name}}/models/`:

```typescript
// Example: src/app/features/tax-rates/models/tax-rate.model.ts

// List item — only fields shown in the grid
export interface TaxRateListItem {
  readonly id: string;
  readonly name: string;
  readonly rate: number;
  readonly validFrom: string;
}

// Full detail — all fields for the form
export interface TaxRate {
  readonly id: string;
  readonly name: string;
  readonly rate: number;
  readonly validFrom: string;
  readonly description: string;
}

// Create/Update request body — matches OpenAPI request schema
export interface CreateTaxRateRequest {
  readonly name: string;
  readonly rate: number;
  readonly validFrom: string;
  readonly description: string;
}

export interface UpdateTaxRateRequest {
  readonly name: string;
  readonly rate: number;
  readonly validFrom: string;
  readonly description: string;
}
```

Rules:
- All properties are `readonly`
- Interfaces, not classes (per `AGENTS.md`)
- Derive field names and types from the OpenAPI `components/schemas`
- Use `string` for dates (ISO 8601 format from API)
- Use `string` for UUIDs

### Step 3 — Create the API Service (`services/`)

Create an HTTP service following the pattern in `blueprint-customer.service.ts`:

```typescript
// src/app/features/tax-rates/services/tax-rate-api.service.ts

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';
import { PagedResponse, PaginationParams } from '../../../shared/models/pagination.model';
import { TaxRateListItem, TaxRate, CreateTaxRateRequest, UpdateTaxRateRequest } from '../models/tax-rate.model';

@Injectable({ providedIn: 'root' })
export class TaxRateApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/tax-rates`; // ← derive from OpenAPI path

  getAll(params?: PaginationParams): Observable<PagedResponse<TaxRateListItem>> {
    let httpParams = new HttpParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value != null) {
          httpParams = httpParams.set(key, value);
        }
      }
    }
    return this.http.get<PagedResponse<TaxRateListItem>>(this.baseUrl, { params: httpParams });
  }

  getById(id: string): Observable<TaxRate> {
    return this.http.get<TaxRate>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateTaxRateRequest): Observable<TaxRate> {
    return this.http.post<TaxRate>(this.baseUrl, request);
  }

  update(id: string, request: UpdateTaxRateRequest): Observable<TaxRate> {
    return this.http.put<TaxRate>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
```

Rules:
- Inject `API_BASE_URL` — never import `environment` directly
- Return `Observable<T>` with typed responses
- Do **not** catch HTTP errors (handled by `http-error.interceptor.ts`)
- Base URL path must match the OpenAPI spec paths (strip `/api/v1` prefix — it's in `API_BASE_URL`)

### Step 4 — Create the State Service (`services/`)

Create a signal-based state service following `blueprint.service.ts` and `docs/state-management.md`:

```typescript
// src/app/features/tax-rates/services/tax-rate.service.ts

import { computed, Injectable, signal } from '@angular/core';
import { TaxRateListItem } from '../models/tax-rate.model';

@Injectable({ providedIn: 'root' })
export class TaxRateService {
  private readonly itemsSignal = signal<TaxRateListItem[]>([]);
  private readonly loadingSignal = signal(false);

  readonly items = this.itemsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly itemCount = computed(() => this.itemsSignal().length);
  readonly hasItems = computed(() => this.itemsSignal().length > 0);

  setItems(items: TaxRateListItem[]): void {
    this.itemsSignal.set(items);
  }

  setLoading(loading: boolean): void {
    this.loadingSignal.set(loading);
  }
}
```

Rules:
- Writable signals are **private** — expose via `asReadonly()`
- Mutation only through named methods
- Use `computed()` for derived state
- No `effect()` for state synchronization

### Step 5 — Create the List Page (`pages/`)

Create the list component at `src/app/features/{{feature-name}}/pages/{{feature-name}}-list/`:

**Component (`.ts`):**
- Use `ChangeDetectionStrategy.OnPush`
- Inject the state service and the API service
- Use the shared `ReferenceGrid` component (`src/app/shared/components/reference-grid/reference-grid`)
- Define `GridColumn[]` for the grid columns (fields from the list model)
- Load data via the API service on init, store in the state service
- Handle row selection to navigate to create/edit page

**Template (`.html`):**
```html
<div class="{{feature-name}}-list">
  <h1>{{ '{{i18nPrefix}}.title' | translate }}</h1>

  @if (loading()) {
    <p>{{ 'common.loading' | translate }}</p>
  } @else {
    <app-reference-grid
      [data]="items()"
      [columns]="columns"
      [pageSize]="20"
      primaryKey="id"
      (rowSelected)="onRowSelected($event)"
    />
  }
</div>
```

Import requirements:
```typescript
import { ReferenceGrid, GridColumn } from '../../../../shared/components/reference-grid/reference-grid';
import { TranslatePipe } from '@ngx-translate/core';
```

### Step 6 — Create the Create/Edit Page (`pages/`)

Create the form component at `src/app/features/{{feature-name}}/pages/{{feature-name}}-create-edit/`:

Follow `blueprint-create-edit.ts` exactly for:

**Component (`.ts`):**
- `ChangeDetectionStrategy.OnPush`
- `input<string>()` for the route `:id` parameter (edit mode) — uses `withComponentInputBinding()`
- `computed(() => !!this.id())` for `isEditMode`
- Typed reactive form via `inject(FormBuilder)` with validators from `shared/validators/custom-validators`
- Form-state signals: `isValid`, `isDirty`, `isPending` via `toSignal()`
- `onSubmit()`: call API service create/update, navigate back to list on success
- `onCancel()`: navigate back to list
- `showErrors(controlName)`: helper for template error display
- Load entity for edit mode via API service in `ngOnInit()`

**Template (`.html`):**
- Use IgniteUI form components:
  - `IgxInputGroupComponent` + `IgxInputDirective` + `IgxLabelDirective` + `IgxHintDirective` from `@infragistics/igniteui-angular/input-group`
  - `IgxCheckboxComponent` from `@infragistics/igniteui-angular/checkbox` (for booleans)
- Use `TranslatePipe` for all labels and messages
- Use `@if (showErrors('field'))` blocks for validation messages
- Derive form fields from the OpenAPI create/update request schema

Import requirements:
```typescript
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  IgxInputGroupComponent, IgxInputDirective, IgxLabelDirective, IgxHintDirective,
} from '@infragistics/igniteui-angular/input-group';
import { IgxCheckboxComponent } from '@infragistics/igniteui-angular/checkbox';
import { CustomValidators } from '../../../../shared/validators/custom-validators';
```

### Step 7 — Create Routes (`{{feature-name}}.routes.ts`)

```typescript
import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth-guard';
import { permissionGuard } from '../../core/guards/permission-guard';

export const {{featureCamelCase}}Routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/{{feature-name}}-list/{{feature-name}}-list').then(
        (m) => m.{{FeaturePascal}}List,
      ),
    title: '{{Feature Label}} – List',
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/{{feature-name}}-create-edit/{{feature-name}}-create-edit').then(
        (m) => m.{{FeaturePascal}}CreateEdit,
      ),
    title: '{{Feature Label}} – Create',
    canActivate: [authGuard, permissionGuard],
    data: { permission: '{{feature-name}}.create' },
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./pages/{{feature-name}}-create-edit/{{feature-name}}-create-edit').then(
        (m) => m.{{FeaturePascal}}CreateEdit,
      ),
    title: '{{Feature Label}} – Edit',
    canActivate: [authGuard, permissionGuard],
    data: { permission: '{{feature-name}}.edit' },
  },
];
```

### Step 8 — Register in App Router

Add the feature to `src/app/app.routes.ts` inside the `Shell` children array:

```typescript
{
  path: '{{feature-name}}',
  loadChildren: () =>
    import('./features/{{feature-name}}/{{feature-name}}.routes').then(
      (m) => m.{{featureCamelCase}}Routes,
    ),
},
```

### Step 9 — Add Sidenav Entry

Add a `NavItem` to the `navItems` array in `src/app/layout/sidenav/sidenav.ts`:

```typescript
readonly navItems: NavItem[] = [
  // ...existing entries...
  { label: '{{Feature Label}}', route: '/{{feature-name}}', icon: '📋' },
];
```

Ask the user which icon emoji or Material icon name to use if unclear.

### Step 10 — Add i18n Keys

Add translation keys to **both** `src/assets/i18n/de.json` and `src/assets/i18n/en.json`:

```json
{
  "{{i18nPrefix}}": {
    "title": "{{Feature Label}} – Liste",
    "createEdit": {
      "titleCreate": "{{Feature Label}} – Erstellen",
      "titleEdit": "{{Feature Label}} – Bearbeiten"
    },
    "fields": {
      "fieldName1": "Label DE",
      "fieldName2": "Label DE"
    }
  }
}
```

Also add the sidenav label:
```json
{
  "layout": {
    "sidenav": {
      "{{i18nKey}}": "{{Feature Label}}"
    }
  }
}
```

Derive field labels from the OpenAPI schema property names. Ask the user for German translations if unsure.

### Step 11 — Write Tests

For every file, create a colocated `*.spec.ts`:

**API Service test** (follow `blueprint-customer.service.spec.ts` pattern):
- Use `provideHttpClient()` + `provideHttpClientTesting()` + `{ provide: API_BASE_URL, useValue: '...' }`
- Test each HTTP method (getAll, getById, create, update, delete)
- Call `httpTesting.verify()` in `afterEach`

**State Service test** (follow `blueprint.service.spec.ts` pattern):
- Test initial state (empty items, loading false)
- Test mutation methods (setItems, setLoading)
- Test computed signals (itemCount, hasItems)

**List Page test** (follow `blueprint-list.spec.ts` pattern):
- TestBed component test: create, empty state, loading state
- Integration test (`.integration.spec.ts`): use `@testing-library/angular` `render`/`screen`

**Create/Edit Page test** (follow `blueprint-create-edit.spec.ts` pattern):
- Provide: `provideRouter([])`, `provideAnimations()`, `provideTranslateService({ defaultLanguage: 'en' })`
- Test: creation, create vs edit mode, form validity, required fields, signal state, submit behavior

### Step 12 — Validate

Run these commands and ensure zero errors:

```bash
npm run build
npm test
npm run lint
```

---

## Questions to Ask the User

If any of the following are unclear, **stop and ask**:

- [ ] The feature name does not match any tag or path in `openapi/erp-api.json` — what is the correct API tag/path?
- [ ] The OpenAPI spec has multiple endpoint groups that could match — which one?
- [ ] A field type in the OpenAPI schema is ambiguous — what TypeScript type to use?
- [ ] German translations for field labels — what are the correct labels?
- [ ] Which icon should the sidenav entry use?
- [ ] The OpenAPI spec has additional operations (e.g. bulk delete, export) beyond basic CRUD — should they be included?
- [ ] The create and update request schemas differ significantly — should the form handle both or separate components?

---

## Files Modified Checklist

After implementation, verify all these files were created or modified:

**New files:**
- [ ] `src/app/features/{{feature-name}}/models/{{entity}}.model.ts`
- [ ] `src/app/features/{{feature-name}}/services/{{entity}}-api.service.ts`
- [ ] `src/app/features/{{feature-name}}/services/{{entity}}-api.service.spec.ts`
- [ ] `src/app/features/{{feature-name}}/services/{{entity}}.service.ts`
- [ ] `src/app/features/{{feature-name}}/services/{{entity}}.service.spec.ts`
- [ ] `src/app/features/{{feature-name}}/pages/{{feature-name}}-list/{{feature-name}}-list.ts`
- [ ] `src/app/features/{{feature-name}}/pages/{{feature-name}}-list/{{feature-name}}-list.html`
- [ ] `src/app/features/{{feature-name}}/pages/{{feature-name}}-list/{{feature-name}}-list.scss`
- [ ] `src/app/features/{{feature-name}}/pages/{{feature-name}}-list/{{feature-name}}-list.spec.ts`
- [ ] `src/app/features/{{feature-name}}/pages/{{feature-name}}-list/{{feature-name}}-list.integration.spec.ts`
- [ ] `src/app/features/{{feature-name}}/pages/{{feature-name}}-create-edit/{{feature-name}}-create-edit.ts`
- [ ] `src/app/features/{{feature-name}}/pages/{{feature-name}}-create-edit/{{feature-name}}-create-edit.html`
- [ ] `src/app/features/{{feature-name}}/pages/{{feature-name}}-create-edit/{{feature-name}}-create-edit.scss`
- [ ] `src/app/features/{{feature-name}}/pages/{{feature-name}}-create-edit/{{feature-name}}-create-edit.spec.ts`
- [ ] `src/app/features/{{feature-name}}/{{feature-name}}.routes.ts`

**Modified files:**
- [ ] `src/app/app.routes.ts` — added lazy-loaded child route
- [ ] `src/app/layout/sidenav/sidenav.ts` — added NavItem
- [ ] `src/assets/i18n/de.json` — added German translations
- [ ] `src/assets/i18n/en.json` — added English translations

