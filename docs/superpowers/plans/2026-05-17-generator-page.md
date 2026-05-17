# Generator Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the post generator as a full-page two-column experience at `/projects/:projectId/generator`, with tone and LinkedIn support wired through backend and frontend.

**Architecture:** Backend gains `tone` and `linkedin` in the generate schema and AI prompt. A new `Generator.tsx` page renders a brief panel (left) and result panel (right). The AppShell sidebar gains a "Generador" nav item. The Gallery's generate modal is removed and replaced with a Link.

**Tech Stack:** React 19, React Router v6, Clerk v6 (`useAuth`), Hono + Zod backend, Vitest e2e tests, vanilla CSS.

---

## File Map

| File | Action |
|------|--------|
| `backend/src/modules/posts/posts.schemas.ts` | Modify — add `linkedin`, add `tone` with default |
| `backend/src/modules/posts/ai.ts` | Modify — `generatePostText` accepts `tone`, adds LinkedIn rules |
| `backend/src/modules/posts/posts.service.ts` | Modify — pass `input.tone` to `generatePostText` |
| `backend/test/posts.e2e.test.ts` | Modify — add `linkedin` and `tone` test cases |
| `frontend/src/lib/api.ts` | Modify — add `linkedin` to `Post.socialMedia`, add `tone` to `GeneratePostInput` |
| `frontend/src/components/AppShell.tsx` | Modify — add Generador nav item, fix active class per route |
| `frontend/src/pages/Generator.css` | Create — gen-grid, brief-panel, result-panel, network/tone buttons |
| `frontend/src/pages/Generator.tsx` | Create — two-column generator page |
| `frontend/src/App.tsx` | Modify — add `/projects/:projectId/generator` route |
| `frontend/src/pages/ProjectGallery.tsx` | Modify — remove modal, replace generate buttons with Link |

---

## Task 1: Backend — Add `tone` and `linkedin` to schema and AI service

**Files:**
- Modify: `backend/src/modules/posts/posts.schemas.ts`
- Modify: `backend/src/modules/posts/ai.ts`
- Modify: `backend/src/modules/posts/posts.service.ts`
- Test: `backend/test/posts.e2e.test.ts`

- [ ] **Step 1: Write failing tests**

Add these two test cases inside `describe("generate post", ...)` in `backend/test/posts.e2e.test.ts`:

```typescript
it("accepts linkedin as social media", async () => {
  const project = await createProject();

  const response = await request(server)
    .post(`/projects/${project.id}/posts/generate`)
    .set("Authorization", "Bearer test-token")
    .send({ socialMedia: "linkedin", description: "Professional post about our launch" })
    .expect(201);

  expect(response.body).toMatchObject({
    socialMedia: "linkedin",
    approved: false,
  });
});

it("accepts tone parameter and uses casual as default", async () => {
  const project = await createProject();

  const withTone = await request(server)
    .post(`/projects/${project.id}/posts/generate`)
    .set("Authorization", "Bearer test-token")
    .send({ socialMedia: "instagram", description: "Summer vibes", tone: "inspiracional" })
    .expect(201);

  expect(withTone.body).toMatchObject({ socialMedia: "instagram", approved: false });

  const withoutTone = await request(server)
    .post(`/projects/${project.id}/posts/generate`)
    .set("Authorization", "Bearer test-token")
    .send({ socialMedia: "instagram", description: "Summer vibes" })
    .expect(201);

  expect(withoutTone.body).toMatchObject({ approved: false });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter backend test:e2e -- --reporter=verbose
```

Expected: both new tests FAIL with 400 (invalid social media / unknown tone).

- [ ] **Step 3: Update `posts.schemas.ts`**

Replace the file content:

```typescript
import { z } from "zod";

export const socialMediaEnum = z.enum(["instagram", "x", "facebook", "linkedin"]);

export const generatePostSchema = z.object({
  socialMedia: socialMediaEnum,
  description: z.string().trim().min(1),
  tone: z.enum(["formal", "casual", "humoristico", "inspiracional"]).default("casual"),
});

export type GeneratePostInput = z.infer<typeof generatePostSchema>;

export const projectIdParamsSchema = z.object({
  projectId: z.coerce.number().int().positive(),
});

export const postIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  projectId: z.coerce.number().int().positive(),
});

export const postsQuerySchema = z.object({
  includeUnapproved: z.coerce.boolean().optional(),
});
```

