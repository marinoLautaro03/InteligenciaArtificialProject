import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Authenticator } from "./auth/auth.js";
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
  authenticator?: Authenticator;
  healthRepository?: HealthRepository;
  postsRepository?: PostsRepository;
  projectsRepository?: ProjectsRepository;
  usersRepository?: UsersRepository;
};

export const createApp = (dependencies: AppDependencies = {}) => {
  const app = new Hono();

  const healthRepository = dependencies.healthRepository ?? createHealthRepository();
  const healthService = createHealthService(healthRepository);
  const postsRepository = dependencies.postsRepository ?? createPostsRepository();
  const postsService = createPostsService(postsRepository);
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
    app.route("/projects", createPostsController(postsService, dependencies.authenticator));
  }
  app.route("/users", createUsersController(usersService));

  return app;
};
