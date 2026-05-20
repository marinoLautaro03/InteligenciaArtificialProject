import { z } from "zod";

export const socialMediaEnum = z.enum(["instagram", "x", "facebook", "linkedin"]);

export const generatePostSchema = z.object({
  description: z.string().trim().min(1),
  tone: z.enum(["formal", "casual", "humoristico", "inspiracional"]).default("casual"),
});

export type GeneratePostInput = z.infer<typeof generatePostSchema>;

export const savePostSchema = z.object({
  socialMedia: socialMediaEnum,
  text: z.string().trim().min(1),
  hashtags: z.array(z.string()).default([]),
  imageUrl: z.string().min(1),
  generationPrompt: z.string().default(""),
});

export type SavePostInput = z.infer<typeof savePostSchema>;

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

export const updatePostSchema = z
  .object({
    text: z.string().trim().min(1).optional(),
    imageUrl: z.string().min(1).optional(),
    generationPrompt: z.string().optional(),
  })
  .refine(
    (data) =>
      data.text !== undefined ||
      data.imageUrl !== undefined ||
      data.generationPrompt !== undefined,
    { message: "At least one field is required" },
  );

export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const generateImageSchema = z.object({
  description: z.string().trim().min(1),
});

export type GenerateImageInput = z.infer<typeof generateImageSchema>;
