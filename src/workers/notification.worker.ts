import { Worker } from "bullmq";
import { redisConnection } from "@gql-prisma-api/lib/redis.js";
import { deadLetterQueue, enqueueWithIdempotency, notificationQueue } from "@gql-prisma-api/lib/queues/index.js";
import { triggerNovuWorkflow, type NovuEventName } from "@gql-prisma-api/utils/novu.js";
import { CircuitBreaker } from "@gql-prisma-api/utils/circuit-breaker.js";
import { logger } from "@gql-prisma-api/utils/logger.js";

const novuBreaker = new CircuitBreaker({
  name: "novu",
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxCalls: 2,
});

export const notificationWorker = new Worker(
  "notification-queue",
  async (job) => {
    const { userId, eventName, payload } = job.data as {
      userId: string;
      eventName: NovuEventName;
      payload: Record<string, unknown>;
    };
    await novuBreaker.execute(() => triggerNovuWorkflow(userId, eventName, payload));
  },
  {
    connection: redisConnection as any,
  },
);

notificationWorker.on("failed", async (job, err) => {
  if (!job) return;
  const maxAttempts = job.opts.attempts ?? 1;
  if (job.attemptsMade >= maxAttempts) {
    logger.error("Notification job exhausted retries — moving to DLQ", {
      jobId: job.id,
      name: job.name,
      error: err.message,
    });
    await deadLetterQueue.add(
      job.name,
      { ...job.data, originalQueue: "notification-queue", originalJobId: job.id, error: err.message },
      { attempts: 1 },
    );
  }
});

export async function enqueueNotification(
  userId: string,
  eventName: NovuEventName,
  payload: Record<string, unknown> = {},
  idempotencyKey?: string,
): Promise<string> {
  return enqueueWithIdempotency(notificationQueue, eventName, { userId, eventName, payload }, idempotencyKey);
}