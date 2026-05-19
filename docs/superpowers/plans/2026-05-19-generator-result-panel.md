# Generator Result Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Preview/Raw tabs, granular regeneration (copy-only, image-only), hashtag chips, character count + length bar, clipboard copy, and an always-visible `/ajustar` tweak bar to the Generator result panel.

**Architecture:** Two new backend endpoints (`/generate-copy`, `/generate-image`) let the frontend update only the relevant slice of `GenerationResult` state. The result panel gains a toolbar with tab switcher, a Raw view with two cards (copy + image), and an adjust bar that re-runs full generation with extra context appended to the description.

**Tech Stack:** Hono + Zod (backend), React 19 + TypeScript + CSS custom properties (frontend), Vitest + supertest (backend e2e tests).

---

## File Map

| File | Change |
|---|---|
| `backend/src/modules/posts/posts.schemas.ts` | Add `generateImageSchema`, `GenerateImageInput` |
| `backend/src/modules/posts/posts.service.ts` | Add `generateCopies`, `generateImage` methods |
| `backend/src/modules/posts/posts.controller.ts` | Add two new POST routes |
| `backend/test/posts.e2e.test.ts` | Add tests for both new routes |
| `frontend/src/lib/api.ts` | Add `GenerateCopyResult`, `GenerateImageResult`, `GenerateImageInput` types + two new `postsApi` methods |
| `frontend/src/pages/Generator.css` | New styles: toolbar, seg control, dot, result-stage, result-card, chip, length-bar, adjust-bar |
| `frontend/src/pages/Generator.tsx` | New state, handlers, and render for result panel |

---

## Task 1: Backend schema — add `generateImageSchema`

**Files:** Modify `backend/src/modules/posts/posts.schemas.ts`

The existing `generatePostSchema` (description + tone) covers `/generate-copy`. Image generation only needs `description`.

- [ ] **Step 1: Add schema and type**

Open `backend/src/modules/posts/posts.schemas.ts` and append after the existing exports:

```typescript
export const generateImageSchema = z.object({
  description: z.string().trim().min(1),
});

export type GenerateImageInput = z.infer<typeof generateImageSchema>;
```

- [ ] **Step 2: Type-check**

```powershell
pnpm --filter backend lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/posts/posts.schemas.ts
git commit -m "feat(backend): add generateImageSchema for image-only regeneration"
```

---

## Task 2: Backend tests — write failing tests for new routes

**Files:** Modify `backend/test/posts.e2e.test.ts`

The file already has `createMockAiService`, in-memory repos, and `createTestAuthenticator`. Add a new `describe` block after the existing ones.

- [ ] **Step 1: Add the test block**

Append inside the outer `describe("posts module e2e", ...)` block, after the `"owner isolation"` describe:

```typescript
describe("generate-copy endpoint", () => {
  it("returns networks with copy for all 4 networks, no imageUrl", async () => {
    const project = await createProject();

    const response = await request(server)
      .post(`/projects/${project.id}/posts/generate-copy`)
      .set("Authorization", "Bearer test-token")
      .send({ description: "Winter blend launch", tone: "casual" })
      .expect(200);

    expect(response.body).toMatchObject({
      networks: {
        instagram: { copy: expect.any(String), hashtags: expect.any(Array) },
        x:         { copy: expect.any(String), hashtags: expect.any(Array) },
        linkedin:  { copy: expect.any(String), hashtags: expect.any(Array) },
        facebook:  { copy: expect.any(String), hashtags: expect.any(Array) },
      },
    });
    expect(response.body.imageUrl).toBeUndefined();
  });

  it("requires description", async () => {
    const project = await createProject();

    await request(server)
      .post(`/projects/${project.id}/posts/generate-copy`)
      .set("Authorization", "Bearer test-token")
      .send({ description: "" })
      .expect(400);
  });

  it("requires auth", async () => {
    await request(server)
      .post("/projects/1/posts/generate-copy")
      .send({ description: "test" })
      .expect(401);
  });

  it("returns 404 when project not found", async () => {
    await request(server)
      .post("/projects/9999/posts/generate-copy")
      .set("Authorization", "Bearer test-token")
      .send({ description: "test" })
      .expect(404);
  });
});

describe("generate-image endpoint", () => {
  it("returns imageUrl only, no networks", async () => {
    const project = await createProject();

    const response = await request(server)
      .post(`/projects/${project.id}/posts/generate-image`)
      .set("Authorization", "Bearer test-token")
      .send({ description: "Winter blend launch" })
      .expect(200);

    expect(response.body).toMatchObject({
      imageUrl: expect.any(String),
    });
    expect(response.body.networks).toBeUndefined();
  });

  it("requires description", async () => {
    const project = await createProject();

    await request(server)
      .post(`/projects/${project.id}/posts/generate-image`)
      .set("Authorization", "Bearer test-token")
      .send({ description: "" })
      .expect(400);
  });

  it("requires auth", async () => {
    await request(server)
      .post("/projects/1/posts/generate-image")
      .send({ description: "test" })
      .expect(401);
  });

  it("returns 404 when project not found", async () => {
    await request(server)
      .post("/projects/9999/posts/generate-image")
      .set("Authorization", "Bearer test-token")
      .send({ description: "test" })
      .expect(404);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```powershell
