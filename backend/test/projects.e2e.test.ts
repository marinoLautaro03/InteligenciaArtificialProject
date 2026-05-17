import { createAdaptorServer } from "@hono/node-server";
import { HTTPException } from "hono/http-exception";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import type { Authenticator } from "../src/auth/auth.js";
import { createApp } from "../src/app.js";
import type { HealthRepository } from "../src/modules/health/health.repository.js";
import type { Project, ProjectsRepository } from "../src/modules/projects/projects.repository.js";

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
    findByIdForOwner: async (id, ownerId) => records.find((project) => project.id === id && project.ownerId === ownerId),
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
        postCount: 0,
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

describe("projects module e2e", () => {
  let server: ReturnType<typeof createAdaptorServer>;

  beforeEach(() => {
    const app = createApp({
      authenticator: createTestAuthenticator(),
      healthRepository: createInMemoryHealthRepository(),
      projectsRepository: createInMemoryProjectsRepository(),
    });

    server = createAdaptorServer(app);
  });

  it("requires authentication", async () => {
    await request(server).get("/projects").expect(401);
  });

  it("creates, lists, reads, updates, and deletes owned projects", async () => {
    const createResponse = await request(server)
      .post("/projects")
      .set("Authorization", "Bearer test-token")
      .send({
        name: "Winter Launch",
        description: "Campaign for the seasonal beverage release",
        primaryColor: "#D97706",
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      id: 1,
      name: "Winter Launch",
      description: "Campaign for the seasonal beverage release",
      status: "active",
      ownerId: "user_123",
      primaryColor: "#D97706",
    });

    const listResponse = await request(server)
      .get("/projects")
      .set("Authorization", "Bearer test-token")
      .expect(200);

    expect(listResponse.body).toHaveLength(1);
    expect(listResponse.body[0]).toMatchObject({
      id: 1,
      ownerId: "user_123",
      postCount: 0,
    });

    const getResponse = await request(server)
      .get("/projects/1")
      .set("Authorization", "Bearer test-token")
      .expect(200);

    expect(getResponse.body).toMatchObject({
      id: 1,
      name: "Winter Launch",
    });

    const updateResponse = await request(server)
      .patch("/projects/1")
      .set("Authorization", "Bearer test-token")
      .send({
        description: "Updated brief for the launch campaign",
        logoUrl: "https://example.com/logo.png",
      })
      .expect(200);

    expect(updateResponse.body).toMatchObject({
      id: 1,
      description: "Updated brief for the launch campaign",
      logoUrl: "https://example.com/logo.png",
      postCount: 0,
    });

    await request(server).delete("/projects/1").set("Authorization", "Bearer test-token").expect(204);

    const finalListResponse = await request(server)
      .get("/projects")
      .set("Authorization", "Bearer test-token")
      .expect(200);

    expect(finalListResponse.body).toEqual([]);
  });

  it("isolates projects by owner", async () => {
    await request(server)
      .post("/projects")
      .set("Authorization", "Bearer test-token")
      .send({
        name: "Owner one",
        description: "First owner's campaign",
      })
      .expect(201);

    const otherOwnerServer = createAdaptorServer(
      createApp({
        authenticator: createTestAuthenticator("user_999"),
        healthRepository: createInMemoryHealthRepository(),
        projectsRepository: createInMemoryProjectsRepository(),
      }),
    );

    const otherOwnerList = await request(otherOwnerServer)
      .get("/projects")
      .set("Authorization", "Bearer test-token")
      .expect(200);

    expect(otherOwnerList.body).toEqual([]);
  });

  it("returns not found for foreign-owned records", async () => {
    const sharedRepository = createInMemoryProjectsRepository();
    const ownerOneServer = createAdaptorServer(
      createApp({
        authenticator: createTestAuthenticator("user_123"),
        healthRepository: createInMemoryHealthRepository(),
        projectsRepository: sharedRepository,
      }),
    );
    const ownerTwoServer = createAdaptorServer(
      createApp({
        authenticator: createTestAuthenticator("user_999"),
        healthRepository: createInMemoryHealthRepository(),
        projectsRepository: sharedRepository,
      }),
    );

    await request(ownerOneServer)
      .post("/projects")
      .set("Authorization", "Bearer test-token")
      .send({
        name: "Hidden project",
        description: "Only one owner should see this",
      })
      .expect(201);

    await request(ownerTwoServer).get("/projects/1").set("Authorization", "Bearer test-token").expect(404);
    await request(ownerTwoServer)
      .patch("/projects/1")
      .set("Authorization", "Bearer test-token")
      .send({ name: "Stolen" })
      .expect(404);
    await request(ownerTwoServer).delete("/projects/1").set("Authorization", "Bearer test-token").expect(404);
  });

  it("validates ids and payloads", async () => {
    const invalidBodyResponse = await request(server)
      .post("/projects")
      .set("Authorization", "Bearer test-token")
      .send({
        name: "",
        description: "",
      })
      .expect(400);

    expect(invalidBodyResponse.body.error).toBe("Invalid request body");

    const invalidIdResponse = await request(server)
      .get("/projects/not-a-number")
      .set("Authorization", "Bearer test-token")
      .expect(400);

    expect(invalidIdResponse.body.error).toBe("Invalid project id");
  });
});
