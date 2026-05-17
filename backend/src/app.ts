import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Authenticator } from "./auth/auth.js";
import { env } from "./env.js";
import { createAiService, type AiService } from "./modules/posts/ai.js";
import { createHealthController } from "./modules/health/health.controller.js";
import { createHealthRepository, type HealthRepository } from "./modules/health/health.repository.js";
import { createHealthService } from "./modules/health/health.service.js";
import { createPostsController } from "./modules/posts/posts.controller.js";
import { createPostsRepository, type PostsRepository } from "./modules/posts/posts.repository.js";
import { createPostsService } from "./modules/posts/posts.service.js";
import { createProjectsController } from "./modules/projects/projects.controller.js";
import { createProjectsRepository, type ProjectsRepository } from "./modules/projects/projects.repository.js";
import { createProjectsService } from "./modules/projects/projects.service.js";
import { createUsersController } from "./modules/users/users.controller.js";
import { createUsersRepository, type UsersRepository } from "./modules/users/users.repository.js";
import { createUsersService } from "./modules/users/users.service.js";

type AppDependencies = {
  aiService?: AiService;
  authenticator?: Authenticator;
  healthRepository?: HealthRepository;
  postsRepository?: PostsRepository;
  projectsRepository?: ProjectsRepository;
  usersRepository?: UsersRepository;
};

export const createApp = (dependencies: AppDependencies = {}) => {
  const app = new Hono();

  app.onError((err, c) => {
    console.error(`[${c.req.method}] ${c.req.url}`, err);
    return c.json({ error: err.message }, 500);
  });

  const healthRepository = dependencies.healthRepository ?? createHealthRepository();
  const healthService = createHealthService(healthRepository);
  const postsRepository = dependencies.postsRepository ?? createPostsRepository();
  const aiService =
    dependencies.aiService ??
    createAiService({
      textModel: env.AI_TEXT_MODEL,
      textBaseUrl: env.AI_TEXT_BASE_URL,
      textApiKey: env.AI_TEXT_API_KEY,
      imageModel: env.AI_IMAGE_MODEL,
      imageBaseUrl: env.AI_IMAGE_BASE_URL,
      imageApiKey: env.AI_IMAGE_API_KEY,
    });
  const postsService = createPostsService(postsRepository, aiService);
  const projectsRepository = dependencies.projectsRepository ?? createProjectsRepository();
  const projectsService = createProjectsService(projectsRepository);
  const usersRepository = dependencies.usersRepository ?? createUsersRepository();
  const usersService = createUsersService(usersRepository);

  app.use(
    "*",
    cors({
      origin: ["http://localhost:5173"],
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  app.route("/health", createHealthController(healthService));
  if (dependencies.authenticator) {
    app.route("/projects", createProjectsController(projectsService, dependencies.authenticator));
    app.route("/projects", createPostsController(postsService, projectsService, dependencies.authenticator));
  }
  app.route("/users", createUsersController(usersService));

  return app;
};
