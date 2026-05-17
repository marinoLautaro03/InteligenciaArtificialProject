# Dashboard Projects UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full SCRUM-13 Dashboard + App Shell — sidebar layout, project cards with post count and kebab menu, reusable CSS system, and React Context for shared project state.

**Architecture:** AppShell is a React Router v6 layout route that renders sidebar + topbar + Outlet. It provides ProjectsContext so Dashboard can consume projects without a duplicate fetch. The active project in the sidebar is derived from URL params via `useMatch`, no global state needed.

**Tech Stack:** React 19, React Router DOM v6, Clerk v6, Hono + Drizzle ORM (backend), Vitest (e2e tests), vanilla CSS modules.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/src/modules/projects/projects.repository.ts` | Modify | Add `postCount` subquery to SELECT |
| `backend/test/projects.e2e.test.ts` | Modify | Update in-memory repo + add `postCount` assertion |
| `frontend/src/lib/api.ts` | Modify | Add `postCount: number` to `Project` type |
| `frontend/src/styles/shell.css` | Create | App shell layout: sidebar, topbar, breadcrumbs, content |
| `frontend/src/styles/components.css` | Create | Shared UI primitives: buttons, inputs, cards, modals, page headers |
| `frontend/src/App.css` | Modify | Empty — all styles moved to modular files |
| `frontend/src/main.tsx` | Modify | Import `shell.css` and `components.css` |
| `frontend/src/pages/Dashboard.css` | Modify | Dashboard-only styles; remove shared primitives; add kebab CSS |
| `frontend/src/pages/ProjectGallery.css` | Create | Gallery-specific styles extracted from Dashboard.css |
| `frontend/src/components/ProjectForm.tsx` | Modify | Migrate button/input class names to `.btn`/`.input` system |
| `frontend/src/pages/ProjectGallery.tsx` | Modify | Remove standalone topbar; import own CSS; migrate class names |
| `frontend/src/context/ProjectsContext.tsx` | Create | React Context + Provider for projects list |
| `frontend/src/components/AppShell.tsx` | Create | Sidebar + TopBar + Outlet layout component |
| `frontend/src/App.tsx` | Modify | Layout route wrapping AppShell |
| `frontend/src/pages/Dashboard.tsx` | Modify | Consume context, remove hero, new card with kebab menu |

---

### Task 1: Backend — add `postCount` to projects

**Files:**
- Modify: `backend/src/modules/projects/projects.repository.ts`
- Modify: `backend/test/projects.e2e.test.ts`

- [ ] **Step 1: Add failing `postCount` assertion to the e2e test**

Open `backend/test/projects.e2e.test.ts`. In the `"creates, lists, reads, updates, and deletes owned projects"` test, update the `listResponse` assertion (around line 123):

```typescript
expect(listResponse.body).toHaveLength(1);
expect(listResponse.body[0]).toMatchObject({
  id: 1,
  ownerId: "user_123",
  postCount: 0,
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm --filter backend test:e2e -- --reporter=verbose
```

Expected: FAIL — `postCount` is `undefined`, expected `0`.

- [ ] **Step 3: Update `projects.repository.ts`**

Replace the entire file content:

```typescript
import { and, eq, getTableColumns, sql } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { db } from "../../db/index.js";
import { posts } from "../posts/posts.entity.js";
import type { CreateProjectInput, UpdateProjectInput } from "./projects.schemas.js";
import { projects } from "./projects.entity.js";

type DbProject = InferSelectModel<typeof projects>;
export type Project = DbProject & { postCount: number };

export type ProjectsRepository = {
  findAllByOwner: (ownerId: string) => Promise<Project[]>;
  findByIdForOwner: (id: number, ownerId: string) => Promise<Project | undefined>;
  create: (input: CreateProjectInput & { ownerId: string }) => Promise<Project>;
  updateForOwner: (id: number, ownerId: string, input: UpdateProjectInput) => Promise<Project | undefined>;
  deleteForOwner: (id: number, ownerId: string) => Promise<boolean>;
};

const postCountExpr = sql<number>`(SELECT COUNT(*)::int FROM posts WHERE posts.project_id = ${projects.id})`;

export const createProjectsRepository = (database = db): ProjectsRepository => ({
  findAllByOwner: async (ownerId) => {
    return database
      .select({ ...getTableColumns(projects), postCount: postCountExpr })
      .from(projects)
      .where(eq(projects.ownerId, ownerId));
  },

  findByIdForOwner: async (id, ownerId) => {
    const [project] = await database
      .select({ ...getTableColumns(projects), postCount: postCountExpr })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)));
    return project;
  },

  create: async (input) => {
    const [created] = await database
      .insert(projects)
      .values({
        name: input.name,
        description: input.description ?? "",
        ownerId: input.ownerId,
        logoUrl: input.logoUrl,
        primaryColor: input.primaryColor,
      })
      .returning();
    return { ...created, postCount: 0 };
  },

  updateForOwner: async (id, ownerId, input) => {
    const [updated] = await database
      .update(projects)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)))
      .returning();

    if (!updated) return undefined;

    const [withCount] = await database
      .select({ ...getTableColumns(projects), postCount: postCountExpr })
      .from(projects)
      .where(eq(projects.id, updated.id));

    return withCount;
  },

  deleteForOwner: async (id, ownerId) => {
    const deleted = await database
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)))
      .returning({ id: projects.id });
    return deleted.length > 0;
  },
});
```

- [ ] **Step 4: Update in-memory repository in the e2e test**

In `backend/test/projects.e2e.test.ts`, update `createInMemoryProjectsRepository`. The `Project` type now requires `postCount`, so every object literal of type `Project` needs `postCount: 0`:

```typescript
import type { Project, ProjectsRepository } from "../src/modules/projects/projects.repository.js";

