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
  generatePostText: async () => "Mock AI generated post text for testing purposes.",
  generatePostImage: async () => "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
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

    it("requires auth for approving posts", async () => {
      await request(server).patch("/projects/1/posts/1/approve").expect(401);
    });

    it("requires auth for deleting posts", async () => {
      await request(server).delete("/projects/1/posts/1").expect(401);
    });
  });

  describe("generate post", () => {
    it("generates a post with approved=false", async () => {
      const project = await createProject();

      const response = await request(server)
        .post(`/projects/${project.id}/posts/generate`)
        .set("Authorization", "Bearer test-token")
        .send({ socialMedia: "instagram", description: "A cool new product launch" })
        .expect(201);

      expect(response.body).toMatchObject({
        projectId: project.id,
        socialMedia: "instagram",
        generationPrompt: "A cool new product launch",
        approved: false,
      });
      expect(response.body.id).toBeGreaterThan(0);
      expect(response.body.imageUrl).toBeTruthy();
      expect(response.body.text).toBeTruthy();
    });

    it("validates social media type", async () => {
      const project = await createProject();

      await request(server)
        .post(`/projects/${project.id}/posts/generate`)
        .set("Authorization", "Bearer test-token")
        .send({ socialMedia: "tiktok", description: "Bad platform" })
        .expect(400);
    });

    it("requires description", async () => {
      const project = await createProject();

      await request(server)
        .post(`/projects/${project.id}/posts/generate`)
        .set("Authorization", "Bearer test-token")
        .send({ socialMedia: "instagram", description: "" })
        .expect(400);
    });
  });

  describe("gallery (list posts)", () => {
    it("returns only approved posts by default", async () => {
      const project = await createProject();

      const post1 = await request(server)
        .post(`/projects/${project.id}/posts/generate`)
        .set("Authorization", "Bearer test-token")
        .send({ socialMedia: "instagram", description: "Post 1" })
        .expect(201);

      const post2 = await request(server)
        .post(`/projects/${project.id}/posts/generate`)
        .set("Authorization", "Bearer test-token")
        .send({ socialMedia: "x", description: "Post 2" })
        .expect(201);

      const listBeforeApprove = await request(server)
        .get(`/projects/${project.id}/posts`)
        .set("Authorization", "Bearer test-token")
        .expect(200);

      expect(listBeforeApprove.body).toEqual([]);

      await request(server)
        .patch(`/projects/${project.id}/posts/${post1.body.id}/approve`)
        .set("Authorization", "Bearer test-token")
        .expect(200);

      const listAfterApprove = await request(server)
        .get(`/projects/${project.id}/posts`)
        .set("Authorization", "Bearer test-token")
        .expect(200);

      expect(listAfterApprove.body).toHaveLength(1);
      expect(listAfterApprove.body[0].id).toBe(post1.body.id);
      expect(listAfterApprove.body[0].approved).toBe(true);
    });

    it("returns all posts with includeUnapproved=true", async () => {
      const project = await createProject();

      await request(server)
        .post(`/projects/${project.id}/posts/generate`)
        .set("Authorization", "Bearer test-token")
        .send({ socialMedia: "instagram", description: "Post 1" })
        .expect(201);

      await request(server)
        .post(`/projects/${project.id}/posts/generate`)
        .set("Authorization", "Bearer test-token")
        .send({ socialMedia: "x", description: "Post 2" })
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

      const generated = await request(server)
        .post(`/projects/${project.id}/posts/generate`)
        .set("Authorization", "Bearer test-token")
        .send({ socialMedia: "facebook", description: "Single post" })
        .expect(201);

      const response = await request(server)
        .get(`/projects/${project.id}/posts/${generated.body.id}`)
        .set("Authorization", "Bearer test-token")
        .expect(200);

      expect(response.body).toMatchObject({
        id: generated.body.id,
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
    it("approves a generated post", async () => {
      const project = await createProject();

      const generated = await request(server)
        .post(`/projects/${project.id}/posts/generate`)
        .set("Authorization", "Bearer test-token")
        .send({ socialMedia: "instagram", description: "Approve me" })
        .expect(201);

      expect(generated.body.approved).toBe(false);

      const approved = await request(server)
        .patch(`/projects/${project.id}/posts/${generated.body.id}/approve`)
        .set("Authorization", "Bearer test-token")
        .expect(200);

      expect(approved.body.approved).toBe(true);
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

      const generated = await request(server)
        .post(`/projects/${project.id}/posts/generate`)
        .set("Authorization", "Bearer test-token")
        .send({ socialMedia: "instagram", description: "Delete me" })
        .expect(201);

      await request(server)
        .delete(`/projects/${project.id}/posts/${generated.body.id}`)
        .set("Authorization", "Bearer test-token")
        .expect(204);

      await request(server)
        .get(`/projects/${project.id}/posts/${generated.body.id}`)
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
        .post(`/projects/${projectOwner1.body.id}/posts/generate`)
        .set("Authorization", "Bearer test-token")
        .send({ socialMedia: "instagram", description: "Owner 1 post" })
        .expect(201);

      const owner2List = await request(ownerTwoServer)
        .get(`/projects/${projectOwner1.body.id}/posts?includeUnapproved=true`)
        .set("Authorization", "Bearer test-token")
        .expect(200);

      expect(owner2List.body).toEqual([]);
    });
  });
});
