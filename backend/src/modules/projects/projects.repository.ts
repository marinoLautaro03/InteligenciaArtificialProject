import { and, eq, getTableColumns, sql } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { db } from "../../db/index.js";
import { posts } from "../posts/posts.entity.js";
import type { CreateProjectInput, UpdateProjectInput } from "./projects.schemas.js";
import { projects } from "./projects.entity.js";

type DbProject = InferSelectModel<typeof projects>;
export type Project = DbProject & { postCount: number };

export type ProjectsRepository = {
  findAllByOwner: (ownerId: string) => Promise<Project[]>;
  findByIdForOwner: (id: number, ownerId: string) => Promise<Project | undefined>;
  create: (input: CreateProjectInput & { ownerId: string }) => Promise<Project>;
  updateForOwner: (id: number, ownerId: string, input: UpdateProjectInput) => Promise<Project | undefined>;
  deleteForOwner: (id: number, ownerId: string) => Promise<boolean>;
};

const postCountExpr = sql<number>`(SELECT COUNT(*)::int FROM posts WHERE posts.project_id = ${projects.id})`;

export const createProjectsRepository = (database = db): ProjectsRepository => ({
  findAllByOwner: async (ownerId) => {
    return database
      .select({ ...getTableColumns(projects), postCount: postCountExpr })
      .from(projects)
      .where(eq(projects.ownerId, ownerId));
  },

  findByIdForOwner: async (id, ownerId) => {
    const [project] = await database
      .select({ ...getTableColumns(projects), postCount: postCountExpr })
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
    return { ...created, postCount: 0 };
  },

  updateForOwner: async (id, ownerId, input) => {
    const [updated] = await database
      .update(projects)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)))
      .returning();

    if (!updated) return undefined;

    const [withCount] = await database
      .select({ ...getTableColumns(projects), postCount: postCountExpr })
      .from(projects)
      .where(eq(projects.id, updated.id));

    return withCount;
  },

  deleteForOwner: async (id, ownerId) => {
    const deleted = await database
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, ownerId)))
      .returning({ id: projects.id });
    return deleted.length > 0;
  },
});
