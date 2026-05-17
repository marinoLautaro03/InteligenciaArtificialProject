import { boolean, integer, pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { projects } from "../projects/projects.entity.js";

export const socialMediaPlatformEnum = pgEnum("social_media_platform", ["instagram", "x", "facebook", "linkedin"]);

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  imageUrl: text("image_url").notNull(),
  text: text("text").notNull(),
  socialMedia: socialMediaPlatformEnum("social_media").notNull(),
  approved: boolean("approved").notNull().default(false),
  generationPrompt: text("generation_prompt").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
