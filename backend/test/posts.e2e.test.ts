import { createAdaptorServer } from "@hono/node-server";
import { HTTPException } from "hono/http-exception";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import type { Authenticator } from "../src/auth/auth.js";
import { createApp } from "../src/app.js";
import type { AiService } from "../src/modules/posts/ai.js";
import type { HealthRepository } from "../src/modules/health/health.repository.js";
import type { Post, PostsRepository } from "../src/modules/posts/posts.repository.js";
import type { Project, ProjectsRepository } from "../src/modules/projects/projects.repository.js";

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

const createInMemoryHealthRepository = (): HealthRepository => ({
  getStatus: async () => ({
    status: "ok",
    uptime: 1,
    checkedAt: "2026-01-01T00:00:00.000Z",
  }),
});

const createInMemoryProjectsRepository = (): ProjectsRepository => {
  const records: Project[] = [];
  let nextId = 1;

  return {
    findAllByOwner: async (ownerId) => records.filter((project) => project.ownerId === ownerId),
    findByIdForOwner: async (id, ownerId) =>
      records.find((project) => project.id === id && project.ownerId === ownerId),
    create: async (input) => {
      const now = new Date("2026-01-01T00:00:00.000Z");
      const project: Project = {
        id: nextId,
        name: input.name,
        description: input.description,
        status: "active",
        ownerId: input.ownerId,
        logoUrl: input.logoUrl ?? null,
        primaryColor: input.primaryColor ?? null,
        createdAt: now,
        updatedAt: now,
      };

      nextId += 1;
      records.push(project);

      return project;
    },
    updateForOwner: async (id, ownerId, input) => {
      const project = records.find((record) => record.id === id && record.ownerId === ownerId);

      if (!project) {
        return undefined;
      }

      Object.assign(project, input, {
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      });

      return project;
    },
    deleteForOwner: async (id, ownerId) => {
      const index = records.findIndex((project) => project.id === id && project.ownerId === ownerId);

      if (index === -1) {
        return false;
      }

      records.splice(index, 1);
      return true;
    },
  };
};

const createInMemoryPostsRepository = (): PostsRepository => {
  const records: Post[] = [];
  let nextId = 1;

  return {
    findAllByProject: async (projectId, ownerId, options) => {
      return records.filter((post) => {
        if (post.projectId !== projectId) return false;
        if (!options?.includeUnapproved && !post.approved) return false;
        return true;
      });
    },
    findByIdForProject: async (id, projectId, ownerId) => {
      return records.find((post) => post.id === id && post.projectId === projectId);
    },
    create: async (input) => {
      const now = new Date("2026-01-01T00:00:00.000Z");
      const post: Post = {
        id: nextId,
        projectId: input.projectId,
        imageUrl: input.imageUrl,
        text: input.text,
        socialMedia: input.socialMedia,
        approved: false,
        generationPrompt: input.generationPrompt,
        createdAt: now,
        updatedAt: now,
      };

      nextId += 1;
      records.push(post);

      return post;
    },
    update: async (id, projectId, data) => {
      const post = records.find((record) => record.id === id && record.projectId === projectId);

      if (!post) {
        return undefined;
      }

      Object.assign(post, data, {
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      });

      return post;
    },
    remove: async (id, projectId) => {
      const index = records.findIndex((record) => record.id === id && record.projectId === projectId);

      if (index === -1) {
        return false;
      }

      records.splice(index, 1);
      return true;
    },
  };
};

const createTestAuthenticator = (userId = "user_123"): Authenticator => {
  return async (context) => {
    if (context.req.header("Authorization") !== "Bearer test-token") {
      throw new HTTPException(401, {
        message: "Authentication required",
      });
    }

    return { userId };
  };
};

