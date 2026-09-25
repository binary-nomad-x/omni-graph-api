import cron, { ScheduledTask } from "node-cron";
import { WeatherService } from "@gql-prisma-api/modules/weather/weather.service.js";
import { logger } from "@gql-prisma-api/utils/logger.js";
import { weatherFetchCounter, weatherConsecutiveFailures, weatherMetricsRegister } from "@gql-prisma-api/lib/weather-metrics.js";

const weather = new WeatherService();

let task: ScheduledTask | null = null;
let lastLogLine = "";
let lastLogAt = 0;
let consecutiveFailures = 0;
let totalRuns = 0;
let totalFailures = 0;

// Don't spam logs if nothing changed
const LOG_SUPPRESS_MS = 5 * 60 * 1000; // Re-log unchanged state every 5 min

// Alert after N consecutive failures
const FAILURE_ALERT_THRESHOLD = 3;

export function startWeatherCron(): void {
  if (task) {
    logger.warning("Weather cron already running — skipping start");
    return;
  }

  // Run every minute
  task = cron.schedule("* * * * *", async () => {
    totalRuns++;
    const startedAt = Date.now();

    try {
      const data = await weather.fetchCurrent();

      if (!data) {
        consecutiveFailures++;
        totalFailures++;
        weatherFetchCounter.inc({ status: "error" });
        weatherConsecutiveFailures.inc(1);

        if (consecutiveFailures === FAILURE_ALERT_THRESHOLD) {
          logger.error("Weather cron: consecutive failures threshold reached", {
            consecutiveFailures,
            totalFailures,
            totalRuns,
          });
        }

        return;
      }

      // Reset failure counter on success
      consecutiveFailures = 0;
      weatherFetchCounter.inc({ status: "success" });
      weatherConsecutiveFailures.set(0);

      const line = weather.formatSummary(data);
      const now = Date.now();
      const payload = weather.toLogPayload(data);

      // Log on change OR every 5 minutes
      const shouldLog = line !== lastLogLine || now - lastLogAt > LOG_SUPPRESS_MS;

      if (shouldLog) {
        logger.info(line, {
          ...payload,
          durationMs: Date.now() - startedAt,
        });
        lastLogLine = line;
        lastLogAt = now;
      } else {
        logger.debug("Weather cron: no change — suppressing log", payload);
      }
    } catch (err) {
      consecutiveFailures++;
      totalFailures++;
      weatherFetchCounter.inc({ status: "error" });
      weatherConsecutiveFailures.inc(1);

      logger.error("Weather cron: unexpected error", {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        consecutiveFailures,
        durationMs: Date.now() - startedAt,
      });
    }
  });

  logger.info("Weather cron started", {
    schedule: "every 1 minute",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

export function stopWeatherCron(): void {
  if (task) {
    task.stop();
    task = null;
    logger.info("Weather cron stopped", { totalRuns, totalFailures });
  }
}

/**
 * Manual trigger — useful for testing or admin endpoints.
 */
export async function runWeatherCronOnce(): Promise<void> {
  logger.info("Weather cron: manual trigger");
  const data = await weather.fetchCurrent();
  if (data) {
    logger.info(weather.formatSummary(data), weather.toLogPayload(data));
  }
}

export function registerWeatherMetricsEndpoint(httpServer: any): void {
  httpServer.get("/metrics", async (req: any, res: any) => {
    try {
      res.set("Content-Type", weatherMetricsRegister.contentType);
      res.end(weatherMetricsRegister.metrics());
    } catch (err) {
      logger.error("Error serving metrics", { error: String(err) });
      res.status(500).end();
    }
  });

  logger.info("Weather Prometheus metrics endpoint registered", {
    endpoint: "/metrics",
  });
}