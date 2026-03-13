# UI Library Integration

> Governance Reference: ADR-10100 (UI-Layout & Komponentenstruktur)

## Drei-Stufen-Hierarchie (Three-Tier Hierarchy)

The UI library strategy follows a strict three-tier hierarchy for component selection:

```
1. dione-lib          → ALWAYS check FIRST
2. Infragistics       → When dione-lib has no matching component
3. Angular Material   → ONLY with explicit approval
```

### Decision Tree for Agents

```
Need a UI component?
│
├─ Does dione-lib provide it?
│  ├─ YES → Use dione-lib component
│  └─ NO  ↓
│
├─ Does Infragistics (igniteui-angular) provide it?
│  ├─ YES → Use Infragistics component
│  └─ NO  ↓
│
├─ Does Angular Material provide it?
│  ├─ YES → Request explicit approval, then use Angular Material
│  └─ NO  → Escalate to human for architecture decision
│
└─ NEVER build custom components that replicate library functionality
```

### Rules

- **Do not** keep custom implementations when a library component exists
- **Do not** write custom CSS that replicates library component functionality
- **Do not** mix UI libraries for the same component category
- **Do not** import package styles in `styles.scss`; use `angular.json` only

---

## Installed Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `@infragistics/igniteui-angular` | ^21.1.0 | Primary UI component library (Grid, Navbar, Dialog, etc.) |
| `@igniteui/material-icons-extended` | ^3.1.0 | Extended Material icon set for Ignite UI |
| `@angular/animations` | ^21.2.4 | Required peer dependency for Infragistics animations |

### Pending

| Package | Status | Purpose |
|---------|--------|---------|
| `@dicom-software/dione-lib` | Not yet installed (registry auth required) | Custom component library (highest priority in hierarchy) |

---

## Configuration

### angular.json – Style Imports

External library styles are imported exclusively via `angular.json`, **never** in `styles.scss`:

```json
"styles": [
  "node_modules/@infragistics/igniteui-angular/styles/igniteui-fluent-light.css",
  "src/styles.scss"
]
```

### app.config.ts – Providers

Infragistics requires the Angular animations provider:

```typescript
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... other providers
    provideAnimationsAsync(),
  ],
};
```

---

## Component Catalog

### Infragistics Components in Use

| Category | Component | Import Path | Selector |
|----------|-----------|-------------|----------|
| **Navbar** | `IgxNavbarComponent` | `@infragistics/igniteui-angular/navbar` | `<igx-navbar>` |
| **Navigation** | `IgxNavigationDrawerComponent` | `@infragistics/igniteui-angular/navigation-drawer` | `<igx-nav-drawer>` |
| **Grid** | `IgxGridComponent` | `@infragistics/igniteui-angular/grids/grid` | `<igx-grid>` |
| **Paginator** | `IgxPaginatorComponent` | `@infragistics/igniteui-angular/paginator` | `<igx-paginator>` |
| **Dialog** | `IgxDialogComponent` | `@infragistics/igniteui-angular/dialog` | `<igx-dialog>` |
| **Icon** | `IgxIconComponent` | `@infragistics/igniteui-angular/icon` | `<igx-icon>` |

### Available Infragistics Components (Full List)

The following components are available from `@infragistics/igniteui-angular`:

| Module | Components |
|--------|-----------|
| `accordion` | Accordion |
| `avatar` | Avatar |
| `badge` | Badge |
| `banner` | Banner |
| `bottom-nav` | Bottom Navigation |
| `button-group` | Button Group |
| `calendar` | Calendar |
| `card` | Card |
| `carousel` | Carousel |
| `checkbox` | Checkbox |
| `chips` | Chips |
| `combo` | Combo Box |
| `date-picker` | Date Picker |
| `dialog` | Dialog |
| `drop-down` | Drop-down |
| `expansion-panel` | Expansion Panel |
| `grids/grid` | Data Grid |
| `grids/tree-grid` | Tree Grid |
| `grids/hierarchical-grid` | Hierarchical Grid |
| `grids/pivot-grid` | Pivot Grid |
| `icon` | Icon |
| `input-group` | Input Group |
| `list` | List |
| `navbar` | Navbar |
| `navigation-drawer` | Navigation Drawer |
| `paginator` | Paginator |
| `progressbar` | Progress Bar |
| `radio` | Radio |
| `select` | Select |
| `slider` | Slider |
| `snackbar` | Snackbar |
| `stepper` | Stepper |
| `switch` | Switch |
| `tabs` | Tabs |
| `time-picker` | Time Picker |
| `toast` | Toast |
| `tree` | Tree |

