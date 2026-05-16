import { and, desc, eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { db } from "../../db/index.js";
import { projects } from "../projects/projects.entity.js";
import { posts } from "./posts.entity.js";

export type Post = InferSelectModel<typeof posts>;

export type PostsRepository = {
  findAllByProject: (projectId: number, ownerId: string, options?: { includeUnapproved?: boolean }) => Promise<Post[]>;
  findByIdForProject: (id: number, projectId: number, ownerId: string) => Promise<Post | undefined>;
  create: (input: {
    projectId: number;
    imageUrl: string;
    text: string;
    socialMedia: Post["socialMedia"];
    generationPrompt: string;
  }) => Promise<Post>;
  update: (id: number, projectId: number, data: Partial<Post>) => Promise<Post | undefined>;
  remove: (id: number, projectId: number) => Promise<boolean>;
};

export const createPostsRepository = (database = db): PostsRepository => ({
  findAllByProject: async (projectId, ownerId, options) => {
    const conditions = [eq(projects.ownerId, ownerId), eq(posts.projectId, projectId)];

    if (!options?.includeUnapproved) {
      conditions.push(eq(posts.approved, true));
    }

    const result = await database
      .select({ post: posts })
      .from(posts)
      .innerJoin(projects, eq(posts.projectId, projects.id))
      .where(and(...conditions))
      .orderBy(desc(posts.createdAt));

    return result.map((r) => r.post);
  },

  findByIdForProject: async (id, projectId, ownerId) => {
    const [result] = await database
      .select({ post: posts })
      .from(posts)
      .innerJoin(projects, eq(posts.projectId, projects.id))
      .where(and(eq(posts.id, id), eq(posts.projectId, projectId), eq(projects.ownerId, ownerId)));

    return result?.post;
  },

  create: async (input) => {
    const [created] = await database
      .insert(posts)
      .values({
        projectId: input.projectId,
        imageUrl: input.imageUrl,
        text: input.text,
        socialMedia: input.socialMedia,
        generationPrompt: input.generationPrompt,
      })
      .returning();
    return created;
  },

  update: async (id, projectId, data) => {
    const [updated] = await database
      .update(posts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(posts.id, id), eq(posts.projectId, projectId)))
      .returning();
    return updated;
  },

  remove: async (id, projectId) => {
    const deletedPosts = await database
      .delete(posts)
      .where(and(eq(posts.id, id), eq(posts.projectId, projectId)))
      .returning({ id: posts.id });

    return deletedPosts.length > 0;
  },
});
