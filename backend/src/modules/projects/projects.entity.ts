import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("active"),
  ownerId: text("owner_id").notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
