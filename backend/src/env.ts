import {z} from "zod";
import {config} from "dotenv";

config({quiet: true})

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url().default("postgres://postgres:postgres@localhost:5432/ia_project"),
  CLERK_SECRET_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env);
