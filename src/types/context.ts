import type { PrismaClient } from "@prisma/client";
import type { Services } from "@gql-prisma-api/lib/Services.js";
import type { Loaders } from "@gql-prisma-api/loaders/index.js";

export interface Context {
  prisma: PrismaClient;
  services: Services;
  loaders?: Loaders;
  userId?: string;
  userRole?: string;
  correlationId?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role?: string;
}
