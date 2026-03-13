# API Communication

## OpenAPI as Single Source of Truth

The backend API contract is defined via an OpenAPI specification stored in:

```
openapi/erp-api.json
```

This file is the authoritative reference for all API endpoints, request/response
schemas, and pagination contracts.

### Updating the Spec

1. Obtain the latest `erp-api.json` from the backend team or CI artifact.
2. Replace `openapi/erp-api.json` with the new version.
3. Review the diff for breaking changes (removed paths, renamed fields).
4. Update affected TypeScript interfaces in `src/app/features/*/models/`.
5. Run tests (`npm test`) to verify nothing is broken.

## HTTP Client Configuration

The Angular `HttpClient` is configured centrally in `src/app/app.config.ts`:

- `provideHttpClient(withInterceptors([]))` sets up the client with an
  interceptor chain. New interceptors (auth, correlation-id, error handling)
  are added to this array.
- `API_BASE_URL` is provided as an injection token so services never import
  the environment directly. The token is defined in
  `src/app/core/tokens/api-base-url.token.ts`.

### Environment URLs

| Environment | File | Value |
|---|---|---|
| Development | `src/environments/environment.ts` | `http://localhost:5000/api/v1` |
| Production | `src/environments/environment.prod.ts` | `/api/v1` |

## Service Pattern

Each feature exposes an **API service** that encapsulates HTTP calls.
The service follows the pattern defined in ADR-10300:

```typescript
@Injectable({ providedIn: 'root' })
export class BlueprintCustomerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(API_BASE_URL)}/blueprint/customers`;

  getAll(params?: PaginationParams): Observable<PagedResponse<BlueprintCustomerListItem>> { ... }
  getById(id: string): Observable<BlueprintCustomerListItem> { ... }
}
```

Key rules:

- Services inject `API_BASE_URL` — never import `environment` directly.
- Services return `Observable<T>` with typed responses.
- Services do **not** catch HTTP errors (handled by interceptors).
- Services live in `src/app/features/<feature>/services/`.
- API models live in `src/app/features/<feature>/models/`.

## Pagination & Sorting

Shared pagination types are in `src/app/shared/models/pagination.model.ts`:

| Interface | Purpose |
|---|---|
| `PaginationParams` | Query parameters sent to the API (`page`, `pageSize`, `sortBy`, `sortOrder`) |
| `PaginationMeta` | Metadata returned by the API (`totalCount`, `totalPages`, …) |
| `PagedResponse<T>` | Wrapper with `data: T[]` and `pagination: PaginationMeta` |

These types match the `PaginationMetadata` and `PagedResponseOf*` schemas in
the OpenAPI spec.
