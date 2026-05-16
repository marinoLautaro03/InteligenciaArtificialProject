import { Hono } from "hono";
import type { Authenticator } from "../../auth/auth.js";
import type { ProjectsService } from "../projects/projects.service.js";
import {
  generatePostSchema,
  postIdParamsSchema,
  postsQuerySchema,
  projectIdParamsSchema,
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

    if (!params.success) {
      return c.json({ error: "Invalid project id", issues: params.error.issues }, 400);
    }

    const query = postsQuerySchema.safeParse(c.req.query());

    if (!query.success) {
      return c.json({ error: "Invalid query parameters", issues: query.error.issues }, 400);
    }

    const posts = await postsService.findAllByProject(params.data.projectId, user.userId, {
      includeUnapproved: query.data.includeUnapproved,
    });
    return c.json(posts);
  });

  controller.get("/:projectId/posts/:id", async (c) => {
    const user = await authenticate(c);
    const params = postIdParamsSchema.safeParse(c.req.param());

    if (!params.success) {
      return c.json({ error: "Invalid parameters", issues: params.error.issues }, 400);
    }

    const post = await postsService.findByIdForProject(params.data.id, params.data.projectId, user.userId);

    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    return c.json(post);
  });

  controller.post("/:projectId/posts/generate", async (c) => {
    const user = await authenticate(c);
    const params = projectIdParamsSchema.safeParse(c.req.param());

    if (!params.success) {
      return c.json({ error: "Invalid project id", issues: params.error.issues }, 400);
    }

    const body = await c.req.json().catch(() => undefined);
    const result = generatePostSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        {
          error: "Invalid request body",
          issues: result.error.issues,
        },
        400,
      );
    }

    const project = await projectsService.findByIdForOwner(params.data.projectId, user.userId);

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    const post = await postsService.generatePost(
      {
        id: project.id,
        name: project.name,
        description: project.description,
        primaryColor: project.primaryColor,
      },
      user.userId,
      result.data,
    );
    return c.json(post, 201);
  });

  controller.patch("/:projectId/posts/:id/approve", async (c) => {
    const user = await authenticate(c);
    const params = postIdParamsSchema.safeParse(c.req.param());

    if (!params.success) {
      return c.json({ error: "Invalid parameters", issues: params.error.issues }, 400);
    }

    const post = await postsService.approvePost(params.data.id, params.data.projectId, user.userId);

    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    return c.json(post);
  });

  controller.delete("/:projectId/posts/:id", async (c) => {
    const user = await authenticate(c);
    const params = postIdParamsSchema.safeParse(c.req.param());

    if (!params.success) {
      return c.json({ error: "Invalid parameters", issues: params.error.issues }, 400);
    }

    const deleted = await postsService.deletePost(params.data.id, params.data.projectId, user.userId);

    if (!deleted) {
      return c.json({ error: "Post not found" }, 404);
    }

    return c.body(null, 204);
  });

  return controller;
};