const createInMemoryProjectsRepository = (): ProjectsRepository => {
  const records: Project[] = [];
  let nextId = 1;

  return {
    findAllByOwner: async (ownerId) =>
      records.filter((p) => p.ownerId === ownerId),

    findByIdForOwner: async (id, ownerId) =>
      records.find((p) => p.id === id && p.ownerId === ownerId),

    create: async (input) => {
      const now = new Date("2026-01-01T00:00:00.000Z");
      const project: Project = {
        id: nextId,
        name: input.name,
        description: input.description,
        status: "active",
        ownerId: input.ownerId,
        logoUrl: input.logoUrl ?? null,
        primaryColor: input.primaryColor ?? null,
        createdAt: now,
        updatedAt: now,
        postCount: 0,
      };
      nextId += 1;
      records.push(project);
      return project;
    },

    updateForOwner: async (id, ownerId, input) => {
      const project = records.find((r) => r.id === id && r.ownerId === ownerId);
      if (!project) return undefined;
      Object.assign(project, input, { updatedAt: new Date("2026-01-02T00:00:00.000Z") });
      return project;
    },

    deleteForOwner: async (id, ownerId) => {
      const index = records.findIndex((p) => p.id === id && p.ownerId === ownerId);
      if (index === -1) return false;
      records.splice(index, 1);
      return true;
    },
  };
};
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm --filter backend test:e2e -- --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/projects/projects.repository.ts backend/test/projects.e2e.test.ts
git commit -m "feat: add postCount to projects repository"
```

---

### Task 2: Frontend — add `postCount` to Project type

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add `postCount` to the `Project` type**

In `frontend/src/lib/api.ts`, update the `Project` type:

```typescript
export type Project = {
  id: number;
  name: string;
  description: string;
  status: string;
  ownerId: string;
  logoUrl: string | null;
  primaryColor: string | null;
  postCount: number;
  createdAt: string;
  updatedAt: string;
};
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter frontend build
```

Expected: compiles with no errors (existing code doesn't read `postCount` yet, so no breakage).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: add postCount to Project type"
```

---

### Task 3: CSS — create `shell.css` and `components.css`

**Files:**
- Create: `frontend/src/styles/shell.css`
- Create: `frontend/src/styles/components.css`
- Modify: `frontend/src/App.css`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Create `frontend/src/styles/shell.css`**

```css
/* App shell layout */
.app {
  display: grid;
  grid-template-columns: 248px 1fr;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  border-right: 1px solid var(--border);
  background: var(--surface-2);
  display: flex;
  flex-direction: column;
  padding: 18px 14px;
  gap: 18px;
  overflow-y: auto;
}

.sidebar .brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 6px 12px;
  border-bottom: 1px solid var(--border);
}

.brand-mark {
  width: 26px;
  height: 26px;
  background: var(--fg);
  color: var(--bg);
  border-radius: 6px;
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.04em;
  flex-shrink: 0;
}

.brand-name {
  font-size: var(--t-md);
  font-weight: 500;
  letter-spacing: -0.02em;
}

.brand-sub {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--fg-soft);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: 1px;
}

.nav-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-label {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--fg-soft);
  padding: 6px 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border-radius: var(--radius-sm);
  color: var(--fg-muted);
  font-size: 13.5px;
  cursor: pointer;
  border: none;
  background: transparent;
  text-align: left;
  width: 100%;
  text-decoration: none;
  transition: background 0.12s, color 0.12s;
}

.nav-item:hover {
  background: var(--surface);
  color: var(--fg);
}

.nav-item.active {
  background: var(--surface);
  color: var(--fg);
  box-shadow: inset 0 0 0 1px var(--border);
}

.nav-item .count {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--fg-soft);
}

.project-glyph {
  width: 16px;
  height: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--fg);
  flex-shrink: 0;
}

.sidebar .spacer {
  flex: 1;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: oklch(0.78 0.07 60);
  display: grid;
  place-items: center;
  font-size: 11px;
  color: oklch(0.25 0.05 60);
  font-weight: 500;
  flex-shrink: 0;
}

.user-meta {
  line-height: 1.25;
  min-width: 0;
  flex: 1;
}

.user-meta .name {
  font-size: 12.5px;
}

.user-meta .email {
  font-size: 10.5px;
  color: var(--fg-soft);
  font-family: var(--font-mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Main column */
.main {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 28px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  min-height: 56px;
  flex-shrink: 0;
}

.crumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--fg-muted);
}

.crumbs a {
  color: var(--fg-muted);
  text-decoration: none;
}

.crumbs a:hover {
  color: var(--fg);
}

.crumbs .sep {
  color: var(--fg-soft);
}

.crumbs .current {
  color: var(--fg);
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 28px;
}

.content-inner {
  max-width: 1200px;
  margin: 0 auto;
}
```

