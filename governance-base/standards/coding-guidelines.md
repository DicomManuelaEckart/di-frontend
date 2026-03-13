# Coding Guidelines

These guidelines define how we write and change code across repositories in this organization.
They are designed to support:
- consistent implementation across multiple repos
- clean architecture boundaries
- automated enforcement via tests (ArchTests)
- safe collaboration with coding agents

> Source of truth for architecture decisions are ADRs. When in doubt: follow ADRs.

---

## Scope

Applies to all repos:
- backend
- frontend
- admin
- printservice
- infrastructure

Repo-specific exceptions must be documented either in:
- an ADR with `scope: <repo>`, or
- a local decision doc under `/docs/decisions-local/` referencing the ADR.

---

## Architectural Principles

### ADR first
- If you introduce a new architectural pattern or cross-cutting rule, create or update an ADR first.
- If you need to deviate from an ADR, propose a new ADR or deprecate the old one.

**Related ADRs:** (fill in)
- ADR-xxxxx …

### Keep boundaries explicit
- Keep dependencies and access directions clear (e.g., Domain → none; Application → Domain; Infrastructure → Application+Domain; API → Application).
- Do not add “helper shortcuts” across layers.

**Enforcement:** ArchTests in each repo where applicable.

### Prefer boring solutions
- Use standard language features and established libraries already used in the codebase.
- Avoid introducing new dependencies unless needed and documented.

---

## Repository Structure

### Required baseline
Each repo SHOULD include:
- `README.md` (how to build/test/run, key links)
- `AGENTS.md` (agent constraints and repo-specific rules)
- `/governance-base` (git submodule; read-only)
- `/src` and `/tests` (or equivalent for frontend)

### governance-base submodule rule
- `/governance-base` is read-only and pushed via github actions from `governance-base` to consumer repositories.
- Contains ADRs, Standards, and Agent documentation.
- Do not edit files in `/governance-base` in product repos.

---

## Naming & Code Style

### Naming conventions
- Use clear, intention-revealing names.
- Avoid abbreviations unless domain-standard.
- Keep naming consistent with the domain language (ubiquitous language).


### Type naming suffixes by layer (backend)

The following suffixes are mandatory across all backend modules. Violations are caught by ArchTests. See also ADR-00003.

| Layer | Allowed suffixes | Examples |
|-------|-----------------|----------|
| `Application` (handler inputs) | `*Command`, `*Query` | `CreateCustomerCommand`, `GetCustomerQuery` |
| `Application.Contracts` (inter-BC API, handler outputs) | `*Dto` | `CustomerDto`, `CustomerSummaryDto` |
| `Presentation` (HTTP boundary) | `*Request`, `*Response` | `CreateCustomerRequest`, `CustomerResponse` |

**Never use in Application/Contracts:** `*ReadModel`, `*ViewModel`, `*Request`, `*Response`  
**Never use in Presentation:** `*Dto` as a public HTTP type  
**Note:** `Result<T>` is a return-value wrapper, not a DTO type – the type parameter follows the table above (e.g., `Result<CustomerDto>`).

### Projects / packages
- Keep RootNamespace and AssemblyName consistent (backend/.NET):
  - `RootNamespace == AssemblyName`
- Follow the namespace standard defined in `namespaces.md`.

### Formatting
- Use automated formatting where available (dotnet format / eslint / prettier).
- Prefer small, readable units over clever one-liners.

---

## Change Management (PR hygiene)

### Small PRs
- Prefer PRs that are easy to review.
- Separate refactoring from behavior change whenever possible.

### PR description must include
- What changed and why
- How to test
- Links to Issues
- If relevant: ADR IDs (e.g., `ADR-00012`)

### Commit messages
- Use a consistent convention (e.g., Conventional Commits) if adopted.
- Include issue references when relevant.

---

## Testing

### Test pyramid (default)
- Unit tests: fast, most common
- Integration tests: database, messaging, file I/O, HTTP
- End-to-end tests: selective, high value flows

### Architecture tests (ArchTests)
- Architectural rules SHOULD be enforced by ArchTests.
- Each ArchTest rule MUST reference the ADR that motivated it, using one of:
  - a comment in the test code: `// ADR-xxxxx`
  - OR a class/file name prefix: `ADR_xxxxx_...`
  - AND/OR an entry in `tests/Architecture.Tests/ADR-Mapping.md`

**Recommendation:** Use both `// ADR-xxxxx` and `ADR-Mapping.md` for traceability.

### Test naming
- `MethodName_State_ExpectedResult` or `Given_When_Then` (pick one and stay consistent per repo).

### Determinism
- Tests must be deterministic.
- Avoid time-based flakiness; use controllable clocks/time providers.

---

## Error Handling

### Prefer explicit errors
- Domain/Application should express failures explicitly (domain errors, result types, exceptions as per ADRs).
- API layer translates to HTTP concerns (status codes, problem details).

### Logging
- Domain should not depend on logging frameworks.
- Logging should be structured (key/value) and useful for debugging.

---

## Warnings & Static Analysis

### Warnings sind Build-Fehler
- Compiler-/Linter-Warnings müssen als Fehler behandelt werden.
- Der Build darf bei Warnings nicht erfolgreich sein.
- Warnings werden behoben, nicht unterdrückt.

| Stack | Enforcement |
|-------|-------------|
| .NET | `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` in `Directory.Build.props` |
| Angular/TypeScript | `"strict": true` in `tsconfig.json`, ESLint mit `error`-Severity |
| Node.js | ESLint-Regeln auf `error`, `--max-warnings 0` in CI |

### Verboten
- **.NET:** `#pragma warning disable` / `[SuppressMessage]` / `<NoWarn>` ohne ADR-Referenz
- **TypeScript:** `// @ts-ignore` / `// @ts-expect-error` / `eslint-disable` ohne dokumentierte Begründung
- **Alle:** Pauschalunterdrückungen in Config-Dateien für Produktionscode

### Erlaubt (mit Einschränkung)
- Temporäre Unterdrückung mit TODO + Issue-Referenz (max. 1 Sprint)
- Unterdrückung in generierten Code-Dateien (z.B. API-Clients, Protobuf)
- Dokumentierte Ausnahmen mit ADR-Referenz (selten, begründungspflichtig)

### CI-Enforcement
- CI-Pipeline muss bei Warnings fehlschlagen.
- Keine `--ignore-warnings` oder `--force` Flags in Build-Scripts.

---

## Dependencies & Packages

### Default rules
- Minimize dependencies in core layers.
- Infrastructure can depend on heavier frameworks; core layers should not.

### Updating packages
- Prefer regular updates (small increments).
- Record major upgrades and breaking changes in ADRs or release notes as appropriate.

---

## Security & Secrets

- Never commit secrets.
- Use environment-based configuration.
- Sanitize logs (no tokens, passwords, personal data).

---

## Documentation

### Always keep these up to date
- `README.md` build/test/run steps
- ADR references in code/tests where rules are enforced
- Public contracts (API schemas, message schemas)

---

## Coding Agents

### Rules
- Agents must follow `AGENTS.md` in the target repo.
- Agents must not change `/governance-base` submodule.
- Agents should keep changes minimal and focused.

### Agent-ready tasks
When creating tasks intended for agents, ensure the issue contains:
- exact scope (repo + folders)
- constraints (what must not be touched)
- definition of done (compiles, tests pass, ADR referenced)

---
