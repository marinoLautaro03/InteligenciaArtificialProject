import type { InferSelectModel } from "drizzle-orm";
import { db } from "../../db/index.js";
import type { CreateUserInput } from "./users.schemas.js";
import { users } from "./users.entity.js";

export type User = InferSelectModel<typeof users>;

export type UsersRepository = {
  findAll: () => Promise<User[]>;
  create: (input: CreateUserInput) => Promise<User>;
};

export const createUsersRepository = (database = db): UsersRepository => ({
  findAll: async () => {
    return database.select().from(users);
  },
  create: async (input) => {
    const [createdUser] = await database.insert(users).values(input).returning();
    return createdUser;
  },
});
