# Testing Baseline

> Reference: [ADR-02000 – Testing Strategy](../governance-base/adr/02-testing/ADR-02000-testing-strategy.md)

## Testing Trophy

This project follows the **Testing Trophy** approach, which prioritizes
test types by the confidence they provide relative to their cost:

```
        ╱ E2E Tests ╲            ← highest confidence, highest cost
       ╱──────────────╲
      ╱ Integration    ╲         ← Testing Library, user-centric
     ╱──────────────────╲
    ╱   Unit Tests       ╲      ← fast, focused on pure logic
   ╱──────────────────────╲
  ╱  Static Analysis       ╲    ← TypeScript strict, ESLint
 ╱──────────────────────────╲
```

| Level              | Tool                        | Focus                         |
| ------------------ | --------------------------- | ----------------------------- |
| Static Analysis    | TypeScript (strict), ESLint | Type safety, coding standards |
| Unit Tests         | Vitest                      | Pure functions, computed state |
| Integration Tests  | @testing-library/angular    | Component behaviour, DOM      |
| E2E Tests          | Playwright (future)         | Critical user journeys        |

---

## Test Structure

Tests follow the **Angular Style Guide (FLAT)**: each test file is placed
next to its implementation.

```
features/blueprint/
├── services/
│   ├── blueprint.service.ts
│   └── blueprint.service.spec.ts          # Unit test
├── utils/
│   ├── blueprint-article.mapper.ts
│   ├── blueprint-article.mapper.spec.ts   # Unit test – pure function
│   ├── blueprint-article.validators.ts
│   └── blueprint-article.validators.spec.ts
├── pages/
│   └── blueprint-list/
│       ├── blueprint-list.ts
│       ├── blueprint-list.spec.ts                # TestBed test
│       └── blueprint-list.integration.spec.ts    # Testing Library test
```

Naming convention: `<name>.<type>.spec.ts` (e.g. `blueprint.service.spec.ts`).

---

## Unit Tests

Unit tests validate **pure logic** that has no DOM or Angular dependency.

### When to write unit tests

- Mapper / transformer functions
- Validators
- Computed signals (via service injection)
- Model creation helpers

### Pattern

```typescript
import { validateArticle } from './blueprint-article.validators';

describe('validateArticle', () => {
  it('should return valid for a complete article', () => {
    const result = validateArticle({
      articleId: 'a1',
      name: 'Widget',
      description: 'A useful widget',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
```

### Guidelines

- No DOM manipulation.
- No `TestBed` – import functions directly.
- Each test should run in **< 100 ms**.
- Follow **AAA** (Arrange – Act – Assert).

---

## Integration Tests

Integration tests validate **component behaviour from a user perspective**
using `@testing-library/angular`.

### When to write integration tests

- Component rendering & conditional display
- User interactions (click, type, select)
- Service integration within a component

### Pattern

```typescript
import { render, screen } from '@testing-library/angular';
import { BlueprintList } from './blueprint-list';
import { BlueprintService } from '../../services/blueprint.service';

describe('BlueprintList (Integration)', () => {
  it('should display heading', async () => {
    await render(BlueprintList);
    expect(screen.getByRole('heading', { name: /blueprint articles/i })).toBeTruthy();
  });

  it('should display articles after service update', async () => {
    const { fixture } = await render(BlueprintList);
    const service = fixture.debugElement.injector.get(BlueprintService);

    service.setArticles([{ articleId: 'a1', name: 'Widget', description: 'Desc' }]);
    fixture.detectChanges();

    expect(screen.getByText('Widget')).toBeTruthy();
  });
});
```

### Guidelines

- Use **user-centric queries**: `getByRole`, `getByText`, `getByLabelText`.
- Avoid implementation details (`querySelector`, component internals).
- Mock services that make HTTP calls.
- File suffix: `.integration.spec.ts` to distinguish from TestBed tests.

---

## Service Tests

Service tests validate **HTTP communication and signal-based state**.

### When to write service tests

- Services that call HTTP endpoints
- Signal-based state services

### Pattern – HTTP Mocking

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { BlueprintCustomerService } from './blueprint-customer.service';
import { API_BASE_URL } from '../../../core/tokens/api-base-url.token';

describe('BlueprintCustomerService', () => {
  let service: BlueprintCustomerService;
  let httpTesting: HttpTestingController;
  const apiBaseUrl = 'http://localhost:5000/api/v1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    });
    service = TestBed.inject(BlueprintCustomerService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should call GET for a single customer', () => {
    service.getById('c1').subscribe((customer) => {
      expect(customer.name).toBe('Customer One');
    });

    const req = httpTesting.expectOne(`${apiBaseUrl}/blueprint/customers/c1`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'c1', name: 'Customer One', createdAt: '2026-01-01' });
  });
});
```

### Guidelines

- Always call `httpTesting.verify()` in `afterEach` to detect outstanding requests.
- Mock `API_BASE_URL` via the DI token.
- Test signal state through public readonly signals.

---

## Coverage

Coverage is generated with the Vitest built-in coverage provider.

```bash
# Run tests with coverage
npm run test:coverage
```

### Configuration

| Setting           | Value                     |
| ----------------- | ------------------------- |
| Reporters         | `html`, `lcov`, `text`    |
| Exclude           | `*.spec.ts`, `main.ts`    |
| Target            | ≥ 80 % (lines/branches)  |

Reports are written to `coverage/` (git-ignored).

---

## NPM Scripts

| Script              | Description                        |
| ------------------- | ---------------------------------- |
| `npm test`          | Run all unit & integration tests   |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint`      | ESLint + Angular template linting  |
| `npm run build`     | Production build                   |

---

## Best Practices

1. **Test behaviour, not implementation** – assert what the user sees.
2. **Keep tests fast** – no unnecessary DOM setup in unit tests.
3. **One assertion focus per test** – each `it()` verifies one concept.
4. **AAA structure** – Arrange, Act, Assert in every test.
5. **No `@ts-ignore` or `eslint-disable`** – fix the root cause instead.
6. **Collocate tests** – every `*.ts` file has a `*.spec.ts` sibling.
