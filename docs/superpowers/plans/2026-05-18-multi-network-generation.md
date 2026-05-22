# Multi-Network Generation + Social Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate copy for all 4 social networks in one AI call, allow switching between them in the Generator, and display native-style social network previews matching the prototype.

**Architecture:** The backend `/generate` endpoint now returns an ephemeral `GenerationResult` (not stored) with network-specific copy+hashtags and one shared image. A new `/save` endpoint creates an already-approved Post from the selected network variant. The frontend Generator holds the `GenerationResult` in local state, drives the preview through the active network tab, and calls `/save` when the user confirms.

**Tech Stack:** Hono (backend), Drizzle ORM, Zod, Vitest + supertest (e2e tests), React 19 + Vite, TypeScript

---

## File Map

| File | Change |
|---|---|
| `backend/src/modules/posts/ai.ts` | Replace `generatePostText` → `generateAllCopies`; keep `generatePostImage` |
| `backend/src/modules/posts/posts.schemas.ts` | Remove `socialMedia` from `generatePostSchema`; add `savePostSchema`, `NetworkVariant`, `GenerationResult` |
| `backend/src/modules/posts/posts.service.ts` | Replace `generatePost` → `generatePostVariants`; add `savePost` |
| `backend/src/modules/posts/posts.controller.ts` | Change `/generate` to return `GenerationResult` (200); add `POST /save` → 201 Post |
| `backend/test/posts.e2e.test.ts` | Update mock AI, update existing generate tests, add save tests |
| `frontend/src/lib/api.ts` | Add `NetworkVariant`, `GenerationResult` types; update `postsApi.generate`; add `postsApi.save` |
| `frontend/src/components/Icons.tsx` | Add: Heart, Comment, Send, Bookmark, Repost, Share, More, Globe, ThumbsUp |
| `frontend/src/components/SocialPreview.tsx` | New component — 4 network previews |
| `frontend/src/components/SocialPreview.css` | New file — styles ported from `prototype/styles.css` lines 936–1021 |
| `frontend/src/pages/Generator.tsx` | Use `GenerationResult` state, network-switcher tabs, `SocialPreview`, call `postsApi.save` |
| `frontend/src/pages/Generator.css` | Remove old result-card styles; add result-toolbar, network-switcher tweaks |

---

## Task 1: Update e2e tests for new backend contract

**Files:**
- Modify: `backend/test/posts.e2e.test.ts`

- [ ] **Step 1: Update `createMockAiService` to match new `AiService` interface**

Replace the existing `createMockAiService` function (currently lines 12-15) with:

```typescript
const createMockAiService = (): AiService => ({
  generateAllCopies: async () => ({
    instagram: { copy: "Mock IG copy", hashtags: ["#ig", "#test"] },
    x: { copy: "Mock X copy", hashtags: ["#x"] },
    linkedin: { copy: "Mock LI copy", hashtags: ["#li", "#professional"] },
    facebook: { copy: "Mock FB copy", hashtags: ["#fb"] },
  }),
  generatePostImage: async () =>
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
});
```

- [ ] **Step 2: Update the `generate post` describe block to expect the new `GenerationResult` shape**

Replace the `describe("generate post", ...)` block entirely with:

```typescript
describe("generate post", () => {
  it("returns a GenerationResult with all 4 networks and imageUrl", async () => {
    const project = await createProject();

    const response = await request(server)
      .post(`/projects/${project.id}/posts/generate`)
      .set("Authorization", "Bearer test-token")
      .send({ description: "A cool new product launch" })
      .expect(200);

    expect(response.body).toMatchObject({
      imageUrl: expect.any(String),
      networks: {
        instagram: { copy: expect.any(String), hashtags: expect.any(Array) },
        x: { copy: expect.any(String), hashtags: expect.any(Array) },
        linkedin: { copy: expect.any(String), hashtags: expect.any(Array) },
        facebook: { copy: expect.any(String), hashtags: expect.any(Array) },
      },
    });
  });

  it("requires description", async () => {
    const project = await createProject();

    await request(server)
      .post(`/projects/${project.id}/posts/generate`)
      .set("Authorization", "Bearer test-token")
      .send({ description: "" })
      .expect(400);
  });

  it("accepts tone parameter", async () => {
    const project = await createProject();

    const response = await request(server)
      .post(`/projects/${project.id}/posts/generate`)
      .set("Authorization", "Bearer test-token")
      .send({ description: "Summer vibes", tone: "inspiracional" })
      .expect(200);

    expect(response.body.networks).toBeDefined();
  });

  it("returns 404 when project not found", async () => {
    await request(server)
      .post(`/projects/9999/posts/generate`)
      .set("Authorization", "Bearer test-token")
      .send({ description: "test" })
      .expect(404);
  });
});
```

- [ ] **Step 3: Add a `save post` describe block after the generate block**