pnpm --filter backend test:e2e -- --reporter=verbose
```

Expected: the 8 new tests fail with 404 (routes don't exist yet). All previously passing tests still pass.

---

## Task 3: Backend service — add `generateCopies` and `generateImage`

**Files:** Modify `backend/src/modules/posts/posts.service.ts`

- [ ] **Step 1: Add imports**

At the top of `backend/src/modules/posts/posts.service.ts`, the existing import is:

```typescript
import type { AllNetworkCopies, AiService } from "./ai.js";
import type { PostsRepository } from "./posts.repository.js";
import type { GeneratePostInput, SavePostInput } from "./posts.schemas.js";
```

Change the schemas import to also include `GenerateImageInput`:

```typescript
import type { GeneratePostInput, GenerateImageInput, SavePostInput } from "./posts.schemas.js";
```

- [ ] **Step 2: Add the two methods to the returned object**

Inside `createPostsService`, the function returns an object. Add these two methods after `generatePostVariants`:

```typescript
generateCopies: async (
  project: { id: number; name: string; description: string; primaryColor: string | null },
  _ownerId: string,
  input: GeneratePostInput,
): Promise<AllNetworkCopies> => {
  return ai.generateAllCopies({
    projectName: project.name,
    projectDescription: project.description,
    primaryColor: project.primaryColor,
    userDescription: input.description,
    tone: input.tone,
  });
},

