import { Hono } from "hono";
import type { HealthService } from "./health.service.js";

export const createHealthController = (healthService: HealthService) => {
  const controller = new Hono();

  controller.get("/", async (c) => {
    const status = await healthService.getStatus();
    return c.json(status);
  });

  return controller;
};