describe("posts module e2e", () => {
  let server: ReturnType<typeof createAdaptorServer>;

  beforeEach(() => {
    const app = createApp({
      authenticator: createTestAuthenticator(),
      aiService: createMockAiService(),
      healthRepository: createInMemoryHealthRepository(),
      postsRepository: createInMemoryPostsRepository(),
      projectsRepository: createInMemoryProjectsRepository(),
    });

    server = createAdaptorServer(app);
  });

  const createProject = async (name = "Test Project") => {
    const response = await request(server)
      .post("/projects")
      .set("Authorization", "Bearer test-token")
      .send({ name, description: "A test project" })
      .expect(201);

    return response.body;
  };

  describe("authentication", () => {
    it("requires auth for listing posts", async () => {
      await request(server).get("/projects/1/posts").expect(401);
    });

    it("requires auth for generating posts", async () => {
      await request(server).post("/projects/1/posts/generate").expect(401);
    });

    it("requires auth for saving posts", async () => {
      await request(server).post("/projects/1/posts/save").expect(401);
    });

    it("requires auth for approving posts", async () => {
      await request(server).patch("/projects/1/posts/1/approve").expect(401);
    });

    it("requires auth for deleting posts", async () => {
      await request(server).delete("/projects/1/posts/1").expect(401);
    });

    it("requires auth for updating posts", async () => {
      await request(server).patch("/projects/1/posts/1").expect(401);
    });
  });

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

  describe("gallery (list posts)", () => {
    it("returns only approved posts by default", async () => {
      const project = await createProject();

      const listBeforeCreate = await request(server)
        .get(`/projects/${project.id}/posts`)
        .set("Authorization", "Bearer test-token")
        .expect(200);

      expect(listBeforeCreate.body).toEqual([]);

      const post1 = await request(server)
        .post(`/projects/${project.id}/posts/save`)
        .set("Authorization", "Bearer test-token")
        .send({ socialMedia: "instagram", text: "Post 1", hashtags: [], imageUrl: "data:image/png;base64,abc", generationPrompt: "Post 1" })
        .expect(201);

      const listAfterCreate = await request(server)
        .get(`/projects/${project.id}/posts`)
        .set("Authorization", "Bearer test-token")
        .expect(200);

      expect(listAfterCreate.body).toHaveLength(1);
      expect(listAfterCreate.body[0].id).toBe(post1.body.id);
      expect(listAfterCreate.body[0].approved).toBe(true);
    });

    it("returns all posts with includeUnapproved=true", async () => {
      const project = await createProject();

      await request(server)
        .post(`/projects/${project.id}/posts/save`)
        .set("Authorization", "Bearer test-token")
        .send({ socialMedia: "instagram", text: "Post 1", hashtags: [], imageUrl: "data:image/png;base64,abc", generationPrompt: "Post 1" })
        .expect(201);

      await request(server)
        .post(`/projects/${project.id}/posts/save`)
        .set("Authorization", "Bearer test-token")
        .send({ socialMedia: "x", text: "Post 2", hashtags: [], imageUrl: "data:image/png;base64,abc", generationPrompt: "Post 2" })
        .expect(201);

      const response = await request(server)
        .get(`/projects/${project.id}/posts?includeUnapproved=true`)
        .set("Authorization", "Bearer test-token")
        .expect(200);

      expect(response.body).toHaveLength(2);
    });
  });

  describe("get single post", () => {
    it("returns a post by id", async () => {
      const project = await createProject();

      const saved = await request(server)
        .post(`/projects/${project.id}/posts/save`)
        .set("Authorization", "Bearer test-token")
        .send({ socialMedia: "facebook", text: "Single post", hashtags: [], imageUrl: "data:image/png;base64,abc", generationPrompt: "Single post" })
        .expect(201);

      const response = await request(server)
        .get(`/projects/${project.id}/posts/${saved.body.id}`)
        .set("Authorization", "Bearer test-token")
        .expect(200);

      expect(response.body).toMatchObject({
        id: saved.body.id,
        projectId: project.id,
        socialMedia: "facebook",
      });
    });

    it("returns 404 for non-existent post", async () => {
      const project = await createProject();

      await request(server)
        .get(`/projects/${project.id}/posts/999`)
        .set("Authorization", "Bearer test-token")
        .expect(404);
    });
  });

  describe("approve post", () => {
    it("approves a saved post", async () => {
      const project = await createProject();

      const saved = await request(server)
        .post(`/projects/${project.id}/posts/save`)
        .set("Authorization", "Bearer test-token")
        .send({ socialMedia: "instagram", text: "Approve me", hashtags: [], imageUrl: "data:image/png;base64,abc", generationPrompt: "Approve me" })
        .expect(201);

      const approved = await request(server)
        .patch(`/projects/${project.id}/posts/${saved.body.id}/approve`)
        .set("Authorization", "Bearer test-token")
        .expect(200);

      expect(approved.body.approved).toBe(true);
      expect(approved.body.id).toBe(saved.body.id);
    });

    it("returns 404 when approving non-existent post", async () => {
      const project = await createProject();

      await request(server)
        .patch(`/projects/${project.id}/posts/999/approve`)
        .set("Authorization", "Bearer test-token")
        .expect(404);
    });
  });

  describe("delete post", () => {
    it("deletes a post", async () => {
      const project = await createProject();

      const saved = await request(server)
        .post(`/projects/${project.id}/posts/save`)
        .set("Authorization", "Bearer test-token")
        .send({ socialMedia: "instagram", text: "Delete me", hashtags: [], imageUrl: "data:image/png;base64,abc", generationPrompt: "Delete me" })
        .expect(201);

      await request(server)
        .delete(`/projects/${project.id}/posts/${saved.body.id}`)
        .set("Authorization", "Bearer test-token")
        .expect(204);

      await request(server)
        .get(`/projects/${project.id}/posts/${saved.body.id}`)
        .set("Authorization", "Bearer test-token")
        .expect(404);
    });

    it("returns 404 when deleting non-existent post", async () => {
      const project = await createProject();

      await request(server)
        .delete(`/projects/${project.id}/posts/999`)
        .set("Authorization", "Bearer test-token")
        .expect(404);
    });
  });

  describe("update post", () => {
    it("updates the text of an existing post", async () => {
      const project = await createProject();

      const saved = await request(server)
        .post(`/projects/${project.id}/posts/save`)
        .set("Authorization", "Bearer test-token")
        .send({ socialMedia: "instagram", text: "Original post", hashtags: [], imageUrl: "data:image/png;base64,abc", generationPrompt: "Original post" })
        .expect(201);

      const updated = await request(server)
        .patch(`/projects/${project.id}/posts/${saved.body.id}`)
        .set("Authorization", "Bearer test-token")
        .send({ text: "Updated copy text" })
        .expect(200);

      expect(updated.body.text).toBe("Updated copy text");
      expect(updated.body.id).toBe(saved.body.id);
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

      const saved = await request(server)
        .post(`/projects/${project.id}/posts/save`)
        .set("Authorization", "Bearer test-token")
        .send({ socialMedia: "instagram", text: "Post", hashtags: [], imageUrl: "data:image/png;base64,abc", generationPrompt: "Post" })
        .expect(201);

      await request(server)
        .patch(`/projects/${project.id}/posts/${saved.body.id}`)
        .set("Authorization", "Bearer test-token")
        .send({ text: "" })
        .expect(400);
    });

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
      expect(updated.body.generationPrompt).toBe(saved.body.generationPrompt);
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
  });

  describe("owner isolation", () => {
    it("isolates posts by project ownership", async () => {
      const ownerOneApp = createApp({
        authenticator: createTestAuthenticator("user_123"),
        aiService: createMockAiService(),
        healthRepository: createInMemoryHealthRepository(),
        postsRepository: createInMemoryPostsRepository(),
        projectsRepository: createInMemoryProjectsRepository(),
      });
      const ownerTwoApp = createApp({
        authenticator: createTestAuthenticator("user_999"),
        aiService: createMockAiService(),
        healthRepository: createInMemoryHealthRepository(),
        postsRepository: createInMemoryPostsRepository(),
        projectsRepository: createInMemoryProjectsRepository(),
      });

      const ownerOneServer = createAdaptorServer(ownerOneApp);
      const ownerTwoServer = createAdaptorServer(ownerTwoApp);

      const projectOwner1 = await request(ownerOneServer)
        .post("/projects")
        .set("Authorization", "Bearer test-token")
        .send({ name: "Owner 1 Project", description: "Project 1" })
        .expect(201);

      await request(ownerOneServer)
        .post(`/projects/${projectOwner1.body.id}/posts/save`)
        .set("Authorization", "Bearer test-token")
        .send({ socialMedia: "instagram", text: "Owner 1 post", hashtags: [], imageUrl: "data:image/png;base64,abc", generationPrompt: "Owner 1 post" })
        .expect(201);

      const owner2List = await request(ownerTwoServer)
        .get(`/projects/${projectOwner1.body.id}/posts?includeUnapproved=true`)
        .set("Authorization", "Bearer test-token")
        .expect(200);

      expect(owner2List.body).toEqual([]);
    });
  });

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
});
