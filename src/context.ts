import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { IncomingMessage } from "http";
import { randomUUID } from "node:crypto";
import { verifyToken } from "@gql-prisma-api/utils/auth.js";
import type { Context } from "@gql-prisma-api/types/context.js";
import { Services } from "@gql-prisma-api/lib/Services.js";
import { createLoaders } from "@gql-prisma-api/loaders/index.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });
const services = new Services(prisma);

export async function createContext({ req }: { req: IncomingMessage }): Promise<Context> {
  const token = req.headers.authorization?.replace("Bearer ", "");
  let userId: string | undefined;
  let userRole: string | undefined;

  if (token) {
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
      userRole = decoded.role;
    } catch {
      // Invalid token
    }
  }

  const correlationId = (req.headers["x-correlation-id"] as string) || randomUUID();

  return { prisma, services, userId, userRole, loaders: createLoaders(prisma), correlationId };
}

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
