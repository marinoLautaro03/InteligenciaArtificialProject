import type { HealthStatus } from "./health.entity.js";

export type HealthRepository = {
  getStatus: () => Promise<HealthStatus>;
};

export const createHealthRepository = (): HealthRepository => ({
  getStatus: async () => {
    return {
      status: "ok",
      uptime: process.uptime(),
      checkedAt: new Date().toISOString(),
    };
  },
});
