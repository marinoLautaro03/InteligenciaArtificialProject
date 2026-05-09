import { Hono } from "hono";
import { createHealthController } from "./modules/health/health.controller.js";
import { createHealthRepository, type HealthRepository } from "./modules/health/health.repository.js";
import { createHealthService } from "./modules/health/health.service.js";
import { createUsersController } from "./modules/users/users.controller.js";
import { createUsersRepository, type UsersRepository } from "./modules/users/users.repository.js";
import { createUsersService } from "./modules/users/users.service.js";

type AppDependencies = {
  healthRepository?: HealthRepository;
  usersRepository?: UsersRepository;
};

export const createApp = (dependencies: AppDependencies = {}) => {
  const app = new Hono();

  const healthRepository = dependencies.healthRepository ?? createHealthRepository();
  const healthService = createHealthService(healthRepository);
  const usersRepository = dependencies.usersRepository ?? createUsersRepository();
  const usersService = createUsersService(usersRepository);

  app.route("/health", createHealthController(healthService));
  app.route("/users", createUsersController(usersService));

  return app;
};
