# UI Library Baseline

> **ADR-Referenz:** ADR-10100 (UI-Layout & Komponentenstruktur)

## Drei-Stufen-Hierarchie

Die Anwendung verwendet eine klar definierte dreistufige Hierarchie für UI-Komponenten:

```
1. dione-lib           → IMMER ZUERST prüfen
2. Infragistics        → Wenn dione-lib keine passende Komponente hat
3. Angular Material    → NUR mit expliziter Genehmigung
```

### Entscheidungsbaum

```
Benötige ich eine UI-Komponente?
│
├─ Gibt es eine dione-lib-Komponente dafür?
│  ├─ JA  → dione-lib verwenden
│  └─ NEIN ↓
│
├─ Gibt es eine Infragistics-Komponente dafür?
│  ├─ JA  → Infragistics verwenden
│  └─ NEIN ↓
│
├─ Gibt es eine Angular-Material-Komponente dafür?
│  ├─ JA  → Genehmigung einholen, dann Angular Material verwenden
│  └─ NEIN → Eigene Implementierung mit Begründung (Eskalation)
│
└─ REGEL: Keine Mischung innerhalb einer Komponente
```

### Regeln

- Bestehende eigene Implementierungen ersetzen, wenn eine Library-Komponente existiert
- Custom CSS, das Library-Funktionalität nachbaut, entfernen
- Keine SVG-Icons oder eigene Icon-Bibliotheken ohne Genehmigung
- Icons über `<igx-icon>` verwenden, wenn Infragistics im Einsatz ist
- Styles externer Pakete **ausschließlich über `angular.json`** importieren

---

## dione-lib (Stufe 1)

> **Paket:** `@dicom-software/dione-lib`
> **Registry:** GitHub Packages (`npm.pkg.github.com`)
> **Status:** Vorbereitet für Integration (Zugang über GitHub Package Registry erforderlich)

### Verfügbare Komponenten

| Kategorie     | Komponenten                                             |
|---------------|---------------------------------------------------------|
| Form Controls | `dione-input`, `dione-select`, `dione-checkbox`         |
| Layout        | `dione-dialog`, `dione-simple-grid`                     |
| Buttons       | `dione-button`                                          |

### Import-Beispiele

```typescript
// In einer standalone Komponente
import { DioneInputComponent } from '@dicom-software/dione-lib/input';
import { DioneSelectComponent } from '@dicom-software/dione-lib/select';
import { DioneButtonComponent } from '@dicom-software/dione-lib/button';
import { DioneDialogComponent } from '@dicom-software/dione-lib/dialog';

@Component({
  selector: 'app-my-form',
  imports: [DioneInputComponent, DioneSelectComponent, DioneButtonComponent],
  // ...
})
export class MyForm {}
```

### Verwendungspriorität

dione-lib-Komponenten sind **immer erste Wahl** für:
- Formular-Eingabefelder (`dione-input`, `dione-select`, `dione-checkbox`)
- Standard-Buttons (`dione-button`)
- Einfache Dialoge (`dione-dialog`)
- Einfache Grids/Tabellen (`dione-simple-grid`)

---

## Infragistics Ignite UI for Angular (Stufe 2)

> **Paket:** `@infragistics/igniteui-angular`
> **Version:** 21.1.0
> **Registry:** Infragistics NPM Registry

### Installierte Pakete

| Paket                                    | Version | Zweck                        |
|------------------------------------------|---------|------------------------------|
| `@infragistics/igniteui-angular`         | 21.1.0  | Hauptbibliothek              |
| `@igniteui/material-icons-extended`      | 3.1.0   | Erweitertes Icon-Set         |
| `hammerjs`                               | 2.0.8   | Touch/Gesture-Unterstützung  |
| `igniteui-webcomponents`                 | 7.x     | Peer Dependency              |
| `igniteui-grid-lite`                     | 0.6.x   | Peer Dependency              |

