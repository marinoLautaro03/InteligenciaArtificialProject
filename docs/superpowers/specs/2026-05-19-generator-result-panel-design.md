# Generator Result Panel — Design Spec

**Date:** 2026-05-19  
**Branch:** generador-posts-tweaks  
**Status:** Approved

## Summary

Enhance the Generator page's result panel to match the prototype design: Preview/Raw tabs, granular regeneration controls (copy-only, image-only), hashtag chips, character count with length bar, clipboard copy, and an always-visible `/ajustar` natural-language tweak bar.

---

## Backend Changes

### New endpoints

Both endpoints accept the same auth and project-ownership checks as `/generate`.

#### `POST /projects/:projectId/posts/generate-copy`

Generates new copy for all four networks. Does not touch the image.

Request body (same shape as `/generate`):
```json
{ "description": "string", "tone": "formal|casual|humoristico|inspiracional" }
```

Response:
```json
{
  "networks": {
    "instagram": { "copy": "string", "hashtags": ["string"] },
    "x":         { "copy": "string", "hashtags": ["string"] },
    "linkedin":  { "copy": "string", "hashtags": ["string"] },
    "facebook":  { "copy": "string", "hashtags": ["string"] }
  }
}
```

#### `POST /projects/:projectId/posts/generate-image`

Generates a new image. Does not touch copy.

Request body:
```json
{ "description": "string" }
```

Response:
```json
{ "imageUrl": "string" }
```

### Service layer

`generateCopies(project, ownerId, input)` — calls `ai.generateAllCopies(...)` only.  
`generateImage(project, ownerId, input)` — calls `ai.generatePostImage(...)` only.

---

## Frontend Changes

### New state in `Generator.tsx`

| State | Type | Purpose |
|---|---|---|
| `view` | `'preview' \| 'raw'` | Active tab |
| `generatingStage` | `'copy' \| 'image' \| 'both' \| null` | Which part is loading |
| `adjustText` | `string` | Text in the /ajustar input |

`result` stays as `GenerationResult | null`. Partial regenerations mutate only the relevant slice:
- Regenerar copy → updates `result.networks`
- Regenerar imagen → updates `result.imageUrl`
- Regenerar todo + Aplicar → replaces full `result`

### Result panel layout

```
┌─ result-toolbar ─────────────────────────────────────────┐
│  ● Listo     [Preview | Raw]          [↻ Regenerar todo]  │
└──────────────────────────────────────────────────────────┘

── Preview tab ──────────────────────────────────────────────
  <SocialPreview> (unchanged)

── Raw tab ──────────────────────────────────────────────────
  ┌─ COPY card (left) ──────────┐  ┌─ IMAGEN card (right) ─┐
  │ COPY            187/63206   │  │ IMAGEN       1.91:1   │
  │                             │  │                       │
  │ [copy text — read-only]     │  │ [imagen]              │
  │                             │  │                       │
  │ #hábitos  #bienestar        │  │ [↻ Regenerar imagen]  │
  │ ▓▓▓▓▒▒▒░░ length bar        │  └───────────────────────┘
  │ 2 tags · 32 palabras        │
  │ [↻ Regenerar copy] [□ Copiar]
  └─────────────────────────────┘

── always visible (when result exists) ──────────────────────
  /ajustar [input ........................] [↗ Aplicar] [×]
```

### Component details

**Toolbar (`result-toolbar`)**
- Status dot: grey when idle, animated when generating
- Label: "Listo" / "Generando copy…" / "Generando imagen…" / "Generando copy + imagen…"
- Segmented control: Preview | Raw (`.seg` class from prototype CSS)
- "Regenerar todo" button (right-aligned, ghost style): calls `/generate` with original `description` + `tone`

**Preview tab**
- Renders `<SocialPreview>` exactly as today.

**Raw tab — COPY card**
- Header: "COPY" label (left) + `{charCount} / {maxChars}` (right, monospace). `charCount` = copy text chars + 2 (newlines) + all hashtag chars + spaces between them, matching how the post is actually stored.
- Body: read-only `<pre>` or `<div>` showing the copy for the **currently selected network**.
- Hashtag chips: each hashtag rendered as `<span class="chip">`. Displayed below the copy text.
- Length bar: a `<div class="length-bar">` with an inner span width = `min(100%, charCount/maxChars * 100%)`. Turns warning color (amber) above `softLimit`, danger color (red) above `maxChars`.
- Footer meta: `{tags.length} tags · {wordCount} palabras`
- Actions row: `[↻ Regenerar copy]` + `[□ Copiar]`
  - Regenerar copy: calls `/generate-copy`, shows skeleton over COPY card body during load
  - Copiar: `navigator.clipboard.writeText(copy + "\n\n" + hashtags.join(" "))` — includes hashtags, formats for the selected network

**Raw tab — IMAGEN card**
- Header: "IMAGEN" label (left) + aspect ratio string (right, monospace)
- Body: renders the image (same as current `<SocialPreview>` image area)
- Actions row: `[↻ Regenerar imagen]`
  - Calls `/generate-image` with `description`, shows skeleton over image during load

**Adjust bar (`.adjust-bar`)**
- Visible whenever `result !== null`
- `/ajustar` prefix label (styled as a monospace chip)
- `<input>` with placeholder "ej: hacé el copy más corto, agregá 2 emojis sutiles, imagen más cálida…"
- "Aplicar" button: calls `/generate` with `description + "\n\n" + adjustText` as the description, then clears `adjustText`
- "×" button: clears `adjustText` only (bar stays visible)

### Loading states

During `generatingStage === 'copy'`: skeleton overlay on COPY card body  
During `generatingStage === 'image'`: skeleton overlay on IMAGEN card  
During `generatingStage === 'both'`: skeleton on both  
All regeneration buttons are disabled while any stage is loading.

### API additions in `frontend/src/lib/api.ts`

```ts
export type GenerateCopyResult = {
  networks: GenerationResult['networks'];
};

export type GenerateImageResult = {
  imageUrl: string;
};
```

Two new methods on `postsApi`:
- `generateCopy(projectId, input, getToken) → GenerateCopyResult`
- `generateImage(projectId, input, getToken) → GenerateImageResult`

---

## Files to change

| File | Change |
|---|---|
| `backend/src/modules/posts/posts.service.ts` | Add `generateCopies` and `generateImage` methods |
| `backend/src/modules/posts/posts.controller.ts` | Add two new POST routes |
| `backend/src/modules/posts/posts.schemas.ts` | Add `generateImageSchema` (description-only) |
| `frontend/src/lib/api.ts` | Add two new API methods + types |
| `frontend/src/pages/Generator.tsx` | Main state + render changes |
| `frontend/src/pages/Generator.css` | New styles for toolbar, cards, chips, length bar, adjust bar |

---

## Out of scope

- Editing copy inline (read-only view only)
- Per-network image variants
- Saving directly from Raw tab (save button stays in brief panel)
