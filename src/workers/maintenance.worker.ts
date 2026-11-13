import { Worker } from "bullmq";
import { redisConnection } from "@gql-prisma-api/lib/redis.js";
import { logger } from "@gql-prisma-api/utils/logger.js";

export const maintenanceWorker = new Worker(
  "maintenance-queue",
  async (job) => {
    switch (job.name) {
      case "cleanup.stale-carts":
        logger.info("Maintenance: stale cart cleanup triggered", { scheduledAt: job.data.scheduledAt });
        // Stale carts are cleaned by the nightly cron (see src/cron/maintenance.cron.ts).
        break;
      case "reindex.search":
        logger.info("Maintenance: search reindex triggered", { scheduledAt: job.data.scheduledAt });
        break;
      default:
        logger.warning("Unknown maintenance job", { name: job.name });
    }
  },
  {
    connection: redisConnection as any,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
);