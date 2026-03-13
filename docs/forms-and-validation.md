# Forms & Validation Baseline

> Reference: ADR-10500 – Forms, Validation & CRUD Operations, ADR-03000 – Authentication Entra ID OIDC JWT

## Reactive Forms Policy

**Only Angular Reactive Forms are allowed.** Template-driven forms (`ngModel`, `[(ngModel)]`) are forbidden.

This is enforced by:
1. Angular strict template checking — `ngModel` requires `FormsModule`, which must not be imported
2. The ESLint policy comment in `eslint.config.js` documents this rule for developers and agents
3. Standalone components only import `ReactiveFormsModule`, never `FormsModule`

```typescript
// ✅ CORRECT: Reactive Forms with typed FormBuilder
readonly form = this.fb.group({
  name: ['', [Validators.required, Validators.minLength(2)]],
  email: ['', [Validators.required, Validators.email]],
  isActive: [true],
});

// ❌ FORBIDDEN: Template-driven Forms
// <input [(ngModel)]="name">
```

## Typed FormBuilder Pattern

All forms use Angular's typed `FormBuilder` (injected via `inject()`).
Form controls are fully typed — no `any` types allowed.

```typescript
import { inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

@Component({ /* ... */ })
export class MyForm {
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    articleId: ['', [Validators.required]],
    name: ['', [Validators.required, CustomValidators.trimmedMinLength(2)]],
    description: ['', [Validators.required, CustomValidators.trimmedMaxLength(500)]],
    isActive: [true],
  });
}
```

**Key rules:**
- Always use `inject(FormBuilder)` — not constructor injection
- Define the form as a `readonly` class field
- Use typed validators from `@angular/forms` and `shared/validators/custom-validators`
- Never use `any` — TypeScript strict mode enforces this

## Form-State with Signals

Form state is exposed as Angular Signals using `toSignal()` from `@angular/core/rxjs-interop`.
This integrates reactive forms with Angular's signal-based change detection.

```typescript
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

readonly isValid = toSignal(
  this.form.statusChanges.pipe(map(() => this.form.valid)),
  { initialValue: false },
);

readonly isDirty = toSignal(
  this.form.valueChanges.pipe(map(() => this.form.dirty)),
  { initialValue: false },
);

readonly isPending = toSignal(
  this.form.statusChanges.pipe(map(() => this.form.pending)),
  { initialValue: false },
);
```

**Usage in templates:**
```html
<button [disabled]="!isValid() || isPending()">Save</button>

@if (isPending()) {
  <p>Validating…</p>
}
```

## Validation Patterns

### Sync Validators

Standard Angular validators and custom validators from `shared/validators/custom-validators.ts`:

| Validator | Description | Error Key |
|-----------|-------------|-----------|
| `Validators.required` | Field must not be empty | `required` |
| `Validators.minLength(n)` | Minimum character length | `minlength` |
| `Validators.maxLength(n)` | Maximum character length | `maxlength` |
| `Validators.email` | Valid email format | `email` |
| `CustomValidators.notBlank` | Not whitespace-only | `notBlank` |
| `CustomValidators.trimmedMinLength(n)` | Min length after trim | `trimmedMinLength` |
| `CustomValidators.trimmedMaxLength(n)` | Max length after trim | `trimmedMaxLength` |
| `CustomValidators.patternWithName(regex, key)` | Custom regex with named error | Custom key |

### Async Validators

For server-side checks like uniqueness validation:

```typescript
import { uniqueNameValidator } from '../../shared/validators/custom-validators';

// Check article ID uniqueness against existing articles
control.addAsyncValidators(
  uniqueNameValidator(() => existingArticles.map(a => a.articleId))
);
```

### Validation Messages (i18n)

Validation messages are defined in `src/assets/i18n/{lang}.json` under the `validation` key:

```json
{
  "validation": {
    "required": "This field is required.",
    "minLength": "Must be at least {{min}} characters.",
    "maxLength": "Must not exceed {{max}} characters.",
    "email": "Please enter a valid email address.",
    "unique": "This value already exists.",
    "notBlank": "This field must not be blank."
  }
}
```

**Display pattern:**
```html
@if (showErrors('name')) {
  @if (form.controls.name.errors?.['required']) {
    <igx-hint>{{ 'validation.required' | translate }}</igx-hint>
  }
  @if (form.controls.name.errors?.['trimmedMinLength']) {
    <igx-hint>{{ 'validation.minLength' | translate: { min: 2 } }}</igx-hint>
  }
}
```

Errors are shown only after the field is touched or dirty (first user interaction).

## UI Form Components

Form components use the Infragistics Ignite UI Angular library (second tier per `docs/ui-library.md`).

### Available Components

| Component | Import | Usage |
|-----------|--------|-------|
| Input Group | `@infragistics/igniteui-angular/input-group` | Text inputs, textareas |
| Checkbox | `@infragistics/igniteui-angular/checkbox` | Boolean toggles |
| Select | `@infragistics/igniteui-angular/select` | Dropdown selections |
| Radio | `@infragistics/igniteui-angular/radio` | Radio button groups |
| Switch | `@infragistics/igniteui-angular/switch` | On/off toggles |
| Date Picker | `@infragistics/igniteui-angular/date-picker` | Date selection |

### Input Group Pattern

```html
<igx-input-group type="border">
  <label igxLabel for="name">{{ 'fields.name' | translate }}</label>
  <input igxInput id="name" formControlName="name" type="text" />
  @if (showErrors('name')) {
    <igx-hint>{{ 'validation.required' | translate }}</igx-hint>
  }
</igx-input-group>
```

### Checkbox Pattern

```html
<igx-checkbox formControlName="isActive" labelPosition="after">
  {{ 'fields.isActive' | translate }}
</igx-checkbox>
```

## Route Guards

### Authentication Guard

`src/app/core/guards/auth-guard.ts` — Checks if the user is authenticated.

```typescript
import { authGuard } from '../../core/guards/auth-guard';

{
  path: 'protected',
  loadComponent: () => import('./protected'),
  canActivate: [authGuard],
}
```

### Permission Guard

`src/app/core/guards/permission-guard.ts` — Checks route-level permissions.

```typescript
import { permissionGuard } from '../../core/guards/permission-guard';

{
  path: 'admin',
  loadComponent: () => import('./admin'),
  canActivate: [authGuard, permissionGuard],
  data: { permission: 'admin.access' },
}
```

Guards redirect to `/access-denied` when access is denied.

Reference: ADR-03000 – Authentication Entra ID OIDC JWT

## Reference Implementation

The complete reference implementation is in:

```
src/app/features/blueprint/pages/blueprint-create-edit/
├── blueprint-create-edit.ts        # Component with typed form + signals
├── blueprint-create-edit.html      # Template with IgniteUI components
├── blueprint-create-edit.scss      # Styles
└── blueprint-create-edit.spec.ts   # Unit tests
```

Routes with guards:

```
src/app/features/blueprint/blueprint.routes.ts
```

Custom validators:

```
src/app/shared/validators/custom-validators.ts
```

Auth service and guards:

```
src/app/core/services/auth.service.ts
src/app/core/guards/auth-guard.ts
src/app/core/guards/permission-guard.ts
```
