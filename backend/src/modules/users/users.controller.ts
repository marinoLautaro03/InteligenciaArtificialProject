import { Hono } from "hono";
import { createUserSchema } from "./users.schemas.js";
import type { UsersService } from "./users.service.js";

export const createUsersController = (usersService: UsersService) => {
  const controller = new Hono();

  controller.get("/", async (c) => {
    const users = await usersService.findAll();
    return c.json(users);
  });

  controller.post("/", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    const result = createUserSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        {
          error: "Invalid request body",
          issues: result.error.issues,
        },
        400,
      );
    }

    const createdUser = await usersService.create(result.data);
    return c.json(createdUser, 201);
  });

  return controller;
};
