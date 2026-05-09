import type { HealthRepository } from "./health.repository.js";

export const createHealthService = (healthRepository: HealthRepository) => ({
  getStatus: () => {
    return healthRepository.getStatus();
  },
});

export type HealthService = ReturnType<typeof createHealthService>;
