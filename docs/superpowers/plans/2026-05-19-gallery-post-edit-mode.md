# Gallery Post Edit Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking a post in the Gallery opens it in the Generator pre-populated with existing data; the user can regenerate copy/image and save back via PATCH.

**Architecture:** New route `/projects/:projectId/posts/:postId/edit` renders the existing `Generator` component in "edit mode" (detected via `postId` param). The backend PATCH endpoint is extended to accept `imageUrl` and `generationPrompt` in addition to `text`. The Gallery removes inline editing; cards become clickable and navigate to the edit route.

**Tech Stack:** React 19, React Router DOM, TypeScript, Hono, Zod, Drizzle ORM, Vitest + supertest (backend e2e tests)

---

### Task 1: Extend backend PATCH endpoint to accept imageUrl and generationPrompt

**Files:**
- Modify: `backend/src/modules/posts/posts.schemas.ts` (lines 35–39)
- Modify: `backend/src/modules/posts/posts.service.ts` (lines 93–98)
- Modify: `backend/src/modules/posts/posts.controller.ts` (line 148)
- Modify: `backend/test/posts.e2e.test.ts` (inside `describe("update post text", ...)`)

- [ ] **Step 1: Add three failing tests to the "update post text" describe block**

Open `backend/test/posts.e2e.test.ts` and append these three `it` blocks inside `describe("update post text", ...)`, after the existing "rejects empty text" test:

```ts
it("updates imageUrl and generationPrompt alongside text", async () => {
  const project = await createProject();

  const saved = await request(server)
    .post(`/projects/${project.id}/posts/save`)
    .set("Authorization", "Bearer test-token")
    .send({
      socialMedia: "instagram",
      text: "Original text",
      hashtags: [],
      imageUrl: "data:image/png;base64,abc",
      generationPrompt: "Original prompt",
    })
    .expect(201);

  const updated = await request(server)
    .patch(`/projects/${project.id}/posts/${saved.body.id}`)
    .set("Authorization", "Bearer test-token")
    .send({
      text: "Updated text",
      imageUrl: "data:image/png;base64,newimage",
      generationPrompt: "Updated prompt",
    })
    .expect(200);

  expect(updated.body.text).toBe("Updated text");
  expect(updated.body.imageUrl).toBe("data:image/png;base64,newimage");
  expect(updated.body.generationPrompt).toBe("Updated prompt");
});

it("allows partial update with imageUrl only", async () => {
  const project = await createProject();

  const saved = await request(server)
    .post(`/projects/${project.id}/posts/save`)
    .set("Authorization", "Bearer test-token")
    .send({
      socialMedia: "instagram",
      text: "Original text",
      hashtags: [],
      imageUrl: "data:image/png;base64,abc",
      generationPrompt: "Original prompt",
    })
    .expect(201);

  const updated = await request(server)
    .patch(`/projects/${project.id}/posts/${saved.body.id}`)
    .set("Authorization", "Bearer test-token")
    .send({ imageUrl: "data:image/png;base64,newimage" })
    .expect(200);

  expect(updated.body.imageUrl).toBe("data:image/png;base64,newimage");
  expect(updated.body.text).toBe(saved.body.text);
});

it("rejects an empty body (no fields provided)", async () => {
  const project = await createProject();

  const saved = await request(server)
    .post(`/projects/${project.id}/posts/save`)
    .set("Authorization", "Bearer test-token")
    .send({
      socialMedia: "instagram",
      text: "Post",
      hashtags: [],
      imageUrl: "data:image/png;base64,abc",
      generationPrompt: "Post",
    })
    .expect(201);

  await request(server)
    .patch(`/projects/${project.id}/posts/${saved.body.id}`)
    .set("Authorization", "Bearer test-token")
    .send({})
    .expect(400);
});
```

- [ ] **Step 2: Run the tests — verify these three new ones fail**

```
pnpm --filter backend test:e2e -- --reporter=verbose
```

