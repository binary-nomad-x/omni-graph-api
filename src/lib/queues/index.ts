import { Queue } from "bullmq";
import { redisConnection } from "@gql-prisma-api/lib/redis.js";

export { emailQueue } from "./email.js";

export const notificationQueue = new Queue("notification-queue", {
  connection: redisConnection as any,
  defaultJobOptions: { removeOnComplete: 100, removeOnFail: false },
});

export const maintenanceQueue = new Queue("maintenance-queue", {
  connection: redisConnection as any,
  defaultJobOptions: { removeOnComplete: 100, removeOnFail: false },
});

export const deadLetterQueue = new Queue("dead-letter-queue", {
  connection: redisConnection as any,
  defaultJobOptions: { removeOnComplete: 100, removeOnFail: false },
});

export const QUEUE_NAMES = ["email-queue", "notification-queue", "maintenance-queue", "dead-letter-queue"] as const;
export type QueueName = (typeof QUEUE_NAMES)[number];

/** Idempotency: dedupe mutating jobs by key (exactly-once semantics). */
export async function enqueueWithIdempotency(
  queue: Queue,
  name: string,
  data: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<string> {
  if (idempotencyKey) {
    const existing = await redisConnection.get(`idem:${queue.name}:${idempotencyKey}`);
    if (existing) return existing;
  }
  const job = await queue.add(name, data, {
    jobId: idempotencyKey,
    removeOnComplete: 100,
    removeOnFail: false,
  });
  if (idempotencyKey) {
    await redisConnection.set(`idem:${queue.name}:${idempotencyKey}`, job.id ?? "", "EX", 3600);
  }
  return job.id ?? "";
}

/** Back-pressure: queue depth above threshold sheds load. */
export async function getQueueDepth(queue: Queue): Promise<number> {
  const counts = await queue.getJobCounts("waiting", "active");
  return counts.waiting + counts.active;
}

export const BACK_PRESSURE_THRESHOLD = 1000;

export async function closeQueues(): Promise<void> {
  const { emailQueue } = await import("./email.js");
  await Promise.all([emailQueue, notificationQueue, maintenanceQueue, deadLetterQueue].map((q) => q.close()));
}
