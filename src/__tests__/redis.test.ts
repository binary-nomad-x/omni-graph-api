import { describe, it, expect } from "vitest";
import { cacheKey, cacheGet, cacheSet, cacheAside, rateLimit, acquireLock, releaseLock } from "../lib/redis.js";

describe("redis helpers", () => {
  it("cacheKey produces namespaced keys", () => {
    expect(cacheKey("users", "123")).toBe("cache:users:123");
  });

  it("cacheGet returns null for missing keys", async () => {
    const result = await cacheGet<string>("cache:nonexistent:key");
    expect(result).toBeNull();
  });

  it("cacheSet and cacheGet round-trip a value", async () => {
    const value = { hello: "world" };
    await cacheSet("cache:test:roundtrip", value, 10);
    const result = await cacheGet<typeof value>("cache:test:roundtrip");
    expect(result).toEqual(value);
  });

  it("cacheAside returns loader result on cache miss", async () => {
    let loaderCalled = false;
    const result = await cacheAside(
      "cache:test:aside",
      10,
      async () => {
        loaderCalled = true;
        return { data: 42 };
      },
    );
    expect(loaderCalled).toBe(true);
    expect(result).toEqual({ data: 42 });
  });

  it("rateLimit allows requests under the limit", async () => {
    const allowed = await rateLimit("test:rate", 5, 60);
    expect(allowed).toBe(true);
  });

  it("acquireLock and releaseLock work", async () => {
    const acquired = await acquireLock("test:lock", 5);
    expect(acquired).toBe(true);
    await releaseLock("test:lock");
  });
});
