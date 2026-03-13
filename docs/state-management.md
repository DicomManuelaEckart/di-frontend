# State Management – Angular Signals

> **ADR Reference:** [ADR-10200 – State Management](../governance-base/adr/10-frontend/ADR-10200-state-management.md)

## State Hierarchy

| Scope | Solution | Example |
|-------|----------|---------|
| Component-local | `signal()` in the component | Loading state, form values, toggle flags |
| Feature-wide | Signal-based injectable services | Feature data lists, selected item, pagination |
| App-wide | Core services with signals | Auth state, user preferences, theme |

---

## Signal Patterns

### 1. Component-Local State

Use `signal()` directly in the component for UI state that does not leave the component:

```typescript
@Component({ changeDetection: ChangeDetectionStrategy.OnPush })
export class ExampleComponent {
  // Private writable signal – only mutated inside this component
  private readonly loading = signal(false);

  // Protected readonly projection – accessible in the template
  protected readonly isLoading = this.loading.asReadonly();

  // Computed signal – derived from other signals
  protected readonly statusText = computed(() =>
    this.loading() ? 'Loading…' : 'Ready'
  );
}
```

### 2. Feature-Wide State (Service with Signals)

Feature services own the data and expose **readonly** signals to consumers:

```typescript
@Injectable({ providedIn: 'root' })
export class FeatureService {
  // Private writable signal – mutated only via service methods
  private readonly itemsSignal = signal<Item[]>([]);
  private readonly loadingSignal = signal(false);

  // Public readonly signals – consumed by components
  readonly items = this.itemsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  // Computed signal – derived state
  readonly itemCount = computed(() => this.itemsSignal().length);
  readonly hasItems = computed(() => this.itemsSignal().length > 0);

  // Mutation methods – the only way to change state
  setItems(items: Item[]): void {
    this.itemsSignal.set(items);
  }

  addItem(item: Item): void {
    this.itemsSignal.update((current) => [...current, item]);
  }

  removeItem(id: string): void {
    this.itemsSignal.update((current) =>
      current.filter((i) => i.id !== id)
    );
  }
}
```

### 3. App-Wide State (Core Service)

Core services follow the same pattern but live in `src/app/core/`:

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSignal = signal<User | null>(null);

  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
}
```

---

## Best Practices

1. **Writable signals are private** – Never expose a `WritableSignal` outside its owner (component or service).
2. **Use `asReadonly()`** – Expose signals as `Signal<T>` (readonly) to consumers and templates.
3. **Use `computed()`** – Derive state declaratively instead of imperatively updating dependent values.
4. **Use `update()` for immutable collection changes** – Always create new arrays/objects instead of mutating in place.
5. **Mutation only through methods** – Services expose named methods (`addItem`, `removeItem`) for every state change. Components never call `.set()` on a service's internal signal.
6. **Keep signals close to their consumer** – Component-local state stays in the component. Only promote to a service when multiple components need access.
7. **Avoid `effect()` for state synchronization** – Prefer `computed()` for derived values. Use `effect()` only for side effects like logging or DOM manipulation.
8. **No signals across feature boundaries** – Features communicate via shared core services, not by importing each other's feature services.

---

## Reference Implementations

| Pattern | Reference File |
|---------|---------------|
| Feature service with signals | `src/app/features/blueprint/services/blueprint.service.ts` |
| Component-local signals | `src/app/features/blueprint/pages/blueprint-list/blueprint-list.ts` |
| Service injection + computed | `src/app/features/blueprint/pages/blueprint-detail/blueprint-detail.ts` |
