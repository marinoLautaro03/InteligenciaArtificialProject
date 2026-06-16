import { Hono } from "hono";
import type { PostsService } from "../posts/posts.service.js";
import type { ProjectsService } from "../projects/projects.service.js";

type DataUrl = { mime: string; base64: string } | null;

const parseDataUrl = (dataUrl: string): DataUrl => {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
};

export const createImagesController = (
  projectsService: ProjectsService,
  postsService: PostsService,
) => {
  const controller = new Hono();

  controller.get("/logos/:projectId", async (c) => {
    const projectId = Number(c.req.param("projectId"));
    if (!Number.isFinite(projectId)) {
      return c.json({ error: "Invalid project id" }, 400);
    }

    const project = await projectsService.findById(projectId);
    if (!project?.logoUrl) {
      return c.json({ error: "Not found" }, 404);
    }

    const parsed = parseDataUrl(project.logoUrl);
    if (!parsed) {
      return c.json({ error: "Invalid image data" }, 500);
    }

    const buffer = Buffer.from(parsed.base64, "base64");
    return new Response(buffer, {
      headers: {
        "Content-Type": parsed.mime,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000",
      },
    });
  });

  controller.get("/posts/:postId", async (c) => {
    const postId = Number(c.req.param("postId"));
    if (!Number.isFinite(postId)) {
      return c.json({ error: "Invalid post id" }, 400);
    }

    const post = await postsService.findById(postId);
    if (!post?.imageUrl) {
      return c.json({ error: "Not found" }, 404);
    }

    const parsed = parseDataUrl(post.imageUrl);
    if (!parsed) {
      return c.json({ error: "Invalid image data" }, 500);
    }

    const buffer = Buffer.from(parsed.base64, "base64");
    return new Response(buffer, {
      headers: {
        "Content-Type": parsed.mime,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "public, max-age=31536000",
      },
    });
  });

  return controller;
};