- [ ] **Step 2: Create `frontend/src/styles/components.css`**

```css
/* ===== Buttons ===== */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--fg);
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
  text-decoration: none;
  font-family: inherit;
}

.btn:hover {
  background: var(--surface-2);
  border-color: var(--border-strong);
}

.btn:active {
  transform: translateY(0.5px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-primary {
  background: var(--accent);
  color: var(--accent-fg);
  border-color: transparent;
}

.btn-primary:hover {
  background: var(--accent);
  filter: brightness(1.06);
  border-color: transparent;
}

.btn-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--fg-muted);
}

.btn-ghost:hover {
  background: var(--surface-2);
  color: var(--fg);
  border-color: transparent;
}

.btn-danger {
  color: var(--danger);
  border-color: oklch(0.85 0.1 25);
  background: oklch(0.97 0.03 25);
}

.btn-danger:hover {
  background: oklch(0.94 0.06 25);
}

.btn-lg {
  padding: 10px 16px;
  font-size: 14px;
}

.btn-sm {
  padding: 5px 9px;
  font-size: 12px;
}

.btn-icon {
  padding: 6px;
  aspect-ratio: 1;
  justify-content: center;
}

/* ===== Inputs ===== */
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 12px;
  color: var(--fg-muted);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.input,
.textarea {
  width: 100%;
  padding: 9px 11px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--fg);
  font-size: 13.5px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.12s, box-shadow 0.12s;
}

.input:focus,
.textarea:focus {
  border-color: var(--fg);
  box-shadow: 0 0 0 3px oklch(0.92 0.004 85);
}

.textarea {
  min-height: 90px;
  resize: vertical;
  line-height: 1.45;
}

/* ===== Cards ===== */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.card-pad {
  padding: 20px;
}

/* ===== Modals ===== */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(36, 24, 8, 0.24);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 24px;
  z-index: 100;
}

.modal {
  width: min(720px, 100%);
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: 0 24px 80px rgba(51, 34, 13, 0.15);
  padding: 24px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.modal-header h2 {
  margin: 0;
}

.modal-header p {
  margin: 0;
  color: var(--fg-muted);
}

/* ===== Page headers ===== */
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.page-title {
  font-size: var(--t-2xl);
  font-weight: 500;
  letter-spacing: -0.025em;
  margin: 0;
}

.page-sub {
  font-size: 13.5px;
  color: var(--fg-muted);
  margin-top: 4px;
}

/* ===== Row utility ===== */
.row {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ===== Chips ===== */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  padding: 6px 11px;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 999px;
  font-size: 12.5px;
  color: var(--fg-muted);
  cursor: pointer;
  transition: all 0.12s;
}

.chip:hover {
  color: var(--fg);
  border-color: var(--border-strong);
}

.chip.active {
  background: var(--fg);
  color: var(--bg);
  border-color: var(--fg);
}

/* ===== Error banner ===== */
.error-banner {
  color: oklch(0.35 0.12 25);
  background: oklch(0.97 0.03 25);
  border: 1px solid oklch(0.85 0.1 25);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  font-size: 13.5px;
}
```

- [ ] **Step 3: Empty `frontend/src/App.css`**

Replace the entire file with a single comment:

```css
/* App-level styles are in src/styles/shell.css and src/styles/components.css */
```

- [ ] **Step 4: Update `frontend/src/main.tsx` to import the new CSS files**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './styles/shell.css'
import './styles/components.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)
```

- [ ] **Step 5: Type-check**

```bash
pnpm --filter frontend build
```

Expected: compiles with no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/styles/ frontend/src/App.css frontend/src/main.tsx
git commit -m "feat: add shared CSS — shell layout and component primitives"
```

---

### Task 4: CSS — refactor Dashboard.css, create ProjectGallery.css, migrate class names

**Files:**
- Modify: `frontend/src/pages/Dashboard.css`
- Create: `frontend/src/pages/ProjectGallery.css`
- Modify: `frontend/src/components/ProjectForm.tsx`
- Modify: `frontend/src/pages/ProjectGallery.tsx`

- [ ] **Step 1: Replace `frontend/src/pages/Dashboard.css`**

Remove all shared primitives (buttons, modals, gallery styles) — those now live in `components.css`. Keep only dashboard and project-card styles, and add new kebab menu styles:

```css
/* ===== Dashboard layout ===== */
.dashboard-feedback {
  padding: 18px 0;
  color: var(--fg-muted);
  font-size: 13.5px;
}

.dashboard-search {
  width: 220px;
}

/* ===== Empty state ===== */
.dashboard-empty-state {
  padding: 16px 0 8px;
}

.dashboard-empty-card {
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 28px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
}

.dashboard-empty-card h3 {
  margin: 0;
}

.dashboard-empty-card p {
  margin: 0;
  color: var(--fg-muted);
}

/* ===== Project grid ===== */
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  padding-top: 8px;
}

/* ===== Project card ===== */
.project-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: border-color 0.15s, transform 0.15s;
}

.project-card:hover {
  border-color: var(--border-strong);
  transform: translateY(-1px);
}

.project-cover {
  aspect-ratio: 16 / 9;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.project-cover .glyph {
  font-family: var(--font-mono);
  font-size: 28px;
  font-weight: 500;
  letter-spacing: -0.05em;
  color: var(--fg);
  opacity: 0.9;
}

.project-logo {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.7);
}

.project-card-body {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.project-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.project-card-header .name {
  font-size: 14.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-card-body .desc {
  font-size: 12.5px;
  color: var(--fg-muted);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-card-body .meta {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px dashed var(--border);
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--fg-soft);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* ===== Kebab menu ===== */
.project-kebab {
  position: relative;
  flex-shrink: 0;
}

.project-kebab-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 10;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  min-width: 140px;
  overflow: hidden;
}

.kebab-item {
  display: block;
  width: 100%;
  padding: 9px 14px;
  font-size: 13px;
  font-family: inherit;
  text-align: left;
  color: var(--fg);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.1s;
}

.kebab-item:hover {
  background: var(--surface-2);
}

.kebab-item:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.kebab-item-danger {
  color: var(--danger);
}

.kebab-item-danger:hover {
  background: oklch(0.97 0.03 25);
}

/* ===== Create card ===== */
.project-create-card {
  background: transparent;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 10px;
  padding: 22px;
  text-align: left;
  color: var(--fg-muted);
  cursor: pointer;
  min-height: 100%;
  font-size: 13px;
  transition: all 0.15s;
}

.project-create-card:hover {
  color: var(--fg);
  border-color: var(--fg);
}

.project-create-card .plus {
  font-size: 32px;
  line-height: 1;
}

.project-create-card strong {
  font-size: 15px;
}

/* ===== Project form (modal content) ===== */
.project-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.project-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.project-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.project-field span {
  font-size: 12px;
  color: var(--fg-muted);
  font-weight: 600;
}

.project-color-row {
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 10px;
}

.project-color {
  width: 52px;
  height: 44px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  padding: 4px;
  cursor: pointer;
}

.project-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
```

- [ ] **Step 2: Create `frontend/src/pages/ProjectGallery.css`**

```css
.gallery-topbar {
  padding: 0 0 20px;
}

.gallery-intro {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(260px, 0.8fr);
  gap: 18px;
  align-items: stretch;
  margin-bottom: 24px;
}

.gallery-intro h1 {
  margin: 8px 0 10px;
  font-size: clamp(28px, 4vw, 48px);
  letter-spacing: -0.02em;
}

.gallery-intro p {
  margin: 0;
  color: var(--fg-muted);
}

.gallery-summary-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gallery-summary-card span {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fg-soft);
}

.gallery-summary-card strong {
  font-size: 28px;
  font-weight: 600;
}

.gallery-summary-card small {
  color: var(--fg-muted);
  font-size: 13px;
  line-height: 1.5;
}

.gallery-empty-state {
  padding: 16px 0 8px;
}

.gallery-empty-card {
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 28px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
}

.gallery-empty-card h3 {
  margin: 0;
}

.gallery-empty-card p {
  margin: 0;
  color: var(--fg-muted);
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  padding: 0 0 40px;
}

.gallery-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.gallery-card img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
}

.gallery-card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gallery-card-network {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
}

.gallery-card-text {
  font-size: 13px;
  line-height: 1.4;
  color: var(--fg-muted);
  margin: 0;
}

/* Generate modal */
.generate-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

@media (max-width: 840px) {
  .gallery-intro {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Migrate class names in `frontend/src/components/ProjectForm.tsx`**

Replace all occurrences of the old class names:
- `project-modal-backdrop` → `modal-backdrop`
- `project-modal` → `modal`
- `project-modal-header` → `modal-header`
- `project-input` → `input`
- `project-textarea` → `textarea`
- `ghost-button` → `btn btn-ghost`
- `primary-button` → `btn btn-primary`
- `project-error` → `error-banner`

Full updated `ProjectForm.tsx`:

```tsx
import { useState } from 'react';
import type { CreateProjectInput, Project } from '../lib/api';

type ProjectFormProps = {
  initialValue?: Project | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (input: CreateProjectInput) => Promise<void>;
};