```typescript
describe("save post", () => {
  it("creates an already-approved post from a network variant", async () => {
    const project = await createProject();

    const response = await request(server)
      .post(`/projects/${project.id}/posts/save`)
      .set("Authorization", "Bearer test-token")
      .send({
        socialMedia: "instagram",
        text: "Great caption here",
        hashtags: ["#one", "#two"],
        imageUrl: "data:image/png;base64,abc",
        generationPrompt: "A cool product",
      })
      .expect(201);

    expect(response.body).toMatchObject({
      projectId: project.id,
      socialMedia: "instagram",
      approved: true,
    });
    expect(response.body.text).toContain("Great caption here");
    expect(response.body.id).toBeGreaterThan(0);
  });

  it("requires socialMedia", async () => {
    const project = await createProject();

    await request(server)
      .post(`/projects/${project.id}/posts/save`)
      .set("Authorization", "Bearer test-token")
      .send({ text: "hi", hashtags: [], imageUrl: "http://example.com/img.png", generationPrompt: "test" })
      .expect(400);
  });

  it("requires text", async () => {
    const project = await createProject();

    await request(server)
      .post(`/projects/${project.id}/posts/save`)
      .set("Authorization", "Bearer test-token")
      .send({ socialMedia: "x", text: "", hashtags: [], imageUrl: "http://example.com/img.png", generationPrompt: "test" })
      .expect(400);
  });

  it("saved post appears in approved gallery", async () => {
    const project = await createProject();

    await request(server)
      .post(`/projects/${project.id}/posts/save`)
      .set("Authorization", "Bearer test-token")
      .send({
        socialMedia: "linkedin",
        text: "Professional post",
        hashtags: ["#work"],
        imageUrl: "data:image/png;base64,abc",
        generationPrompt: "work stuff",
      })
      .expect(201);

    const gallery = await request(server)
      .get(`/projects/${project.id}/posts`)
      .set("Authorization", "Bearer test-token")
      .expect(200);

    expect(gallery.body).toHaveLength(1);
    expect(gallery.body[0].approved).toBe(true);
  });

  it("requires auth", async () => {
    await request(server)
      .post(`/projects/1/posts/save`)
      .send({ socialMedia: "instagram", text: "hi", hashtags: [], imageUrl: "x", generationPrompt: "" })
      .expect(401);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail with current code**

```bash
pnpm --filter backend test:e2e -- --reporter=verbose
```

Expected: Several test failures — `generateAllCopies` not found, `/save` 404s, etc.

---

## Task 2: Update AI service

**Files:**
- Modify: `backend/src/modules/posts/ai.ts`

- [ ] **Step 1: Replace `generatePostText` with `generateAllCopies` in the `AiService` interface and implementation**

Replace the entire contents of `backend/src/modules/posts/ai.ts` with:

```typescript
export type NetworkVariant = { copy: string; hashtags: string[] };

export type AllNetworkCopies = {
  instagram: NetworkVariant;
  x: NetworkVariant;
  linkedin: NetworkVariant;
  facebook: NetworkVariant;
};

export type AiService = {
  generateAllCopies: (input: {
    projectName: string;
    projectDescription: string;
    primaryColor: string | null;
    userDescription: string;
    tone: "formal" | "casual" | "humoristico" | "inspiracional";
  }) => Promise<AllNetworkCopies>;

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

const toneHints: Record<"formal" | "casual" | "humoristico" | "inspiracional", string> = {
  formal: "profesional y directo",
  casual: "cercano y conversacional",
  humoristico: "ligero, con humor y chispa",
  inspiracional: "motivador y emotivo",
};

const FALLBACK_COPIES: AllNetworkCopies = {
  instagram: { copy: "", hashtags: [] },
  x: { copy: "", hashtags: [] },
  linkedin: { copy: "", hashtags: [] },
  facebook: { copy: "", hashtags: [] },
};

function parseAllNetworkCopies(raw: string): AllNetworkCopies {
  // Strip markdown code fences if the model wraps in ```json ... ```
  const stripped = raw.replace(/^```[a-z]*\n?/m, "").replace(/\n?```$/m, "").trim();

  // Find first { ... } block
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) return FALLBACK_COPIES;

  try {
    const parsed = JSON.parse(stripped.slice(start, end + 1)) as Record<string, unknown>;
    const networks: (keyof AllNetworkCopies)[] = ["instagram", "x", "linkedin", "facebook"];

    const result: AllNetworkCopies = { ...FALLBACK_COPIES };
    for (const net of networks) {
      const val = parsed[net];
      if (val && typeof val === "object" && "copy" in val) {
        result[net] = {
          copy: String((val as Record<string, unknown>).copy ?? ""),
          hashtags: Array.isArray((val as Record<string, unknown>).hashtags)
            ? ((val as Record<string, unknown>).hashtags as unknown[]).map(String)
            : [],
        };
      }
    }
    return result;
  } catch {
    return FALLBACK_COPIES;
  }
}

