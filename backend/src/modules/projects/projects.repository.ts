import { and, eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { db } from "../../db/index.js";
import type { CreateProjectInput, UpdateProjectInput } from "./projects.schemas.js";
import { projects } from "./projects.entity.js";

export type Project = InferSelectModel<typeof projects>;

export type ProjectsRepository = {
  findAllByOwner: (ownerId: string) => Promise<Project[]>;
  findByIdForOwner: (id: number, ownerId: string) => Promise<Project | undefined>;
  create: (input: CreateProjectInput & { ownerId: string }) => Promise<Project>;
  updateForOwner: (id: number, ownerId: string, input: UpdateProjectInput) => Promise<Project | undefined>;
  deleteForOwner: (id: number, ownerId: string) => Promise<boolean>;
};

export const createProjectsRepository = (database = db): ProjectsRepository => ({
  findAllByOwner: async (ownerId) => {
    return database.select().from(projects).where(eq(projects.ownerId, ownerId));
  },

  findByIdForOwner: async (id, ownerId) => {
    const [project] = await database
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)));
    return project;
  },

  create: async (input) => {
    const [created] = await database
      .insert(projects)
      .values({
        name: input.name,
        description: input.description ?? "",
        ownerId: input.ownerId,
        logoUrl: input.logoUrl,
        primaryColor: input.primaryColor,
    })
      .returning();
    return created;
  },

  updateForOwner: async (id, ownerId, input) => {
    const [updated] = await database
      .update(projects)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)))
      .returning();
    return updated;
  },

  deleteForOwner: async (id, ownerId) => {
    const deletedProjects = await database
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)))
      .returning({ id: projects.id });

    return deletedProjects.length > 0;
  },
});
