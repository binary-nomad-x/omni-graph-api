import { appendFileSync, copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "./config.js";

const CACHE_DIR = resolve(config.root, ".cache");
const LOG_DIR = resolve(CACHE_DIR, "novu-logs");

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function getEnvironment(): string {
  return process.env.LOG_CHANNEL_NAME
    || config.nodeEnv
    || process.env.NODE_ENV
    || (process.env.NODE_ENV === "production" ? "production" : "local");
}

function nowLaravel(): string {
  return new Date().toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
}

const runId = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

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

  private levelName(level: string): string {
    const map: Record<string, string> = {
      debug: "DEBUG",
      info: "INFO",
      warn: "WARNING",
      warning: "WARNING",
      error: "ERROR",
      critical: "CRITICAL",
    };
    return map[level.toLowerCase()] ?? level.toUpperCase();
  }

  private write(level: string, message: string, data?: unknown): void {
    this.entries.push({ level, message, data });
    const timestamp = nowLaravel();
    const meta = data ? ` ${JSON.stringify(data)}` : "";
    const line = `[${timestamp}] ${getEnvironment()}.${this.levelName(level)}: ${message}${meta}\n`;
    appendFileSync(this.logFile, line, "utf-8");
    try { rmSync(this.latestLink, { force: true }); } catch { /* ignore */ }
    try { copyFileSync(this.logFile, this.latestLink); } catch { /* ignore */ }
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
