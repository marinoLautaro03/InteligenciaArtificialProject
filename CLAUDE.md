# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

pnpm monorepo with two packages:
- `frontend/`: React 19 + Vite + TypeScript + ESLint
- `backend/`: Hono + Drizzle ORM + PostgreSQL + Zod + Vitest

## Commands

### Root (runs across both packages)
```bash
pnpm install          # install all dependencies
pnpm dev              # run frontend and backend in parallel
pnpm build            # compile both packages
pnpm lint             # eslint (frontend) + tsc --noEmit (backend)
```

### Backend only
```bash
pnpm --filter backend dev          # tsx watch on src/index.ts
pnpm --filter backend build        # tsc compile to dist/
pnpm --filter backend lint         # tsc --noEmit (type checking)
pnpm --filter backend test:e2e     # vitest run (e2e tests in test/)
pnpm --filter backend db:generate  # drizzle-kit generate migrations
pnpm --filter backend db:push      # drizzle-kit push schema to DB
```

### Frontend only
```bash
pnpm --filter frontend dev      # vite dev server
pnpm --filter frontend build    # tsc -b && vite build
pnpm --filter frontend lint     # eslint
pnpm --filter frontend preview  # vite preview of production build
```

### Database (local PostgreSQL via Docker)
```bash
docker compose -f backend/docker-compose.yml up -d   # start postgres
docker compose -f backend/docker-compose.yml down    # stop postgres
```

Credentials: `postgres://postgres:postgres@localhost:5432/ia_project`

### Running a single test file
```bash
pnpm --filter backend test:e2e -- --reporter=verbose
```
Vitest picks up all `test/**/*.e2e.test.ts` files.

## Architecture

### Backend module pattern

Each domain feature lives in `backend/src/modules/<name>/` with four layers:

- **entity** (`*.entity.ts`): Drizzle table definition. Source of truth for the DB schema and inferred TypeScript types.
- **repository** (`*.repository.ts`): Data access only. Exports a factory function `create<Name>Repository()` and a `<Name>Repository` interface — this interface is what the service and tests depend on, not the concrete implementation.
- **service** (`*.service.ts`): Business logic. Created via `create<Name>Service(repository)`. Its return type is exported as `<Name>Service`.
- **controller** (`*.controller.ts`): Hono router. Created via `create<Name>Controller(service)`. Handles request parsing (Zod) and HTTP responses.

### Dependency injection

`backend/src/app.ts` wires everything together via `createApp(dependencies?)`. The optional `dependencies` argument accepts repository overrides — this is how e2e tests inject in-memory repositories without touching the database.

### E2E tests

`backend/test/users.e2e.test.ts` uses in-memory repository implementations and `supertest` against a real Hono app instance. No database connection is required.

### Schema and validation

Zod schemas in `*.schemas.ts` define request payloads. Drizzle table types are inferred with `InferSelectModel` in the repository files and re-exported from `backend/src/db/schema.ts`.

### Frontend

React + Vite scaffold with **React Router DOM** for routing and **Clerk v6** for authentication.

Key files:
- `frontend/src/main.tsx`: Wraps the app with `<ClerkProvider>` and `<BrowserRouter>`.
- `frontend/src/App.tsx`: Defines routes — `/login` (public), `/sso-callback` (OAuth redirect), `/*` (protected).
- `frontend/src/components/ProtectedRoute.tsx`: Redirects unauthenticated users to `/login`.
- `frontend/src/pages/LoginPage.tsx`: Custom two-column login page with email/password and Google OAuth via Clerk's `useSignIn` signal-based API.
- `frontend/src/pages/Dashboard.tsx`: Placeholder protected screen with logout button.

Clerk uses the signal-based API (`useSignIn().signIn` is a signal, not a plain object). Always access `.value` when reading signal state (e.g., `signIn.value?.status`).

Routes:
- `/login` — unauthenticated landing; redirects to `/` if already signed in
- `/sso-callback` — handles OAuth redirect from Clerk (`AuthenticateWithRedirectCallback`)
- `/*` — protected; redirects to `/login` if not signed in

### Design source of truth — `prototype/`

The `prototype/` folder contains a fully working HTML/JSX prototype of the application. It is **read-only documentation** — it must never be modified, imported, or referenced at runtime.

Rules:
- **Never** import from, require, or link to anything inside `prototype/`.
- **Never** modify any file inside `prototype/`.
- **Do** read it to understand the intended component structure, layout, visual hierarchy, interactions, and design tokens when implementing frontend screens.
- When implementing a screen, reproduce the component logic and styles in the appropriate `frontend/src/` location. Copy patterns and structure from the prototype, but write fresh, idiomatic React + TypeScript code — do not port JSX verbatim.

What the prototype defines (use it as the canonical reference):
- Screen layouts and two-column/split structures
- Component trees per screen (Login, Dashboard, Generator, History, Post Detail)
- Visual states (loading skeletons, empty states, hover, active, error)
- Design tokens: CSS vars `--fg`, `--bg`, `--accent`, `--surface-*`, `--border`, `--font-mono`, border radii, spacing scale
- Interaction flows and navigation logic between screens

## Dev URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- Health endpoint: `http://localhost:3001/health`

## MCP servers

Copy the template and fill in your Atlassian credentials:

```powershell
Copy-Item .mcp.json.example .mcp.json
```

Edit `.mcp.json` and replace `JIRA_URL`, `JIRA_USERNAME`, and `JIRA_API_TOKEN` with real values. Get an API token at https://id.atlassian.com/manage-api-tokens. The file is gitignored — never committed.

Requires Docker Desktop running to start the `mcp-atlassian` container.

## Environment setup

Copy the example env files before first run:
```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Backend requires `DATABASE_URL` (PostgreSQL connection string) and optionally `PORT` (default `3001`).

Frontend requires `VITE_CLERK_PUBLISHABLE_KEY` (from the Clerk dashboard for the project's development instance).

### Test credentials (Clerk dev instance)

| Field    | Value                  |
|----------|------------------------|
| Username | `test`                 |
| Password | `SocialContentStudio`  |

> The Clerk instance uses **username** as the sign-in identifier (not email). The email associated with the test account is `test@gmail.com` but it cannot be used to log in.
