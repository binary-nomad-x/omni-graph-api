import { appendFileSync, copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "./config.js";

const CACHE_DIR = resolve(config.root, ".cache");
const LOG_DIR = resolve(CACHE_DIR, "novu-logs");

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function now(): string {
  return new Date().toISOString();
}

const runId = timestamp();

export class RunLogger {
  private readonly logFile: string;
  private readonly latestLink: string;
  private entries: Array<{ level: string; message: string; data?: unknown }> = [];

  constructor() {
    ensureDir(LOG_DIR);
    this.logFile = resolve(LOG_DIR, `${runId}.log`);
    this.latestLink = resolve(LOG_DIR, "latest.log");
    this.info("Run started", { runId });
  }

  private write(level: string, message: string, data?: unknown): void {
    const entry = { time: now(), level, message, data };
    this.entries.push({ level, message, data });
    const line = JSON.stringify(entry) + "\n";
    appendFileSync(this.logFile, line, "utf-8");
    // update latest.log by copy (atomic-ish on most OS)
    try {
      rmSync(this.latestLink, { force: true });
    } catch { /* ignore */
    }
    try {
      copyFileSync(this.logFile, this.latestLink);
    } catch { /* ignore */
    }
    // also print to stderr
    this.print(level, message, data);
  }

  private print(level: string, message: string, data?: unknown): void {
    const prefix = level === "error" ? "ERR" : level === "warn" ? "WRN" : "INF";
    const meta = data ? ` ${JSON.stringify(data)}` : "";
    process.stderr.write(`[${prefix}] ${message}${meta}\n`);
  }

  info(message: string, data?: unknown): void { this.write("info", message, data); }

  warn(message: string, data?: unknown): void { this.write("warn", message, data); }

  error(message: string, data?: unknown): void { this.write("error", message, data); }

  summary(): { logFile: string; entries: number } {
    return { logFile: this.logFile, entries: this.entries.length };
  }
}