Expected: the three new tests FAIL (schema still requires `text` and doesn't know `imageUrl`/`generationPrompt`); existing tests pass.

- [ ] **Step 3: Update `updatePostSchema` in `backend/src/modules/posts/posts.schemas.ts`**

Replace lines 35–39:

```ts
// Before
export const updatePostSchema = z.object({
  text: z.string().trim().min(1),
});

export type UpdatePostInput = z.infer<typeof updatePostSchema>;
```

With:

```ts
export const updatePostSchema = z
  .object({
    text: z.string().trim().min(1).optional(),
    imageUrl: z.string().min(1).optional(),
    generationPrompt: z.string().optional(),
  })
  .refine(
    (data) =>
      data.text !== undefined ||
      data.imageUrl !== undefined ||
      data.generationPrompt !== undefined,
    { message: "At least one field is required" },
  );

export type UpdatePostInput = z.infer<typeof updatePostSchema>;
```

- [ ] **Step 4: Rename `updatePostText` → `updatePost` in `backend/src/modules/posts/posts.service.ts`**

Replace lines 93–98:

```ts
// Before
updatePostText: async (id: number, projectId: number, ownerId: string, text: string) => {
  const post = await postsRepository.findByIdForProject(id, projectId, ownerId);
  if (!post) return undefined;
  return postsRepository.update(id, projectId, { text });
},
```

With:

```ts
updatePost: async (
  id: number,
  projectId: number,
  ownerId: string,
  data: { text?: string; imageUrl?: string; generationPrompt?: string },
) => {
  const post = await postsRepository.findByIdForProject(id, projectId, ownerId);
  if (!post) return undefined;
  return postsRepository.update(id, projectId, data);
},
```

- [ ] **Step 5: Update the PATCH handler in `backend/src/modules/posts/posts.controller.ts`**

Find line 148 (inside `controller.patch("/:projectId/posts/:id", ...)`):

```ts
// Before
const post = await postsService.updatePostText(params.data.id, params.data.projectId, user.userId, result.data.text);
```

Replace with:

```ts
const post = await postsService.updatePost(params.data.id, params.data.projectId, user.userId, result.data);
```

- [ ] **Step 6: Run the full test suite — all tests must pass**

```
pnpm --filter backend test:e2e -- --reporter=verbose
```

Expected: all tests PASS, including the three new ones.

- [ ] **Step 7: Commit**

```
git add backend/src/modules/posts/posts.schemas.ts backend/src/modules/posts/posts.service.ts backend/src/modules/posts/posts.controller.ts backend/test/posts.e2e.test.ts
git commit -m "feat(backend): extend PATCH /posts/:id to update imageUrl and generationPrompt"
```

---

### Task 2: Frontend API client — add `postsApi.getById`, extend `postsApi.update`

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Update `postsApi.update` signature (line ~149)**

Find in `frontend/src/lib/api.ts`:

```ts
update: (projectId: number, postId: number, input: { text: string }, getToken: () => Promise<string | null>) =>
  request<Post>(`/projects/${projectId}/posts/${postId}`, getToken, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }),
```

Replace with:

```ts
update: (
  projectId: number,
  postId: number,
  input: { text?: string; imageUrl?: string; generationPrompt?: string },
  getToken: () => Promise<string | null>,
) =>
  request<Post>(`/projects/${projectId}/posts/${postId}`, getToken, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }),
```

- [ ] **Step 2: Add `postsApi.getById` after the `list` entry**

Find in `frontend/src/lib/api.ts`:

```ts
export const postsApi = {
  list: (projectId: number, getToken: () => Promise<string | null>, options?: { includeUnapproved?: boolean }) =>
    request<Post[]>(`/projects/${projectId}/posts${options?.includeUnapproved ? '?includeUnapproved=true' : ''}`, getToken),
```

Replace with:

```ts
export const postsApi = {
  list: (projectId: number, getToken: () => Promise<string | null>, options?: { includeUnapproved?: boolean }) =>
    request<Post[]>(`/projects/${projectId}/posts${options?.includeUnapproved ? '?includeUnapproved=true' : ''}`, getToken),

  getById: (projectId: number, postId: number, getToken: () => Promise<string | null>) =>
    request<Post>(`/projects/${projectId}/posts/${postId}`, getToken),
```

- [ ] **Step 3: Run type check**

```
pnpm --filter frontend lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```
git add frontend/src/lib/api.ts
git commit -m "feat(frontend): add postsApi.getById and extend postsApi.update to accept imageUrl and generationPrompt"
```

---

### Task 3: Add edit route to App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add the edit route inside the protected `<Route>` block**

Find in `frontend/src/App.tsx`:

```tsx
        <Route path="/projects/:projectId/gallery" element={<ProjectGallery />} />
        <Route path="/projects/:projectId/generator" element={<Generator />} />
```

Replace with:

```tsx
        <Route path="/projects/:projectId/gallery" element={<ProjectGallery />} />
        <Route path="/projects/:projectId/generator" element={<Generator />} />
        <Route path="/projects/:projectId/posts/:postId/edit" element={<Generator />} />
```

- [ ] **Step 2: Run type check**

```
pnpm --filter frontend lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add frontend/src/App.tsx
git commit -m "feat(frontend): add /projects/:projectId/posts/:postId/edit route"
```

---

### Task 4: Gallery — clickable cards, remove inline editing

**Files:**
- Modify: `frontend/src/pages/ProjectGallery.tsx`

- [ ] **Step 1: Remove inline edit state, handlers, and imports**

At the top of `ProjectGallery`, remove these state declarations and their handlers:

```ts
// Remove these:
const [editingId, setEditingId] = useState<number | null>(null);
const [editText, setEditText] = useState('');
const [saving, setSaving] = useState(false);
```

And remove these functions entirely:
- `handleStartEdit`
- `handleCancelEdit`
- `handleSave` (the Gallery one, not the Generator one)

- [ ] **Step 2: Add `useNavigate` import and hook**

Find:

```tsx
import { Link, useParams } from 'react-router-dom';
```

Replace with:

```tsx
import { Link, useNavigate, useParams } from 'react-router-dom';
```

Then add inside the component body (after `const numericId = Number(projectId);`):

```tsx
const navigate = useNavigate();
```

- [ ] **Step 3: Replace gallery card JSX with clickable version**

Find the `posts.map(...)` block and replace the entire `<article>` content:

```tsx
{posts.map((post) => (
  <article
    key={post.id}
    className="gallery-card"
    onClick={() => navigate(`/projects/${numericId}/posts/${post.id}/edit`)}
    style={{ cursor: 'pointer' }}
  >
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
    <div className="gallery-card-actions">
      <button
        className="btn btn-ghost btn-sm"
        onClick={(e) => { e.stopPropagation(); void handleDelete(post.id); }}
        style={{ color: 'var(--danger)' }}
      >
        Eliminar
      </button>
    </div>
  </article>
))}
```

- [ ] **Step 4: Run type check**

```
pnpm --filter frontend lint
```

Expected: no errors. If there are unused import errors for `useState`, remove the `useState` import if it is no longer used (it's still used for `project`, `posts`, `status`, `error` — so it stays).

- [ ] **Step 5: Commit**

```
git add frontend/src/pages/ProjectGallery.tsx
git commit -m "feat(frontend): make gallery cards clickable and navigate to edit route"
```

---

### Task 5: Generator — edit mode (pre-populate from existing post, PATCH on save)

**Files:**
- Modify: `frontend/src/pages/Generator.tsx`

- [ ] **Step 1: Read `postId` from params and derive `isEditMode`**

Find in `Generator.tsx`:

```tsx
  const { projectId } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const numericId = Number(projectId);
```

Replace with:

```tsx
  const { projectId, postId } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const numericId = Number(projectId);
  const numericPostId = postId ? Number(postId) : undefined;
  const isEditMode = Boolean(numericPostId);
```

- [ ] **Step 2: Add a useEffect to load the post in edit mode**

Add this `useEffect` immediately after the existing one that loads the project (`projectsApi.getById(...)`):

```tsx
  useEffect(() => {
    if (!isEditMode || !numericPostId || !numericId) return;
    postsApi.getById(numericId, numericPostId, getToken).then((post) => {
      setNetwork(post.socialMedia);
      setDescription(post.generationPrompt);
      const networks: GenerationResult['networks'] = {
        instagram: { copy: '', hashtags: [] },
        x: { copy: '', hashtags: [] },
        linkedin: { copy: '', hashtags: [] },
        facebook: { copy: '', hashtags: [] },
      };
      networks[post.socialMedia] = { copy: post.text, hashtags: [] };
      setResult({ imageUrl: post.imageUrl, networks });
    }).catch(() => {});
  }, [isEditMode, numericPostId, numericId, getToken]);
```

- [ ] **Step 3: Update `handleSave` to PATCH when in edit mode**

Find the full `handleSave` function:

```tsx
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
```

Replace with:

```tsx
  const handleSave = async () => {
    if (!result) return;
    const variant = result.networks[network];
    const fullText = variant.hashtags.length > 0
      ? `${variant.copy}\n\n${variant.hashtags.join(' ')}`
      : variant.copy;
    setSaving(true);
    setError('');
    try {
      if (isEditMode && numericPostId) {
        await postsApi.update(
          numericId,
          numericPostId,
          { text: fullText, imageUrl: result.imageUrl, generationPrompt: description },
          getToken,
        );
      } else {
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
      }
      navigate(`/projects/${numericId}/gallery`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };
```

- [ ] **Step 4: Update the page header to reflect edit mode**

Find:

```tsx
      <div className="page-header">
        <div>
          <h1 className="page-title">Generador de post</h1>
          <p className="page-sub">Brief → copy + imagen para las 4 redes. Switcheá y guardá la que más te guste.</p>
        </div>
        <Link to={`/projects/${numericId}/gallery`} className="btn btn-ghost btn-sm">
          Ver galería
        </Link>
      </div>
```

Replace with:

```tsx
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEditMode ? 'Editar post' : 'Generador de post'}</h1>
          <p className="page-sub">
            {isEditMode
              ? 'Regenerá copy o imagen y guardá los cambios.'
              : 'Brief → copy + imagen para las 4 redes. Switcheá y guardá la que más te guste.'}
          </p>
        </div>
        <Link to={`/projects/${numericId}/gallery`} className="btn btn-ghost btn-sm">
          {isEditMode ? 'Volver a galería' : 'Ver galería'}
        </Link>
      </div>
```

- [ ] **Step 5: Update the save button label**

Find inside the `<aside className="brief-panel">`:

```tsx
          {result && (
            <button
              className="btn btn-sm"
              onClick={handleSave}
              disabled={saving || generatingStage !== null}
            >
              {saving ? 'Guardando…' : `Guardar post de ${activeNetwork.label}`}
            </button>
          )}
```

Replace with:

```tsx
          {result && (
            <button
              className="btn btn-sm"
              onClick={handleSave}
              disabled={saving || generatingStage !== null}
            >
              {saving ? 'Guardando…' : isEditMode ? 'Guardar cambios' : `Guardar post de ${activeNetwork.label}`}
            </button>
          )}
```

- [ ] **Step 6: Run type check**

```
pnpm --filter frontend lint
```

Expected: no errors. Make sure `postsApi` import in Generator includes the updated client (it's imported from `'../lib/api'` — no change needed there).

- [ ] **Step 7: Commit**

```
git add frontend/src/pages/Generator.tsx
git commit -m "feat(frontend): add edit mode to Generator — pre-populate from existing post, PATCH on save"
```

---

## Manual Verification Checklist

Start both servers:
```
pnpm dev
```

1. Open a project gallery at `http://localhost:5173/projects/<id>/gallery`
2. Click a post card — should navigate to `/projects/<id>/posts/<postId>/edit`
3. Verify the brief textarea is pre-filled with the post's generation prompt
4. Verify the correct network tab is pre-selected
5. Verify the result panel shows the existing image and copy immediately (no generate required)
6. Click "Regenerar imagen" — new image loads; click "Guardar cambios" — navigates to gallery, post updated
7. Click the post again — edited image and text appear
8. Create a new post via Generador — save behavior unchanged (POST, new post created)
9. Click "Eliminar" on a gallery card — confirm dialog appears, card removed; no navigation to edit occurs
