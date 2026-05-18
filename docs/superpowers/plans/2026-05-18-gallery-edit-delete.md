# Gallery Edit & Delete Posts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-card edit (inline text) and delete buttons to the ProjectGallery page, backed by a new PATCH endpoint for text updates.

**Architecture:** New `PATCH /projects/:projectId/posts/:id` backend endpoint updates post text after ownership verification. Frontend adds `postsApi.update` and `postsApi.delete`, then wires them into per-card action buttons in `ProjectGallery`.

**Tech Stack:** Hono + Zod (backend), React 19 + TypeScript (frontend), Vitest + supertest (e2e tests)

---

## Files touched

| File | Action |
|---|---|
| `backend/src/modules/posts/posts.schemas.ts` | Add `updatePostSchema` |
| `backend/src/modules/posts/posts.service.ts` | Add `updatePostText` method |
| `backend/src/modules/posts/posts.controller.ts` | Add `PATCH /:projectId/posts/:id` route |
| `backend/test/posts.e2e.test.ts` | Add tests for new endpoint |
| `frontend/src/lib/api.ts` | Add `postsApi.update` and `postsApi.delete` |
| `frontend/src/pages/ProjectGallery.css` | Add `.gallery-card-actions` and `.gallery-card-edit-area` |
| `frontend/src/pages/ProjectGallery.tsx` | Add edit/delete state and per-card UI |

---

## Task 1: Backend — schema + service + controller for text update

**Files:**
- Modify: `backend/src/modules/posts/posts.schemas.ts`
- Modify: `backend/src/modules/posts/posts.service.ts`
- Modify: `backend/src/modules/posts/posts.controller.ts`

- [ ] **Step 1.1: Add `updatePostSchema` to schemas**

In `backend/src/modules/posts/posts.schemas.ts`, append after the existing exports:

```ts
export const updatePostSchema = z.object({
  text: z.string().trim().min(1),
});

export type UpdatePostInput = z.infer<typeof updatePostSchema>;
```

- [ ] **Step 1.2: Add `updatePostText` to service**

In `backend/src/modules/posts/posts.service.ts`, add this method inside the returned object (after `approvePost`):

```ts
updatePostText: async (id: number, projectId: number, ownerId: string, text: string) => {
  const post = await postsRepository.findByIdForProject(id, projectId, ownerId);
  if (!post) return undefined;
  return postsRepository.update(id, projectId, { text });
},
```

Also add `UpdatePostInput` to the import from `./posts.schemas.js` at the top of the file — but since the service only receives `text: string` directly, no import change is needed.

- [ ] **Step 1.3: Add PATCH route to controller**

In `backend/src/modules/posts/posts.controller.ts`, add this route after the `PATCH .../approve` block and before the `DELETE` block:

```ts
controller.patch("/:projectId/posts/:id", async (c) => {
  const user = await authenticate(c);
  const params = postIdParamsSchema.safeParse(c.req.param());

  if (!params.success) {
    return c.json({ error: "Invalid parameters", issues: params.error.issues }, 400);
  }

  const body = await c.req.json().catch(() => undefined);
  const result = updatePostSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: "Invalid request body", issues: result.error.issues }, 400);
  }

  const post = await postsService.updatePostText(
    params.data.id,
    params.data.projectId,
    user.userId,
    result.data.text,
  );

  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  return c.json(post);
});
```

Add `updatePostSchema` to the import from `./posts.schemas.js` at the top of the controller:

```ts
import {
  generatePostSchema,
  postIdParamsSchema,
  postsQuerySchema,
  projectIdParamsSchema,
  updatePostSchema,
} from "./posts.schemas.js";
```

- [ ] **Step 1.4: Type-check backend**

```bash
pnpm --filter backend lint
```

Expected: no errors.

- [ ] **Step 1.5: Commit**

```bash
git add backend/src/modules/posts/posts.schemas.ts backend/src/modules/posts/posts.service.ts backend/src/modules/posts/posts.controller.ts
git commit -m "feat(posts): add PATCH endpoint to update post text"
```

---

## Task 2: Backend — e2e tests for text update endpoint

**Files:**
- Modify: `backend/test/posts.e2e.test.ts`

- [ ] **Step 2.1: Add auth test for new PATCH route**

In the `describe("authentication")` block in `backend/test/posts.e2e.test.ts`, add:

```ts
it("requires auth for updating posts", async () => {
  await request(server).patch("/projects/1/posts/1").expect(401);
});
```

- [ ] **Step 2.2: Add `describe("update post text")` block**

Add after the `describe("delete post")` block:

```ts
describe("update post text", () => {
  it("updates the text of an existing post", async () => {
    const project = await createProject();

    const generated = await request(server)
      .post(`/projects/${project.id}/posts/generate`)
      .set("Authorization", "Bearer test-token")
      .send({ socialMedia: "instagram", description: "Original post" })
      .expect(201);

    const updated = await request(server)
      .patch(`/projects/${project.id}/posts/${generated.body.id}`)
      .set("Authorization", "Bearer test-token")
      .send({ text: "Updated copy text" })
      .expect(200);

    expect(updated.body.text).toBe("Updated copy text");
    expect(updated.body.id).toBe(generated.body.id);
  });

  it("returns 404 when updating non-existent post", async () => {
    const project = await createProject();

    await request(server)
      .patch(`/projects/${project.id}/posts/999`)
      .set("Authorization", "Bearer test-token")
      .send({ text: "New text" })
      .expect(404);
  });

  it("rejects empty text", async () => {
    const project = await createProject();

    const generated = await request(server)
      .post(`/projects/${project.id}/posts/generate`)
      .set("Authorization", "Bearer test-token")
      .send({ socialMedia: "instagram", description: "Post" })
      .expect(201);

    await request(server)
      .patch(`/projects/${project.id}/posts/${generated.body.id}`)
      .set("Authorization", "Bearer test-token")
      .send({ text: "" })
      .expect(400);
  });
});
```