### Import Examples

```typescript
// Navbar
import { IgxNavbarComponent, IgxNavbarTitleDirective } from '@infragistics/igniteui-angular/navbar';

// Navigation Drawer
import {
  IgxNavigationDrawerComponent,
  IgxNavDrawerTemplateDirective,
} from '@infragistics/igniteui-angular/navigation-drawer';

// Grid
import { IgxGridComponent } from '@infragistics/igniteui-angular/grids/grid';

// Paginator
import { IgxPaginatorComponent } from '@infragistics/igniteui-angular/paginator';

// Dialog
import { IgxDialogComponent, IgxDialogActionsDirective } from '@infragistics/igniteui-angular/dialog';

// Icon
import { IgxIconComponent } from '@infragistics/igniteui-angular/icon';
```

---

## Patterns

### Grid/Table Pattern (ADR-03500)

A reference grid component is provided at `src/app/shared/components/reference-grid/`:

```html
<app-reference-grid [data]="myData" [pageSize]="15" />
```

The `ReferenceGrid` component wraps `IgxGridComponent` with:
- Auto-generated columns
- Built-in filtering
- Pagination via `IgxPaginatorComponent`

For custom column definitions, use `IgxGridComponent` directly:

```html
<igx-grid [data]="data" [autoGenerate]="false" [allowFiltering]="true">
  <igx-column field="id" header="ID" [sortable]="true"></igx-column>
  <igx-column field="name" header="Name" [sortable]="true"></igx-column>
  <igx-paginator [perPage]="10"></igx-paginator>
</igx-grid>
```

### Dialog/Modal Pattern (ADR-03300)

A `DialogService` is provided at `src/app/core/services/dialog.service.ts`:

```typescript
// Programmatic dialog opening
const ref = this.dialogService.open(MyDialogComponent, {
  title: 'Edit Item',
  message: 'Optional message',
});

ref.closed.subscribe((result) => {
  // Handle dialog result
});

// Confirm dialog shorthand
this.dialogService.confirm('Delete this item?').subscribe((confirmed) => {
  if (confirmed) {
    // Perform action
  }
});
```

A `ConfirmDialog` component is provided at `src/app/shared/components/confirm-dialog/`.

---

## Icon Usage

Icons are provided exclusively as **font icons** via these packages:

| Package | Purpose |
|---------|---------|
| `@infragistics/igniteui-angular` | Ignite UI built-in icons |
| `@igniteui/material-icons-extended` | Extended Material icon set for Ignite UI |

### Rules

- Always use `<igx-icon>` when Infragistics is in use
- No SVG icons or custom icon libraries without explicit approval

```html
<igx-icon>home</igx-icon>
<igx-icon>settings</igx-icon>
<igx-icon>description</igx-icon>
```

---

## Layout Components

The following layout components use Infragistics:

| Component | Location | Infragistics Component |
|-----------|----------|----------------------|
| Header | `src/app/layout/header/` | `IgxNavbarComponent` |
| Sidenav | `src/app/layout/sidenav/` | `IgxNavigationDrawerComponent` |

---

## dione-lib Component Catalog (Planned)

> **Status:** Not yet installed. Package registry authentication required.

Once installed, the following categories are expected:

| Category | Components |
|----------|-----------|
| Form Controls | `dione-input`, `dione-select`, `dione-checkbox`, etc. |
| Layout | `dione-dialog`, `dione-simple-grid` |
| Buttons | `dione-button` |

dione-lib components take **highest priority** in the hierarchy.

---

## Related ADRs

- **ADR-10100** – UI-Layout & Komponentenstruktur
- **ADR-10000** – Frontend-Architektur (SPA, Grundstruktur)
- **ADR-10500** – Formulare, Validierung & CRUD-Operationen