- [ ] **Step 4: Update `ai.ts` — add `tone` param and LinkedIn rules**

Replace the `AiService` type and `generatePostText` implementation:

```typescript
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export type AiService = {
  generatePostText: (input: {
    projectName: string;
    projectDescription: string;
    primaryColor: string | null;
    socialMedia: string;
    userDescription: string;
    tone: string;
  }) => Promise<string>;

  generatePostImage: (input: {
    projectName: string;
    userDescription: string;
  }) => Promise<string>;
};

type AiConfig = {
  textModel: string;
  textBaseUrl: string;
  textApiKey: string;
  imageModel: string;
  imageBaseUrl: string;
  imageApiKey: string;
};

const toneHints: Record<string, string> = {
  formal: "profesional y directo",
  casual: "cercano y conversacional",
  humoristico: "ligero, con humor y chispa",
  inspiracional: "motivador y emotivo",
};

export const createAiService = (config: AiConfig): AiService => {
  return {
    generatePostText: async (input) => {
      if (!config.textBaseUrl || !config.textApiKey) {
        throw new Error(
          "AI text generation is not configured. Set AI_TEXT_BASE_URL and AI_TEXT_API_KEY.",
        );
      }

      const textProvider = createOpenAI({
        baseURL: config.textBaseUrl,
        apiKey: config.textApiKey,
      });

      const system = [
        `Eres un community manager experto generando contenido para "${input.projectName}".`,
        `Descripcion del proyecto: "${input.projectDescription}"`,
        input.primaryColor ? `Color primario: ${input.primaryColor}` : null,
        `Red social: ${input.socialMedia}`,
        `Tono: ${toneHints[input.tone] ?? input.tone}`,
        "",
        "Adapta el tono, la longitud y el formato a la plataforma:",
        "- Instagram: creativo, visual, con emojis y hashtags (max 2200 caracteres)",
        "- X: conciso, directo, maximo 280 caracteres, 2 hashtags",
        "- LinkedIn: profesional, reflexivo, maximo 3000 caracteres, 4-5 hashtags",
        "- Facebook: conversacional, mas extenso, invita a la interaccion",
        "",
        "Responde SOLO con el contenido del post, sin explicaciones adicionales.",
      ]
        .filter(Boolean)
        .join("\n");

      const { text } = await generateText({
        model: textProvider(config.textModel),
        system,
        prompt: input.userDescription,
      });

      return text;
    },

    generatePostImage: async (input) => {
      if (!config.imageBaseUrl || !config.imageApiKey) {
        throw new Error(
          "AI image generation is not configured. Set AI_IMAGE_BASE_URL and AI_IMAGE_API_KEY.",
        );
      }

      const modelPath = config.imageModel.toLowerCase().replace(/\./g, "-");
      const base = config.imageBaseUrl.replace(/\/$/, "");
      const url = `${base}/${modelPath}?api-version=preview`;

      const apiPrompt = [
        `Social media image for project "${input.projectName}": ${input.userDescription}`,
        "Minimalist, clean design, suitable for social media.",
      ].join(". ");

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.imageApiKey}`,
        },
        body: JSON.stringify({
          prompt: apiPrompt,
          model: config.imageModel,
          width: 256,
          height: 256,
          n: 1,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          `Image generation failed (${response.status}): ${response.statusText}${body ? ` - ${body}` : ""}`,
        );
      }

      const data = (await response.json()) as {
        data: { b64_json: string }[];
      };

      if (!data.data?.[0]?.b64_json) {
        throw new Error("Image generation returned an empty response.");
      }

      return `data:image/png;base64,${data.data[0].b64_json}`;
    },
  };
};
```

- [ ] **Step 5: Update `posts.service.ts` — pass `tone` to `generatePostText`**

In `backend/src/modules/posts/posts.service.ts`, update the `generatePost` call to `ai.generatePostText`:

```typescript
const [text, imageUrl] = await Promise.all([
  ai.generatePostText({
    projectName: project.name,
    projectDescription: project.description,
    primaryColor: project.primaryColor,
    socialMedia: input.socialMedia,
    userDescription: input.description,
    tone: input.tone,
  }),
  ai.generatePostImage({
    projectName: project.name,
    userDescription: input.description,
  }),
]);
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm --filter backend test:e2e -- --reporter=verbose
```

Expected: all tests PASS including the two new ones.

- [ ] **Step 7: Run lint**

```bash
pnpm --filter backend lint
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/posts/posts.schemas.ts backend/src/modules/posts/ai.ts backend/src/modules/posts/posts.service.ts backend/test/posts.e2e.test.ts
git commit -m "feat: add tone and linkedin support to post generation (SCRUM-17)"
```

---

## Task 2: Frontend — Update API types

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Update `api.ts` — add `linkedin` and `tone`**

Update the `Post` type's `socialMedia` field and `GeneratePostInput`:

```typescript
export type Post = {
  id: number;
  projectId: number;
  imageUrl: string;
  text: string;
  socialMedia: 'instagram' | 'x' | 'facebook' | 'linkedin';
  approved: boolean;
  generationPrompt: string;
  createdAt: string;
  updatedAt: string;
};