- [ ] **Step 2.3: Run the tests**

```bash
pnpm --filter backend test:e2e -- --reporter=verbose
```

Expected: all tests pass, including the 4 new ones.

- [ ] **Step 2.4: Commit**

```bash
git add backend/test/posts.e2e.test.ts
git commit -m "test(posts): add e2e tests for PATCH post text endpoint"
```

---

## Task 3: Frontend API — add update and delete

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 3.1: Add `update` and `delete` to `postsApi`**

In `frontend/src/lib/api.ts`, replace the `postsApi` object with:

```ts
export const postsApi = {
  list: (projectId: number, getToken: () => Promise<string | null>, options?: { includeUnapproved?: boolean }) =>
    request<Post[]>(`/projects/${projectId}/posts${options?.includeUnapproved ? '?includeUnapproved=true' : ''}`, getToken),

  generate: (projectId: number, input: GeneratePostInput, getToken: () => Promise<string | null>) =>
    request<Post>(`/projects/${projectId}/posts/generate`, getToken, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  approve: (projectId: number, postId: number, getToken: () => Promise<string | null>) =>
    request<Post>(`/projects/${projectId}/posts/${postId}/approve`, getToken, {
      method: 'PATCH',
    }),

  update: (projectId: number, postId: number, input: { text: string }, getToken: () => Promise<string | null>) =>
    request<Post>(`/projects/${projectId}/posts/${postId}`, getToken, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  delete: (projectId: number, postId: number, getToken: () => Promise<string | null>) =>
    request<void>(`/projects/${projectId}/posts/${postId}`, getToken, {
      method: 'DELETE',
    }),
};
```

- [ ] **Step 3.2: Type-check frontend**

```bash
pnpm --filter frontend build
```

Expected: builds without errors.

- [ ] **Step 3.3: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat(api): add postsApi.update and postsApi.delete"
```

---

## Task 4: Frontend — gallery card actions CSS

**Files:**
- Modify: `frontend/src/pages/ProjectGallery.css`

- [ ] **Step 4.1: Add card actions styles**

In `frontend/src/pages/ProjectGallery.css`, append before the `@media` block at the bottom:

```css
.gallery-card-actions {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--border);
  background: var(--surface-2);
}

.gallery-card-edit-area {
  width: 100%;
  min-height: 80px;
  resize: vertical;
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.4;
  color: var(--fg);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
}

.gallery-card-edit-area:focus {
  outline: none;
  border-color: var(--fg);
}

.gallery-card-edit-area:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 4.2: Commit**

```bash
git add frontend/src/pages/ProjectGallery.css
git commit -m "style(gallery): add card actions and edit area styles"
```

---

## Task 5: Frontend — edit/delete UI in ProjectGallery

**Files:**
- Modify: `frontend/src/pages/ProjectGallery.tsx`

- [ ] **Step 5.1: Add state and handlers**

Replace the existing `useState` imports and state block. The full updated file:

```tsx
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

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

  const handleStartEdit = (post: Post) => {
    setEditingId(post.id);
    setEditText(post.text);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleSave = async (postId: number) => {
    if (!editText.trim()) return;
    setSaving(true);
    setError('');
    try {
      const updated = await postsApi.update(numericId, postId, { text: editText }, getToken);
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
      setEditingId(null);
      setEditText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (postId: number) => {
    if (!window.confirm('¿Eliminar este post? Esta acción no se puede deshacer.')) return;
    setError('');
    try {
      await postsApi.delete(numericId, postId, getToken);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar.');
    }
  };

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

      {error && <div className="error-banner">{error}</div>}

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
          {posts.map((post) => {
            const isEditing = editingId === post.id;
            return (
              <article key={post.id} className="gallery-card">
                <img src={post.imageUrl} alt="" />
                <div className="gallery-card-body">
                  <span
                    className="gallery-card-network"
                    style={{ color: socialColors[post.socialMedia] }}
                  >
                    {socialNames[post.socialMedia]}
                  </span>
                  {isEditing ? (
                    <textarea
                      className="gallery-card-edit-area"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      disabled={saving}
                      autoFocus
                    />
                  ) : (
                    <p className="gallery-card-text">{post.text}</p>
                  )}
                </div>
                <div className="gallery-card-actions">
                  {isEditing ? (
                    <>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSave(post.id)}
                        disabled={saving || !editText.trim()}
                      >
                        {saving ? 'Guardando…' : 'Guardar'}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={handleCancelEdit}
                        disabled={saving}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleStartEdit(post)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDelete(post.id)}
                        style={{ color: 'var(--danger)' }}
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
```

- [ ] **Step 5.2: Build to verify no TypeScript errors**

```bash
pnpm --filter frontend build
```

Expected: builds cleanly, no type errors.

- [ ] **Step 5.3: Smoke test in browser**

Start the dev servers:
```bash
pnpm dev
```

1. Open `http://localhost:5173`, log in with user `test` / `SocialContentStudio`
2. Open a project, generate and approve a post from the Generator
3. Go to the gallery — the card should show **Editar** and **Eliminar** buttons in the footer
4. Click **Editar** — the text becomes a textarea with **Guardar** / **Cancelar**
5. Change the text and click **Guardar** — the card updates with the new text
6. Click **Eliminar** — confirm dialog appears; confirm → card disappears from the grid

- [ ] **Step 5.4: Commit**

```bash
git add frontend/src/pages/ProjectGallery.tsx
git commit -m "feat(gallery): add per-card edit and delete actions"
```
