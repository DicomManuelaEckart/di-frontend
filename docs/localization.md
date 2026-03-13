# Localization / i18n Baseline

> **ADR Reference:** [ADR-02100 – Test Projects Naming Structure](../governance-base/adr/02-testing/ADR-02100-test-projects-naming-structure.md)
> **Story:** F0100-S004

## Library & Configuration

The application uses **@ngx-translate/core** (v17) with the HTTP loader for translation file loading.

### Provider Configuration (`app.config.ts`)

```typescript
provideTranslateService({
  defaultLanguage: 'de',
  fallbackLang: 'de',
  useDefaultLang: true,
  loader: provideTranslateHttpLoader({ prefix: './assets/i18n/', suffix: '.json' }),
  missingTranslationHandler: provideMissingTranslationHandler(AppMissingTranslationHandler),
})
```

- **Default language:** German (`de`)
- **Fallback language:** German (`de`) — used when a key is missing in the active language
- **Loader:** HTTP loader fetches JSON files from `assets/i18n/`

---

## Translation File Structure

```
src/
└── assets/
    └── i18n/
        ├── de.json    # German (default + fallback)
        └── en.json    # English
```

Files are copied to the build output via `angular.json` asset configuration.

---

## Key-Naming Conventions

Translation keys follow a **hierarchical dot-notation** structure: `<feature>.<category>.<key>`

### Rules

| Rule | Example |
|------|---------|
| Top-level = feature or scope | `blueprint`, `common`, `layout` |
| Second level = category | `fields`, `validation`, `title` |
| Leaf = specific text | `name`, `email`, `required` |
| Use camelCase for multi-word keys | `nameRequired`, `noResults` |
| Common/shared texts go under `common` | `common.save`, `common.cancel` |
| Layout texts go under `layout` | `layout.header.title` |

### Example Structure

```json
{
  "common": {
    "save": "Speichern",
    "cancel": "Abbrechen"
  },
  "layout": {
    "header": {
      "title": "DI Frontend"
    }
  },
  "blueprint": {
    "title": "Blueprint – Liste",
    "fields": {
      "name": "Name",
      "description": "Beschreibung"
    }
  },
  "errors": {
    "notFound": {
      "title": "404 – Seite nicht gefunden"
    }
  }
}
```

---

## Language Switching

### LanguageService (`src/app/core/services/language.service.ts`)

A signal-based service that manages the active language:

```typescript
const service = inject(LanguageService);

// Read the current language (signal)
const lang = service.currentLang();

// Switch language
service.setLanguage('en');

// List supported languages
const langs = service.supportedLanguages; // ['de', 'en']
```

**Persistence:** The selected language is stored in `localStorage` under the key `app-language` and restored on app startup.

---

## Using the Translate Pipe

### Import

Add `TranslatePipe` to the component's `imports` array:

```typescript
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  imports: [TranslatePipe],
  // ...
})
```

### Simple Translation

```html
<h1>{{ 'blueprint.title' | translate }}</h1>
```

### Translation with Parameters

```html
<p>{{ 'layout.footer.copyright' | translate: { year: currentYear } }}</p>
```

In the translation file, use `{{paramName}}` for interpolation:

```json
{
  "layout": {
    "footer": {
      "copyright": "© {{year}} DI Frontend"
    }
  }
}
```

---

## Fallback Strategy

1. **Primary:** Uses the currently active language translation
2. **Fallback:** If a key is missing in the active language, the default language (`de`) is used (`useDefaultLang: true`)
3. **Missing key:** If the key is missing in all languages, the `AppMissingTranslationHandler` returns the raw key string
4. **Dev logging:** In development mode (`isDevMode()`), missing keys are logged as warnings to the browser console

### MissingTranslationHandler (`src/app/core/services/missing-translation-handler.ts`)

```typescript
@Injectable()
export class AppMissingTranslationHandler implements MissingTranslationHandler {
  handle(params: MissingTranslationHandlerParams): string {
    if (isDevMode()) {
      console.warn(`Missing translation for key: "${params.key}"`);
    }
    return params.key;
  }
}
```

---

## Best Practices

1. **No hardcoded text in templates** — always use `{{ 'key' | translate }}`
2. **Feature-scoped keys** — prefix keys with the feature name (`blueprint.title`, not just `title`)
3. **Use `common.*` for shared labels** — buttons, actions, and generic labels belong under `common`
4. **Keep translation files in sync** — every key in `de.json` must also exist in `en.json`
5. **Use parameters for dynamic values** — `{{ 'key' | translate: { count: n } }}` instead of string concatenation
6. **Test with both languages** — verify translations render correctly for all supported languages

---

## Adding a New Language

1. Create `src/assets/i18n/<lang>.json` with all keys from `de.json`
2. Add the language code to `SUPPORTED_LANGUAGES` in `language.service.ts`
3. Add a label for the language under the `language` key in all translation files

---

## File Overview

| File | Purpose |
|------|---------|
| `src/app/app.config.ts` | Translation provider configuration |
| `src/app/core/services/language.service.ts` | Language switching + persistence |
| `src/app/core/services/missing-translation-handler.ts` | Dev-mode logging for missing keys |
| `src/assets/i18n/de.json` | German translations (default) |
| `src/assets/i18n/en.json` | English translations |