type FormState = {
  name: string;
  description: string;
  logoUrl: string;
  primaryColor: string;
};

const emptyState: FormState = {
  name: '',
  description: '',
  logoUrl: '',
  primaryColor: '#D97706',
};

const toFormState = (project?: Project | null): FormState => {
  if (!project) return emptyState;
  return {
    name: project.name,
    description: project.description,
    logoUrl: project.logoUrl ?? '',
    primaryColor: project.primaryColor ?? '#D97706',
  };
};

export default function ProjectForm({ initialValue, isSubmitting, onCancel, onSubmit }: ProjectFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(initialValue));
  const [error, setError] = useState('');

  const submitLabel = initialValue ? 'Guardar cambios' : 'Crear proyecto';
  const title = initialValue ? 'Editar proyecto' : 'Crear proyecto';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    try {
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim(),
        logoUrl: form.logoUrl.trim() || undefined,
        primaryColor: form.primaryColor.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar el proyecto.');
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-form-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="project-form-title">{title}</h2>
            <p>Defini el nombre y el proposito de la campana para empezar a generar contenido.</p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={onCancel}>
            Cerrar
          </button>
        </div>

        <form className="project-form" onSubmit={handleSubmit}>
          <label className="project-field">
            <span>Nombre del proyecto</span>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="Lanzamiento otono 2026"
              required
            />
          </label>

          <label className="project-field">
            <span>Descripcion y objetivo</span>
            <textarea
              className="textarea"
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="Que campana es, a quien le habla y que queres lograr."
              rows={5}
              required
            />
          </label>

          <div className="project-form-grid">
            <label className="project-field">
              <span>Logo URL</span>
              <input
                className="input"
                type="url"
                value={form.logoUrl}
                onChange={(e) => setForm((s) => ({ ...s, logoUrl: e.target.value }))}
                placeholder="https://..."
              />
            </label>

            <label className="project-field">
              <span>Color principal</span>
              <div className="project-color-row">
                <input
                  className="project-color"
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm((s) => ({ ...s, primaryColor: e.target.value }))}
                />
                <input
                  className="input"
                  value={form.primaryColor}
                  onChange={(e) => setForm((s) => ({ ...s, primaryColor: e.target.value }))}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#D97706"
                />
              </div>
            </label>
          </div>

          {error ? <div className="error-banner">{error}</div> : null}

          <div className="project-form-actions">
            <button className="btn btn-ghost" type="button" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </button>
            <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update `frontend/src/pages/ProjectGallery.tsx` — remove topbar, import CSS, migrate class names**

