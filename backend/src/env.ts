import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url().default("postgres://postgres:postgres@localhost:5432/ia_project"),
});

export const env = envSchema.parse(process.env);
