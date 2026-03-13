# API Guidelines

These guidelines define how we design and evolve HTTP APIs across this organization.
They aim for:
- a consistent API experience across services
- predictable evolution and compatibility
- easy client integration (frontend, admin, partners)
- strong observability and debuggability

> Architecture and policy decisions are defined in ADRs. These guidelines operationalize them.

---

## Scope

Applies to:
- backend (public and internal HTTP APIs)
- admin (if it exposes HTTP APIs)
- printservice (if it exposes HTTP APIs)

Frontend and admin UIs are API consumers and must rely on these conventions.

---

## Core Principles

### Consistency over cleverness
One consistent style across services is more important than local preferences.

### Contract first
The API is a contract. Changes must be deliberate, documented, and tested.

### Backwards compatibility by default
Breaking changes require explicit versioning and a deprecation strategy.

---

## API Versioning (Mandatory)

### URL-based versioning
All APIs MUST use URL-based versioning.

Pattern:
```
/v{major}/resource
```

Example:
```
/v1/orders
/v1/orders/{orderId}
```

Rules:
- The version is part of the public API boundary.
- Versioning is handled in the API layer only.
- Domain and application layers must not depend on API versions.
- Avoid frequent version bumps; prefer additive, backwards-compatible changes.

---

## URL & Resource Design

### Resource-oriented routes
- Use nouns, not verbs.
  - ✅ `GET /v1/orders/{orderId}`
  - ❌ `POST /v1/getOrder`

### Hierarchies
- Use sub-resources only when they add meaning.
  - ✅ `/v1/orders/{orderId}/items`
- Avoid nesting deeper than 2–3 levels.

### Identifiers
- Identifiers are opaque.
- Clients must not infer meaning from IDs.

---

## HTTP Methods

- `GET`    read (safe, idempotent)
- `POST`   create or non-idempotent action
- `PUT`    full replace (idempotent)
- `PATCH`  partial update
- `DELETE` delete (idempotent)

---

## Status Codes

Use standard HTTP status codes consistently:

- `200 OK` – successful read/update
- `201 Created` – successful create (include `Location` header when applicable)
- `204 No Content` – successful operation without response body
- `400 Bad Request` – malformed request or validation failure
- `401 Unauthorized` – authentication required
- `403 Forbidden` – authenticated but not authorized
- `404 Not Found` – resource does not exist
- `409 Conflict` – concurrency or state conflict
- `422 Unprocessable Entity` – semantic validation errors (if adopted, use consistently)
- `429 Too Many Requests` – rate limiting
- `500 Internal Server Error`
- `503 Service Unavailable`

---

## Error Handling (Mandatory)

### RFC 7807 Problem Details

All error responses MUST use the Problem Details format (RFC 7807).

Content-Type:
application/problem+json

Required fields:
- `type` – URI identifying the error type
- `title` – short, human-readable summary
- `status` – HTTP status code
- `detail` – human-readable explanation
- `instance` – request path
- `traceId` – correlation/trace identifier

Example:
```json
{
  "type": "https://errors.myorg.com/validation",
  "title": "Validation failed",
  "status": 400,
  "detail": "One or more validation errors occurred.",
  "instance": "/v1/orders",
  "traceId": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
}
```

## Validation errors

- Validation details SHOULD be included in a stable, documented structure.
- Do not leak internal model or framework details.

## DTOs & Mapping

- API DTOs are boundary models.
- Domain entities MUST NOT be exposed directly.
- Mapping rules and placement are defined by ADRs.

## Pagination, Filtering, Sorting

### Pagination

List endpoints SHOULD support pagination.

Accepted pattern:
- page
- pageSize

Response SHOULD include:
- totalCount (if feasible)
- paging metadata

### Filtering

Use query parameters:
```
GET /v1/orders?status=open&customerId=123
```

### Sorting

Use:
```
sort=createdAt
direction=asc|desc
```

---

## Idempotency

For POST endpoints that may be retried:
- Support Idempotency-Key header.
- Store key and response for a defined retry window.
- Behavior must be documented if supported.

---

## Concurrency Control

If optimistic concurrency is required:
- Use ETags with If-Match headers OR
- Explicit version fields in DTOs

On conflict:
- Return 409 Conflict
- Provide a clear problem detail explaining the conflict.

---

## Authentication & Authorization

- Authentication and authorization mechanisms are defined by ADRs.
- APIs MUST:
  - return 401 for unauthenticated requests
  - return 403 for unauthorized requests
- Do not leak sensitive information in error responses.

---

## Observability

### Correlation

- Accept and propagate W3C Trace Context headers.
- Include traceId in all Problem Details responses.

### Logging

- Log request start/end with:
  - method
  - route
  - status
  - duration
  - traceId / correlationId
- Never log secrets or personal data.

---

## OpenAPI / Swagger

- Every HTTP API MUST expose an OpenAPI specification.
- OpenAPI documents MUST:
  - reflect actual behavior
  - include examples
  - mark deprecated endpoints and fields

---

## Security Basics

- Validate all inputs server-side.
- Apply rate limiting where appropriate.
- Never expose stack traces or internal implementation details.

---