```tsx
import { useAuth } from '@clerk/react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { postsApi, projectsApi, type GeneratePostInput, type Post, type Project } from '../lib/api';
import './ProjectGallery.css';

const socialNames: Record<string, string> = {
  instagram: 'Instagram',
  x: 'X',
  facebook: 'Facebook',
};

const socialColors: Record<string, string> = {
  instagram: '#E4405F',
  x: '#000',
  facebook: '#1877F2',
};

export default function ProjectGallery() {
  const { projectId } = useParams();
  const { getToken } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [status, setStatus] = useState<'loading' | 'idle' | 'error'>('loading');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<Post | null>(null);
  const [formData, setFormData] = useState<GeneratePostInput>({
    socialMedia: 'instagram',
    description: '',
  });

  const numericId = Number(projectId);

  useEffect(() => {
    const loadData = async () => {
      if (!Number.isInteger(numericId) || numericId <= 0) {
        setStatus('error');
        setError('Proyecto invalido.');
        return;
      }
      setStatus('loading');
      setError('');
      try {
        const [item, postList] = await Promise.all([
          projectsApi.getById(numericId, getToken),
          postsApi.list(numericId, getToken),
        ]);
        setProject(item);
        setPosts(postList);
        setStatus('idle');
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'No pudimos cargar la galeria.');
      }
    };
    void loadData();
  }, [getToken, numericId]);

  const openGenerate = () => {
    setFormData({ socialMedia: 'instagram', description: '' });
    setGeneratedPost(null);
    setShowModal(true);
  };

  const handleGenerate = async () => {
    if (!formData.description.trim()) return;
    setGenerating(true);
    setGeneratedPost(null);
    try {
      const post = await postsApi.generate(numericId, formData, getToken);
      setGeneratedPost(post);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (postId: number) => {
    try {
      const approved = await postsApi.approve(numericId, postId, getToken);
      setPosts((current) => [approved, ...current]);
      setGeneratedPost(null);
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aprobar.');
    }
  };

  if (status === 'loading') {
    return <div className="dashboard-feedback">Cargando galeria...</div>;
  }

  if (status === 'error') {
    return <div className="error-banner">{error}</div>;
  }

  if (!project) return null;

  return (
    <>
      <section className="gallery-intro">
        <div>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
        </div>
        <aside className="gallery-summary-card">
          <span>Posts aprobados</span>
          <strong>{posts.length}</strong>
          <small>Estas piezas son la base visual aprobada para cada red social.</small>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openGenerate}>
            Generar post
          </button>
        </aside>
      </section>

      {posts.length === 0 ? (
        <div className="gallery-empty-state">
          <div className="gallery-empty-card">
            <h3>Todavia no hay posts generados.</h3>
            <p>Crea el primer post describiendo que necesitas y seleccionando una red social.</p>
            <button className="btn btn-primary" onClick={openGenerate}>
              Generar primer post
            </button>
          </div>
        </div>
      ) : (
        <section className="gallery-grid">
          {posts.map((post) => (
            <article key={post.id} className="gallery-card">
              <img src={post.imageUrl} alt="" />
              <div className="gallery-card-body">
                <span
                  className="gallery-card-network"
                  style={{ color: socialColors[post.socialMedia] }}
                >
                  {socialNames[post.socialMedia]}
                </span>
                <p className="gallery-card-text">{post.text}</p>
              </div>
            </article>
          ))}
        </section>
      )}

      {showModal ? (
        <div
          className="modal-backdrop"
          onClick={() => { if (!generating) setShowModal(false); }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            {generatedPost ? (
              <>
                <div className="modal-header">
                  <h2>Post generado</h2>
                </div>
                <img
                  src={generatedPost.imageUrl}
                  alt=""
                  style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 8 }}
                />
                <div style={{ marginTop: 12 }}>
                  <span
                    className="gallery-card-network"
                    style={{ color: socialColors[generatedPost.socialMedia] }}
                  >
                    {socialNames[generatedPost.socialMedia]}
                  </span>
                  <p className="gallery-card-text" style={{ marginTop: 8 }}>{generatedPost.text}</p>
                </div>
                <div className="generate-modal-actions">
                  <button
                    className="btn btn-ghost"
                    onClick={() => { setShowModal(false); setGeneratedPost(null); }}
                  >
                    Descartar
                  </button>
                  <button className="btn btn-primary" onClick={() => handleApprove(generatedPost.id)}>
                    Aprobar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-header">
                  <h2>Generar nuevo post</h2>
                </div>
                <div className="project-form">
                  <div className="project-field">
                    <span>Red social</span>
                    <div className="row">
                      {(['instagram', 'x', 'facebook'] as const).map((platform) => (
                        <button
                          key={platform}
                          className={`btn${formData.socialMedia === platform ? ' btn-primary' : ''}`}
                          onClick={() => setFormData((p) => ({ ...p, socialMedia: platform }))}
                        >
                          {socialNames[platform]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="project-field">
                    <span>Descripcion</span>
                    <textarea
                      className="textarea"
                      placeholder="Describi que necesitas para el post..."
                      value={formData.description}
                      onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                  <div className="generate-modal-actions">
                    <button
                      className="btn btn-ghost"
                      onClick={() => setShowModal(false)}
                      disabled={generating}
                    >
                      Cancelar
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleGenerate}
                      disabled={generating || !formData.description.trim()}
                    >
                      {generating ? 'Generando...' : 'Generar'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
```

- [ ] **Step 5: Type-check**

```bash
pnpm --filter frontend build
```

Expected: compiles with no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Dashboard.css frontend/src/pages/ProjectGallery.css frontend/src/components/ProjectForm.tsx frontend/src/pages/ProjectGallery.tsx
git commit -m "refactor: modular CSS, migrate component class names to shared system"
```

---

### Task 5: Create `ProjectsContext`

**Files:**
- Create: `frontend/src/context/ProjectsContext.tsx`

- [ ] **Step 1: Create the context file**

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@clerk/react';
import { projectsApi, type Project } from '../lib/api';

type ProjectsContextValue = {
  projects: Project[];
  status: 'idle' | 'loading' | 'error';
  error: string;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
};

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setStatus('loading');
      setError('');
      try {
        const items = await projectsApi.list(getToken);
        setProjects(items);
        setStatus('idle');
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'No pudimos cargar los proyectos.');
      }
    };
    void load();
  }, [getToken]);

  return (
    <ProjectsContext.Provider value={{ projects, status, error, setProjects }}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjects must be used inside ProjectsProvider');
  return ctx;
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter frontend build
```

Expected: compiles with no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/context/ProjectsContext.tsx
git commit -m "feat: add ProjectsContext for shared projects state"
```

---

### Task 6: Create `AppShell` and update routing

**Files:**
- Create: `frontend/src/components/AppShell.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `frontend/src/components/AppShell.tsx`**

