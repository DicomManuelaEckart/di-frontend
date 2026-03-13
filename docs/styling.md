# Styling & Theming Baseline

> Reference: ADR-10100 (Design Tokens), ADR-04000 (Logging/Accessibility), ADR-04100 (Observability)

## SCSS Structure

```
src/
├── styles/
│   ├── _variables.scss      # SCSS design token variables
│   ├── _mixins.scss         # Reusable SCSS mixins
│   ├── _reset.scss          # CSS reset / normalize
│   ├── _typography.scss     # Base typography rules
│   ├── _accessibility.scss  # Focus styles, skip link, reduced motion
│   ├── _utilities.scss      # Utility classes (u-flex, u-mt-md, etc.)
│   └── styles.scss          # Main entry point (imported in angular.json)
```

The entry point `src/styles/styles.scss` is referenced in `angular.json` under
`projects.di-frontend.architect.build.options.styles`.

## Design Tokens

All visual values are defined as **SCSS variables** in `_variables.scss` and
exposed as **CSS Custom Properties** in `styles.scss`.

### Colors

| Token | Light | Dark |
|---|---|---|
| `--color-primary` | `#1976d2` | `#1976d2` |
| `--color-on-primary` | `#fff` | `#fff` |
| `--color-secondary` | `#6c757d` | `#6c757d` |
| `--color-success` | `#2e7d32` | `#2e7d32` |
| `--color-warning` | `#ed6c02` | `#ed6c02` |
| `--color-error` | `#d32f2f` | `#d32f2f` |
| `--color-background` | `#fff` | `#121212` |
| `--color-surface` | `#fafafa` | `#1e1e1e` |
| `--color-text` | `#333` | `#e0e0e0` |
| `--color-text-secondary` | `#666` | `#aaa` |
| `--color-border` | `#e0e0e0` | `#333` |
| `--color-hover` | `#e8e8e8` | `#2c2c2c` |
| `--color-active` | `#e3f2fd` | `#0d47a1` |

### Spacing

| Token | Value |
|---|---|
| `--spacing-xs` | `0.25rem` |
| `--spacing-sm` | `0.5rem` |
| `--spacing-md` | `1rem` |
| `--spacing-lg` | `1.5rem` |
| `--spacing-xl` | `2rem` |

### Typography

| Token | Value |
|---|---|
| `--font-size-xs` | `0.75rem` |
| `--font-size-sm` | `0.875rem` |
| `--font-size-body` | `0.875rem` |
| `--font-size-md` | `1rem` |
| `--font-size-lg` | `1.25rem` |
| `--font-size-h1` | `1.5rem` |
| `--font-size-h2` | `1.25rem` |
| `--font-size-h3` | `1.125rem` |
| `--font-weight-normal` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-bold` | `700` |
| `--line-height-base` | `1.5` |
| `--line-height-heading` | `1.2` |

### Border Radius

| Token | Value |
|---|---|
| `--border-radius-sm` | `0.25rem` |
| `--border-radius-md` | `0.5rem` |
| `--border-radius-lg` | `0.75rem` |

## Theming (Light / Dark)

The application supports light and dark themes via the `data-theme` attribute on
`<html>`. When `data-theme="dark"` is set, the dark color tokens override the
defaults defined in `:root`.

### ThemeService

`ThemeService` (`src/app/core/services/theme.service.ts`) manages the theme:

```typescript
import { ThemeService } from '@app/core/services/theme.service';

// Read current theme
const current = this.themeService.theme(); // 'light' | 'dark'

// Set theme
this.themeService.setTheme('dark');

// Toggle
this.themeService.toggleTheme();
```

The service persists the user preference to `localStorage` under the key
`app-theme` and restores it on initialisation.

## Accessibility (WCAG AA)

Reference: ADR-04000

### Focus Styles

All interactive elements (`a`, `button`, `input`, `select`, `textarea`,
`[tabindex]`) receive a visible `:focus-visible` outline via the global
`_accessibility.scss` partial.

### Skip-to-Content Link

A `.skip-link` class is available for skip-navigation links. It is visually
hidden until focused.

### Reduced Motion

When the user has `prefers-reduced-motion: reduce` enabled, all animations and
transitions are suppressed.

### Accessibility Checklist

- [x] All interactive elements have visible focus indicators
- [x] Colour contrast ratios meet WCAG AA (≥ 4.5 : 1 for text)
- [x] `prefers-reduced-motion` is respected
- [x] Skip-link pattern available
- [x] Spinner has `role="status"` and `aria-label`
- [x] Skeleton is hidden from assistive tech (`aria-hidden="true"`)

## Loading States & Skeletons

Reference: ADR-04100

### Spinner Component

```html
<app-spinner />
<app-spinner [diameter]="24" label="Saving…" />
```

Located in `src/app/shared/components/spinner/`.

### Skeleton Component

```html
<app-skeleton />
<app-skeleton width="60%" height="1.5rem" />
```

Located in `src/app/shared/components/skeleton/`.

### Loading-State Pattern

Services should follow the signal-based loading pattern:

```typescript
readonly loading = signal(false);
readonly data = signal<MyData | null>(null);
readonly error = signal<string | null>(null);
```

Show loading UI while `loading()` is true, display errors from `error()`, and
render content from `data()`.

## Utility Classes

| Class | Description |
|---|---|
| `.u-flex` | `display: flex` |
| `.u-flex-center` | Flex with centered items |
| `.u-flex-between` | Flex with space-between |
| `.u-mt-sm` / `.u-mt-md` / `.u-mt-lg` | Margin top |
| `.u-mb-sm` / `.u-mb-md` / `.u-mb-lg` | Margin bottom |
| `.u-p-sm` / `.u-p-md` / `.u-p-lg` | Padding |
| `.u-text-center` | Centered text |
| `.u-text-truncate` | Truncate with ellipsis |
| `.u-visually-hidden` | Visually hidden, accessible to screen readers |
