# Gallery — Edit & Delete Approved Posts

**Date:** 2026-05-18  
**Status:** Approved

## Summary

Add per-card edit and delete actions to the ProjectGallery page so users can manage approved posts without leaving the gallery.

## Scope

- Edit the text of an approved post inline (no modal, no new page)
- Delete an approved post with a confirmation prompt
- One card in edit mode at a time

Out of scope: editing the image, regenerating from the gallery, bulk selection.

## Backend

### New endpoint: `PATCH /projects/:projectId/posts/:id`

Accepts `{ text: string }` (non-empty, validated with Zod). The service verifies the post belongs to the project and the project belongs to the authenticated user before updating. Returns the updated post.

**Schema addition** (`posts.schemas.ts`):
```ts
export const updatePostSchema = z.object({ text: z.string().min(1) });
```

**Service method** (`posts.service.ts`):
```ts
updatePostText(id, projectId, ownerId, text) {
  // verify ownership via findByIdForProject, then postsRepository.update(id, projectId, { text })
}
```

**Controller** (`posts.controller.ts`): new `PATCH /:projectId/posts/:id` route calling the service method.

No DB migration needed — `text` column already exists and `postsRepository.update` already accepts partial fields.

## Frontend API (`src/lib/api.ts`)

Two new functions on `postsApi`:

```ts
update: (projectId, postId, input: { text: string }, getToken) =>
  request<Post>(`/projects/${projectId}/posts/${postId}`, getToken, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }),

delete: (projectId, postId, getToken) =>
  request<void>(`/projects/${projectId}/posts/${postId}`, getToken, {
    method: 'DELETE',
  }),
```

## Frontend UI (`ProjectGallery.tsx` + `ProjectGallery.css`)

### State additions

```ts
const [editingId, setEditingId] = useState<number | null>(null);
const [editText, setEditText] = useState('');
```

Only one card can be in edit mode at a time (`editingId` stores its `post.id`).

### Card structure changes

Each `gallery-card` gains a `gallery-card-actions` footer:

```
┌──────────────────────────────┐
│  [image]                     │
│  Network label               │
│  Post text  (or <textarea>)  │
├──────────────────────────────┤
│  [✏ Editar]   [🗑 Eliminar]  │  ← gallery-card-actions
└──────────────────────────────┘
```

**Edit flow:**
1. Click "Editar" → set `editingId = post.id`, `editText = post.text`
2. Card body shows `<textarea>` instead of `<p>`
3. Buttons become "Guardar" (calls `postsApi.update`, updates `posts` state, clears `editingId`) and "Cancelar" (clears `editingId`)

**Delete flow:**
1. Click "Eliminar" → `window.confirm('¿Eliminar este post?')`
2. If confirmed → call `postsApi.delete`, remove post from `posts` state

### CSS additions (`ProjectGallery.css`)

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
  /* inherits textarea styles */
}
```

## Error handling

- If `postsApi.update` or `postsApi.delete` throws, show the existing `error-banner` in the gallery and keep state unchanged.
- Edit textarea is disabled while the save request is in flight.

## Testing

Manual: approve a post via the generator, then verify edit and delete work from the gallery. No new e2e tests required for this scope.
