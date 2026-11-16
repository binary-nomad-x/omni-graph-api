import { Worker } from "bullmq";
import { redisConnection } from "@gql-prisma-api/lib/redis.js";
import { MailService } from "@gql-prisma-api/services/mail.service.js";
import { deadLetterQueue } from "@gql-prisma-api/lib/queues/index.js";
import { logger } from "@gql-prisma-api/utils/logger.js";

export const emailWorker = new Worker(
  "email-queue",
  async (job) => {
    switch (job.name) {
      case "user.deleted":
        await MailService.sendDeletedEmail(job.data.email, job.data.name);
        break;
      case "order.confirmation":
        await MailService.sendDeletedEmail(job.data.email, job.data.name);
        break;
      default:
        logger.warning("Unknown email job", { name: job.name });
    }
  },
  {
    connection: redisConnection as any,
    limiter: {
      max: 10,
      duration: 1000,
    },
  },
);

// Retries with exponential backoff, then move to DLQ.
emailWorker.on("failed", async (job, err) => {
  if (!job) return;
  const attemptsMade = job.attemptsMade;
  const maxAttempts = job.opts.attempts ?? 1;
  if (attemptsMade >= maxAttempts) {
    logger.error("Email job exhausted retries — moving to DLQ", {
      jobId: job.id,
      name: job.name,
      error: err.message,
    });
    await deadLetterQueue.add(
      job.name,
      { ...job.data, originalQueue: "email-queue", originalJobId: job.id, error: err.message },
      { attempts: 1 },
    );
  }
});