```tsx
import { useClerk, useUser } from '@clerk/react';
import { Link, Outlet, useMatch } from 'react-router-dom';
import { ProjectsProvider, useProjects } from '../context/ProjectsContext';

const initialsFromName = (name: string) =>
  name
    .split(' ')
    .map((chunk) => chunk[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

function ShellContent() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const { projects } = useProjects();

  const projectMatch = useMatch('/projects/:projectId/*');
  const activeProjectId = projectMatch?.params.projectId
    ? Number(projectMatch.params.projectId)
    : null;
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  const displayName = user?.firstName ?? user?.username ?? '';
  const displayEmail = user?.emailAddresses?.[0]?.emailAddress ?? '';
  const userInitials = initialsFromName(displayName || displayEmail);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SC</div>
          <div>
            <div className="brand-name">Social Content Studio</div>
            <div className="brand-sub">v0.1 · MVP</div>
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-label">General</div>
          <Link to="/" className={`nav-item${!activeProject ? ' active' : ''}`}>
            Proyectos
            <span className="count">{projects.length}</span>
          </Link>
        </div>

        {activeProject && (
          <div className="nav-section">
            <div className="nav-label">{activeProject.name}</div>
            <Link
              to={`/projects/${activeProject.id}/gallery`}
              className="nav-item active"
            >
              Galería
            </Link>
          </div>
        )}

        {projects.length > 0 && (
          <div className="nav-section">
            <div className="nav-label">Acceso rápido</div>
            {projects.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}/gallery`}
                className={`nav-item${activeProjectId === p.id ? ' active' : ''}`}
              >
                <span className="project-glyph">{initialsFromName(p.name)}</span>
                {p.name}
              </Link>
            ))}
          </div>
        )}

        <div className="spacer" />

        <div className="user-card">
          <div className="user-avatar">{userInitials}</div>
          <div className="user-meta">
            <div className="name">{displayName}</div>
            <div className="email">{displayEmail}</div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => signOut({ redirectUrl: '/login' })}
            title="Cerrar sesion"
          >
            ✕
          </button>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <nav className="crumbs">
            {!activeProject ? (
              <span className="current">Proyectos</span>
            ) : (
              <>
                <Link to="/">Proyectos</Link>
                <span className="sep">/</span>
                <span className="current">{activeProject.name}</span>
              </>
            )}
          </nav>
        </div>
        <div className="content">
          <div className="content-inner">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppShell() {
  return (
    <ProjectsProvider>
      <ShellContent />
    </ProjectsProvider>
  );
}
```

- [ ] **Step 2: Update `frontend/src/App.tsx`**

```tsx
import type { ReactNode } from 'react';
import { AuthenticateWithRedirectCallback, useAuth } from '@clerk/react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import ProjectGallery from './pages/ProjectGallery';

