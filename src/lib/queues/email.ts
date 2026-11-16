import { Queue } from "bullmq";

import { redisConnection } from "@gql-prisma-api/lib/redis.js";

export const emailQueue = new Queue("email-queue", {
  connection: redisConnection as any,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: false,
  },
});

export type EmailJobName = "user.deleted" | "order.confirmation" | "welcome";

export function enqueueEmail(name: EmailJobName, data: Record<string, unknown>): Promise<string> {
  return emailQueue.add(name, data).then((job) => job.id ?? "");
}
