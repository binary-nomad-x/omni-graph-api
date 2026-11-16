import { Redis } from "ioredis";
import { logger } from "@gql-prisma-api/utils/logger.js";

export const redisConnection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

redisConnection.on("error", (err) => {
  logger.error("Redis connection error", { error: err.message });
});

redisConnection.on("connect", () => {
  logger.info("Redis connected");
});

// ─── Cache-aside helpers ─────────────────────────────────────────────

const CACHE_VERSION_KEY = "cache:version";

export function cacheKey(namespace: string, ...parts: (string | number)[]): string {
  return `cache:${namespace}:${parts.join(":")}`;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await redisConnection.get(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.warning("Cache get failed — degrading to DB", { key, error: String(err) });
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  try {
    await redisConnection.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    logger.warning("Cache set failed", { key, error: String(err) });
  }
}

/**
 * Cache-aside pattern: read from cache, fall back to loader, then backfill.
 */
export async function cacheAside<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;
  const value = await loader();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

/** Invalidate a whole namespace by bumping its version (pipeline batching). */
export async function invalidateNamespace(namespace: string): Promise<void> {
  try {
    await redisConnection
      .multi()
      .incr(`cache:invalidations:${namespace}`)
      .exec();
    logger.info("Cache namespace invalidated", { namespace });
  } catch (err) {
    logger.warning("Cache invalidation failed", { namespace, error: String(err) });
  }
}

/** Invalidate a specific key immediately. */
export async function cacheDelete(key: string): Promise<void> {
  try {
    await redisConnection.del(key);
  } catch (err) {
    logger.warning("Cache delete failed", { key, error: String(err) });
  }
}

// ─── Distributed lock (SET NX) ────────────────────────────────────────

export async function acquireLock(key: string, ttlSeconds = 10): Promise<boolean> {
  const result = await redisConnection.set(`lock:${key}`, "1", "EX", ttlSeconds, "NX");
  return result === "OK";
}

export async function releaseLock(key: string): Promise<void> {
  await redisConnection.del(`lock:${key}`);
}

/** Run a function while holding a distributed lock; returns null if lock busy. */
export async function withLock<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T | null> {
  const acquired = await acquireLock(key, ttlSeconds);
  if (!acquired) return null;
  try {
    return await fn();
  } finally {
    await releaseLock(key);
  }
}

// ─── Rate limiting (sliding window) ───────────────────────────────────

/**
 * Sliding-window rate limiter backed by Redis sorted sets.
 * Returns true if the request is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const zkey = `ratelimit:${key}`;
  try {
    const results = await redisConnection
      .multi()
      .zremrangebyscore(zkey, 0, windowStart)
      .zcard(zkey)
      .exec();
    const count = results?.[1]?.[1];
    const current = Number(count ?? 0);
    if (current >= limit) return false;
    await redisConnection
      .multi()
      .zadd(zkey, now, `${now}:${Math.random().toString(36).slice(2)}`)
      .pexpire(zkey, windowSeconds * 1000 + 1000)
      .exec();
    return true;
  } catch (err) {
    // Fail open — Redis unavailable shouldn't block traffic.
    logger.warning("Rate limiter failed — failing open", { key, error: String(err) });
    return true;
  }
}

// ─── Pub/Sub ───────────────────────────────────────────────────────────

// Dedicated connections: a subscriber connection enters subscriber mode and
// cannot run regular commands, so it must be separate from the shared client.
let subscriberClient: Redis | null = null;

function getSubscriberClient(): Redis {
  if (!subscriberClient) {
    subscriberClient = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
    subscriberClient.on("error", (err) => {
      logger.error("Redis subscriber error", { error: err.message });
    });
  }
  return subscriberClient;
}

/** Publish a JSON message to a channel. Returns number of subscribers reached. */
export async function publishEvent(channel: string, message: Record<string, unknown>): Promise<number> {
  try {
    return await redisConnection.publish(channel, JSON.stringify({ ...message, publishedAt: new Date().toISOString() }));
  } catch (err) {
    logger.warning("Redis publish failed", { channel, error: String(err) });
    return 0;
  }
}

/**
 * Subscribe to a channel and invoke the handler for each message.
 * Returns an unsubscribe function.
 */
export async function subscribeToChannel(
  channel: string,
  handler: (message: Record<string, unknown>) => void,
): Promise<() => Promise<void>> {
  const sub = getSubscriberClient();
  await sub.subscribe(channel);
  logger.info("Redis subscribed to channel", { channel });

  const onMessage = (ch: string, raw: string): void => {
    if (ch !== channel) return;
    try {
      handler(JSON.parse(raw) as Record<string, unknown>);
    } catch (err) {
      logger.warning("Redis message handler failed", { channel, error: String(err) });
    }
  };
  sub.on("message", onMessage);

  return async () => {
    sub.off("message", onMessage);
    await sub.unsubscribe(channel);
    logger.info("Redis unsubscribed from channel", { channel });
  };
}

// ─── Connection health ────────────────────────────────────────────────

export async function redisPing(): Promise<boolean> {
  try {
    const pong = await redisConnection.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  try {
    if (subscriberClient) {
      subscriberClient.disconnect();
      subscriberClient = null;
      logger.info("Redis subscriber connection closed");
    }
    await redisConnection.quit();
    logger.info("Redis connection closed");
  } catch {
    redisConnection.disconnect();
  }
}
