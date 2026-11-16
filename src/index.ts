import "dotenv/config";
import http from "http";
import { ApolloServer, HeaderMap } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import cors from "cors";
import bodyParser from "body-parser";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { createContext, prisma } from "@gql-prisma-api/context.js";
import { typeDefs } from "@gql-prisma-api/schema/typeDefs.js";
import { resolvers } from "@gql-prisma-api/modules/index.js";
import { logger } from "@gql-prisma-api/utils/logger.js";
import { ApolloServerPluginGraphiQL } from "@gql-prisma-api/plugins/graphiql.js";
import { authDirectiveTransformer } from "@gql-prisma-api/plugins/auth-directive.js";
import { graphqlObservabilityPlugin } from "@gql-prisma-api/plugins/graphql-observability.js";
import { register, rateLimitCounter, queueDepthGauge } from "@gql-prisma-api/lib/metrics.js";
import { redisPing, rateLimit, closeRedis } from "@gql-prisma-api/lib/redis.js";
import { emailQueue, notificationQueue, maintenanceQueue, BACK_PRESSURE_THRESHOLD } from "@gql-prisma-api/lib/queues/index.js";
import "@gql-prisma-api/workers/email.worker.js";
import "@gql-prisma-api/workers/notification.worker.js";
import "@gql-prisma-api/workers/maintenance.worker.js";
import { startWeatherCron, stopWeatherCron } from "@gql-prisma-api/cron/weather.cron.js";
import { startMaintenanceCron, stopMaintenanceCron } from "@gql-prisma-api/cron/maintenance.cron.js";

const PORT = Number(process.env.PORT) || 4000;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 100;
const RATE_LIMIT_WINDOW = Number(process.env.RATE_LIMIT_WINDOW) || 60;

const schema = authDirectiveTransformer(makeExecutableSchema({ typeDefs, resolvers }));

const server = new ApolloServer({
  schema,
  introspection: true,
  csrfPrevention: false,
  plugins: [ApolloServerPluginGraphiQL(), graphqlObservabilityPlugin],
});

const httpServer = http.createServer();

const corsHandler = cors({
  origin: true,
  credentials: true,
});

const jsonParser = bodyParser.json({ limit: "50mb" });

async function healthReady(): Promise<{ status: string; db: boolean; redis: boolean }> {
  const [db, redis] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    redisPing(),
  ]);
  return { status: db && redis ? "ok" : "degraded", db, redis };
}

async function updateQueueDepthMetrics(): Promise<void> {
  try {
    const [email, notifications, maintenance] = await Promise.all([
      emailQueue.getJobCounts("waiting", "active"),
      notificationQueue.getJobCounts("waiting", "active"),
      maintenanceQueue.getJobCounts("waiting", "active"),
    ]);
    queueDepthGauge.set({ queue: "email-queue" }, email.waiting + email.active);
    queueDepthGauge.set({ queue: "notification-queue" }, notifications.waiting + notifications.active);
    queueDepthGauge.set({ queue: "maintenance-queue" }, maintenance.waiting + maintenance.active);
  } catch {
    // Redis may be down — metrics best-effort.
  }
}

