# Dark Mode Toggle — Design Spec

**Date:** 2026-06-16
**Status:** Approved

## Overview

Add a classic sun/moon toggle to the sidebar that switches the app between light and dark themes. The preference persists in `localStorage` and initializes from the OS `prefers-color-scheme` setting if no saved value exists.

## Approach

Local React state in `AppShell` + `data-theme` attribute on `<html>`. No context, no extra abstraction. The CSS custom properties already govern every color in the app, so flipping `data-theme` on the root element propagates the theme globally without any component-level changes.

## Files changed

| File | Change |
|---|---|
| `frontend/src/index.css` | Add `[data-theme="dark"]` token block |
| `frontend/src/components/Icons.tsx` | Add `Sun` and `Moon` SVG icon exports |
| `frontend/src/components/AppShell.tsx` | Add theme state, sync effect, toggle button |
| `frontend/src/styles/shell.css` | Add `.theme-toggle` positioning style |

## 1. CSS tokens (index.css)

Add after the `:root` block — copied verbatim from `prototype/styles.css` which already defines them:

```css
[data-theme="dark"] {
  --bg: oklch(0.16 0.005 80);
  --surface: oklch(0.20 0.005 80);
  --surface-2: oklch(0.23 0.005 80);
  --fg: oklch(0.96 0.005 85);
  --fg-muted: oklch(0.70 0.008 80);
  --fg-soft: oklch(0.55 0.008 80);
  --border: oklch(0.28 0.006 80);
  --border-strong: oklch(0.36 0.008 80);
  --accent-soft: oklch(0.30 0.06 50);
}
```

Only color tokens change. Radii, spacing, and typography are theme-neutral.

## 2. Icons — Sun and Moon (Icons.tsx)

Two new exports following the existing `Icon` wrapper pattern (16×16 viewBox, `strokeWidth={1.6}`, `strokeLinecap="round"`):

- **Sun** — circle (cx=8 cy=8 r=3) + 8 short radial lines for rays
- **Moon** — crescent path using a clipped arc

## 3. Theme state (AppShell.tsx)

Add to `ShellContent`:

```ts
const [dark, setDark] = useState(() => {
  const saved = localStorage.getItem('theme');
  if (saved) return saved === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
});

useEffect(() => {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  localStorage.setItem('theme', dark ? 'dark' : 'light');
}, [dark]);
```

### Toggle button placement

Between `.spacer` and `.user-card` in the sidebar JSX:

```tsx
<button
  className="btn btn-ghost btn-icon theme-toggle"
  onClick={() => setDark(d => !d)}
  title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
>
  {dark ? <Sun /> : <Moon />}
</button>
```

- Shows `<Sun>` in dark mode (click → go light)
- Shows `<Moon>` in light mode (click → go dark)
- Reuses existing `btn btn-ghost btn-icon` classes — no new visual style needed

## 4. Shell CSS (shell.css)

```css
.theme-toggle {
  align-self: flex-end;
}
```

Pushes the button to the right edge of the sidebar column, consistent with the overall layout rhythm.

## Constraints

- Do not modify anything inside `prototype/` — it is read-only documentation.
- No new dependencies required.
- No changes to any page-level components — all color changes flow through CSS variables.
