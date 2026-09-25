import client from "prom-client";
import { WeatherService } from "@gql-prisma-api/modules/weather/weather.service.js";
import { logger } from "@gql-prisma-api/utils/logger.js";

const weatherService = new WeatherService();

export const weatherFetchCounter = new client.Counter({
  name: "weather_fetches_total",
  help: "Total number of weather API fetch attempts",
  labelNames: ["status"],
});

export const weatherConsecutiveFailures = new client.Gauge({
  name: "weather_consecutive_failures",
  help: "Number of consecutive weather API failures",
});

export const weatherFetchDuration = new client.Histogram({
  name: "weather_fetch_duration_ms",
  help: "Weather API fetch duration in milliseconds",
  buckets: [100, 200, 300, 500, 1000, 2000, 3000, 5000],
});

export const weatherLastSuccess = new client.Gauge({
  name: "weather_last_success_timestamp",
  help: "Unix timestamp of last successful weather fetch",
});

let lastSuccess = 0;
let originalFetchCurrent: any;

try {
  originalFetchCurrent = weatherService.fetchCurrent;
} catch (err) {
  logger.warning("Could not capture original fetchCurrent", { error: String(err) });
  originalFetchCurrent = async (opts: any) => {
    return weatherService.fetchCurrent(opts);
  };
}

const wrappedFetchCurrent = async function (opts: any) {
  const start = Date.now();
  try {
    const result = await originalFetchCurrent.call(weatherService, opts);
    const duration = Date.now() - start;

    weatherFetchCounter.inc({ status: "success" });
    weatherFetchDuration.observe(duration);
    lastSuccess = Date.now();
    weatherLastSuccess.set(lastSuccess);
    weatherConsecutiveFailures.set(0);

    return result;
  } catch (err) {
    const duration = Date.now() - start;

    weatherFetchCounter.inc({ status: "error" });
    weatherFetchDuration.observe(duration);
    weatherConsecutiveFailures.inc(1);

    logger.error("Weather fetch metrics error", {
      error: err instanceof Error ? err.message : String(err),
    });

    throw err;
  }
};

weatherService.fetchCurrent = wrappedFetchCurrent;

export const weatherMetricsRegister = client.register;