function PublicRoute({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (isSignedIn) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="/projects/:projectId/gallery" element={<ProjectGallery />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter frontend build
```

Expected: compiles with no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/AppShell.tsx frontend/src/App.tsx
git commit -m "feat: add AppShell with sidebar, topbar, and layout route"
```

---

### Task 7: Refactor `Dashboard.tsx`

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Replace `frontend/src/pages/Dashboard.tsx`**

```tsx
import { useAuth } from '@clerk/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectForm from '../components/ProjectForm';
import { useProjects } from '../context/ProjectsContext';
import { projectsApi, type CreateProjectInput, type Project } from '../lib/api';
import './Dashboard.css';

type FormMode = 'create' | 'edit';

const initialsFromName = (name: string) =>
  name
    .split(' ')
    .map((chunk) => chunk[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

const formatRelativeDate = (value: string) =>
  new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(new Date(value));

export default function Dashboard() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { projects, status, error, setProjects } = useProjects();

  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [openKebabId, setOpenKebabId] = useState<number | null>(null);

  useEffect(() => {
    if (!openKebabId) return;
    const close = () => setOpenKebabId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openKebabId]);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
    );
  }, [projects, search]);

  const openCreateModal = () => {
    setSelectedProject(null);
    setFormMode('create');
  };

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setFormMode('edit');
  };

  const closeForm = () => {
    if (isSubmitting) return;
    setSelectedProject(null);
    setFormMode(null);
  };

  const handleCreate = async (input: CreateProjectInput) => {
    setIsSubmitting(true);
    try {
      const created = await projectsApi.create(input, getToken);
      setProjects((current) => [created, ...current]);
      setFormMode(null);
      navigate(`/projects/${created.id}/gallery`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (input: CreateProjectInput) => {
    if (!selectedProject) return;
    setIsSubmitting(true);
    try {
      const updated = await projectsApi.update(selectedProject.id, input, getToken);
      setProjects((current) =>
        current.map((p) => (p.id === updated.id ? updated : p)),
      );
      setFormMode(null);
      setSelectedProject(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (project: Project) => {
    const confirmed = window.confirm(`Eliminar "${project.name}"?`);
    if (!confirmed) return;
    setIsDeletingId(project.id);
    try {
      await projectsApi.remove(project.id, getToken);
      setProjects((current) => current.filter((p) => p.id !== project.id));
    } finally {
      setIsDeletingId(null);
    }
  };

  const isEmpty = status === 'idle' && projects.length === 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tus proyectos</h1>
          <p className="page-sub">
            {projects.length} proyectos · cada proyecto agrupa posts y ajustes de marca.
          </p>
        </div>
        <div className="row">
          <input
            className="input dashboard-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar…"
          />
          <button className="btn btn-primary" onClick={openCreateModal}>
            + Nuevo proyecto
          </button>
        </div>
      </div>

      {status === 'loading' ? (
        <div className="dashboard-feedback">Cargando proyectos...</div>
      ) : null}

      {status === 'error' ? (
        <div className="error-banner">{error}</div>
      ) : null}

      {isEmpty ? (
        <div className="dashboard-empty-state">
          <div className="dashboard-empty-card">
            <h3>Tu lista todavia esta vacia.</h3>
            <p>
              Crea el primer proyecto con el nombre de la campana, una descripcion breve y el
              objetivo principal.
            </p>
            <button className="btn btn-primary" onClick={openCreateModal}>
              Crear primer proyecto
            </button>
          </div>
        </div>
      ) : null}

      {!isEmpty && status === 'idle' ? (
        <section className="project-grid">
          {filteredProjects.map((project) => (
            <article
              key={project.id}
              className="project-card"
              onClick={() => navigate(`/projects/${project.id}/gallery`)}
            >
              <div
                className="project-cover"
                style={
                  project.primaryColor
                    ? {
                        background: `linear-gradient(135deg, ${project.primaryColor}, color-mix(in oklab, ${project.primaryColor} 30%, white))`,
                      }
                    : undefined
                }
              >
                {project.logoUrl ? (
                  <img className="project-logo" src={project.logoUrl} alt="" />
                ) : (
                  <span className="glyph">{initialsFromName(project.name)}</span>
                )}
              </div>

              <div className="project-card-body">
                <div className="project-card-header">
                  <span className="name">{project.name}</span>
                  <div
                    className="project-kebab"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() =>
                        setOpenKebabId(openKebabId === project.id ? null : project.id)
                      }
                    >
                      ⋮
                    </button>
                    {openKebabId === project.id && (
                      <div className="project-kebab-menu">
                        <button
                          className="kebab-item"
                          onClick={() => {
                            openEditModal(project);
                            setOpenKebabId(null);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          className="kebab-item kebab-item-danger"
                          onClick={() => {
                            void handleDelete(project);
                            setOpenKebabId(null);
                          }}
                          disabled={isDeletingId === project.id}
                        >
                          {isDeletingId === project.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="desc">{project.description}</p>

                <div className="meta">
                  <span>{project.postCount} posts</span>
                  <span>·</span>
                  <span>{formatRelativeDate(project.updatedAt)}</span>
                </div>
              </div>
            </article>
          ))}

          <button className="project-create-card" onClick={openCreateModal}>
            <span className="plus">+</span>
            <strong>Crear proyecto</strong>
            <p>Nuevo cliente, campana o linea de contenido.</p>
          </button>
        </section>
      ) : null}

      {formMode === 'create' ? (
        <ProjectForm
          key="create"
          isSubmitting={isSubmitting}
          onCancel={closeForm}
          onSubmit={handleCreate}
        />
      ) : null}

      {formMode === 'edit' ? (
        <ProjectForm
          key={selectedProject ? `edit-${selectedProject.id}` : 'edit'}
          initialValue={selectedProject}
          isSubmitting={isSubmitting}
          onCancel={closeForm}
          onSubmit={handleUpdate}
        />
      ) : null}
    </>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter frontend build
```

Expected: compiles with no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat: refactor Dashboard — sidebar layout, kebab menu, postCount on cards"
```

---

### Task 8: Smoke test the full flow

- [ ] **Step 1: Start dev servers**

```bash
# Terminal 1
docker compose -f backend/docker-compose.yml up -d

# Terminal 2
pnpm dev
```

- [ ] **Step 2: Verify the following in the browser at `http://localhost:5173`**

- [ ] Login page loads correctly (no sidebar — PublicRoute is outside AppShell)
- [ ] After login, sidebar appears with "SC" brand mark, "Proyectos" nav item, user card at bottom
- [ ] Dashboard shows page header "Tus proyectos" with search + "Nuevo proyecto" button (no hero section)
- [ ] Creating a project: modal opens, fills in, saves, navigates to gallery
- [ ] Project cards show initials glyph, name, description, "N posts · date" meta
- [ ] Kebab menu ⋮ opens on click, shows Editar / Eliminar, closes on outside click
- [ ] Editing a project: preserves post count in sidebar acceso rápido
- [ ] Deleting a project: removed from grid and sidebar
- [ ] Clicking a project card navigates to gallery; sidebar shows project name and "Galería" nav item active
- [ ] Breadcrumb shows "Proyectos / [project name]" on gallery screen
- [ ] "Acceso rápido" in sidebar shows up to 4 project links

- [ ] **Step 3: Run backend tests**

```bash
pnpm --filter backend test:e2e -- --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 4: Final commit if any fixes needed, then done**
