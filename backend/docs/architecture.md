# Backend Architecture

The backend is a Hono API organized by feature modules. Each module keeps related HTTP, business, persistence, and entity code together.

## Runtime flow

Requests flow through the layers in this order:

```text
HTTP request
  -> app.ts route registration
  -> module controller
  -> module service
  -> module repository
  -> database or backing dependency
```

Responses return through the same layers in reverse.

## Entry points

- `src/index.ts` starts the HTTP server.
- `src/app.ts` creates and wires the Hono app.
- `src/db/index.ts` creates the Drizzle database client.
- `src/db/schema.ts` exports database entities for Drizzle tooling.

`src/app.ts` is intentionally separate from `src/index.ts` so tests can create the app without opening a network port.

## Module shape

Every module follows this structure:

```text
src/modules/<module>/
  <module>.controller.ts
  <module>.service.ts
  <module>.repository.ts
  <module>.entity.ts
```

Current modules:

- `health`: reports application status through a non-persisted domain entity.
- `users`: exposes user list/create endpoints backed by a Drizzle table.

## Layer responsibilities

Controller:

- Handles Hono routes.
- Validates input with Zod.
- Converts service results into HTTP responses.

Service:

- Owns business logic.
- Orchestrates repositories.
- Does not know about HTTP request/response objects.

Repository:

- Owns database or external dependency access.
- Is the only module layer that should import Drizzle query APIs.
- Exposes a small interface so tests can replace it with in-memory behavior.

Entity:

- Defines a Drizzle table for persisted resources.
- Defines a domain type for non-persisted resources.

## Testing strategy

E2e tests use Supertest against the real Hono app factory. Repositories are injectable, so tests can use in-memory repositories while still covering the HTTP/controller/service/repository path.

This keeps feedback fast and avoids requiring Docker/Postgres for basic API behavior checks. Tickets that specifically change SQL, migrations, or database behavior should add a separate database-backed test path.
