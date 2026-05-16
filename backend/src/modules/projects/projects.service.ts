import type { ProjectsRepository } from "./projects.repository.js";
import type { CreateProjectInput, UpdateProjectInput } from "./projects.schemas.js";

export const createProjectsService = (projectsRepository: ProjectsRepository) => ({
  findAllByOwner: (ownerId: string) => {
    return projectsRepository.findAllByOwner(ownerId);
  },
  findByIdForOwner: (id: number, ownerId: string) => {
    return projectsRepository.findByIdForOwner(id, ownerId);
  },
  create: (ownerId: string, input: CreateProjectInput) => {
    return projectsRepository.create({
      ...input,
      ownerId,
    });
  },
  updateForOwner: (id: number, ownerId: string, input: UpdateProjectInput) => {
    return projectsRepository.updateForOwner(id, ownerId, input);
  },
  deleteForOwner: (id: number, ownerId: string) => {
    return projectsRepository.deleteForOwner(id, ownerId);
  },
});

export type ProjectsService = ReturnType<typeof createProjectsService>;
