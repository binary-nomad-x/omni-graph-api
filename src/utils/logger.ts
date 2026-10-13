import * as fs from "node:fs";
import * as path from "node:path";
import {inspect} from "node:util";

export type LogLevel =
  | "debug"
  | "info"
  | "notice"
  | "warning"
  | "error"
  | "critical"
  | "alert"
  | "emergency";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  notice: 2,
  warning: 3,
  error: 4,
  critical: 5,
  alert: 6,
  emergency: 7,
};

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  debug: "DEBUG",
  info: "INFO",
  notice: "NOTICE",
  warning: "WARNING",
  error: "ERROR",
  critical: "CRITICAL",
  alert: "ALERT",
  emergency: "EMERGENCY",
};

const LOG_DIR = path.resolve(process.cwd(), "logs");

function getMinLevel(): LogLevel {
  const level = (process.env.LOG_LEVEL || "debug").toLowerCase();

  return level in LEVEL_PRIORITY
    ? (level as LogLevel)
    : "debug";
}

function getEnvironment(): string {
  return process.env.LOG_CHANNEL_NAME
    || (process.env.NODE_ENV === "production"
      ? "production"
      : "local");
}

function formatMeta(meta?: unknown): string {
  if (meta === undefined) return "";

  if (meta instanceof Error) {
    return ` ${JSON.stringify({
      exception: meta.name,
      message: meta.message,
      stack: meta.stack,
    })}`;
  }

  try {
    const serialized = JSON.stringify(meta);

    if (serialized !== undefined) {
      return ` ${serialized}`;
    }
  } catch {
    // Handle circular references below.
  }

  return ` ${inspect(meta, {
    depth: 5,
    breakLength: Infinity,
    compact: true,
  })}`;
}

class Logger {
  private get env(): string {
    return getEnvironment();
  }

  private log(
    level: LogLevel,
    message: string,
    meta?: unknown,
  ): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[getMinLevel()]) {
      return;
    }

    const timestamp = new Date()
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d{3}Z$/, "");

    const metaStr = formatMeta(meta);

    // Laravel / Monolog-style single-line log entry.
    const line =
      `[${timestamp}] ${this.env}.${LOG_LEVEL_NAMES[level]}: ` +
      `${message}${metaStr}\n`;

    if (LEVEL_PRIORITY[level] >= LEVEL_PRIORITY.error) {
      process.stderr.write(line);
    } else {
      process.stdout.write(line);
    }

    this.writeToFile(line);
  }

  private writeToFile(line: string): void {
    try {
      fs.mkdirSync(LOG_DIR, {recursive: true});

      const date = new Date().toISOString().slice(0, 10);
      const filePath = path.join(LOG_DIR, `laravel-${date}.log`);

      fs.appendFileSync(filePath, line, "utf8");
    } catch {
      // Logging must never crash the application.
    }
  }

  debug(message: string, meta?: unknown): void {
    this.log("debug", message, meta);
  }

  info(message: string, meta?: unknown): void {
    this.log("info", message, meta);
  }

  notice(message: string, meta?: unknown): void {
    this.log("notice", message, meta);
  }

  warning(message: string, meta?: unknown): void {
    this.log("warning", message, meta);
  }

  error(message: string, meta?: unknown): void {
    this.log("error", message, meta);
  }

  critical(message: string, meta?: unknown): void {
    this.log("critical", message, meta);
  }

  alert(message: string, meta?: unknown): void {
    this.log("alert", message, meta);
  }

  emergency(message: string, meta?: unknown): void {
    this.log("emergency", message, meta);
  }
}

export const logger = new Logger();