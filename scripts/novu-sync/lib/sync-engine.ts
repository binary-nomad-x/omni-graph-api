import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { ApiError, NovuApiClient } from "./api-client.js";
import { RunLogger } from "./logger.js";
import { hashLayout, hashWorkflow } from "./hashing.js";
import { diffJson, diffLines, renderChanges } from "./diff-utils.js";
import {
  getLayoutsDir,
  getWorkflowsDir,
  loadAllLayouts,
  loadAllWorkflows,
  loadLayout,
  loadWorkflow,
  removeLayoutFile,
  removeWorkflowDir,
  saveLayout,
  saveWorkflow,
} from "./discover.js";
import { ensureDir, writeJsonAtomic, writeTextAtomic } from "./file-utils.js";
import type { LayoutJson, SyncResult, SyncSummary, WorkflowJson } from "./types.js";

// ─── Concurrency helper ───────────────────────────────────────

/** Run an async mapper over items with bounded parallelism. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<Array<PromiseSettledResult<R>>> {
  const results: Array<PromiseSettledResult<R>> = new Array(items.length);
  let next = 0;

  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { status: "fulfilled", value: await fn(items[index]) };
      } catch (err) {
        results[index] = { status: "rejected", reason: err };
      }
    }
  });

  await Promise.all(workers);
  return results;
}

// ─── API response normalizers ─────────────────────────────────

function normalizeApiWorkflow(api: Record<string, unknown>): WorkflowJson {
  const steps = (api.steps as Array<Record<string, unknown>> ?? []).map((s) => ({
    stepId: (s.stepId ?? s.slug ?? s._id ?? "") as string,
    name: (s.name ?? "") as string,
    type: (s.type ?? "") as string,
    controlValues: s.controlValues as Record<string, unknown> | undefined,
  }));

  const wf: WorkflowJson = {
    name: api.name as string,
    workflowId: api.workflowId as string,
    slug: (api.workflowId ?? api.slug ?? api._id ?? "") as string,
    description: api.description as string | undefined,
    tags: api.tags as string[] | undefined,
    active: api.active as boolean | undefined,
    validatePayload: api.validatePayload as boolean | undefined,
    payloadSchema: api.payloadSchema as Record<string, unknown> | undefined,
    preferences: api.preferences as Record<string, unknown> | undefined,
    origin: api.origin as string | undefined,
    steps,
  };

  wf.dashboardHash = hashWorkflow(wf);
  return wf;
}

function layoutSlug(api: Record<string, unknown>): string {
  return (api.slug ?? api.identifier ?? api._id ?? "") as string;
}

function normalizeApiLayout(api: Record<string, unknown>): LayoutJson {
  const layout: LayoutJson = {
    name: api.name as string,
    layoutId: (api.layoutId ?? api._id) as string,
    slug: layoutSlug(api),
    description: api.description as string | undefined,
    contentType: api.contentType as string | undefined,
    variables: api.variables as Array<{ name: string; type: string; defaultValue?: string }> | undefined,
    isDefault: api.isDefault as boolean | undefined,
    content: api.content as string | undefined,
  };

  layout.dashboardHash = hashLayout(layout);
  return layout;
}

// ─── Status helpers ───────────────────────────────────────────

export interface SyncStatus {
  type: "workflow" | "layout";
  slug: string;
  local: boolean;
  remote: boolean;
  match: boolean;
  localHash?: string;
  remoteHash?: string;
}

// ─── Sync engine ──────────────────────────────────────────────

export class SyncEngine {
  private readonly api: NovuApiClient;
  private readonly log: RunLogger;

  constructor(log: RunLogger) {
    this.api = new NovuApiClient(log);
    this.log = log;
  }

  private ensureSyncDirs(): void {
    ensureDir(getWorkflowsDir());
    ensureDir(getLayoutsDir());
  }

  /** Fetch a full layout by slug, falling back to its Novu layoutId on 404. */
  private async getLayoutFull(slug: string, layoutId?: string): Promise<Record<string, unknown>> {
    try {
      return await this.api.getLayout(slug);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404 && layoutId) {
        return await this.api.getLayout(layoutId);
      }
      throw err;
    }
  }

  // ─── List ───────────────────────────────────────────────────

  async list(): Promise<void> {
    this.ensureSyncDirs();
    this.log.info("--- Workflows ---");

    const localWfs = loadAllWorkflows(this.log);
    const localSlugs = new Set(localWfs.map((w) => w.slug));

    for (const wf of localWfs) {
      this.log.info(`  [local]  ${wf.slug.padEnd(30)} ${wf.name}`);
    }

    try {
      const remoteData = await this.api.listWorkflows();
      for (const item of remoteData.data as Array<Record<string, unknown>>) {
        const slug = (item.workflowId ?? item.slug ?? item._id) as string;
        const label = localSlugs.has(slug) ? "both " : "remote";
        this.log.info(`  [${label}]  ${slug.padEnd(30)} ${item.name as string}`);
      }
    } catch (err) {
      this.log.warn("Could not fetch remote workflows", { error: String(err) });
    }

    this.log.info("");
    this.log.info("--- Layouts ---");

    const localLayouts = loadAllLayouts(this.log);
    const localLayoutSlugs = new Set(localLayouts.map((l) => l.slug));

    for (const layout of localLayouts) {
      this.log.info(`  [local]  ${layout.slug.padEnd(30)} ${layout.name}`);
    }

    try {
      const remoteData = await this.api.listLayouts();
      for (const item of remoteData.data as Array<Record<string, unknown>>) {
        const slug = layoutSlug(item);
        const label = localLayoutSlugs.has(slug) ? "both " : "remote";
        this.log.info(`  [${label}]  ${slug.padEnd(30)} ${item.name as string}`);
      }
    } catch (err) {
      this.log.warn("Could not fetch remote layouts", { error: String(err) });
    }
  }

  // ─── Status ─────────────────────────────────────────────────

  async status(only?: string): Promise<SyncStatus[]> {
    this.ensureSyncDirs();
    const results: SyncStatus[] = [];

    // Workflows
    const localWfs = loadAllWorkflows(this.log);
    const localWfBySlug = new Map(localWfs.map((w) => [w.slug, w]));

    let remoteWfs: Array<Record<string, unknown>> = [];
    try {
      const data = await this.api.listWorkflows();
      remoteWfs = data.data as Array<Record<string, unknown>>;
    } catch (err) {
      this.log.warn("Could not fetch remote workflows", { error: String(err) });
    }

    // Fetch full workflow details so hashes compare accurately (list returns summary steps only).
    // Bounded concurrency — one request per workflow, 5 at a time.
    const wfTargets = remoteWfs.filter((w) => !only || (w.workflowId ?? w.slug ?? w._id) === only);
    const settled = await mapWithConcurrency(wfTargets, 5, (w) => this.api.getWorkflow((w.workflowId ?? w.slug ?? w._id) as string));

    const remoteWfBySlug = new Map<string, Record<string, unknown>>();
    for (const r of settled) {
      if (r.status === "fulfilled") {
        const wf = r.value;
        remoteWfBySlug.set(((wf.workflowId ?? wf.slug ?? wf._id) as string), wf);
      } else {
        this.log.warn("Could not fetch remote workflow detail", { error: String(r.reason) });
      }
    }

    const allWfSlugs = new Set([...localWfBySlug.keys(), ...remoteWfBySlug.keys()]);

    for (const slug of allWfSlugs) {
      if (only && slug !== only) continue;
      const local = localWfBySlug.get(slug);
      const remote = remoteWfBySlug.get(slug);
      const localHash = local ? hashWorkflow(local) : undefined;
      const remoteHash = remote ? normalizeApiWorkflow(remote).dashboardHash : undefined;
      results.push({
        type: "workflow",
        slug,
        local: !!local,
        remote: !!remote,
        match: !!local && !!remote && localHash === remoteHash,
        localHash,
        remoteHash,
      });
    }

    // Layouts
    const localLayouts = loadAllLayouts(this.log);
    const localLayoutBySlug = new Map(localLayouts.map((l) => [l.slug, l]));

    let remoteLayouts: Array<Record<string, unknown>> = [];
    try {
      const data = await this.api.listLayouts();
      remoteLayouts = data.data as Array<Record<string, unknown>>;
    } catch (err) {
      this.log.warn("Could not fetch remote layouts", { error: String(err) });
    }

    // Fetch full layout details too — the list response omits `content`.
    const layoutTargets = remoteLayouts.filter((l) => !only || layoutSlug(l) === only);
    const layoutSettled = await mapWithConcurrency(layoutTargets, 5, (l) => this.getLayoutFull(layoutSlug(l), l.layoutId as string));

    const remoteLayoutBySlug = new Map<string, Record<string, unknown>>();
    for (const r of layoutSettled) {
      if (r.status === "fulfilled") {
        const layout = r.value;
        remoteLayoutBySlug.set(layoutSlug(layout), layout);
      } else {
        this.log.warn("Could not fetch remote layout detail", { error: String(r.reason) });
      }
    }

    const allLayoutSlugs = new Set([...localLayoutBySlug.keys(), ...remoteLayoutBySlug.keys()]);

    for (const slug of allLayoutSlugs) {
      if (only && slug !== only) continue;
      const local = localLayoutBySlug.get(slug);
      const remote = remoteLayoutBySlug.get(slug);
      const localHash = local ? hashLayout(local) : undefined;
      const remoteHash = remote ? normalizeApiLayout(remote).dashboardHash : undefined;
      results.push({
        type: "layout",
        slug,
        local: !!local,
        remote: !!remote,
        match: !!local && !!remote && localHash === remoteHash,
        localHash,
        remoteHash,
      });
    }

    // Print status
    for (const s of results) {
      const state = !s.local ? "remote-only" : !s.remote ? "local-only " : s.match ? "synced     " : "drifted    ";
      this.log.info(`  [${state}] ${s.type.padEnd(8)} ${s.slug}${s.match ? "" : `  local=${s.localHash ?? "-"}  remote=${s.remoteHash ?? "-"}`}`);
    }

    if (results.length === 0) this.log.info("  (nothing to sync)");
    return results;
  }

  // ─── Diff ───────────────────────────────────────────────────

  async diff(slug: string, type?: "workflow" | "layout"): Promise<void> {
    this.ensureSyncDirs();
    const typesToCheck: Array<"workflow" | "layout"> = type ? [type] : ["workflow", "layout"];

    for (const t of typesToCheck) {
      const local = t === "workflow" ? loadWorkflow(slug, this.log) : loadLayout(slug, this.log);
      let remote: WorkflowJson | LayoutJson | null = null;

      try {
        if (t === "workflow") {
          remote = normalizeApiWorkflow(await this.api.getWorkflow(slug));
        } else {
          remote = normalizeApiLayout(await this.api.getLayout(slug));
        }
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 404) {
          this.log.info(`[${t}] ${slug}: remote not found`);
        } else {
          this.log.error(`[${t}] ${slug}: failed to fetch remote`, { error: String(err) });
        }
        continue;
      }

      if (!local && !remote) {
        this.log.info(`[${t}] ${slug}: not found locally or remotely`);
        continue;
      }
      if (!local) {
        this.log.info(`[${t}] ${slug}: remote-only  → run "novu pull --only=${slug}" to bring it local`);
        continue;
      }
      if (!remote) {
        this.log.info(`[${t}] ${slug}: local-only  → run "novu push --only=${slug}" to push it remote`);
        continue;
      }

      if (t === "workflow") {
        this.diffWorkflow(slug, local as WorkflowJson, remote as WorkflowJson);
      } else {
        this.diffLayout(slug, local as LayoutJson, remote as LayoutJson);
      }
    }
  }

  private diffWorkflow(slug: string, local: WorkflowJson, remote: WorkflowJson): void {
    const lHash = hashWorkflow(local);
    const rHash = hashWorkflow(remote);

    if (lHash === rHash) {
      this.log.info(`[workflow] ${slug}: identical`);
      return;
    }

    this.log.info(`[workflow] ${slug}: differs  local=${lHash}  remote=${rHash}`);

    // Top-level scalar fields
    const scalarKeys = ["name", "description", "tags", "active", "validatePayload", "origin"] as const;
    const lMeta: Record<string, unknown> = {};
    const rMeta: Record<string, unknown> = {};
    for (const key of scalarKeys) {
      lMeta[key] = local[key];
      rMeta[key] = remote[key];
    }
    for (const line of renderChanges(diffJson(lMeta, rMeta))) {
      this.log.info(line);
    }

    if (local.payloadSchema !== undefined || remote.payloadSchema !== undefined) {
      for (const line of renderChanges(diffJson(local.payloadSchema ?? {}, remote.payloadSchema ?? {}), "  payloadSchema:")) {
        this.log.info(line);
      }
    }
    if (local.preferences !== undefined || remote.preferences !== undefined) {
      for (const line of renderChanges(diffJson(local.preferences ?? {}, remote.preferences ?? {}), "  preferences:")) {
        this.log.info(line);
      }
    }

    // Steps — matched by stepId, plus type/name and controlValues detail.
    const localSteps = new Map(local.steps.map((s) => [s.stepId, s]));
    const remoteSteps = new Map(remote.steps.map((s) => [s.stepId, s]));

    for (const s of local.steps) {
      if (!remoteSteps.has(s.stepId)) this.log.info(`  - step ${s.stepId} (${s.type}): local-only`);
    }
    for (const s of remote.steps) {
      if (!localSteps.has(s.stepId)) this.log.info(`  + step ${s.stepId} (${s.type}): remote-only`);
    }

    for (const s of local.steps) {
      const rs = remoteSteps.get(s.stepId);
      if (!rs) continue;

      if (s.name !== rs.name || s.type !== rs.type) {
        this.log.info(`  ~ step ${s.stepId}: name ${JSON.stringify(s.name)} → ${JSON.stringify(rs.name)}, type ${JSON.stringify(s.type)} → ${JSON.stringify(rs.type)}`);
      }

      const lCv = { ...(s.controlValues ?? {}) };
      const rCv = { ...(rs.controlValues ?? {}) };
      const lBody = typeof lCv.body === "string" ? lCv.body : undefined;
      const rBody = typeof rCv.body === "string" ? rCv.body : undefined;
      delete lCv.body;
      delete rCv.body;

      for (const line of renderChanges(diffJson(lCv, rCv), `  step ${s.stepId} controlValues:`)) {
        this.log.info(line);
      }
      this.logBodyDiff(`  step ${s.stepId} body:`, lBody, rBody);
    }
  }

  private diffLayout(slug: string, local: LayoutJson, remote: LayoutJson): void {
    const lHash = hashLayout(local);
    const rHash = hashLayout(remote);

    if (lHash === rHash) {
      this.log.info(`[layout] ${slug}: identical`);
      return;
    }

    this.log.info(`[layout] ${slug}: differs  local=${lHash}  remote=${rHash}`);

    const keys = ["name", "description", "contentType", "isDefault", "variables"] as const;
    const lMeta: Record<string, unknown> = {};
    const rMeta: Record<string, unknown> = {};
    for (const key of keys) {
      lMeta[key] = local[key];
      rMeta[key] = remote[key];
    }
    for (const line of renderChanges(diffJson(lMeta, rMeta))) {
      this.log.info(line);
    }

    this.logBodyDiff("  content:", local.content ?? "", remote.content ?? "");
  }

  private logBodyDiff(label: string, localBody?: string, remoteBody?: string): void {
    if (localBody === undefined && remoteBody === undefined) return;
    const result = diffLines(localBody ?? "", remoteBody ?? "");
    if (result.lines.every((l) => l.type === "same")) return;

    this.log.info(label + (result.truncated ? ` (truncated, ${result.aLines} vs ${result.bLines} lines — too large for line diff)` : ""));
    for (const entry of result.lines) {
      const prefix = entry.type === "add" ? "+ " : entry.type === "del" ? "- " : "  ";
      this.log.info(`  ${prefix}${entry.line}`);
    }
  }

  // ─── Pull ───────────────────────────────────────────────────

  async pull(opts: { only?: string; type?: "workflow" | "layout"; dryRun?: boolean }): Promise<SyncSummary> {
    this.ensureSyncDirs();
    const summary: SyncSummary = { total: 0, created: 0, updated: 0, deleted: 0, skipped: 0, errors: 0, results: [] };
    const dryRun = opts.dryRun === true;

    // ── Workflows ──
    if (!opts.type || opts.type === "workflow") {
      try {
        const data = await this.api.listWorkflows();
        const workflows = data.data as Array<Record<string, unknown>>;
        const targets = workflows.filter((w) => !opts.only || (w.workflowId ?? w.slug ?? w._id) === opts.only);

        // Fetch full details in parallel (list endpoint returns summary steps only).
        const settled = await mapWithConcurrency(targets, 5, async (apiWf) => {
          const slug = (apiWf.workflowId ?? apiWf.slug ?? apiWf._id) as string;
          const full = await this.api.getWorkflow((apiWf.workflowId ?? slug) as string);
          return { slug, wf: normalizeApiWorkflow(full) };
        });

        for (const r of settled) {
          if (r.status === "rejected") {
            summary.errors++;
            summary.results.push({ workflowId: "?", action: "error", detail: String(r.reason) });
            continue;
          }

          const { slug, wf } = r.value;
          summary.total++;

          try {
            const local = loadWorkflow(slug, this.log);
            if (local && hashWorkflow(local) === wf.dashboardHash) {
              summary.skipped++;
              summary.results.push({ workflowId: wf.workflowId, action: "noop", detail: `${slug}: already up to date` });
              if (dryRun) this.log.info(`[DRY-RUN] ${slug}: would skip (unchanged)`);
              continue;
            }

            const action = local ? "update" : "create";
            if (dryRun) {
              this.log.info(`[DRY-RUN] Would ${action} workflow: ${slug}`);
              summary.results.push({ workflowId: wf.workflowId, action, detail: `Would ${action} ${slug}` });
              continue;
            }

            const ok = saveWorkflow(wf, this.log);
            if (ok) {
              if (action === "create") summary.created++;
              else summary.updated++;
              summary.results.push({ workflowId: wf.workflowId, action, detail: `Pulled ${slug}` });
              this.log.info(`[workflow] ${slug}: pulled (${action})`);
            } else {
              summary.errors++;
              summary.results.push({ workflowId: wf.workflowId, action: "error", detail: `Failed to save ${slug}` });
            }
          } catch (err) {
            summary.errors++;
            summary.results.push({ workflowId: wf.workflowId, action: "error", detail: String(err) });
          }
        }
      } catch (err) {
        summary.errors++;
        this.log.error("Failed to list workflows for pull", { error: String(err) });
      }
    }

    // ── Layouts ──
    if (!opts.type || opts.type === "layout") {
      try {
        const data = await this.api.listLayouts();
        const layouts = data.data as Array<Record<string, unknown>>;
        const targets = layouts.filter((l) => !opts.only || layoutSlug(l) === opts.only);

        // The list response does NOT include layout `content` — fetch each
        // layout's detail before saving, otherwise local files are saved
        // without bodies and never match remote again.
        const settled = await mapWithConcurrency(targets, 5, async (apiLayout) => {
          const slug = layoutSlug(apiLayout);
          const full = await this.getLayoutFull(slug, apiLayout.layoutId as string);
          return { slug, layout: normalizeApiLayout(full) };
        });

        for (const r of settled) {
          if (r.status === "rejected") {
            summary.errors++;
            summary.results.push({ workflowId: "?", action: "error", detail: String(r.reason) });
            continue;
          }

          const { slug, layout } = r.value;
          summary.total++;

          try {
            const local = loadLayout(slug, this.log);
            if (local && hashLayout(local) === layout.dashboardHash) {
              summary.skipped++;
              summary.results.push({ workflowId: layout.layoutId, action: "noop", detail: `${slug}: already up to date` });
              if (dryRun) this.log.info(`[DRY-RUN] ${slug}: would skip (unchanged)`);
              continue;
            }

            const action = local ? "update" : "create";
            if (dryRun) {
              this.log.info(`[DRY-RUN] Would ${action} layout: ${slug}`);
              summary.results.push({ workflowId: layout.layoutId, action, detail: `Would ${action} ${slug}` });
              continue;
            }

            const ok = saveLayout(layout, this.log);
            if (ok) {
              if (action === "create") summary.created++;
              else summary.updated++;
              summary.results.push({ workflowId: layout.layoutId, action, detail: `Pulled layout ${slug}` });
              this.log.info(`[layout] ${slug}: pulled (${action})`);
            } else {
              summary.errors++;
              summary.results.push({ workflowId: layout.layoutId, action: "error", detail: `Failed to save ${slug}` });
            }
          } catch (err) {
            summary.errors++;
            summary.results.push({ workflowId: layout.layoutId, action: "error", detail: String(err) });
          }
        }
      } catch (err) {
        summary.errors++;
        this.log.error("Failed to list layouts for pull", { error: String(err) });
      }
    }

    return summary;
  }

  // ─── Push ───────────────────────────────────────────────────

  async push(opts: { only?: string; force?: boolean; dryRun?: boolean }): Promise<SyncSummary> {
    this.ensureSyncDirs();
    const summary: SyncSummary = { total: 0, created: 0, updated: 0, deleted: 0, skipped: 0, errors: 0, results: [] };

    // Push workflows
    const localWfs = loadAllWorkflows(this.log);
    for (const wf of localWfs) {
      if (opts.only && wf.slug !== opts.only) continue;
      summary.total++;
      const result = await this.pushWorkflow(wf, opts);
      this.aggregate(summary, result);
    }

    // Push layouts
    const localLayouts = loadAllLayouts(this.log);
    for (const layout of localLayouts) {
      if (opts.only && layout.slug !== opts.only) continue;
      summary.total++;
      const result = await this.pushLayout(layout, opts);
      this.aggregate(summary, result);
    }

    return summary;
  }

  private async pushWorkflow(wf: WorkflowJson, opts: { force?: boolean; dryRun?: boolean }): Promise<SyncResult> {
    const workflowId = wf.workflowId || wf.slug;
    if (!workflowId) {
      this.log.error(`[workflow] ${wf.slug}: missing workflowId`);
      return { workflowId: wf.slug, action: "error", detail: "Missing workflowId" };
    }

    const buildPayload = (): Record<string, unknown> => ({
      name: wf.name,
      description: wf.description,
      tags: wf.tags ?? [],
      active: wf.active ?? true,
      validatePayload: wf.validatePayload ?? false,
      payloadSchema: wf.payloadSchema,
      preferences: wf.preferences,
      origin: wf.origin ?? "novu-cloud",
      steps: wf.steps.map((s) => ({
        stepId: s.stepId,
        name: s.name,
        type: s.type,
        controlValues: s.controlValues ?? {},
      })),
    });

    try {
      const remote = await this.api.getWorkflow(workflowId);
      const remoteWf = normalizeApiWorkflow(remote);

      const localHash = hashWorkflow(wf);
      const remoteHash = remoteWf.dashboardHash ?? "";

      // In-sync check first — no drift warning when nothing actually changed.
      if (localHash === remoteHash) {
        this.log.info(`[workflow] ${wf.slug}: no changes`);
        return { workflowId: wf.slug, action: "noop", detail: "Already in sync" };
      }

      // Drift guard: remote changed since the last pull (stored hash stale).
      if (!opts.force && wf.dashboardHash && remoteHash !== wf.dashboardHash) {
        this.log.warn(`Drift detected for ${wf.slug} — remote has changed since last pull. Use --force to override.`);
        return { workflowId: wf.slug, action: "skip", detail: "Drift guard: remote changed" };
      }

      if (opts.dryRun) {
        this.log.info(`[DRY-RUN] Would push workflow: ${wf.slug}`);
        return { workflowId: wf.slug, action: "update", detail: "Would push (dry-run)" };
      }

      const updated = await this.api.updateWorkflow(workflowId, buildPayload());

      // Save the remote response so the local file mirrors what is on the dashboard
      const updatedWf = normalizeApiWorkflow(updated);
      saveWorkflow(updatedWf, this.log);

      this.log.info(`[workflow] ${wf.slug}: pushed successfully`);
      return { workflowId: wf.slug, action: "update", detail: "Pushed" };
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) {
        // Create new workflow
        if (opts.dryRun) {
          this.log.info(`[DRY-RUN] Would create workflow: ${wf.slug}`);
          return { workflowId: wf.slug, action: "create", detail: "Would create (dry-run)" };
        }

        const created = await this.api.createWorkflow({
          ...buildPayload(),
          workflowId,
        });

        const createdWf = normalizeApiWorkflow(created);
        wf.dashboardHash = createdWf.dashboardHash;
        wf.workflowId = createdWf.workflowId;
        saveWorkflow(wf, this.log);

        this.log.info(`[workflow] ${wf.slug}: created remotely`);
        return { workflowId: wf.slug, action: "create", detail: "Created remotely" };
      }

      this.log.error(`[workflow] ${wf.slug}: push failed`, { error: String(err) });
      return { workflowId: wf.slug, action: "error", detail: String(err) };
    }
  }

  private async pushLayout(layout: LayoutJson, opts: { force?: boolean; dryRun?: boolean }): Promise<SyncResult> {
    try {
      const remote = await this.api.getLayout(layout.slug);
      const remoteLayout = normalizeApiLayout(remote);

      const localHash = hashLayout(layout);
      const remoteHash = remoteLayout.dashboardHash ?? "";

      // In-sync check first — no drift warning when nothing actually changed.
      if (localHash === remoteHash) {
        this.log.info(`[layout] ${layout.slug}: no changes`);
        return { workflowId: layout.slug, action: "noop", detail: "Already in sync" };
      }

      if (!opts.force && layout.dashboardHash && remoteHash !== layout.dashboardHash) {
        this.log.warn(`Drift detected for layout ${layout.slug} — remote has changed. Use --force to override.`);
        return { workflowId: layout.slug, action: "skip", detail: "Drift guard: remote changed" };
      }

      if (opts.dryRun) {
        this.log.info(`[DRY-RUN] Would push layout: ${layout.slug}`);
        return { workflowId: layout.slug, action: "update", detail: "Would push (dry-run)" };
      }

      await this.api.updateLayout(remote._id as string, {
        name: layout.name,
        description: layout.description,
        contentType: layout.contentType,
        variables: layout.variables,
        isDefault: layout.isDefault,
        content: layout.content,
      });

      const updated = await this.api.getLayout(layout.slug);
      const updatedLayout = normalizeApiLayout(updated);
      layout.dashboardHash = updatedLayout.dashboardHash;
      saveLayout(layout, this.log);

      this.log.info(`[layout] ${layout.slug}: pushed successfully`);
      return { workflowId: layout.slug, action: "update", detail: "Pushed" };
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) {
        if (opts.dryRun) {
          this.log.info(`[DRY-RUN] Would create layout: ${layout.slug}`);
          return { workflowId: layout.slug, action: "create", detail: "Would create (dry-run)" };
        }

        await this.api.createLayout({
          name: layout.name,
          identifier: layout.slug,
          description: layout.description,
          contentType: layout.contentType,
          variables: layout.variables,
          isDefault: layout.isDefault ?? false,
          content: layout.content,
        });

        const created = await this.api.getLayout(layout.slug);
        const createdLayout = normalizeApiLayout(created);
        layout.dashboardHash = createdLayout.dashboardHash;
        saveLayout(layout, this.log);

        this.log.info(`[layout] ${layout.slug}: created remotely`);
        return { workflowId: layout.slug, action: "create", detail: "Created remotely" };
      }

      this.log.error(`[layout] ${layout.slug}: push failed`, { error: String(err) });
      return { workflowId: layout.slug, action: "error", detail: String(err) };
    }
  }

  // ─── Create workflow ────────────────────────────────────────

  async createWorkflow(slug: string, name?: string): Promise<boolean> {
    this.ensureSyncDirs();
    const wfDir = resolve(getWorkflowsDir(), slug);
    if (existsSync(wfDir)) {
      this.log.error(`Workflow directory already exists: ${slug}`);
      return false;
    }

    ensureDir(wfDir);
    const bodiesDir = resolve(getWorkflowsDir(), slug, "bodies");
    ensureDir(bodiesDir);

    const wf: WorkflowJson = {
      name: name ?? slug,
      workflowId: slug,
      slug,
      description: "",
      tags: [],
      active: true,
      validatePayload: false,
      payloadSchema: {},
      preferences: {},
      origin: "external",
      steps: [
        {
          stepId: "email-step",
          name: "Step 1",
          type: "email",
          bodyFile: "email-step.html",
        },
      ],
    };

    // Write default body
    writeTextAtomic(resolve(bodiesDir, "email-step.html"), "<p>Hello {{name}}!</p>", this.log);
    writeJsonAtomic(resolve(wfDir, "workflow.json"), wf, this.log);
    this.log.info(`Created workflow scaffold: ${slug}`);
    return true;
  }

  // ─── Create layout ──────────────────────────────────────────

  async createLayout(slug: string, name?: string): Promise<boolean> {
    this.ensureSyncDirs();
    const layoutFile = resolve(getLayoutsDir(), `${slug}.json`);
    if (existsSync(layoutFile)) {
      this.log.error(`Layout file already exists: ${slug}.json`);
      return false;
    }

    const bodiesDir = resolve(getLayoutsDir(), "bodies");
    ensureDir(bodiesDir);

    const layout: LayoutJson = {
      name: name ?? slug,
      layoutId: "",
      slug,
      description: "",
      contentType: "customHtml",
      variables: [],
      isDefault: false,
      bodyFile: `${slug}.html`,
    };

    writeTextAtomic(resolve(bodiesDir, `${slug}.html`), "<html><body>{{{body}}}</body></html>", this.log);
    writeJsonAtomic(layoutFile, layout, this.log);
    this.log.info(`Created layout scaffold: ${slug}`);
    return true;
  }

  // ─── Delete workflow ────────────────────────────────────────

  async deleteWorkflow(slug: string, opts: { dryRun?: boolean }): Promise<SyncResult> {
    if (opts.dryRun) {
      this.log.info(`[DRY-RUN] Would delete workflow: ${slug}`);
      return { workflowId: slug, action: "delete", detail: "Would delete (dry-run)" };
    }

    // Delete remotely FIRST — never destroy the local copy before the
    // remote deletion is confirmed.
    let remoteDetail = "Absent remotely";
    try {
      const remote = await this.api.getWorkflow(slug);
      await this.api.deleteWorkflow((remote.workflowId ?? remote._id) as string);
      remoteDetail = "Deleted remotely";
      this.log.info(`[workflow] ${slug}: deleted remotely`);
    } catch (err) {
      if (!(err instanceof ApiError && err.statusCode === 404)) {
        this.log.error(`[workflow] ${slug}: failed to delete remotely — local copy kept`, { error: String(err) });
        return { workflowId: slug, action: "error", detail: `Remote delete failed, local kept: ${String(err)}` };
      }
    }

    removeWorkflowDir(slug, this.log);
    return { workflowId: slug, action: "delete", detail: remoteDetail };
  }

  // ─── Delete layout ──────────────────────────────────────────

  async deleteLayout(slug: string, opts: { dryRun?: boolean }): Promise<SyncResult> {
    if (opts.dryRun) {
      this.log.info(`[DRY-RUN] Would delete layout: ${slug}`);
      return { workflowId: slug, action: "delete", detail: "Would delete (dry-run)" };
    }

    let remoteDetail = "Absent remotely";
    try {
      const remote = await this.api.getLayout(slug);
      await this.api.deleteLayout(remote._id as string);
      remoteDetail = "Deleted remotely";
      this.log.info(`[layout] ${slug}: deleted remotely`);
    } catch (err) {
      if (!(err instanceof ApiError && err.statusCode === 404)) {
        this.log.error(`[layout] ${slug}: failed to delete remotely — local copy kept`, { error: String(err) });
        return { workflowId: slug, action: "error", detail: `Remote delete failed, local kept: ${String(err)}` };
      }
    }

    removeLayoutFile(slug, this.log);
    return { workflowId: slug, action: "delete", detail: remoteDetail };
  }

  // ─── Helpers ────────────────────────────────────────────────

  private aggregate(summary: SyncSummary, result: SyncResult): void {
    summary.results.push(result);
    switch (result.action) {
      case "create":
        summary.created++;
        break;
      case "update":
        summary.updated++;
        break;
      case "delete":
        summary.deleted++;
        break;
      case "skip":
        summary.skipped++;
        break;
      case "error":
        summary.errors++;
        break;
      case "noop":
        summary.skipped++;
        break;
    }
  }

  printSummary(summary: SyncSummary): void {
    this.log.info("");
    this.log.info("--- Summary ---");
    this.log.info(`  Total:   ${summary.total}`);
    this.log.info(`  Created: ${summary.created}`);
    this.log.info(`  Updated: ${summary.updated}`);
    this.log.info(`  Deleted: ${summary.deleted}`);
    this.log.info(`  Skipped: ${summary.skipped}`);
    this.log.info(`  Errors:  ${summary.errors}`);
    for (const r of summary.results) {
      if (r.action === "error" || r.action === "skip") {
        this.log.info(`    [${r.action}] ${r.workflowId}: ${r.detail}`);
      }
    }
  }
}
