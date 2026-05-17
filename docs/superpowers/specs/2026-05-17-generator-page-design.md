# Generator Page Design

## Goal

Build the post generator as a full-page experience at `/projects/:projectId/generator`, following the prototype layout, replacing the existing modal in ProjectGallery.

## Architecture

Two-column layout (`gen-grid`): `brief-panel` on the left (inputs), `result-panel` on the right (output). The page is a new route inside the existing AppShell layout. Sidebar gains a "Generador" nav item alongside "Galería" when a project is active.

## Tech Stack

React 19, React Router v6, Clerk v6 (`useAuth`), existing shared CSS (`shell.css`, `components.css`), new `Generator.css`.

---

## Changes

### Routing (`frontend/src/App.tsx`)

Add route inside the protected layout:

```
/projects/:projectId/generator → <Generator />
```

### Sidebar (`frontend/src/components/AppShell.tsx`)

When a project is active (detected via `useMatch`), show two nav items under the project section:
- "Galería" → `/projects/:projectId/gallery`
- "Generador" → `/projects/:projectId/generator`

### Gallery (`frontend/src/pages/ProjectGallery.tsx`)

Replace "Generar post" and "Generar primer post" buttons with `<Link>` to `/projects/:projectId/generator`. Remove modal and all generation state.

### Backend schema (`backend/src/modules/posts/posts.schemas.ts`)

```ts
socialMedia: z.enum(["instagram", "x", "facebook", "linkedin"])
tone: z.enum(["formal", "casual", "humoristico", "inspiracional"]).default("casual")
```

### AI service (`backend/src/modules/posts/ai.ts`)

`generatePostText` receives `tone` and injects it into the system prompt. LinkedIn rules added:

- Instagram: creativo, visual, emojis y hashtags (max 2200 chars)
- X: conciso, directo, máximo 280 chars
- Facebook: conversacional, extenso, invita a la interacción
- LinkedIn: profesional, reflexivo, máximo 3000 chars, 4-5 hashtags

Tone injection: `"Tono: {tone} — {toneHint}"` added to system prompt.

### Frontend types (`frontend/src/lib/api.ts`)

```ts
export type GeneratePostInput = {
  socialMedia: 'instagram' | 'x' | 'facebook' | 'linkedin';
  description: string;
  tone: 'formal' | 'casual' | 'humoristico' | 'inspiracional';
};
```

### New page (`frontend/src/pages/Generator.tsx`)

State:
- `network`: selected social network (default `instagram`)
- `tone`: selected tone (default `casual`)
- `description`: brief text
- `generating`: boolean
- `result`: `Post | null`
- `error`: string

**Brief panel (left):**

Section "1 · Red social":
- 4 `network-btn` buttons: Instagram, X, LinkedIn, Facebook
- `network-meta` row: character limit, ideal hashtags, aspect ratio (hardcoded from prototype `NETWORKS` data)

Section "2 · Brief":
- `<textarea>` placeholder "¿De qué trata el post?"

Section "3 · Tono":
- 4 `tone-btn` buttons: Formal, Casual, Humorístico, Inspiracional — each with a hint line

Actions:
- "Generar" / "Regenerar copy + imagen" button (primary, disabled while generating or description empty)
- "Guardar post" button (ghost, visible only when `result !== null`) — calls `postsApi.approve` then navigates to gallery

**Result panel (right):**

Empty state: placeholder text "Completá el brief y hacé clic en Generar."

Generating state: spinner + "Generando…" text

Result state:
- Image full-width with `aspect-ratio: 16/9` (or `1/1` for Instagram)
- Network chip (colored)
- Copy text
- "Aprobar post" button → `postsApi.approve(projectId, result.id)` → navigate to gallery
- "Descartar" button → clears result

Error: `.error-banner` below the brief panel.

### New styles (`frontend/src/pages/Generator.css`)

Key selectors:
- `.gen-grid` — two-column CSS grid, brief-panel fixed ~320px, result-panel 1fr
- `.brief-panel` — left sidebar with sections
- `.result-panel` — right content area
- `.network-grid` — 2×2 grid of network buttons
- `.network-btn`, `.network-btn.active` — outlined button with active state
- `.network-meta` — small table of network rules
- `.tone-grid` — 2×2 grid of tone buttons
- `.tone-btn`, `.tone-btn.active` — two-line button (name + hint)
- `.result-empty`, `.result-generating`, `.result-card` — result panel states

## Data

Network metadata (hardcoded, from prototype):

| Network   | Soft limit | Max chars | Ideal hashtags | Aspect |
|-----------|-----------|-----------|----------------|--------|
| Instagram | 1500      | 2200      | 8              | 1:1    |
| X         | 240       | 280       | 2              | 16:9   |
| LinkedIn  | 1300      | 3000      | 4              | 1.91:1 |
| Facebook  | 400       | 63206     | 2              | 1.91:1 |

Tones (hardcoded):

| ID            | Name         | Hint                      |
|---------------|--------------|---------------------------|
| formal        | Formal       | Profesional, directo      |
| casual        | Casual       | Cercano, conversacional   |
| humoristico   | Humorístico  | Ligero, con chispa        |
| inspiracional | Inspiracional| Motivador, emotivo        |

## Testing

- Backend: e2e test for `POST /projects/:id/posts/generate` with `tone` and `linkedin` fields
- Frontend: smoke test — navigate to generator, fill brief, select tone, generate, approve → post appears in gallery
