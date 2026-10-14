import { createHash } from "node:crypto";
import type { LayoutJson, WorkflowJson } from "./types.js";

function stripArtifacts<T>(value: T): T {
  const copy = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  delete copy.dashboardHash;
  delete copy.bodyFile;
  // `variables` is derived by Novu from controlValues + payloadSchema; ignore for change detection
  delete copy.variables;
  if (Array.isArray(copy.steps)) {
    for (const s of copy.steps as Array<Record<string, unknown>>) {
      delete s.bodyFile;
      delete s.variables;
    }
  }
  return copy as T;
}

export function hashWorkflow(wf: WorkflowJson): string {
  return hashJson(stripArtifacts(wf));
}

export function hashLayout(layout: LayoutJson): string {
  return hashJson(stripArtifacts(layout));
}

export function hashJson(data: unknown): string {
  return createHash("sha256").update(stableStringify(data)).digest("hex").slice(0, 12);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