export type GeneratePostInput = {
  socialMedia: 'instagram' | 'x' | 'facebook' | 'linkedin';
  description: string;
  tone: 'formal' | 'casual' | 'humoristico' | 'inspiracional';
};
```

- [ ] **Step 2: Run frontend lint**

```bash
pnpm --filter frontend lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: add linkedin and tone to frontend API types (SCRUM-16)"
```

---

## Task 3: AppShell — Add Generador nav item and fix active states

**Files:**
- Modify: `frontend/src/components/AppShell.tsx`

Currently the project nav section always marks "Galería" as active. We need to add "Generador" and make active state depend on the current path.

- [ ] **Step 1: Update `AppShell.tsx`**

Add `useLocation` to imports and update the project nav section:

```typescript
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

- [ ] **Step 2: Run lint**

```bash
pnpm --filter frontend lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/AppShell.tsx
git commit -m "feat: add Generador nav item to AppShell sidebar (SCRUM-16)"
```

---

## Task 4: Generator CSS

**Files:**
- Create: `frontend/src/pages/Generator.css`

- [ ] **Step 1: Create `Generator.css`**

```css
/* Generator page — two-column layout */
.gen-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  align-items: start;
}

/* Brief panel (left) */
.brief-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
}

.brief-panel h3 {
  font-size: var(--t-sm);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--fg-muted);
  margin: 0;
}

.brief-panel .divider-h {
  border: none;
  border-top: 1px solid var(--border);
  margin: 4px 0;
}

/* Network grid */
.network-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.network-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  font-size: var(--t-sm);
  font-weight: 500;
  color: var(--fg-muted);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.network-btn:hover {
  border-color: var(--fg-muted);
  color: var(--fg);
}

.network-btn.active {
  border-color: var(--fg);
  background: var(--fg);
  color: var(--bg);
}

/* Network metadata */
.network-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: var(--t-xs);
  color: var(--fg-muted);
}

.network-meta div {
  display: flex;
  justify-content: space-between;
}

.network-meta .v {
  font-family: var(--font-mono);
  color: var(--fg);
}

/* Tone grid */
.tone-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.tone-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}

.tone-btn:hover {
  border-color: var(--fg-muted);
}

.tone-btn.active {
  border-color: var(--fg);
  background: var(--fg);
}

.tone-btn .name {
  font-size: var(--t-sm);
  font-weight: 500;
  color: var(--fg);
}

.tone-btn.active .name,
.tone-btn.active .hint {
  color: var(--bg);
}

.tone-btn .hint {
  font-size: var(--t-xs);
  color: var(--fg-muted);
}

.brief-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.brief-field label {
  font-size: var(--t-xs);
  font-weight: 500;
  color: var(--fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.brief-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Result panel (right) */
.result-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 480px;
}

.result-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 320px;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  color: var(--fg-muted);
  font-size: var(--t-sm);
  text-align: center;
  padding: 32px;
}

.result-generating {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 320px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--fg-muted);
  font-size: var(--t-sm);
}

.result-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.result-card img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
}

.result-card.square img {
  aspect-ratio: 1 / 1;
}

.result-card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-network {
  font-size: var(--t-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.result-text {
  font-size: var(--t-sm);
  line-height: 1.6;
  white-space: pre-wrap;
  color: var(--fg);
}

.result-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Generator.css
git commit -m "feat: add Generator page CSS (SCRUM-16)"
```

---

## Task 5: Generator Page Component

**Files:**
- Create: `frontend/src/pages/Generator.tsx`

