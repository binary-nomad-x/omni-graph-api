// ─── Line diff (LCS-based) ─────────────────────────────────────

export type LineDiffEntry = { type: "same" | "add" | "del"; line: string };

/**
 * Compute a line-level diff between two strings using LCS.
 * For very large inputs (both sides > 1500 lines) it degrades to a summary
 * so the CLI never stalls.
 */
export function diffLines(a: string, b: string, maxOutput = 200): { lines: LineDiffEntry[]; truncated: boolean; aLines: number; bLines: number } {
  const aLines = a.split("\n");
  const bLines = b.split("\n");

  if (aLines.length > 1500 || bLines.length > 1500) {
    return { lines: [], truncated: true, aLines: aLines.length, bLines: bLines.length };
  }

  const n = aLines.length;
  const m = bLines.length;
  // dp[i][j] = LCS length of a[i..], b[j..]
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = aLines[i] === bLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const full: LineDiffEntry[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (aLines[i] === bLines[j]) {
      full.push({ type: "same", line: aLines[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      full.push({ type: "del", line: aLines[i] });
      i++;
    } else {
      full.push({ type: "add", line: bLines[j] });
      j++;
    }
  }
  while (i < n) full.push({ type: "del", line: aLines[i++] });
  while (j < m) full.push({ type: "add", line: bLines[j++] });

  // Collapse runs of unchanged lines to ±2 context lines.
  const lines: LineDiffEntry[] = [];
  let lastKept = -3;
  for (let k = 0; k < full.length; k++) {
    const entry = full[k];
    if (entry.type !== "same") {
      lines.push(entry);
      lastKept = k;
    } else {
      const nextChange = full.findIndex((e, idx) => idx > k && e.type !== "same");
      if (k - lastKept <= 2 || (nextChange !== -1 && nextChange - k <= 2)) {
        lines.push(entry);
      } else if (lines[lines.length - 1]?.type === "same") {
        lines.push({ type: "same", line: "…" });
      }
    }
  }

  if (lines.length > maxOutput) {
    return { lines: lines.slice(0, maxOutput), truncated: true, aLines: n, bLines: m };
  }
  return { lines, truncated: false, aLines: n, bLines: m };
}

// ─── Structured JSON diff ──────────────────────────────────────

export interface JsonChange {
  path: string;
  type: "added" | "removed" | "changed";
  local?: unknown;
  remote?: unknown;
}

const MAX_STRING_LENGTH = 120;

function shorten(value: unknown): string {
  const json = JSON.stringify(value);
  if (json === undefined) return "undefined";
  return json.length > MAX_STRING_LENGTH ? json.slice(0, MAX_STRING_LENGTH) + "… (" + json.length + " chars)" : json;
}

export function renderChange(change: JsonChange): string {
  if (change.type === "added") return `  + ${change.path}: ${shorten(change.remote)}`;
  if (change.type === "removed") return `  - ${change.path}: ${shorten(change.local)}`;
  return `  ~ ${change.path}: ${shorten(change.local)} → ${shorten(change.remote)}`;
}

export function renderChanges(changes: JsonChange[], label = ""): string[] {
  if (changes.length === 0) return [];
  const out = label ? [label] : [];
  for (const change of changes) out.push(renderChange(change));
  return out;
}

/**
 * Recursively diff two JSON values. Objects are compared key-by-key; arrays
 * are compared element-wise (positionally) so scalar arrays like `tags`
 * produce precise changes instead of one blob.
 */
export function diffJson(local: unknown, remote: unknown, path = ""): JsonChange[] {
  const p = path || "$";

  if (local === remote) return [];
  if (local === undefined) return [{ path: p, type: "added", remote }];
  if (remote === undefined) return [{ path: p, type: "removed", local }];

  if (Array.isArray(local) && Array.isArray(remote)) {
    const changes: JsonChange[] = [];
    const len = Math.max(local.length, remote.length);
    for (let i = 0; i < len; i++) {
      changes.push(...diffJson(local[i], remote[i], `${p}[${i}]`));
    }
    return changes;
  }

  if (
    local !== null &&
    remote !== null &&
    typeof local === "object" &&
    typeof remote === "object" &&
    !Array.isArray(local) &&
    !Array.isArray(remote)
  ) {
    const changes: JsonChange[] = [];
    const lObj = local as Record<string, unknown>;
    const rObj = remote as Record<string, unknown>;
    const keys = new Set([...Object.keys(lObj), ...Object.keys(rObj)]);
    for (const key of Array.from(keys).sort()) {
      changes.push(...diffJson(lObj[key], rObj[key], `${p}.${key}`));
    }
    return changes;
  }

  return [{ path: p, type: "changed", local, remote }];
}
