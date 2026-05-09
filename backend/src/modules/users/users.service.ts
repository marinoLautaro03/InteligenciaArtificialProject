import type { CreateUserInput } from "./users.schemas.js";
import type { UsersRepository } from "./users.repository.js";

export const createUsersService = (usersRepository: UsersRepository) => ({
  findAll: () => {
    return usersRepository.findAll();
  },
  create: (input: CreateUserInput) => {
    return usersRepository.create(input);
  },
});

export type UsersService = ReturnType<typeof createUsersService>;
