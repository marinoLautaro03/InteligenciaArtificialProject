# Responsive Design — Social Content Studio

**Date:** 2026-05-18  
**Branch:** responsive-design  
**Status:** Approved

## Problem

The app shell uses a fixed `grid-template-columns: 248px 1fr` layout with no media queries. On screens ≤ 768px the sidebar occupies the left portion of the screen and the remaining content column is too narrow to be usable. The Generator page compounds the problem with a nested `320px 1fr` two-column grid.

## Approach

React state in `ShellContent` controls sidebar open/closed state on mobile. CSS media queries handle layout reflow. No external libraries.

**Breakpoint:** `768px` — covers phones and tablets.

## Architecture

### 1. AppShell (`frontend/src/components/AppShell.tsx`)

- Add `sidebarOpen: boolean` state via `useState(false)`.
- Add `useEffect` that calls `setSidebarOpen(false)` when `location.pathname` changes — sidebar auto-closes on navigation.
- Pass `sidebarOpen` and `setSidebarOpen` to the sidebar `<aside>` and topbar.
- `<aside>` receives class `sidebar sidebar--open` when open.
- Add `<div className="sidebar-backdrop">` rendered when `sidebarOpen` is true; clicking it closes the sidebar.
- Add `<button className="hamburger">` inside `.topbar`, left of the breadcrumb. Visible only on mobile (hidden via CSS on desktop).

### 2. Shell CSS (`frontend/src/styles/shell.css`)

Add a `@media (max-width: 768px)` block:

```
.app                   → grid-template-columns: 1fr
.sidebar               → position: fixed; top: 0; left: 0; height: 100vh;
                         width: 248px; z-index: 50;
                         transform: translateX(-100%);
                         transition: transform 0.25s ease
.sidebar.sidebar--open → transform: translateX(0)
.sidebar-backdrop      → position: fixed; inset: 0; z-index: 49;
                         background: rgba(0,0,0,0.4)
.hamburger             → display: flex (hidden with display:none on desktop)
```

On desktop (> 768px): `.hamburger { display: none }` and sidebar uses the normal grid flow.

### 3. Generator CSS (`frontend/src/pages/Generator.css`)

Add `@media (max-width: 768px)`:

```
.gen-grid   → grid-template-columns: 1fr
              (brief panel stacks above result panel)
.result-panel → remove min-height: 480px constraint
```

### 4. Gallery CSS (`frontend/src/pages/ProjectGallery.css`)

Existing breakpoint at 840px collapses `.gallery-intro` to `1fr`. Move it to 768px for consistency. `.gallery-grid` already uses `auto-fill minmax(260px,1fr)` — no changes needed.

## Component Changes Summary

| File | Change |
|------|--------|
| `AppShell.tsx` | Add `sidebarOpen` state, backdrop div, hamburger button, auto-close on nav |
| `shell.css` | Add `@media (max-width: 768px)` block |
| `Generator.css` | Stack gen-grid on mobile |
| `ProjectGallery.css` | Move gallery-intro breakpoint from 840px → 768px |

## Validation Plan (Chrome DevTools)

1. Open DevTools → toggle device toolbar (Ctrl+Shift+M).
2. Test viewports: iPhone SE (375px), iPhone 14 Pro (393px), iPad Mini (768px).
3. Verify per viewport:
   - Sidebar hidden by default; hamburger button visible in topbar.
   - Tap hamburger → sidebar slides in from left.
   - Backdrop appears behind sidebar; tap backdrop → sidebar closes.
   - Tap any nav item → sidebar closes, correct route loads.
   - Generator: brief panel renders above result panel.
   - Gallery intro: single column at 768px.
4. At > 768px: hamburger hidden, sidebar always visible in grid, no backdrop.

## Out of Scope

- `LoginPage.css` — no multi-column layout issues.
- `Dashboard.css` — no structural changes needed.
- Persisting sidebar open/closed state across sessions.