generateImage: async (
  project: { id: number; name: string; description: string },
  _ownerId: string,
  input: GenerateImageInput,
): Promise<{ imageUrl: string }> => {
  const imageUrl = await ai.generatePostImage({
    projectName: project.name,
    userDescription: input.description,
  });
  return { imageUrl };
},
```

- [ ] **Step 3: Type-check**

```powershell
pnpm --filter backend lint
```

Expected: no errors.

---

## Task 4: Backend controller — add two new routes

**Files:** Modify `backend/src/modules/posts/posts.controller.ts`

- [ ] **Step 1: Add schema imports**

In the existing import block at the top of the controller, add `generateImageSchema`:

```typescript
import {
  generatePostSchema,
  generateImageSchema,
  savePostSchema,
  postIdParamsSchema,
  postsQuerySchema,
  projectIdParamsSchema,
  updatePostSchema,
} from "./posts.schemas.js";
```

- [ ] **Step 2: Add generate-copy route**

Insert after the existing `controller.post("/:projectId/posts/generate", ...)` handler:

```typescript
controller.post("/:projectId/posts/generate-copy", async (c) => {
  const user = await authenticate(c);
  const params = projectIdParamsSchema.safeParse(c.req.param());
  if (!params.success) return c.json({ error: "Invalid project id", issues: params.error.issues }, 400);

  const body = await c.req.json().catch(() => undefined);
  const result = generatePostSchema.safeParse(body);
  if (!result.success) return c.json({ error: "Invalid request body", issues: result.error.issues }, 400);

  const project = await projectsService.findByIdForOwner(params.data.projectId, user.userId);
  if (!project) return c.json({ error: "Project not found" }, 404);

  const networks = await postsService.generateCopies(
    { id: project.id, name: project.name, description: project.description, primaryColor: project.primaryColor },
    user.userId,
    result.data,
  );
  return c.json({ networks }, 200);
});
```

- [ ] **Step 3: Add generate-image route**

Insert directly after the generate-copy route:

```typescript
controller.post("/:projectId/posts/generate-image", async (c) => {
  const user = await authenticate(c);
  const params = projectIdParamsSchema.safeParse(c.req.param());
  if (!params.success) return c.json({ error: "Invalid project id", issues: params.error.issues }, 400);

  const body = await c.req.json().catch(() => undefined);
  const result = generateImageSchema.safeParse(body);
  if (!result.success) return c.json({ error: "Invalid request body", issues: result.error.issues }, 400);

  const project = await projectsService.findByIdForOwner(params.data.projectId, user.userId);
  if (!project) return c.json({ error: "Project not found" }, 404);

  const imageResult = await postsService.generateImage(
    { id: project.id, name: project.name, description: project.description },
    user.userId,
    result.data,
  );
  return c.json(imageResult, 200);
});
```

- [ ] **Step 4: Type-check**

```powershell
pnpm --filter backend lint
```

Expected: no errors.

- [ ] **Step 5: Run tests — verify all pass**

```powershell
pnpm --filter backend test:e2e -- --reporter=verbose
```

Expected: all tests pass, including the 8 new ones.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/posts/posts.schemas.ts \
        backend/src/modules/posts/posts.service.ts \
        backend/src/modules/posts/posts.controller.ts \
        backend/test/posts.e2e.test.ts
git commit -m "feat(backend): add generate-copy and generate-image endpoints"
```

---

## Task 5: Frontend API — add types and methods

**Files:** Modify `frontend/src/lib/api.ts`

- [ ] **Step 1: Add types**

After the existing `GenerationResult` type, add:

```typescript
export type GenerateCopyResult = {
  networks: GenerationResult['networks'];
};

export type GenerateImageResult = {
  imageUrl: string;
};

export type GenerateImageInput = {
  description: string;
};
```

- [ ] **Step 2: Add methods to `postsApi`**

Inside the `postsApi` object, after the existing `generate` method, add:

```typescript
generateCopy: (projectId: number, input: GeneratePostInput, getToken: () => Promise<string | null>) =>
  request<GenerateCopyResult>(`/projects/${projectId}/posts/generate-copy`, getToken, {
    method: 'POST',
    body: JSON.stringify(input),
  }),

generateImage: (projectId: number, input: GenerateImageInput, getToken: () => Promise<string | null>) =>
  request<GenerateImageResult>(`/projects/${projectId}/posts/generate-image`, getToken, {
    method: 'POST',
    body: JSON.stringify(input),
  }),
```

- [ ] **Step 3: Type-check**

```powershell
pnpm --filter frontend build
```

Expected: no type errors (build output is not needed — type-checking is what matters here; the step will error early if types are wrong).

---

## Task 6: Frontend CSS — add result panel styles

**Files:** Modify `frontend/src/pages/Generator.css`

- [ ] **Step 1: Append new styles**

Add the following to the end of `frontend/src/pages/Generator.css`:

