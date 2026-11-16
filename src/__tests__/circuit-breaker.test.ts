import { describe, it, expect, beforeEach } from "vitest";
import { CircuitBreaker, CircuitBreakerOpenError } from "../utils/circuit-breaker.js";

describe("CircuitBreaker", () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: "test",
      failureThreshold: 2,
      resetTimeoutMs: 50,
      halfOpenMaxCalls: 1,
    });
  });

  it("starts in CLOSED state", () => {
    expect(breaker.state).toBe("CLOSED");
  });

  it("transitions to OPEN after exceeding failure threshold", async () => {
    const failingFn = async () => {
      throw new Error("fail");
    };

    await expect(breaker.execute(failingFn)).rejects.toThrow("fail");
    await expect(breaker.execute(failingFn)).rejects.toThrow("fail");
    expect(breaker.state).toBe("OPEN");
  });

  it("throws CircuitBreakerOpenError when OPEN", async () => {
    const failingFn = async () => {
      throw new Error("fail");
    };

    await expect(breaker.execute(failingFn)).rejects.toThrow("fail");
    await expect(breaker.execute(failingFn)).rejects.toThrow("fail");
    expect(breaker.state).toBe("OPEN");

    await expect(breaker.execute(failingFn)).rejects.toThrow(CircuitBreakerOpenError);
  });

  it("transitions to HALF_OPEN after resetTimeoutMs", async () => {
    const failingFn = async () => {
      throw new Error("fail");
    };

    await expect(breaker.execute(failingFn)).rejects.toThrow("fail");
    await expect(breaker.execute(failingFn)).rejects.toThrow("fail");
    expect(breaker.state).toBe("OPEN");

    await new Promise((r) => setTimeout(r, 100));

    const succeedingFn = async () => {
      return "success";
    };

    const result = await breaker.execute(succeedingFn);
    expect(result).toBe("success");
    expect(breaker.state).toBe("CLOSED");
  });

  it("returns the result of the wrapped function on success", async () => {
    const fn = async () => 42;
    const result = await breaker.execute(fn);
    expect(result).toBe(42);
  });
});
