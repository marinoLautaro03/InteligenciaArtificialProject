# Backend Module Guide

Use this checklist when adding or changing backend modules. Each module owns its HTTP boundary, business logic, persistence access, and entity definitions.

## 1. Create the module folder

Create a folder under `src/modules/<module-name>`.

Required files:

- `<module>.controller.ts`
- `<module>.service.ts`
- `<module>.repository.ts`
- `<module>.entity.ts`

Optional files:

- `<module>.schemas.ts` for Zod request/response schemas
- `<module>.types.ts` for shared TypeScript-only types

## 2. Define the entity

For persisted resources, define the Drizzle table in `<module>.entity.ts`.

For non-persisted resources, define the domain entity type in the same file. The health module is the reference for this shape.

Export persisted entities from `src/db/schema.ts` so Drizzle can discover them.

## 3. Build the repository

The repository is the only layer that should talk directly to Drizzle, the database, or other external storage.

Rules:

- Export a repository type.
- Export a `create<Module>Repository()` factory.
- Accept dependencies as parameters when they make tests easier.
- Return domain/entity shapes, not raw transport objects.

## 4. Build the service

The service owns business rules and orchestration.

Rules:

- Accept the repository as a constructor/factory dependency.
- Keep HTTP concepts out of the service.
- Keep database query details out of the service.
- Export a service type from `ReturnType<typeof create<Module>Service>`.

## 5. Build the controller

The controller owns HTTP concerns.

Rules:

- Create a `new Hono()` controller.
- Validate request bodies, params, and query strings with Zod.
- Return HTTP status codes and JSON responses.
- Call the service, never the repository directly.

## 6. Register the module

Register the module in `src/app.ts`.

Pattern:

```ts
const repository = dependencies.exampleRepository ?? createExampleRepository();
const service = createExampleService(repository);

app.route("/examples", createExampleController(service));
```

Expose repository overrides through `AppDependencies` when e2e tests need an in-memory implementation.

## 7. Add e2e coverage

Add or update tests under `test/**/*.e2e.test.ts`.

Preferred pattern:

- Use `createApp()` from `src/app.ts`.
- Use `createAdaptorServer(app)` from `@hono/node-server`.
- Use Supertest for HTTP assertions.
- Use in-memory repositories for fast, deterministic tests unless the ticket explicitly requires real Postgres coverage.

Run:

```bash
pnpm --filter backend test:e2e
pnpm --filter backend build
```