### Konfiguration

**Styles** (in `angular.json`, nicht in `styles.scss`):
```json
{
  "styles": [
    "node_modules/@infragistics/igniteui-angular/styles/igniteui-angular.css",
    "src/styles.scss"
  ]
}
```

**Animations** (in `app.config.ts`):
```typescript
import { provideAnimations } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    // ...
  ],
};
```

### Haupt-Komponenten

| Kategorie          | Import-Pfad                                          | Komponenten                                      |
|--------------------|------------------------------------------------------|--------------------------------------------------|
| **Grid**           | `@infragistics/igniteui-angular/grids/grid`          | `IgxGridComponent`                               |
| **Grid Core**      | `@infragistics/igniteui-angular/grids/core`          | `IgxColumnComponent`, `IgxColumnGroupComponent`  |
| **Paginator**      | `@infragistics/igniteui-angular/paginator`           | `IgxPaginatorComponent`                          |
| **Dialog**         | `@infragistics/igniteui-angular/dialog`              | `IgxDialogComponent`, Directives                 |
| **Navbar**         | `@infragistics/igniteui-angular/navbar`              | `IgxNavbarComponent`                             |
| **Nav Drawer**     | `@infragistics/igniteui-angular/navigation-drawer`   | `IgxNavigationDrawerComponent`                   |
| **Icon**           | `@infragistics/igniteui-angular/icon`                | `IgxIconComponent`, `IgxIconService`             |
| **Input**          | `@infragistics/igniteui-angular/input-group`         | `IgxInputGroupComponent`                         |
| **Select**         | `@infragistics/igniteui-angular/select`              | `IgxSelectComponent`                             |
| **Checkbox**       | `@infragistics/igniteui-angular/checkbox`            | `IgxCheckboxComponent`                           |
| **Date Picker**    | `@infragistics/igniteui-angular/date-picker`         | `IgxDatePickerComponent`                         |

### Import-Beispiele

```typescript
// Grid mit Pagination und Sorting
import { IgxGridComponent } from '@infragistics/igniteui-angular/grids/grid';
import { IgxColumnComponent } from '@infragistics/igniteui-angular/grids/core';
import { IgxPaginatorComponent } from '@infragistics/igniteui-angular/paginator';

@Component({
  imports: [IgxGridComponent, IgxColumnComponent, IgxPaginatorComponent],
  // ...
})
export class MyList {}
```

```typescript
// Dialog
import { IgxDialogComponent, IgxDialogTitleDirective, IgxDialogActionsDirective } from '@infragistics/igniteui-angular/dialog';

@Component({
  imports: [IgxDialogComponent, IgxDialogTitleDirective, IgxDialogActionsDirective],
  // ...
})
export class MyDialog {}
```

```typescript
// Icons
import { IgxIconComponent } from '@infragistics/igniteui-angular/icon';

@Component({
  imports: [IgxIconComponent],
  template: `<igx-icon family="material">home</igx-icon>`,
})
export class MyComponent {}
```

---

## Grid/Table-Pattern (ADR-03500)

### ReferenceGrid-Komponente

Pfad: `src/app/shared/components/reference-grid/`

Die `ReferenceGrid`-Komponente kapselt das Standard-Grid-Pattern:

```typescript
import { ReferenceGrid, GridColumn } from '../../shared/components/reference-grid/reference-grid';

// Verwendung in einem Feature:
@Component({
  imports: [ReferenceGrid],
  template: `
    <app-reference-grid
      [data]="articles()"
      [columns]="columns"
      [pageSize]="20"
      primaryKey="articleId"
    />
  `,
})
export class ArticleList {
  readonly columns: GridColumn[] = [
    { field: 'name', header: 'Name', sortable: true },
    { field: 'description', header: 'Beschreibung', sortable: true },
    { field: 'createdAt', header: 'Erstellt', dataType: 'date' },
  ];
}
```

### GridColumn-Interface

