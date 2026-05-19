# Responsive Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app usable on mobile (≤ 768px) by hiding the sidebar behind a hamburger+drawer overlay and stacking multi-column page layouts vertically.

**Architecture:** React state (`sidebarOpen`) in `ShellContent` drives the sidebar drawer. CSS media queries at `768px` handle layout reflow for the shell grid, Generator two-column layout, and Gallery intro. No new dependencies.

**Tech Stack:** React 19, TypeScript, CSS (no CSS-in-JS), Vite, Chrome DevTools for validation.

---

## File Map

| File | Change |
|------|--------|
| `frontend/src/components/AppShell.tsx` | Add `sidebarOpen` state, `useEffect` auto-close, hamburger `<button>`, backdrop `<div>` |
| `frontend/src/styles/shell.css` | Add `.hamburger { display: none }` default + `@media (max-width: 768px)` block |
| `frontend/src/pages/Generator.css` | Add `@media (max-width: 768px)` to stack `.gen-grid` |
| `frontend/src/pages/ProjectGallery.css` | Change existing `@media (max-width: 840px)` → `768px` |

---

### Task 1: Add hamburger hide rule + mobile media query to shell.css

**Files:**
- Modify: `frontend/src/styles/shell.css`

- [ ] **Step 1: Append mobile rules to shell.css**

Open `frontend/src/styles/shell.css` and append the following at the very end of the file:

```css
/* ============ Responsive — hide hamburger on desktop ============ */
.hamburger {
  display: none;
}

/* ============ Responsive — Mobile (≤ 768px) ============ */
@media (max-width: 768px) {
  .app {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 248px;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }

  .sidebar.sidebar--open {
    transform: translateX(0);
  }

  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    z-index: 49;
    background: rgba(0, 0, 0, 0.4);
  }

  .hamburger {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    font-size: 18px;
    color: var(--fg-muted);
    background: transparent;
    border: none;
    cursor: pointer;
    flex-shrink: 0;
  }

  .hamburger:hover {
    background: var(--surface-2);
    color: var(--fg);
  }
}
```

- [ ] **Step 2: Run lint to confirm no issues**

```bash
pnpm --filter frontend lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/shell.css
git commit -m "style: add mobile shell layout — hamburger + drawer breakpoint at 768px"
```

---

### Task 2: Update AppShell.tsx — sidebarOpen state, hamburger button, backdrop

**Files:**
- Modify: `frontend/src/components/AppShell.tsx`

- [ ] **Step 1: Replace the full file with the updated version**

Replace the entire contents of `frontend/src/components/AppShell.tsx` with:

```tsx
import { useState, useEffect } from 'react';
import { useClerk, useUser } from '@clerk/react';
import { Link, Outlet, useLocation, useMatch } from 'react-router-dom';
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
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const projectMatch = useMatch('/projects/:projectId/*');
  const activeProjectId = projectMatch?.params.projectId
    ? Number(projectMatch.params.projectId)
    : null;
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  const displayName = user?.firstName ?? user?.username ?? '';
  const displayEmail = user?.emailAddresses?.[0]?.emailAddress ?? '';
  const userInitials = initialsFromName(displayName || displayEmail) || '?';

  return (
    <div className="app">
      <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
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
              className={`nav-item${location.pathname.endsWith('/gallery') ? ' active' : ''}`}
            >
              Galería
            </Link>
            <Link
              to={`/projects/${activeProject.id}/generator`}
              className={`nav-item${location.pathname.endsWith('/generator') ? ' active' : ''}`}
            >
              Generador
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
            onClick={() => void signOut({ redirectUrl: '/login' })}
            title="Cerrar sesión"
          >
            ✕
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="main">
        <div className="topbar">
          <button
            className="hamburger"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Abrir menú"
          >
            ☰
          </button>
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

- [ ] **Step 2: Run type check**

```bash
pnpm --filter frontend build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AppShell.tsx
git commit -m "feat: add hamburger drawer sidebar for mobile in AppShell"
```

---

### Task 3: Stack Generator layout on mobile

**Files:**
- Modify: `frontend/src/pages/Generator.css`

- [ ] **Step 1: Append mobile rules to Generator.css**

Append at the very end of `frontend/src/pages/Generator.css`:

```css
@media (max-width: 768px) {
  .gen-grid {
    grid-template-columns: 1fr;
  }

  .result-panel {
    min-height: unset;
  }
}
```

- [ ] **Step 2: Run lint**

```bash
pnpm --filter frontend lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Generator.css
git commit -m "style: stack generator layout vertically on mobile"
```

---

### Task 4: Normalize Gallery breakpoint from 840px → 768px

**Files:**
- Modify: `frontend/src/pages/ProjectGallery.css`

- [ ] **Step 1: Change the existing media query**

In `frontend/src/pages/ProjectGallery.css`, find the existing block at the end of the file:

```css
@media (max-width: 840px) {
  .gallery-intro {
    grid-template-columns: 1fr;
  }
}
```

Replace it with:

```css
@media (max-width: 768px) {
  .gallery-intro {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Run lint**

```bash
pnpm --filter frontend lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ProjectGallery.css
git commit -m "style: normalize gallery-intro breakpoint to 768px"
```

---

### Task 5: Chrome DevTools validation

**Prerequisites:** frontend dev server running (`pnpm --filter frontend dev`), logged in with test credentials (`test` / `SocialContentStudio`).

- [ ] **Step 1: Start the dev server (if not already running)**

```bash
pnpm --filter frontend dev
```

Open `http://localhost:5173` in Chrome.

- [ ] **Step 2: Open DevTools device toolbar**

Press `F12` → click the device toolbar icon (or `Ctrl+Shift+M`). Set to **iPhone SE (375px)**.

- [ ] **Step 3: Verify sidebar behavior on iPhone SE**

Check all of the following:
- [ ] Sidebar is hidden (not visible on screen)
- [ ] Hamburger button `☰` is visible in the topbar
- [ ] Tapping hamburger slides sidebar in from the left
- [ ] Backdrop (dark overlay) appears behind the sidebar
- [ ] Tapping the backdrop closes the sidebar
- [ ] Tapping a nav item (e.g. "Proyectos") closes the sidebar and navigates correctly

- [ ] **Step 4: Verify at iPhone 14 Pro (393px)**

Switch to **iPhone 14 Pro** preset. Repeat the same checks as Step 3.

- [ ] **Step 5: Verify at iPad Mini (768px)**

Switch viewport width to exactly **768px**. Check:
- [ ] Sidebar is hidden, hamburger visible (breakpoint is `max-width: 768px` so 768px is included)

Switch to **769px**:
- [ ] Sidebar is visible in the grid, hamburger is hidden

- [ ] **Step 6: Verify Generator layout on mobile**

Navigate to any project → Generador. At 375px:
- [ ] Brief panel (network selector, brief, tone) renders above the result panel
- [ ] No horizontal overflow or clipped content

- [ ] **Step 7: Verify Gallery intro on mobile**

Navigate to any project → Galería. At 768px:
- [ ] Gallery intro collapses to a single column (title/description above the stats card)

- [ ] **Step 8: Verify desktop is unchanged**

Set viewport to 1280px (or exit device toolbar):
- [ ] Sidebar always visible, no hamburger button
- [ ] Generator shows two-column layout (brief left, result right)
- [ ] Gallery intro shows two-column layout