```css
/* ── Result toolbar ─────────────────────────────────────── */
.result-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.result-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--t-sm);
  color: var(--fg-muted);
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--fg-muted);
  flex-shrink: 0;
}

.dot.gen {
  background: var(--accent);
  animation: dot-pulse 1s ease-in-out infinite;
}

@keyframes dot-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

.seg {
  display: flex;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg);
}

.seg button {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border: none;
  background: transparent;
  font-size: var(--t-sm);
  font-weight: 500;
  color: var(--fg-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.seg button:not(:last-child) {
  border-right: 1px solid var(--border);
}

.seg button.active {
  background: var(--fg);
  color: var(--bg);
}

.result-toolbar .toolbar-right {
  margin-left: auto;
}

/* ── Raw view ───────────────────────────────────────────── */
.result-stage {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

.result-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-2);
  overflow: hidden;
}

.result-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  font-size: var(--t-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--fg-muted);
}

.result-card-head .mono {
  font-family: var(--font-mono);
  font-size: var(--t-xs);
  font-weight: 400;
}

.result-card-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 180px;
  position: relative;
}

.result-card-body.no-pad {
  padding: 0;
}

.copy-text {
  font-size: var(--t-sm);
  line-height: 1.6;
  color: var(--fg);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.hashtag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  display: inline-block;
  padding: 3px 8px;
  border: 1px solid var(--border);
  border-radius: 99px;
  font-size: var(--t-xs);
  font-family: var(--font-mono);
  color: var(--fg-muted);
  background: var(--bg);
}

.length-bar {
  height: 3px;
  background: var(--border);
  border-radius: 99px;
  overflow: hidden;
}

.length-bar > span {
  display: block;
  height: 100%;
  background: var(--fg-muted);
  border-radius: 99px;
  transition: width 0.3s;
}

.length-bar.warn > span { background: oklch(0.75 0.14 60); }
.length-bar.over > span { background: oklch(0.6 0.2 20); }

.copy-meta {
  display: flex;
  gap: 10px;
  font-size: var(--t-xs);
  color: var(--fg-muted);
}

.result-card-actions {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--border);
}

.image-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-2);
  overflow: hidden;
  min-height: 200px;
}

.image-stage img {
  width: 100%;
  display: block;
  object-fit: cover;
}

/* ── Adjust bar ─────────────────────────────────────────── */
.adjust-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.adjust-bar .adjust-pre {
  font-size: var(--t-xs);
  font-family: var(--font-mono);
  color: var(--fg-muted);
  flex-shrink: 0;
}

.adjust-bar input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: var(--t-sm);
  color: var(--fg);
  outline: none;
}

.adjust-bar input::placeholder {
  color: var(--fg-muted);
}

@media (max-width: 768px) {
  .result-stage {
    grid-template-columns: 1fr;
  }
}
```

---

## Task 7: Frontend Generator — new state, handlers, and render

**Files:** Modify `frontend/src/pages/Generator.tsx`

This is the biggest change. Replace the file contents entirely with the version below. Read the current file first to confirm no other changes have been made, then apply.

- [ ] **Step 1: Replace Generator.tsx**

