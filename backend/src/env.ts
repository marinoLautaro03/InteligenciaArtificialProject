import {z} from "zod";
import {config} from "dotenv";

config({quiet: true})

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url().default("postgres://postgres:postgres@localhost:5432/ia_project"),
  CLERK_SECRET_KEY: z.string().min(1),
  AI_TEXT_MODEL: z.string().default("gpt-4o-mini"),
  AI_TEXT_BASE_URL: z.string().default(""),
  AI_TEXT_API_KEY: z.string().default(""),
  AI_IMAGE_MODEL: z.string().default("dall-e-3"),
  AI_IMAGE_BASE_URL: z.string().default(""),
  AI_IMAGE_API_KEY: z.string().default(""),
});

export const env = envSchema.parse(process.env);
