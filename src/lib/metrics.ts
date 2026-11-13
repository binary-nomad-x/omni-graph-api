import client from "prom-client";
import { weatherMetricsRegister } from "@gql-prisma-api/lib/weather-metrics.js";

// Reuse the existing register so /metrics serves everything.
export const register = weatherMetricsRegister;

export const graphqlRequestCounter = new client.Counter({
  name: "graphql_requests_total",
  help: "Total GraphQL requests",
  labelNames: ["operation", "status"],
  registers: [register],
});

export const graphqlRequestDuration = new client.Histogram({
  name: "graphql_request_duration_ms",
  help: "GraphQL request duration in milliseconds",
  labelNames: ["operation"],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [register],
});

export const graphqlResolverDuration = new client.Histogram({
  name: "graphql_resolver_duration_ms",
  help: "Per-field resolver duration in milliseconds",
  labelNames: ["field"],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500],
  registers: [register],
});

export const cacheHitCounter = new client.Counter({
  name: "cache_hits_total",
  help: "Cache hit/miss counter",
  labelNames: ["result"],
  registers: [register],
});

export const rateLimitCounter = new client.Counter({
  name: "rate_limit_rejections_total",
  help: "Rate limited requests",
  registers: [register],
});

export const queueDepthGauge = new client.Gauge({
  name: "queue_depth",
  help: "Queue depth (waiting + active)",
  labelNames: ["queue"],
  registers: [register],
});