- [ ] **Step 1: Create `Generator.tsx`**

```typescript
import { useAuth } from '@clerk/react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { postsApi, type Post } from '../lib/api';
import './Generator.css';

type Network = 'instagram' | 'x' | 'facebook' | 'linkedin';
type Tone = 'formal' | 'casual' | 'humoristico' | 'inspiracional';

const NETWORKS: { id: Network; label: string; maxChars: number; softLimit: number; hashtags: number; aspect: string }[] = [
  { id: 'instagram', label: 'Instagram', maxChars: 2200, softLimit: 1500, hashtags: 8, aspect: '1:1' },
  { id: 'x', label: 'X', maxChars: 280, softLimit: 240, hashtags: 2, aspect: '16:9' },
  { id: 'linkedin', label: 'LinkedIn', maxChars: 3000, softLimit: 1300, hashtags: 4, aspect: '1.91:1' },
  { id: 'facebook', label: 'Facebook', maxChars: 63206, softLimit: 400, hashtags: 2, aspect: '1.91:1' },
];

const TONES: { id: Tone; name: string; hint: string }[] = [
  { id: 'formal', name: 'Formal', hint: 'Profesional, directo' },
  { id: 'casual', name: 'Casual', hint: 'Cercano, conversacional' },
  { id: 'humoristico', name: 'Humorístico', hint: 'Ligero, con chispa' },
  { id: 'inspiracional', name: 'Inspiracional', hint: 'Motivador, emotivo' },
];

const NETWORK_COLORS: Record<Network, string> = {
  instagram: '#E4405F',
  x: '#000',
  linkedin: '#0A66C2',
  facebook: '#1877F2',
};

export default function Generator() {
  const { projectId } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const numericId = Number(projectId);

  const [network, setNetwork] = useState<Network>('instagram');
  const [tone, setTone] = useState<Tone>('casual');
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<Post | null>(null);
  const [error, setError] = useState('');

  const activeNetwork = NETWORKS.find((n) => n.id === network)!;

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setGenerating(true);
    setError('');
    setResult(null);
    try {
      const post = await postsApi.generate(numericId, { socialMedia: network, description, tone }, getToken);
      setResult(post);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!result) return;
    try {
      await postsApi.approve(numericId, result.id, getToken);
      navigate(`/projects/${numericId}/gallery`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aprobar.');
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Generador de post</h1>
          <p className="page-sub">Brief → copy + imagen, adaptados a la red social.</p>
        </div>
        <Link to={`/projects/${numericId}/gallery`} className="btn btn-ghost btn-sm">
          Ver galería
        </Link>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="gen-grid">
        {/* BRIEF PANEL */}
        <aside className="brief-panel">
          <h3>1 · Red social</h3>
          <div className="network-grid">
            {NETWORKS.map((n) => (
              <button
                key={n.id}
                className={`network-btn${network === n.id ? ' active' : ''}`}
                onClick={() => setNetwork(n.id)}
              >
                {n.label}
              </button>
            ))}
          </div>
          <div className="network-meta">
            <div><span>Largo</span><span className="v">{activeNetwork.softLimit}/{activeNetwork.maxChars}</span></div>
            <div><span>#tags</span><span className="v">{activeNetwork.hashtags} ideal</span></div>
            <div><span>Imagen</span><span className="v">{activeNetwork.aspect}</span></div>
          </div>

          <hr className="divider-h" />

          <h3>2 · Brief</h3>
          <div className="brief-field">
            <label>Tema</label>
            <textarea
              className="textarea"
              placeholder="¿De qué trata el post?"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <h3>3 · Tono</h3>
          <div className="tone-grid">
            {TONES.map((t) => (
              <button
                key={t.id}
                className={`tone-btn${tone === t.id ? ' active' : ''}`}
                onClick={() => setTone(t.id)}
              >
                <span className="name">{t.name}</span>
                <span className="hint">{t.hint}</span>
              </button>
            ))}
          </div>

          <div className="brief-actions">
            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={generating || !description.trim()}
            >
              {generating ? 'Generando…' : result ? 'Regenerar copy + imagen' : 'Generar'}
            </button>
            {result && (
              <button className="btn btn-ghost" onClick={handleApprove}>
                Guardar post
              </button>
            )}
          </div>
        </aside>

        {/* RESULT PANEL */}
        <section className="result-panel">
          {generating ? (
            <div className="result-generating">
              <span>Generando copy + imagen…</span>
            </div>
          ) : result ? (
            <div className={`result-card${network === 'instagram' ? ' square' : ''}`}>
              <img src={result.imageUrl} alt="" />
              <div className="result-card-body">
                <span className="result-network" style={{ color: NETWORK_COLORS[result.socialMedia as Network] }}>
                  {NETWORKS.find((n) => n.id === result.socialMedia)?.label ?? result.socialMedia}
                </span>
                <p className="result-text">{result.text}</p>
              </div>
              <div className="result-actions">
                <button
                  className="btn btn-ghost"
                  onClick={() => setResult(null)}
                >
                  Descartar
                </button>
                <button className="btn btn-primary" onClick={handleApprove}>
                  Aprobar post
                </button>
              </div>
            </div>
          ) : (
            <div className="result-empty">
              <p>Completá el brief y hacé clic en <strong>Generar</strong>.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Run lint**

```bash
pnpm --filter frontend lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Generator.tsx frontend/src/pages/Generator.css
git commit -m "feat: add Generator page component (SCRUM-16)"
```

---

## Task 6: Wire Route and Clean Up Gallery

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/ProjectGallery.tsx`

