import type { Context } from "@gql-prisma-api/types/context.js";
import type { CreateUserInput } from "@gql-prisma-api/modules/auth/dto/index.js";

export const Mutation = {
  signup: (_parent: unknown, { input }: { input: CreateUserInput }, ctx: Context) => ctx.services.auth.signupUser(input),

  login: (_parent: unknown, { email, password }: { email: string; password: string }, ctx: Context) => ctx.services.auth.loginUser(email, password),
};
