import "dotenv/config";
import http from "http";
import { ApolloServer, HeaderMap } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import cors from "cors";
import bodyParser from "body-parser";
import { createContext } from "@gql-prisma-api/context.js";
import { typeDefs } from "@gql-prisma-api/schema/typeDefs.js";
import { resolvers } from "@gql-prisma-api/modules/index.js";
import { logger } from "@gql-prisma-api/utils/logger.js";
import { ApolloServerPluginGraphiQL } from "@gql-prisma-api/plugins/graphiql.js";
import "@gql-prisma-api/workers/email.worker.js";
import { startWeatherCron } from "@gql-prisma-api/cron/weather.cron.js";
import { weatherMetricsRegister } from "@gql-prisma-api/lib/weather-metrics.js";

const PORT = Number(process.env.PORT) || 4000;

import { stopWeatherCron } from "./cron/weather.cron.js";

startWeatherCron();

process.on("SIGTERM", () => {
  stopWeatherCron();
  process.exit(0);
});

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  csrfPrevention: false,
  plugins: [ApolloServerPluginGraphiQL()],
});

const httpServer = http.createServer();

const corsHandler = cors({
  origin: true,
  credentials: true,
});

const jsonParser = bodyParser.json({ limit: "50mb" });

httpServer.on("request", async (req, res) => {
  if (req.url?.startsWith("/metrics")) {
    try {
      const metrics = await weatherMetricsRegister.metrics();
      res.setHeader("Content-Type", weatherMetricsRegister.contentType);
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

httpServer.listen(PORT, () => {
  const url = `http://localhost:${PORT}/graphql`;
  logger.info("Server started", { url });
  console.log(`\n  GraphQL endpoint: ${url}\n`);

  startWeatherCron();
});

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
