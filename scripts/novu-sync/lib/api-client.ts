import { request as httpsRequest, RequestOptions } from "node:https";
import { request as httpRequest } from "node:http";
import { config } from "./config.js";
import { RunLogger } from "./logger.js";

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

function parseUrl(base: string, path: string): URL {
  return new URL(path, base.endsWith("/") ? base : base + "/");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpRequestPromise(
  url: URL,
  options: RequestOptions,
  body?: string,
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const mod = url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = mod(url, options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        resolve({ statusCode: res.statusCode ?? 500, body: Buffer.concat(chunks).toString("utf-8") });
      });
    });
    // Node's `timeout` option only emits an event — without destroying the
    // socket a stalled connection would hang the CLI forever.
    req.on("timeout", () => req.destroy(new Error(`Request timed out after ${options.timeout}ms`)));
    req.on("error", (err) => reject(err));
    if (body) req.write(body);
    req.end();
  });
}

function isRetryableStatus(statusCode: number): boolean {
  return statusCode === 429 || (statusCode >= 500 && statusCode < 600);
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof ApiError) return isRetryableStatus(err.statusCode);
  // Network-level errors (timeout, socket reset, DNS) are retryable.
  return true;
}

export class NovuApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly log: RunLogger;

  constructor(log: RunLogger) {
    this.log = log;
    this.apiKey = config.novuApiKey;
    this.baseUrl = config.novuApiUrl;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.apiKey) throw new ApiError(401, "NOVU_API_SECRET_KEY is not set in .env");

    const url = parseUrl(this.baseUrl, path);
    const headers: Record<string, string | number> = {
      Authorization: `ApiKey ${this.apiKey}`,
      "Content-Type": "application/json",
    };
    const jsonBody = body === undefined ? undefined : JSON.stringify(body);
    if (jsonBody !== undefined) headers["Content-Length"] = Buffer.byteLength(jsonBody);

    let lastError: Error = new Error(`Request failed: ${path}`);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await httpRequestPromise(url, { method, headers, timeout: REQUEST_TIMEOUT_MS }, jsonBody);

        if (isRetryableStatus(res.statusCode) && attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          this.log.warn(`Retry ${attempt}/${MAX_RETRIES} after ${res.statusCode}`, { path, delayMs: Math.round(delay) });
          await sleep(delay);
          continue;
        }

        if (res.statusCode === 401) throw new ApiError(401, "Authentication failed — check NOVU_API_SECRET_KEY");
        if (res.statusCode === 404) throw new ApiError(404, `Not found: ${path}`);
        if (res.statusCode === 409) throw new ApiError(409, `Conflict: ${res.body}`);
        if (res.statusCode >= 400) {
          let parsed: unknown;
          try {
            parsed = JSON.parse(res.body);
          } catch {
            parsed = res.body;
          }
          throw new ApiError(res.statusCode, `API error ${res.statusCode} on ${path}`, parsed);
        }

        if (!res.body) return undefined as T;
        return JSON.parse(res.body) as T;
      } catch (err) {
        if (!isRetryableError(err)) throw err;
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 500;
          this.log.warn(`Retry ${attempt}/${MAX_RETRIES} after error`, { path, error: lastError.message, delayMs: delay });
          await sleep(delay);
        }
      }
    }

    throw lastError;
  }

  // ─── Notification groups ────────────────────────────────────
  async listNotificationGroups(): Promise<Array<Record<string, unknown>>> {
    return this.request("GET", "/v1/notification-groups");
  }

  // ─── Workflows (Novu v2 API) ────────────────────────────────

  /**
   * Fetch ALL workflows by paging through the v2 list endpoint.
   * The previous version ignored the `page` parameter, so any workflow beyond
   * the first page was silently invisible to list/status/pull.
   */
  async listWorkflows(pageSize = 50): Promise<{ data: Array<Record<string, unknown>>; totalCount: number }> {
    const all: Array<Record<string, unknown>> = [];
    let totalCount = 0;
    let page = 0;

    // Hard cap to avoid infinite loops on a misbehaving API.
    while (page < 200) {
      const raw = await this.request<{ data: { workflows?: Array<Record<string, unknown>>; totalCount?: number; hasMore?: boolean } }>(
        "GET",
        `/v2/workflows?page=${page}&limit=${pageSize}`,
      );
      const workflows = raw.data?.workflows ?? [];
      totalCount = raw.data?.totalCount ?? all.length + workflows.length;
      all.push(...workflows);

      const hasMore = raw.data?.hasMore ?? all.length < totalCount;
      if (workflows.length === 0 || !hasMore) break;
      page++;
    }

    return { data: all, totalCount };
  }

  async getWorkflow(workflowId: string): Promise<Record<string, unknown>> {
    const raw = await this.request<{ data: Record<string, unknown> }>("GET", `/v2/workflows/${workflowId}`);
    return raw.data ?? {};
  }

  async createWorkflow(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const raw = await this.request<{ data: Record<string, unknown> }>("POST", "/v2/workflows", data);
    return raw.data ?? {};
  }

  async updateWorkflow(workflowId: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const raw = await this.request<{ data: Record<string, unknown> }>("PUT", `/v2/workflows/${workflowId}`, data);
    return raw.data ?? {};
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    await this.request("DELETE", `/v2/workflows/${workflowId}`);
  }

  // ─── Layouts (Novu v1 API) ──────────────────────────────────

  /** Fetch ALL layouts by paging through the v1 list endpoint. */
  async listLayouts(pageSize = 50): Promise<{ data: Array<Record<string, unknown>>; totalCount: number }> {
    const all: Array<Record<string, unknown>> = [];
    let totalCount = 0;
    let page = 0;

    while (page < 200) {
      const raw = await this.request<{ data?: Array<Record<string, unknown>>; totalCount?: number }>(
        "GET",
        `/v1/layouts?page=${page}&limit=${pageSize}`,
      );
      const layouts = raw.data ?? [];
      totalCount = raw.totalCount ?? all.length + layouts.length;
      all.push(...layouts);

      if (layouts.length === 0 || all.length >= totalCount) break;
      page++;
    }

    return { data: all, totalCount };
  }

  async getLayout(layoutIdOrIdentifier: string): Promise<Record<string, unknown>> {
    const raw = await this.request<{ data?: Record<string, unknown> }>("GET", `/v1/layouts/${layoutIdOrIdentifier}`);
    return (raw?.data ?? raw) as Record<string, unknown>;
  }

  async createLayout(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request("POST", "/v1/layouts", data);
  }

  async updateLayout(layoutId: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request("PUT", `/v1/layouts/${layoutId}`, data);
  }

  async deleteLayout(layoutId: string): Promise<void> {
    await this.request("DELETE", `/v1/layouts/${layoutId}`);
  }
}
