# Gallery Post Edit Mode — Design Spec

**Date:** 2026-05-19  
**Status:** Approved

## Overview

Clicking a post in the Gallery opens it in the Generator page pre-populated with the post's existing data. The user can regenerate copy and/or image and save back to the same post via PATCH.

## Routes

| Route | Component | Mode |
|---|---|---|
| `/projects/:projectId/generator` | `Generator` | New post |
| `/projects/:projectId/posts/:postId/edit` | `Generator` | Edit existing post |

## Frontend — Gallery (`ProjectGallery.tsx`)

- Remove inline edit functionality (the `editingId` / `editText` / `handleStartEdit` / `handleCancelEdit` / `handleSave` state and handlers).
- Gallery cards become clickable: clicking anywhere on the card (image, text, network badge) navigates to `/projects/:projectId/posts/:postId/edit`. Wrap the card body in a `<Link>` or use `useNavigate` on `onClick`.
- Remove the "Editar" button (redundant — the card itself navigates to edit).
- "Eliminar" button stays as the only action in the card footer; call `e.stopPropagation()` so it does not trigger card navigation.
- Remove the `editingId`, `editText`, and `saving` state (no longer needed in Gallery).

## Frontend — Generator (`Generator.tsx`)

### Edit mode detection

- Read `postId` from `useParams()` (optional — present only on the edit route).
- `const isEditMode = Boolean(postId)`.

### Data loading

On mount when `isEditMode`:
1. Fetch `GET /projects/:projectId/posts/:postId` → `Post`.
2. Set `network = post.socialMedia`.
3. Set `description = post.generationPrompt`.
4. Set `tone = 'casual'` (tone is not persisted).
5. Build a synthetic `GenerationResult`:
   ```ts
   {
     imageUrl: post.imageUrl,
     networks: {
       instagram: { copy: '', hashtags: [] },
       x: { copy: '', hashtags: [] },
       linkedin: { copy: '', hashtags: [] },
       facebook: { copy: '', hashtags: [] },
       [post.socialMedia]: { copy: post.text, hashtags: [] },
     }
   }
   ```
   This pre-shows the existing image and copy in the result panel without requiring a generate call.

### UI changes in edit mode

- Page header title: "Editar post" (instead of "Generador de post").
- Sub-heading: "Regenerá copy o imagen y guardá los cambios."
- Back link: "Volver a galería" (same target, same style).
- "Guardar" button label: "Guardar cambios" (instead of "Guardar post de X").

### Save behavior

```
PATCH /projects/:projectId/posts/:postId
body: { text: fullText, imageUrl: result.imageUrl, generationPrompt: description }
```

Where `fullText` = `copy + "\n\n" + hashtags.join(' ')` (same logic as save in new mode).  
On success: navigate to `/projects/:projectId/gallery`.

All regeneration actions (regenerar copy, regenerar imagen, adjust bar) work identically in both modes.

## Backend — `posts.schemas.ts`

Extend `updatePostSchema`:

```ts
// Before
export const updatePostSchema = z.object({ text: z.string().min(1) });

// After
export const updatePostSchema = z.object({
  text: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
  generationPrompt: z.string().optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'At least one field required' });
```

## Backend — `posts.service.ts`

Rename `updatePostText` → `updatePost`, accept partial fields:

```ts
updatePost: async (id, projectId, ownerId, data: { text?: string; imageUrl?: string; generationPrompt?: string }) => {
  const post = await postsRepository.findByIdForProject(id, projectId, ownerId);
  if (!post) return undefined;
  return postsRepository.update(id, projectId, data);
}
```

`postsRepository.update` already accepts a partial object — no repository changes needed.

## Backend — `posts.controller.ts`

Change `postsService.updatePostText(...)` → `postsService.updatePost(...)` passing `result.data` directly.

## API Client — `frontend/src/lib/api.ts`

Update `postsApi.update` signature:

```ts
update: (projectId, postId, input: { text?: string; imageUrl?: string; generationPrompt?: string }, getToken) => ...
```

Add `postsApi.getById`:

```ts
getById: (projectId, postId, getToken) =>
  request<Post>(`/projects/${projectId}/posts/${postId}`, getToken),
```

## Data constraints

- `tone` is not stored — defaults to `'casual'` when entering edit mode. The user can change it before regenerating.
- Other network variants (not matching `post.socialMedia`) start empty. Switching networks shows an empty result panel until the user regenerates.
- No DB migrations required: `imageUrl` and `generationPrompt` columns already exist.

## Out of scope

- Storing `tone` on the post.
- Persisting all 4 network variants.
- Conflict detection (concurrent edits).
