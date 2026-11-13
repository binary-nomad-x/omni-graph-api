/**
 * Circuit breaker: fail fast on external dependencies (Novu, email provider).
 * States: CLOSED (normal) -> OPEN (failing) -> HALF_OPEN (probing).
 */
import { logger } from "@gql-prisma-api/utils/logger.js";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxCalls: number;
  name: string;
}

export class CircuitBreakerOpenError extends Error {
  constructor(name: string) {
    super(`Circuit breaker "${name}" is OPEN — failing fast`);
    this.name = "CircuitBreakerOpenError";
  }
}

export class CircuitBreaker {
  private _state: CircuitState = "CLOSED";
  private failures = 0;
  private successes = 0;
  private halfOpenCalls = 0;
  private lastOpenedAt = 0;

  constructor(private readonly options: CircuitBreakerOptions) {}

  get state(): CircuitState {
    return this._state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this._state === "OPEN") {
      if (Date.now() - this.lastOpenedAt >= this.options.resetTimeoutMs) {
        this._state = "HALF_OPEN";
        this.halfOpenCalls = 0;
        logger.info("Circuit breaker entering HALF_OPEN", { name: this.options.name });
      } else {
        throw new CircuitBreakerOpenError(this.options.name);
      }
    }

    if (this._state === "HALF_OPEN") {
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    if (this._state === "HALF_OPEN") {
      this.successes++;
      if (this.successes >= this.options.halfOpenMaxCalls) {
        this._state = "CLOSED";
        this.failures = 0;
        this.successes = 0;
        logger.info("Circuit breaker CLOSED — recovered", { name: this.options.name });
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    if (this._state === "HALF_OPEN") {
      this.open();
      return;
    }
    this.failures++;
    if (this.failures >= this.options.failureThreshold) {
      this.open();
    }
  }

  private open(): void {
    this._state = "OPEN";
    this.lastOpenedAt = Date.now();
    logger.warning("Circuit breaker OPENED", {
      name: this.options.name,
      failures: this.failures,
      resetTimeoutMs: this.options.resetTimeoutMs,
    });
  }
}