- [ ] **Step 1: Add generator route to `App.tsx`**

```typescript
import type { ReactNode } from 'react';
import { AuthenticateWithRedirectCallback, useAuth } from '@clerk/react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Generator from './pages/Generator';
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
        <Route path="/projects/:projectId/generator" element={<Generator />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 2: Remove modal from `ProjectGallery.tsx`, replace generate buttons with Links**

Replace the entire file with this cleaned-up version:

```typescript
import { useAuth } from '@clerk/react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { postsApi, projectsApi, type Post, type Project } from '../lib/api';
import './ProjectGallery.css';

const socialNames: Record<string, string> = {
  instagram: 'Instagram',
  x: 'X',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
};

const socialColors: Record<string, string> = {
  instagram: '#E4405F',
  x: '#000',
  linkedin: '#0A66C2',
  facebook: '#1877F2',
};

export default function ProjectGallery() {
  const { projectId } = useParams();
  const { getToken } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [status, setStatus] = useState<'loading' | 'idle' | 'error'>('loading');
  const [error, setError] = useState('');

  const numericId = Number(projectId);

  useEffect(() => {
    const loadData = async () => {
      if (!Number.isInteger(numericId) || numericId <= 0) {
        setStatus('error');
        setError('Proyecto inválido.');
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
        setError(err instanceof Error ? err.message : 'No pudimos cargar la galería.');
      }
    };
    void loadData();
  }, [getToken, numericId]);

  if (status === 'loading') {
    return <div className="dashboard-feedback">Cargando galería…</div>;
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
          <Link
            to={`/projects/${numericId}/generator`}
            className="btn btn-primary"
            style={{ marginTop: 12 }}
          >
            Generar post
          </Link>
        </aside>
      </section>

      {posts.length === 0 ? (
        <div className="gallery-empty-state">
          <div className="gallery-empty-card">
            <h3>Todavía no hay posts generados.</h3>
            <p>Crea el primer post describiendo qué necesitás y seleccionando una red social.</p>
            <Link to={`/projects/${numericId}/generator`} className="btn btn-primary">
              Generar primer post
            </Link>
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
    </>
  );
}
```

- [ ] **Step 3: Run lint and build**

```bash
pnpm --filter frontend lint
pnpm --filter frontend build
```

Expected: no errors, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/pages/ProjectGallery.tsx
git commit -m "feat: add generator route and remove gallery modal (SCRUM-16)"
```

---

## Task 7: Mark Jira tickets as done

- [ ] **Step 1: Transition SCRUM-16, SCRUM-17, SCRUM-20 to Finalizada in Jira**

Use the Atlassian MCP tool:

```
mcp__atlassian__jira_transition_issue(SCRUM-16, transition_id=41)
mcp__atlassian__jira_transition_issue(SCRUM-17, transition_id=41)
mcp__atlassian__jira_transition_issue(SCRUM-20, transition_id=41)
```

- [ ] **Step 2: Create and push PR**

```bash
git push -u origin feature/scrum-17
gh pr create --title "feat: SCRUM-16/17/20 — Generator page with tone and LinkedIn support" \
  --base main
```
