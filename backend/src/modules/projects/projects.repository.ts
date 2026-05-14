import { eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { db } from "../../db/index.js";
import type { CreateProjectInput, UpdateProjectInput } from "./projects.schemas.js";
import { projects } from "./projects.entity.js";

export type Project = InferSelectModel<typeof projects>;

export type ProjectsRepository = {
  findAllByOwner: (ownerId: string) => Promise<Project[]>;
  findById: (id: number) => Promise<Project | undefined>;
  create: (input: CreateProjectInput & { ownerId: string }) => Promise<Project>;
  update: (id: number, input: UpdateProjectInput) => Promise<Project>;
  archive: (id: number) => Promise<Project>;
  delete: (id: number) => Promise<void>;
};

export const createProjectsRepository = (database = db): ProjectsRepository => ({
  findAllByOwner: async (ownerId) => {
    return database.select().from(projects).where(eq(projects.ownerId, ownerId));
  },

  findById: async (id) => {
    const [project] = await database.select().from(projects).where(eq(projects.id, id));
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

  update: async (id, input) => {
    const [updated] = await database
      .update(projects)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated;
  },

  archive: async (id) => {
    const [archived] = await database
      .update(projects)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return archived;
  },

  delete: async (id) => {
    await database.delete(projects).where(eq(projects.id, id));
  },
});
