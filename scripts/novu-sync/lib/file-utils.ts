import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { RunLogger } from "./logger.js";

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function readJson<T = unknown>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

export function readText(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf-8");
}

export function writeJsonAtomic(filePath: string, data: unknown, log: RunLogger): boolean {
  ensureDir(dirname(filePath));
  const tmp = filePath + ".tmp";
  try {
    writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf-8");
    renameSync(tmp, filePath);
    return true;
  } catch (err) {
    log.error(`Failed to write ${filePath}`, { error: String(err) });
    try { rmSync(tmp, { force: true }); } catch { /* ignore */ }
    return false;
  }
}

export function writeTextAtomic(filePath: string, content: string, log: RunLogger): boolean {
  ensureDir(dirname(filePath));
  const tmp = filePath + ".tmp";
  try {
    writeFileSync(tmp, content, "utf-8");
    renameSync(tmp, filePath);
    return true;
  } catch (err) {
    log.error(`Failed to write ${filePath}`, { error: String(err) });
    try { rmSync(tmp, { force: true }); } catch { /* ignore */ }
    return false;
  }
}

export function rmDirRecursive(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { force: true, recursive: true });
  }
}

export function copyFile(src: string, dest: string): void {
  copyFileSync(src, dest);
}