```typescript
import { useAuth } from '@clerk/react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { postsApi, projectsApi, type GenerationResult, type Project } from '../lib/api';
import SocialPreview from '../components/SocialPreview';
import { Sparkle } from '../components/Icons';
import './Generator.css';

type Network = 'instagram' | 'x' | 'linkedin' | 'facebook';
type Tone = 'formal' | 'casual' | 'humoristico' | 'inspiracional';
type View = 'preview' | 'raw';
type GeneratingStage = 'copy' | 'image' | 'both' | null;

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

export default function Generator() {
  const { projectId } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const numericId = Number(projectId);

  const [network, setNetwork] = useState<Network>('instagram');
  const [tone, setTone] = useState<Tone>('casual');
  const [description, setDescription] = useState('');
  const [generatingStage, setGeneratingStage] = useState<GeneratingStage>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [view, setView] = useState<View>('preview');
  const [adjustText, setAdjustText] = useState('');

  useEffect(() => {
    if (!numericId) return;
    projectsApi.getById(numericId, getToken).then(setProject).catch(() => {});
  }, [numericId, getToken]);

  const activeNetwork = NETWORKS.find((n) => n.id === network)!;
  const activeVariant = result?.networks[network];

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setGeneratingStage('both');
    setResult(null);
    setError('');
    try {
      const data = await postsApi.generate(numericId, { description, tone }, getToken);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar.');
    } finally {
      setGeneratingStage(null);
    }
  };

  const handleRegenerateAll = async () => {
    if (!description.trim()) return;
    setGeneratingStage('both');
    setError('');
    try {
      const data = await postsApi.generate(numericId, { description, tone }, getToken);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al regenerar.');
    } finally {
      setGeneratingStage(null);
    }
  };

  const handleRegenerateCopy = async () => {
    if (!description.trim()) return;
    setGeneratingStage('copy');
    setError('');
    try {
      const data = await postsApi.generateCopy(numericId, { description, tone }, getToken);
      setResult((prev) => (prev ? { ...prev, networks: data.networks } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al regenerar copy.');
    } finally {
      setGeneratingStage(null);
    }
  };

  const handleRegenerateImage = async () => {
    if (!description.trim()) return;
    setGeneratingStage('image');
    setError('');
    try {
      const data = await postsApi.generateImage(numericId, { description }, getToken);
      setResult((prev) => (prev ? { ...prev, imageUrl: data.imageUrl } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al regenerar imagen.');
    } finally {
      setGeneratingStage(null);
    }
  };

  const handleApplyAdjust = async () => {
    if (!adjustText.trim()) return;
    setGeneratingStage('both');
    setError('');
    try {
      const adjustedDescription = `${description}\n\n${adjustText}`;
      const data = await postsApi.generate(numericId, { description: adjustedDescription, tone }, getToken);
      setResult(data);
      setAdjustText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aplicar ajuste.');
    } finally {
      setGeneratingStage(null);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    const variant = result.networks[network];
    setSaving(true);
    setError('');
    try {
      await postsApi.save(
        numericId,
        {
          socialMedia: network,
          text: variant.copy,
          hashtags: variant.hashtags,
          imageUrl: result.imageUrl,
          generationPrompt: description,
        },
        getToken,
      );
      navigate(`/projects/${numericId}/gallery`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const statusLabel =
    generatingStage === 'copy' ? 'Generando copy…' :
    generatingStage === 'image' ? 'Generando imagen…' :
    generatingStage === 'both' ? 'Generando copy + imagen…' :
    'Listo';

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Generador de post</h1>
          <p className="page-sub">Brief → copy + imagen para las 4 redes. Switcheá y guardá la que más te guste.</p>
        </div>
        <Link to={`/projects/${numericId}/gallery`} className="btn btn-ghost btn-sm">
          Ver galería
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="gen-grid">
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
              disabled={generatingStage !== null || !description.trim()}
            >
              <Sparkle size={14} />
              {result ? 'Regenerar' : 'Generar'}
            </button>
          </div>

          {result && (
            <button
              className="btn btn-sm"
              onClick={handleSave}
              disabled={saving || generatingStage !== null}
            >
              {saving ? 'Guardando…' : `Guardar post de ${activeNetwork.label}`}
            </button>
          )}
        </aside>

        <section className="result-panel">
          {generatingStage !== null && !result ? (
            <div className="result-generating">
              <span>{statusLabel}</span>
            </div>
          ) : result && activeVariant ? (
            <>
              <div className="result-toolbar">
                <div className="result-status">
                  <span className={`dot${generatingStage ? ' gen' : ''}`} />
                  {statusLabel}
                </div>
                <div className="seg" style={{ marginLeft: 12 }}>
                  <button
                    className={view === 'preview' ? 'active' : ''}
                    onClick={() => setView('preview')}
                  >
                    Preview
                  </button>
                  <button
                    className={view === 'raw' ? 'active' : ''}
                    onClick={() => setView('raw')}
                  >
                    Raw
                  </button>
                </div>
                <div className="toolbar-right">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleRegenerateAll}
                    disabled={generatingStage !== null}
                  >
                    Regenerar todo
                  </button>
                </div>
              </div>

              {view === 'preview' && (
                <SocialPreview
                  network={network}
                  copy={activeVariant.copy}
                  hashtags={activeVariant.hashtags}
                  imageUrl={result.imageUrl}
                  projectName={project?.name ?? 'Tu marca'}
                />
              )}

              {view === 'raw' && (() => {
                const fullText = activeVariant.hashtags.length > 0
                  ? `${activeVariant.copy}\n\n${activeVariant.hashtags.join(' ')}`
                  : activeVariant.copy;
                const charCount = fullText.length;
                const lenPct = Math.min(100, (charCount / activeNetwork.maxChars) * 100);
                const lenState =
                  charCount > activeNetwork.maxChars ? 'over' :
                  charCount > activeNetwork.softLimit ? 'warn' : '';
                const wordCount = activeVariant.copy.split(/\s+/).filter(Boolean).length;

                return (
                  <div className="result-stage">
                    <div className="result-card">
                      <div className="result-card-head">
                        <span>Copy</span>
                        <span className="mono">{charCount} / {activeNetwork.maxChars}</span>
                      </div>
                      <div className="result-card-body">
                        <p className="copy-text">{activeVariant.copy}</p>
                        {activeVariant.hashtags.length > 0 && (
                          <div className="hashtag-chips">
                            {activeVariant.hashtags.map((tag, i) => (
                              <span key={i} className="chip">{tag}</span>
                            ))}
                          </div>
                        )}
                        <div className={`length-bar ${lenState}`}>
                          <span style={{ width: `${lenPct}%` }} />
                        </div>
                        <div className="copy-meta">
                          <span>{activeVariant.hashtags.length} tags</span>
                          <span>{wordCount} palabras</span>
                        </div>
                      </div>
                      <div className="result-card-actions">
                        <button
                          className="btn btn-sm"
                          onClick={handleRegenerateCopy}
                          disabled={generatingStage !== null}
                        >
                          Regenerar copy
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => navigator.clipboard.writeText(fullText)}
                        >
                          Copiar
                        </button>
                      </div>
                    </div>

                    <div className="result-card">
                      <div className="result-card-head">
                        <span>Imagen</span>
                        <span className="mono">{activeNetwork.aspect}</span>
                      </div>
                      <div className="result-card-body no-pad">
                        {result.imageUrl && (
                          <div className="image-stage">
                            <img src={result.imageUrl} alt="" />
                          </div>
                        )}
                      </div>
                      <div className="result-card-actions">
                        <button
                          className="btn btn-sm"
                          onClick={handleRegenerateImage}
                          disabled={generatingStage !== null}
                        >
                          Regenerar imagen
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="adjust-bar">
                <span className="adjust-pre">/ajustar</span>
                <input
                  value={adjustText}
                  onChange={(e) => setAdjustText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleApplyAdjust(); }}
                  placeholder="ej: hacé el copy más corto, agregá 2 emojis sutiles, imagen más cálida…"
                />
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleApplyAdjust}
                  disabled={!adjustText.trim() || generatingStage !== null}
                >
                  Aplicar
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setAdjustText('')}
                  aria-label="Limpiar ajuste"
                >
                  ×
                </button>
              </div>
            </>
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

- [ ] **Step 2: Type-check**

```powershell
pnpm --filter frontend build
```

Expected: no type errors.

- [ ] **Step 3: Start dev servers**

```powershell
pnpm dev
```

- [ ] **Step 4: Manual browser test**

Open `http://localhost:5173`, sign in, open a project → Generator. Verify:

1. Empty state shows "Completá el brief…"
2. Fill brief, click Generar → shows "Generando copy + imagen…" loading state
3. After generation: toolbar shows "● Listo", Preview tab shows social preview
4. Switch to Raw tab → COPY card shows copy text, hashtag chips, length bar, copy meta, buttons
5. Raw tab → IMAGEN card shows image and "Regenerar imagen" button
6. Click "Copiar" → paste into a text editor and confirm copy + hashtags are both present
7. Click "Regenerar copy" → dot animates, copy card updates, image unchanged
8. Click "Regenerar imagen" → dot animates, image updates, copy unchanged
9. Click "Regenerar todo" → both update
10. Type text in /ajustar input, press Enter or click Aplicar → regenerates both, input clears
11. Click × → clears the input (bar stays)
12. Change network tab → Raw view updates to show that network's copy + hashtags
13. Click "Guardar post de X" → redirects to gallery

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api.ts \
        frontend/src/pages/Generator.css \
        frontend/src/pages/Generator.tsx
git commit -m "feat(frontend): add Preview/Raw tabs, partial regeneration, hashtag chips, and adjust bar to Generator"
```