```typescript
export interface GridColumn {
  readonly field: string;
  readonly header: string;
  readonly sortable?: boolean;    // Default: true
  readonly filterable?: boolean;  // Default: true
  readonly width?: string;
  readonly dataType?: 'string' | 'number' | 'boolean' | 'date';
}
```

### Features

- **Pagination**: Integriert via `IgxPaginatorComponent` (Standard: 15 Einträge/Seite)
- **Sorting**: Spaltenweise Sortierung via `[sortable]="true"`
- **Filtering**: Spaltenweise Filterung via `[filterable]="true"`

---

## Dialog/Modal-Pattern (ADR-03300)

### DialogService

Pfad: `src/app/core/services/dialog.service.ts`

```typescript
import { DialogService } from './core/services/dialog.service';

@Component({...})
export class MyComponent {
  private readonly dialogService = inject(DialogService);

  onDelete(): void {
    this.dialogService.confirm('Möchten Sie diesen Eintrag löschen?')
      .subscribe(confirmed => {
        if (confirmed) {
          // Löschen durchführen
        }
      });
  }
}
```

### ConfirmDialog-Komponente

Pfad: `src/app/shared/components/confirm-dialog/`

Wiederverwendbare Bestätigungsdialog-Komponente auf Basis von `IgxDialogComponent`:

```html
<app-confirm-dialog
  title="Löschen bestätigen"
  message="Möchten Sie diesen Eintrag wirklich löschen?"
  confirmLabel="Löschen"
  cancelLabel="Abbrechen"
  (confirmed)="onConfirmResult($event)"
/>
```

### DialogConfig-Interface

```typescript
export interface DialogConfig {
  readonly title?: string;
  readonly message?: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
}
```

---

## Icon-Verwendung

Icons werden ausschließlich als Font Icons bereitgestellt:

| Paket                                    | Zweck                                  |
|------------------------------------------|----------------------------------------|
| `@infragistics/igniteui-angular`         | Ignite UI Built-in Icons               |
| `@igniteui/material-icons-extended`      | Erweitertes Material-Icon-Set          |

### Regeln

- Icons immer über `<igx-icon>` verwenden
- Keine SVG-Icons oder eigene Icon-Bibliotheken
- Font-Family `material` als Standard

```html
<igx-icon family="material">home</igx-icon>
<igx-icon family="material">delete</igx-icon>
<igx-icon family="material">edit</igx-icon>
<igx-icon family="material">warning</igx-icon>
```

---

## Style Import Policy

Styles von externen Paketen werden **ausschließlich über `angular.json`** importiert:

```json
// angular.json → architect.build.options.styles
{
  "styles": [
    "node_modules/@infragistics/igniteui-angular/styles/igniteui-angular.css",
    "src/styles.scss"
  ]
}
```

**Verboten:**
```scss
// ❌ NICHT in styles.scss importieren
@import '@infragistics/igniteui-angular/styles/igniteui-angular.css';
```

---

## Zuordnungstabelle: Bereich → Komponenten

| Bereich                    | Ziel-Komponenten                                             |
|----------------------------|--------------------------------------------------------------|
| Header / Breadcrumbs       | `IgxNavbarComponent`, `IgxIconComponent`                     |
| Side-Menu / Navigation     | `IgxNavigationDrawerComponent`                               |
| Grid / Tabellen            | `IgxGridComponent`, `IgxColumnComponent`, `IgxPaginatorComponent` |
| Formulare / Bearbeitung    | dione-lib Form Controls (`dione-input`, `dione-select`, etc.) |
| Dialoge / Modals           | `IgxDialogComponent`, `ConfirmDialog`, `DialogService`       |
| Icons                      | `IgxIconComponent` mit `family="material"`                   |

---

## Verweise

- ADR-10100 – UI-Layout & Komponentenstruktur
- ADR-10000 – Frontend-Architektur: SPA & Grundstruktur
