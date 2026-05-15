import { Hono } from "hono";
import type { Authenticator } from "../../auth/auth.js";
import { createProjectSchema, projectIdParamsSchema, updateProjectSchema } from "./projects.schemas.js";
import type { ProjectsService } from "./projects.service.js";

export const createProjectsController = (projectsService: ProjectsService, authenticate: Authenticator) => {
  const controller = new Hono();

  controller.get("/", async (c) => {
    const user = await authenticate(c);
    const projects = await projectsService.findAllByOwner(user.userId);
    return c.json(projects);
  });

  controller.post("/", async (c) => {
    const user = await authenticate(c);
    const body = await c.req.json().catch(() => undefined);
    const result = createProjectSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        {
          error: "Invalid request body",
          issues: result.error.issues,
        },
        400,
      );
    }

    const project = await projectsService.create(user.userId, result.data);
    return c.json(project, 201);
  });

  controller.get("/:id", async (c) => {
    const user = await authenticate(c);
    const params = projectIdParamsSchema.safeParse(c.req.param());

    if (!params.success) {
      return c.json({ error: "Invalid project id", issues: params.error.issues }, 400);
    }

    const project = await projectsService.findByIdForOwner(params.data.id, user.userId);

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    return c.json(project);
  });

  controller.patch("/:id", async (c) => {
    const user = await authenticate(c);
    const params = projectIdParamsSchema.safeParse(c.req.param());
    const body = await c.req.json().catch(() => undefined);
    const bodyResult = updateProjectSchema.safeParse(body);

    if (!params.success) {
      return c.json({ error: "Invalid project id", issues: params.error.issues }, 400);
    }

    if (!bodyResult.success) {
      return c.json({ error: "Invalid request body", issues: bodyResult.error.issues }, 400);
    }

    const project = await projectsService.updateForOwner(params.data.id, user.userId, bodyResult.data);

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    return c.json(project);
  });

  controller.delete("/:id", async (c) => {
    const user = await authenticate(c);
    const params = projectIdParamsSchema.safeParse(c.req.param());

    if (!params.success) {
      return c.json({ error: "Invalid project id", issues: params.error.issues }, 400);
    }

    const deleted = await projectsService.deleteForOwner(params.data.id, user.userId);

    if (!deleted) {
      return c.json({ error: "Project not found" }, 404);
    }

    return c.body(null, 204);
  });

  return controller;
};