export const createAiService = (config: AiConfig): AiService => {
  return {
    generateAllCopies: async (input) => {
      if (!config.textBaseUrl || !config.textApiKey) {
        throw new Error(
          "AI text generation is not configured. Set AI_TEXT_BASE_URL and AI_TEXT_API_KEY.",
        );
      }

      const prompt = [
        `Sos un community manager experto generando contenido para "${input.projectName}".`,
        `Descripción del proyecto: "${input.projectDescription}"`,
        input.primaryColor ? `Color primario: ${input.primaryColor}` : null,
        `Brief: "${input.userDescription}"`,
        `Tono: ${toneHints[input.tone] ?? input.tone}`,
        "",
        "Generá copy para las 4 redes sociales. Respondé ÚNICAMENTE con JSON válido, sin explicaciones ni markdown:",
        `{`,
        `  "instagram": { "copy": "texto sin hashtags", "hashtags": ["#tag1", "#tag2"] },`,
        `  "x":         { "copy": "texto sin hashtags", "hashtags": ["#tag1"] },`,
        `  "linkedin":  { "copy": "texto sin hashtags", "hashtags": ["#tag1", "#tag2"] },`,
        `  "facebook":  { "copy": "texto sin hashtags", "hashtags": ["#tag1"] }`,
        `}`,
        "",
        "Reglas:",
        "- Instagram: hasta 1500 caracteres, hasta 8 hashtags, creativo con emojis",
        "- X: máximo 240 caracteres en total (copy + hashtags juntos), 2 hashtags",
        "- LinkedIn: hasta 1300 caracteres, hasta 4 hashtags, tono profesional",
        "- Facebook: hasta 400 caracteres, hasta 2 hashtags, conversacional",
        "- Los hashtags van en el array, NO dentro del copy",
      ]
        .filter(Boolean)
        .join("\n");

      const textRes = await fetch(`${config.textBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.textApiKey}`,
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          model: config.textModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          top_p: 0.7,
          max_tokens: 1024,
          stream: true,
        }),
      });

      if (!textRes.ok) {
        const body = await textRes.text();
        throw new Error(`Text generation failed (${textRes.status}): ${body}`);
      }

      let raw = "";
      const reader = textRes.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data) as {
              choices: { delta: { content?: string } }[];
            };
            raw += parsed.choices[0]?.delta?.content ?? "";
          } catch {
            // skip malformed SSE lines
          }
        }
      }

      return parseAllNetworkCopies(raw);
    },

    generatePostImage: async (input) => {
      if (!config.imageBaseUrl || !config.imageApiKey) {
        throw new Error(
          "AI image generation is not configured. Set AI_IMAGE_BASE_URL and AI_IMAGE_API_KEY.",
        );
      }

      const modelSlug = config.imageModel.toLowerCase().replace(/\./g, "-");
      const url = `${config.imageBaseUrl}/providers/blackforestlabs/v1/${modelSlug}?api-version=preview`;

      const prompt = [
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
          prompt,
          model: config.imageModel,
          width: 1024,
          height: 1024,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Image generation failed (${response.status}): ${body}`);
      }

      const data = (await response.json()) as {
        data?: { b64_json?: string; url?: string }[];
        images?: { b64_json?: string; url?: string }[];
      };

      const item = data.data?.[0] ?? data.images?.[0];

      if (item?.b64_json) {
        return `data:image/png;base64,${item.b64_json}`;
      }

      if (item?.url) {
        return item.url;
      }

      throw new Error("Image generation returned an empty response.");
    },
  };
};
```

---

## Task 3: Update schemas

**Files:**
- Modify: `backend/src/modules/posts/posts.schemas.ts`

- [ ] **Step 1: Replace the file contents**

```typescript
import { z } from "zod";

export const socialMediaEnum = z.enum(["instagram", "x", "facebook", "linkedin"]);

export const generatePostSchema = z.object({
  description: z.string().trim().min(1),
  tone: z.enum(["formal", "casual", "humoristico", "inspiracional"]).default("casual"),
});

export type GeneratePostInput = z.infer<typeof generatePostSchema>;

export const savePostSchema = z.object({
  socialMedia: socialMediaEnum,
  text: z.string().trim().min(1),
  hashtags: z.array(z.string()).default([]),
  imageUrl: z.string().min(1),
  generationPrompt: z.string().default(""),
});

export type SavePostInput = z.infer<typeof savePostSchema>;

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

export const updatePostSchema = z.object({
  text: z.string().trim().min(1),
});

export type UpdatePostInput = z.infer<typeof updatePostSchema>;
```

---

## Task 4: Update service

**Files:**
- Modify: `backend/src/modules/posts/posts.service.ts`

- [ ] **Step 1: Replace the file contents**

```typescript
import type { AllNetworkCopies, AiService } from "./ai.js";
import type { PostsRepository } from "./posts.repository.js";
import type { GeneratePostInput, SavePostInput } from "./posts.schemas.js";

export type GenerationResult = {
  imageUrl: string;
  networks: AllNetworkCopies;
};

export const createPostsService = (postsRepository: PostsRepository, ai: AiService) => ({
  findAllByProject: (projectId: number, ownerId: string, options?: { includeUnapproved?: boolean }) => {
    return postsRepository.findAllByProject(projectId, ownerId, options);
  },

  findByIdForProject: (id: number, projectId: number, ownerId: string) => {
    return postsRepository.findByIdForProject(id, projectId, ownerId);
  },

  generatePostVariants: async (
    project: { id: number; name: string; description: string; primaryColor: string | null },
    _ownerId: string,
    input: GeneratePostInput,
  ): Promise<GenerationResult> => {
    const [networks, imageUrl] = await Promise.all([
      ai.generateAllCopies({
        projectName: project.name,
        projectDescription: project.description,
        primaryColor: project.primaryColor,
        userDescription: input.description,
        tone: input.tone,
      }),
      ai.generatePostImage({
        projectName: project.name,
        userDescription: input.description,
      }),
    ]);

    return { imageUrl, networks };
  },

  savePost: async (
    project: { id: number; name: string },
    _ownerId: string,
    input: SavePostInput,
  ) => {
    const fullText = input.hashtags.length > 0
      ? `${input.text}\n\n${input.hashtags.join(" ")}`
      : input.text;

    const post = await postsRepository.create({
      projectId: project.id,
      imageUrl: input.imageUrl,
      text: fullText,
      socialMedia: input.socialMedia,
      generationPrompt: input.generationPrompt,
    });

    return postsRepository.update(post.id, project.id, { approved: true });
  },

  approvePost: async (id: number, projectId: number, ownerId: string) => {
    const post = await postsRepository.findByIdForProject(id, projectId, ownerId);
    if (!post) return undefined;
    return postsRepository.update(id, projectId, { approved: true });
  },

  updatePostText: async (id: number, projectId: number, ownerId: string, text: string) => {
    const post = await postsRepository.findByIdForProject(id, projectId, ownerId);
    if (!post) return undefined;
    return postsRepository.update(id, projectId, { text });
  },

  deletePost: async (id: number, projectId: number, ownerId: string) => {
    const post = await postsRepository.findByIdForProject(id, projectId, ownerId);
    if (!post) return false;
    return postsRepository.remove(id, projectId);
  },
});

export type PostsService = ReturnType<typeof createPostsService>;
```

---

## Task 5: Update controller

**Files:**
- Modify: `backend/src/modules/posts/posts.controller.ts`

- [ ] **Step 1: Replace the file contents**

```typescript
import { Hono } from "hono";
import type { Authenticator } from "../../auth/auth.js";
import type { ProjectsService } from "../projects/projects.service.js";
import {
  generatePostSchema,
  savePostSchema,
  postIdParamsSchema,
  postsQuerySchema,
  projectIdParamsSchema,
  updatePostSchema,
} from "./posts.schemas.js";
import type { PostsService } from "./posts.service.js";

export const createPostsController = (
  postsService: PostsService,
  projectsService: ProjectsService,
  authenticate: Authenticator,
) => {
  const controller = new Hono();

  controller.get("/:projectId/posts", async (c) => {
    const user = await authenticate(c);
    const params = projectIdParamsSchema.safeParse(c.req.param());
    if (!params.success) return c.json({ error: "Invalid project id", issues: params.error.issues }, 400);

    const query = postsQuerySchema.safeParse(c.req.query());
    if (!query.success) return c.json({ error: "Invalid query parameters", issues: query.error.issues }, 400);

    const posts = await postsService.findAllByProject(params.data.projectId, user.userId, {
      includeUnapproved: query.data.includeUnapproved,
    });
    return c.json(posts);
  });

  controller.get("/:projectId/posts/:id", async (c) => {
    const user = await authenticate(c);
    const params = postIdParamsSchema.safeParse(c.req.param());
    if (!params.success) return c.json({ error: "Invalid parameters", issues: params.error.issues }, 400);

    const post = await postsService.findByIdForProject(params.data.id, params.data.projectId, user.userId);
    if (!post) return c.json({ error: "Post not found" }, 404);

    return c.json(post);
  });

  controller.post("/:projectId/posts/generate", async (c) => {
    const user = await authenticate(c);
    const params = projectIdParamsSchema.safeParse(c.req.param());
    if (!params.success) return c.json({ error: "Invalid project id", issues: params.error.issues }, 400);

    const body = await c.req.json().catch(() => undefined);
    const result = generatePostSchema.safeParse(body);
    if (!result.success) return c.json({ error: "Invalid request body", issues: result.error.issues }, 400);

    const project = await projectsService.findByIdForOwner(params.data.projectId, user.userId);
    if (!project) return c.json({ error: "Project not found" }, 404);

    const generation = await postsService.generatePostVariants(
      { id: project.id, name: project.name, description: project.description, primaryColor: project.primaryColor },
      user.userId,
      result.data,
    );
    return c.json(generation, 200);
  });

  controller.post("/:projectId/posts/save", async (c) => {
    const user = await authenticate(c);
    const params = projectIdParamsSchema.safeParse(c.req.param());
    if (!params.success) return c.json({ error: "Invalid project id", issues: params.error.issues }, 400);

    const body = await c.req.json().catch(() => undefined);
    const result = savePostSchema.safeParse(body);
    if (!result.success) return c.json({ error: "Invalid request body", issues: result.error.issues }, 400);

    const project = await projectsService.findByIdForOwner(params.data.projectId, user.userId);
    if (!project) return c.json({ error: "Project not found" }, 404);

    const post = await postsService.savePost(
      { id: project.id, name: project.name },
      user.userId,
      result.data,
    );
    return c.json(post, 201);
  });

  controller.patch("/:projectId/posts/:id/approve", async (c) => {
    const user = await authenticate(c);
    const params = postIdParamsSchema.safeParse(c.req.param());
    if (!params.success) return c.json({ error: "Invalid parameters", issues: params.error.issues }, 400);

    const post = await postsService.approvePost(params.data.id, params.data.projectId, user.userId);
    if (!post) return c.json({ error: "Post not found" }, 404);

    return c.json(post);
  });

  // NOTE: register all sub-resource PATCH routes (e.g. /:id/approve) before this catch-all.
  controller.patch("/:projectId/posts/:id", async (c) => {
    const user = await authenticate(c);
    const params = postIdParamsSchema.safeParse(c.req.param());
    if (!params.success) return c.json({ error: "Invalid parameters", issues: params.error.issues }, 400);

    const body = await c.req.json().catch(() => undefined);
    const result = updatePostSchema.safeParse(body);
    if (!result.success) return c.json({ error: "Invalid request body", issues: result.error.issues }, 400);

    const post = await postsService.updatePostText(params.data.id, params.data.projectId, user.userId, result.data.text);
    if (!post) return c.json({ error: "Post not found" }, 404);

    return c.json(post);
  });

  controller.delete("/:projectId/posts/:id", async (c) => {
    const user = await authenticate(c);
    const params = postIdParamsSchema.safeParse(c.req.param());
    if (!params.success) return c.json({ error: "Invalid parameters", issues: params.error.issues }, 400);

    const deleted = await postsService.deletePost(params.data.id, params.data.projectId, user.userId);
    if (!deleted) return c.json({ error: "Post not found" }, 404);

    return c.body(null, 204);
  });

  return controller;
};
```

---

## Task 6: Run backend tests and commit

**Files:** none new

- [ ] **Step 1: Run lint (type check)**

```bash
pnpm --filter backend lint
```

Expected: no errors.

- [ ] **Step 2: Run e2e tests**

```bash
pnpm --filter backend test:e2e -- --reporter=verbose
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/posts/ai.ts backend/src/modules/posts/posts.schemas.ts backend/src/modules/posts/posts.service.ts backend/src/modules/posts/posts.controller.ts backend/test/posts.e2e.test.ts
git commit -m "feat(api): generate all 4 network copies in one call; add /save endpoint"
```

---

## Task 7: Update frontend API client

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add `NetworkVariant` and `GenerationResult` types; update `postsApi.generate`; add `postsApi.save`**

Replace the `postsApi` section (lines 82–107) and add the new types above it:

```typescript
export type NetworkVariant = {
  copy: string;
  hashtags: string[];
};

export type GenerationResult = {
  imageUrl: string;
  networks: {
    instagram: NetworkVariant;
    x: NetworkVariant;
    linkedin: NetworkVariant;
    facebook: NetworkVariant;
  };
};

export type GeneratePostInput = {
  description: string;
  tone: 'formal' | 'casual' | 'humoristico' | 'inspiracional';
};

export type SavePostInput = {
  socialMedia: 'instagram' | 'x' | 'facebook' | 'linkedin';
  text: string;
  hashtags: string[];
  imageUrl: string;
  generationPrompt: string;
};

export const postsApi = {
  list: (projectId: number, getToken: () => Promise<string | null>, options?: { includeUnapproved?: boolean }) =>
    request<Post[]>(`/projects/${projectId}/posts${options?.includeUnapproved ? '?includeUnapproved=true' : ''}`, getToken),

  generate: (projectId: number, input: GeneratePostInput, getToken: () => Promise<string | null>) =>
    request<GenerationResult>(`/projects/${projectId}/posts/generate`, getToken, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  save: (projectId: number, input: SavePostInput, getToken: () => Promise<string | null>) =>
    request<Post>(`/projects/${projectId}/posts/save`, getToken, {
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

Also remove the old `GeneratePostInput` type that was defined before `postsApi` (the one with `socialMedia`).

- [ ] **Step 2: Type-check**

```bash
pnpm --filter frontend build
```

Expected: build succeeds (or only Generator.tsx errors since it still uses the old types — those will be fixed in Task 10).

---

## Task 8: Add social action icons

**Files:**
- Modify: `frontend/src/components/Icons.tsx`

- [ ] **Step 1: Append the following icons to the existing file**

```typescript
export const Heart = (p: IconProps) => (
  <Icon {...p} viewBox="0 0 24 24" width={p.size ?? 22} height={p.size ?? 22}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </Icon>
);

export const Comment = (p: IconProps) => (
  <Icon {...p} viewBox="0 0 24 24" width={p.size ?? 22} height={p.size ?? 22}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Icon>
);

export const PaperSend = (p: IconProps) => (
  <Icon {...p} viewBox="0 0 24 24" width={p.size ?? 22} height={p.size ?? 22}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </Icon>
);

export const Bookmark = (p: IconProps) => (
  <Icon {...p} viewBox="0 0 24 24" width={p.size ?? 22} height={p.size ?? 22}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </Icon>
);

export const Repost = (p: IconProps) => (
  <Icon {...p} viewBox="0 0 24 24" width={p.size ?? 18} height={p.size ?? 18}>
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </Icon>
);

export const ShareIcon = (p: IconProps) => (
  <Icon {...p} viewBox="0 0 24 24" width={p.size ?? 18} height={p.size ?? 18}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </Icon>
);

export const MoreHoriz = (p: IconProps) => (
  <Icon {...p} viewBox="0 0 24 24" width={p.size ?? 18} height={p.size ?? 18}>
    <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </Icon>
);

export const Globe = (p: IconProps) => (
  <Icon {...p} viewBox="0 0 24 24" width={p.size ?? 14} height={p.size ?? 14}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </Icon>
);

export const ThumbsUp = (p: IconProps) => (
  <Icon {...p} viewBox="0 0 24 24" width={p.size ?? 18} height={p.size ?? 18}>
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </Icon>
);
```

---

## Task 9: Create SocialPreview component

**Files:**
- Create: `frontend/src/components/SocialPreview.tsx`
- Create: `frontend/src/components/SocialPreview.css`

- [ ] **Step 1: Create `SocialPreview.css`**

```css
/* ============ Social Preview Cards ============ */
.preview-frame {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  width: 100%;
}

/* Instagram */
.ig {
  background: #fff;
  color: #262626;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
}
.ig-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid #efefef;
}
.ig-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, oklch(0.78 0.07 60), oklch(0.68 0.1 30));
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}
.ig-handle { font-size: 13px; font-weight: 600; }
.ig-sub { font-size: 11px; color: #8e8e8e; }
.ig-more { margin-left: auto; color: #262626; display: flex; }
.ig-img { aspect-ratio: 1; background: var(--surface-2); overflow: hidden; }
.ig-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ig-actions { display: flex; gap: 14px; padding: 8px 14px 6px; align-items: center; }
.ig-actions svg { stroke: #262626; }
.ig-actions .ig-bookmark { margin-left: auto; display: flex; }
.ig-likes { font-size: 13px; font-weight: 600; padding: 2px 14px; }
.ig-caption {
  font-size: 13px;
  padding: 4px 14px 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}
.ig-caption .sp-handle { font-weight: 600; margin-right: 6px; }
.ig-caption .sp-tag { color: #00376b; }

/* X / Twitter */
.tw {
  background: #fff;
  color: #0f1419;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  padding: 14px 16px;
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 12px;
}
.tw-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: oklch(0.7 0.05 60);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}
.tw-head { display: flex; align-items: center; gap: 4px; font-size: 14px; flex-wrap: wrap; }
.tw-name { font-weight: 700; }
.tw-handle { color: #536471; }
.tw-text { font-size: 15px; line-height: 1.35; margin-top: 4px; white-space: pre-wrap; word-break: break-word; }
.tw-text .sp-tag { color: #1d9bf0; }
.tw-img {
  margin-top: 12px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #eff3f4;
  aspect-ratio: 16/9;
  background: var(--surface-2);
}
.tw-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tw-actions {
  display: flex;
  gap: 24px;
  margin-top: 12px;
  color: #536471;
  font-size: 13px;
  align-items: center;
}
.tw-actions .tw-action { display: flex; align-items: center; gap: 6px; }
.tw-actions svg { stroke: currentColor; }

/* LinkedIn */
.li {
  background: #fff;
  color: rgba(0, 0, 0, 0.9);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
}
.li-head { display: flex; gap: 10px; padding: 14px 16px 8px; align-items: center; }
.li-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: oklch(0.55 0.08 240);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 600;
  flex-shrink: 0;
}
.li-name { font-size: 14px; font-weight: 600; }
.li-headline { font-size: 12px; color: rgba(0, 0, 0, 0.6); line-height: 1.3; }
.li-time { font-size: 11px; color: rgba(0, 0, 0, 0.6); margin-top: 2px; display: flex; align-items: center; gap: 4px; }
.li-more { margin-left: auto; color: rgba(0, 0, 0, 0.6); display: flex; }
.li-text {
  font-size: 14px;
  line-height: 1.45;
  padding: 0 16px 12px;
  white-space: pre-wrap;
  word-break: break-word;
}
.li-text .sp-tag { color: #0a66c2; font-weight: 500; }
.li-img { aspect-ratio: 1.91/1; background: var(--surface-2); overflow: hidden; border-top: 1px solid #e9e9e9; }
.li-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.li-actions { display: flex; padding: 4px 8px; border-top: 1px solid #e9e9e9; }
.li-actions button {
  flex: 1;
  background: transparent;
  border: none;
  padding: 10px;
  color: rgba(0, 0, 0, 0.6);
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: default;
}
.li-actions svg { stroke: currentColor; }

/* Facebook */
.fb {
  background: #fff;
  color: #050505;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
}
.fb-head { display: flex; gap: 10px; padding: 12px 16px 8px; align-items: center; }
.fb-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: oklch(0.6 0.15 250);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 600;
  flex-shrink: 0;
}
.fb-name { font-size: 14px; font-weight: 600; }
.fb-time { font-size: 11px; color: #65676b; display: flex; align-items: center; gap: 3px; }
.fb-more { margin-left: auto; color: #65676b; display: flex; }
.fb-text {
  font-size: 14px;
  line-height: 1.45;
  padding: 0 16px 12px;
  white-space: pre-wrap;
  word-break: break-word;
}
.fb-text .sp-tag { color: #1877f2; }
.fb-img { aspect-ratio: 1.91/1; background: var(--surface-2); overflow: hidden; }
.fb-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fb-stats {
  display: flex;
  padding: 10px 16px 6px;
  font-size: 12px;
  color: #65676b;
  align-items: center;
  gap: 6px;
}
.fb-stats-right { margin-left: auto; }
.fb-actions { display: flex; padding: 4px 8px; border-top: 1px solid #ced0d4; }
.fb-actions button {
  flex: 1;
  background: transparent;
  border: none;
  padding: 8px;
  color: #65676b;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: default;
}
.fb-actions svg { stroke: currentColor; }
```

- [ ] **Step 2: Create `SocialPreview.tsx`**

```typescript
import './SocialPreview.css';
import {
  Heart, Comment, PaperSend, Bookmark,
  Repost, ShareIcon, MoreHoriz, Globe, ThumbsUp,
} from './Icons';

type Network = 'instagram' | 'x' | 'linkedin' | 'facebook';

type SocialPreviewProps = {
  network: Network;
  copy: string;
  hashtags: string[];
  imageUrl: string | null;
  projectName: string;
};

function renderTaggedText(copy: string, hashtags: string[]) {
  const fullText = hashtags.length > 0 ? `${copy}\n\n${hashtags.join(' ')}` : copy;
  const parts = fullText.split(/(#[\wáéíóúñÁÉÍÓÚÑ]+)/g);
  return parts.map((part, i) =>
    part.startsWith('#')
      ? <span key={i} className="sp-tag">{part}</span>
      : <span key={i}>{part}</span>
  );
}

function getHandle(projectName: string) {
  return projectName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '').slice(0, 18) || 'tumarca';
}

function getInitials(projectName: string) {
  return projectName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'TM';
}

export default function SocialPreview({ network, copy, hashtags, imageUrl, projectName }: SocialPreviewProps) {
  const handle = getHandle(projectName);
  const initials = getInitials(projectName);

  if (network === 'instagram') {
    return (
      <div className="preview-frame">
        <div className="ig">
          <div className="ig-head">
            <div className="ig-avatar">{initials}</div>
            <div>
              <div className="ig-handle">{handle}</div>
              <div className="ig-sub">Patrocinado · Buenos Aires</div>
            </div>
            <div className="ig-more"><MoreHoriz size={16} /></div>
          </div>
          <div className="ig-img">
            {imageUrl && <img src={imageUrl} alt="" />}
          </div>
          <div className="ig-actions">
            <Heart size={22} />
            <Comment size={22} />
            <PaperSend size={22} />
            <div className="ig-bookmark"><Bookmark size={22} /></div>
          </div>
          <div className="ig-likes">2.847 Me gusta</div>
          <div className="ig-caption">
            <span className="sp-handle">{handle}</span>
            {renderTaggedText(copy, hashtags)}
          </div>
        </div>
      </div>
    );
  }

  if (network === 'x') {
    return (
      <div className="preview-frame">
        <div className="tw">
          <div className="tw-avatar">{initials}</div>
          <div>
            <div className="tw-head">
              <span className="tw-name">{projectName}</span>
              <span className="tw-handle">@{handle} · 2h</span>
            </div>
            <div className="tw-text">{renderTaggedText(copy, hashtags)}</div>
            {imageUrl && (
              <div className="tw-img"><img src={imageUrl} alt="" /></div>
            )}
            <div className="tw-actions">
              <span className="tw-action"><Comment size={16} /> 24</span>
              <span className="tw-action"><Repost size={16} /> 89</span>
              <span className="tw-action"><Heart size={16} /> 412</span>
              <span className="tw-action"><ShareIcon size={16} /></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (network === 'linkedin') {
    return (
      <div className="preview-frame">
        <div className="li">
          <div className="li-head">
            <div className="li-avatar">{initials}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="li-name">{projectName}</div>
              <div className="li-headline">Empresa · Software de marketing · 12.4K seguidores</div>
              <div className="li-time">
                Hace 3 h · <Globe size={11} />
              </div>
            </div>
            <div className="li-more"><MoreHoriz size={18} /></div>
          </div>
          <div className="li-text">{renderTaggedText(copy, hashtags)}</div>
          {imageUrl && (
            <div className="li-img"><img src={imageUrl} alt="" /></div>
          )}
          <div className="li-actions">
            <button><ThumbsUp size={18} /> Recomendar</button>
            <button><Comment size={18} /> Comentar</button>
            <button><Repost size={18} /> Compartir</button>
            <button><PaperSend size={18} /> Enviar</button>
          </div>
        </div>
      </div>
    );
  }

  if (network === 'facebook') {
    return (
      <div className="preview-frame">
        <div className="fb">
          <div className="fb-head">
            <div className="fb-avatar">{initials}</div>
            <div style={{ flex: 1 }}>
              <div className="fb-name">{projectName}</div>
              <div className="fb-time">
                3 h · <Globe size={11} />
              </div>
            </div>
            <div className="fb-more"><MoreHoriz size={18} /></div>
          </div>
          <div className="fb-text">{renderTaggedText(copy, hashtags)}</div>
          {imageUrl && (
            <div className="fb-img"><img src={imageUrl} alt="" /></div>
          )}
          <div className="fb-stats">
            <span>👍 ❤️</span>
            <span>1.2K</span>
            <span className="fb-stats-right">84 comentarios · 31 veces compartido</span>
          </div>
          <div className="fb-actions">
            <button><ThumbsUp size={18} /> Me gusta</button>
            <button><Comment size={18} /> Comentar</button>
            <button><ShareIcon size={18} /> Compartir</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
```

---

## Task 10: Update Generator page

**Files:**
- Modify: `frontend/src/pages/Generator.tsx`
- Modify: `frontend/src/pages/Generator.css`

- [ ] **Step 1: Replace `Generator.tsx` entirely**

```typescript
import { useAuth } from '@clerk/react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { postsApi, type GenerationResult } from '../lib/api';
import SocialPreview from '../components/SocialPreview';
import { Sparkle } from '../components/Icons';
import './Generator.css';

type Network = 'instagram' | 'x' | 'linkedin' | 'facebook';
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

export default function Generator() {
  const { projectId } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const numericId = Number(projectId);

  const [network, setNetwork] = useState<Network>('instagram');
  const [tone, setTone] = useState<Tone>('casual');
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeNetwork = NETWORKS.find((n) => n.id === network)!;

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setGenerating(true);
    setError('');
    setResult(null);
    try {
      const data = await postsApi.generate(numericId, { description, tone }, getToken);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar.');
    } finally {
      setGenerating(false);
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

  const activeVariant = result?.networks[network];

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
              disabled={generating || !description.trim()}
            >
              <Sparkle size={14} />
              {generating ? 'Generando…' : result ? 'Regenerar' : 'Generar'}
            </button>
          </div>
        </aside>

        <section className="result-panel">
          {generating ? (
            <div className="result-generating">
              <span>Generando copy para las 4 redes + imagen…</span>
            </div>
          ) : result ? (
            <div className="result-with-preview">
              <div className="result-save-bar">
                <span className="result-save-label">
                  Mostrando: <strong>{activeNetwork.label}</strong>
                </span>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Guardando…' : `Guardar post de ${activeNetwork.label}`}
                </button>
              </div>
              {activeVariant && (
                <SocialPreview
                  network={network}
                  copy={activeVariant.copy}
                  hashtags={activeVariant.hashtags}
                  imageUrl={result.imageUrl}
                  projectName="Tu marca"
                />
              )}
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

- [ ] **Step 2: Update `Generator.css` — add `result-with-preview` and `result-save-bar`**

Add these rules at the end of `frontend/src/pages/Generator.css`:

```css
.result-with-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-save-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0 4px;
  gap: 12px;
}

.result-save-label {
  font-size: 13px;
  color: var(--fg-soft);
}
```

Also remove the `.result-card`, `.result-card-body`, `.result-network`, `.result-text`, `.result-actions` rules if they exist (they're replaced by `SocialPreview`).

- [ ] **Step 3: Run the frontend dev server and verify the full flow**

```bash
pnpm --filter frontend dev
```

Open [http://localhost:5173](http://localhost:5173), log in, open a project → Generator:

1. Enter a brief description, select a tone, click **Generar**
2. Verify a loading state appears ("Generando copy para las 4 redes + imagen…")
3. After result: verify the social preview renders for the selected network
4. Switch network tabs (Instagram → X → LinkedIn → Facebook) — verify copy and layout change per network
5. Click **Guardar post de [network]** — verify redirect to gallery
6. In gallery, verify the saved post appears with the correct network

- [ ] **Step 4: Run lint**

```bash
pnpm --filter frontend lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/components/Icons.tsx frontend/src/components/SocialPreview.tsx frontend/src/components/SocialPreview.css frontend/src/pages/Generator.tsx frontend/src/pages/Generator.css
git commit -m "feat(generator): multi-network generation with native-style social previews"
```
