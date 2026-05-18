import { z } from "zod";

export const socialMediaEnum = z.enum(["instagram", "x", "facebook", "linkedin"]);

export const generatePostSchema = z.object({
  socialMedia: socialMediaEnum,
  description: z.string().trim().min(1),
  tone: z.enum(["formal", "casual", "humoristico", "inspiracional"]).default("casual"),
});

export type GeneratePostInput = z.infer<typeof generatePostSchema>;

export const projectIdParamsSchema = z.object({
  projectId: z.coerce.number().int().positive(),
});

export const postIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  projectId: z.coerce.number().int().positive(),
});

export const postsQuerySchema = z.object({
  includeUnapproved: z.coerce.boolean().optional(),
});

export const updatePostSchema = z.object({
  text: z.string().trim().min(1),
});

export type UpdatePostInput = z.infer<typeof updatePostSchema>;
