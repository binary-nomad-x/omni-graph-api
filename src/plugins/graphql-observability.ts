import type { ApolloServerPlugin, BaseContext, GraphQLRequestContext, GraphQLRequestListener } from "@apollo/server";
import { graphqlRequestCounter, graphqlRequestDuration } from "@gql-prisma-api/lib/metrics.js";
import { logger } from "@gql-prisma-api/utils/logger.js";

/**
 * Query complexity + depth limits and request metrics.
 * Complexity scoring: each field costs 1, list fields add a multiplier.
 */
export const MAX_DEPTH = 12;
export const MAX_COMPLEXITY = 800;

export function estimateComplexity(query: string): number {
  // Rough heuristic: count fields + list multipliers.
  const fieldMatches = query.match(/(?<!\w)[a-zA-Z_]\w*(?=\s*(\(|\{|:|,|\n|$))/g) ?? [];
  const listFields = query.match(/\[\s*\w+\s*(!)?\s*\]/g)?.length ?? 0;
  const fragments = query.match(/fragment\s+\w+\s+on/g)?.length ?? 0;
  return fieldMatches.length + listFields * 10 + fragments * 5;
}

export function estimateDepth(query: string): number {
  let depth = 0;
  let maxDepth = 0;
  for (const ch of query) {
    if (ch === "{") {
      depth++;
      maxDepth = Math.max(maxDepth, depth);
    } else if (ch === "}") {
      depth--;
    }
  }
  return maxDepth;
}

export const graphqlObservabilityPlugin: ApolloServerPlugin<BaseContext> = {
  async requestDidStart(requestContext: GraphQLRequestContext<BaseContext>) {
    const start = Date.now();
    const operationName = requestContext.request.operationName ?? "anonymous";
    const query = requestContext.request.query ?? "";
    const ctx = requestContext.contextValue as { correlationId?: string } | undefined;

    const depth = estimateDepth(query);
    if (depth > MAX_DEPTH) {
      logger.warning("GraphQL query rejected — depth limit exceeded", { depth, maxDepth: MAX_DEPTH, operationName });
      throw new Error(`Query depth ${depth} exceeds maximum allowed depth ${MAX_DEPTH}`);
    }

    const complexity = estimateComplexity(query);
    if (complexity > MAX_COMPLEXITY) {
      logger.warning("GraphQL query rejected — complexity limit exceeded", {
        complexity,
        maxComplexity: MAX_COMPLEXITY,
        operationName,
      });
      throw new Error(`Query complexity ${complexity} exceeds maximum allowed complexity ${MAX_COMPLEXITY}`);
    }

    return {
      async willSendResponse(requestContext: GraphQLRequestContext<BaseContext>) {
        const duration = Date.now() - start;
        const body = requestContext.response.body;
        const errors =
          body?.kind === "single" && body && "errors" in body ? (body as { errors?: unknown[] }).errors?.length : 0;
        const status = errors ? "error" : "ok";
        graphqlRequestCounter.inc({ operation: operationName, status });
        graphqlRequestDuration.observe({ operation: operationName }, duration);
        logger.info("GraphQL request complete", {
          correlationId: ctx?.correlationId,
          operationName,
          durationMs: duration,
          status,
        });
      },
      async didEncounterErrors(requestContext: GraphQLRequestContext<BaseContext>) {
        for (const err of requestContext.errors ?? []) {
          logger.error("GraphQL error", {
            correlationId: ctx?.correlationId,
            operationName,
            message: err.message,
            path: err.path,
          });
        }
      },
    } satisfies GraphQLRequestListener<BaseContext>;
  },
};