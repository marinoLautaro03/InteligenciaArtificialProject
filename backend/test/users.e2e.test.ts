import { createAdaptorServer } from "@hono/node-server";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { HealthRepository } from "../src/modules/health/health.repository.js";
import type { User, UsersRepository } from "../src/modules/users/users.repository.js";

const createInMemoryHealthRepository = (): HealthRepository => ({
  getStatus: async () => ({
    status: "ok",
    uptime: 1,
    checkedAt: "2026-01-01T00:00:00.000Z",
  }),
});

const createInMemoryUsersRepository = (): UsersRepository => {
  const records: User[] = [];
  let nextId = 1;

  return {
    findAll: async () => records,
    create: async (input) => {
      const user = {
        id: nextId,
        name: input.name,
        email: input.email,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      };

      nextId += 1;
      records.push(user);

      return user;
    },
  };
};

describe("users module e2e", () => {
  let server: ReturnType<typeof createAdaptorServer>;

  beforeEach(() => {
    const app = createApp({
      healthRepository: createInMemoryHealthRepository(),
      usersRepository: createInMemoryUsersRepository(),
    });

    server = createAdaptorServer(app);
  });

  it("returns the health status", async () => {
    const response = await request(server).get("/health").expect(200);

    expect(response.body).toEqual({
      status: "ok",
      uptime: 1,
      checkedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("creates and lists users through the users module", async () => {
    const createResponse = await request(server)
      .post("/users")
      .send({ name: "Ada Lovelace", email: "ada@example.com" })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      id: 1,
      name: "Ada Lovelace",
      email: "ada@example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    const listResponse = await request(server).get("/users").expect(200);

    expect(listResponse.body).toEqual([createResponse.body]);
  });

  it("rejects invalid create user payloads", async () => {
    const response = await request(server).post("/users").send({ name: "", email: "not-an-email" }).expect(400);

    expect(response.body.error).toBe("Invalid request body");
    expect(response.body.issues).toHaveLength(2);
  });
});
