import cron, { type ScheduledTask } from "node-cron";
import { logger } from "@gql-prisma-api/utils/logger.js";
import { maintenanceQueue } from "@gql-prisma-api/lib/queues/index.js";

let task: ScheduledTask | null = null;

/**
 * Nightly jobs: cleanup stale carts, reindex search, refresh stats.
 * Runs at 02:00 server time, enqueues work into the maintenance queue.
 */
export function startMaintenanceCron(): void {
  if (task) {
    logger.warning("Maintenance cron already running — skipping start");
    return;
  }

  task = cron.schedule("0 2 * * *", async () => {
    const scheduledAt = new Date().toISOString();
    try {
      await maintenanceQueue.add("cleanup.stale-carts", { scheduledAt });
      await maintenanceQueue.add("reindex.search", { scheduledAt });
      logger.info("Maintenance cron enqueued nightly jobs", { scheduledAt });
    } catch (err) {
      logger.error("Maintenance cron failed to enqueue", { error: String(err) });
    }
  });

  logger.info("Maintenance cron started", { schedule: "0 2 * * * (nightly 02:00)" });
}

export function stopMaintenanceCron(): void {
  if (task) {
    task.stop();
    task = null;
    logger.info("Maintenance cron stopped");
  }
}