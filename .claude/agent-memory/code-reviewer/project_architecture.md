---
name: project-architecture
description: Backend module pattern and DI wiring for the InteligenciaArtificialProject monorepo
metadata:
  type: project
---

Backend follows a strict four-layer module pattern per domain feature under `backend/src/modules/<name>/`:

- **entity** (`*.entity.ts`) — Drizzle table definition; source of truth for DB schema.
- **repository** (`*.repository.ts`) — Data access only. Exports a factory function `create<Name>Repository()` and a `<Name>Repository` interface. The interface (not the concrete impl) is what service and tests depend on.
- **service** (`*.service.ts`) — Business logic. Created via `create<Name>Service(repository)`.
- **controller** (`*.controller.ts`) — Hono router. Created via `create<Name>Controller(service)`. Zod parsing + HTTP responses.

**Why:** Clean separation of concerns; testability via in-memory repository substitution in e2e tests.

**How to apply:** When reviewing, check that no business logic leaks into the repository layer and no DB imports appear in service/controller. Repository interfaces are the seam for DI.

The `Project` type is defined in `projects.repository.ts` as `DbProject & { postCount: number }`, where `DbProject = InferSelectModel<typeof projects>`. The `postCountExpr` is a module-level SQL subquery constant reused by `findAllByOwner`, `findByIdForOwner`, and `updateForOwner` re-query.

E2E tests in `backend/test/` use in-memory repository implementations injected via `createApp(dependencies?)`. No real DB connection needed for tests.

---

**Frontend shell architecture (as of SCRUM-13 / commit 5713067):**

`AppShell` = default export that wraps `ShellContent` in `<ProjectsProvider>`. `ShellContent` is the internal component that consumes context and renders the layout. This split is the established pattern for provider-consumer separation in shell components.

`PublicRoute` is defined inline in `App.tsx` (not a shared component). Guards the `/login` route; redirects signed-in users to `/`.

`useMatch('/projects/:projectId/*')` is the canonical way to derive `activeProjectId` from the URL in layout-level components. The wildcard `/*` ensures it matches all sub-routes under a project.

The prototype `app.jsx` sidebar uses inline styles for `.project-glyph`; the React implementation replaces these with a `.project-glyph` CSS class — a deliberate improvement over the prototype's inline style.

---

**Frontend context + mutation pattern (as of SCRUM-13 / commit fcf1571):**

`ProjectsContext` loads projects once in `ProjectsProvider` via `projectsApi.list`. Dashboard consumes `useProjects()` and calls `setProjects` for create/update/delete mutations — no re-fetch. After create, navigate to `/projects/:id/gallery`. `projectsApi.list` must NOT be called directly from Dashboard.

CSS class contract mandated by spec: `page-title`, `page-sub`, `input dashboard-search`, `btn btn-primary`, `project-grid`, `project-card`, `project-cover`, `glyph`, `project-logo`, `project-card-body`, `project-card-header`, `desc`, `meta`, `project-kebab`, `btn btn-ghost btn-icon`, `project-kebab-menu`, `kebab-item`, `kebab-item-danger`, `project-create-card`, `plus`.