httpServer.on("request", async (req, res) => {
  if (req.url?.startsWith("/health/live")) {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() }));
    return;
  }

  if (req.url?.startsWith("/health/ready")) {
    const result = await healthReady();
    res.statusCode = result.status === "ok" ? 200 : 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result));
    return;
  }

  if (req.url?.startsWith("/health")) {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() }));
    return;
  }

  if (req.url?.startsWith("/metrics")) {
    try {
      const metrics = await register.metrics();
      res.setHeader("Content-Type", register.contentType);
      res.end(metrics);
    } catch (err) {
      logger.error("Error serving metrics", { error: String(err) });
      res.statusCode = 500;
      res.end();
    }
    return;
  }

  corsHandler(req, res, (err) => {
    if (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ errors: [{ message: "CORS error" }] }));
      return;
    }

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    jsonParser(req, res, async (parseErr) => {
      if (parseErr) {
        res.statusCode = 400;
        res.end(JSON.stringify({ errors: [{ message: "Invalid JSON body" }] }));
        return;
      }

      // Rate limiting per user (or IP) — sliding window.
      const clientKey = req.headers.authorization?.slice(0, 32) || req.socket.remoteAddress || "anonymous";
      const allowed = await rateLimit(`graphql:${clientKey}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);
      if (!allowed) {
        rateLimitCounter.inc();
        res.statusCode = 429;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ errors: [{ message: "Rate limit exceeded — try again later" }] }));
        return;
      }

      // Back-pressure: shed load when total queue depth is too high.
      try {
        await updateQueueDepthMetrics();
        const [emailDepth, notifDepth, maintDepth] = await Promise.all([
          emailQueue.getJobCounts("waiting", "active"),
          notificationQueue.getJobCounts("waiting", "active"),
          maintenanceQueue.getJobCounts("waiting", "active"),
        ]);
        const totalDepth =
          emailDepth.waiting + emailDepth.active + notifDepth.waiting + notifDepth.active + maintDepth.waiting + maintDepth.active;
        if (totalDepth > BACK_PRESSURE_THRESHOLD) {
          logger.warning("Back-pressure: shedding request", { totalDepth, threshold: BACK_PRESSURE_THRESHOLD });
          res.statusCode = 503;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ errors: [{ message: "Server overloaded — try again later" }] }));
          return;
        }
      } catch {
        // Redis unavailable — don't block traffic.
      }

      try {
        const headers = new HeaderMap();
        for (const [key, value] of Object.entries(req.headers)) {
          if (value !== undefined) {
            headers.set(key, Array.isArray(value) ? value.join(", ") : value);
          }
        }

        const httpGraphQLRequest = {
          method: req.method!.toUpperCase(),
          headers,
          search: req.url?.includes("?") ? req.url.slice(req.url.indexOf("?")) : "",
          body: "body" in req ? (req as any).body : undefined,
        };

        const httpGraphQLResponse = await server.executeHTTPGraphQLRequest({
          httpGraphQLRequest,
          context: () => createContext({ req }),
        });

        for (const [key, value] of httpGraphQLResponse.headers) {
          res.setHeader(key, value);
        }

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Credentials", "true");

        res.statusCode = httpGraphQLResponse.status || 200;

        if (httpGraphQLResponse.body.kind === "complete") {
          res.end(httpGraphQLResponse.body.string);
        } else {
          for await (const chunk of httpGraphQLResponse.body.asyncIterator) {
            res.write(chunk);
          }
          res.end();
        }
      } catch (error) {
        logger.error("Request handler error", { error: String(error) });
        res.statusCode = 500;
        res.end(JSON.stringify({ errors: [{ message: "Internal server error" }] }));
      }
    });
  });
});

server.addPlugin(ApolloServerPluginDrainHttpServer({ httpServer }));

await server.start();

startWeatherCron();
startMaintenanceCron();

httpServer.listen(PORT, () => {
  const url = `http://localhost:${PORT}/graphql`;
  logger.info("Server started", { url });
  logger.info("GraphQL endpoint ready", { url });
});

// ─── Graceful shutdown ────────────────────────────────────────────────
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("Graceful shutdown started", { signal });

  // 1. Stop accepting new requests.
  httpServer.close(() => logger.info("HTTP server closed"));

  // 2. Stop crons.
  stopWeatherCron();
  stopMaintenanceCron();

  // 3. Drain Apollo (finishes in-flight requests).
  await server.stop();

  // 4. Close DB pool.
  await prisma.$disconnect();

  // 5. Close Redis.
  await closeRedis();

  logger.info("Graceful shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.critical("Uncaught exception", {
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason: String(reason) });
});
