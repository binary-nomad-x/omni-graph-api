import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { ApiError, NovuApiClient } from "./api-client.js";
import { RunLogger } from "./logger.js";
import { hashLayout, hashWorkflow } from "./hashing.js";
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

// ─── API response normalizers ─────────────────────────────────

function normalizeApiWorkflow(api: Record<string, unknown>): WorkflowJson {
  const steps = (api.steps as Array<Record<string, unknown>> ?? []).map((s) => ({
    stepId: (s.stepId ?? s.slug ?? s._id ?? "") as string,
    name: (s.name ?? "") as string,
    type: (s.type ?? "") as string,
    controlValues: s.controlValues as Record<string, unknown> | undefined,
    variables: s.variables as Record<string, unknown> | undefined,
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
        this.log.info(`  [${label}] ${slug.padEnd(30)} ${item.name as string}`);
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
        const slug = (item.slug ?? item.identifier ?? item._id) as string;
        const label = localLayoutSlugs.has(slug) ? "both " : "remote";
        this.log.info(`  [${label}] ${slug.padEnd(30)} ${item.name as string}`);
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

    // Fetch full workflow details so hashes compare accurately (list returns summary steps only)
    const detailedWfs: Array<Record<string, unknown>> = [];
    const wfIds = (only
      ? remoteWfs.filter((w) => (w.workflowId ?? w.slug ?? w._id) === only)
      : remoteWfs).map((w) => (w.workflowId ?? w.slug ?? w._id) as string);
    const resultsMap = await Promise.allSettled(wfIds.map((id) => this.api.getWorkflow(id)));
    for (const r of resultsMap) {
      if (r.status === "fulfilled") detailedWfs.push(r.value);
      else this.log.warn("Could not fetch remote workflow detail", { error: String(r.reason) });
    }

    const remoteWfBySlug = new Map(detailedWfs.map((w) => [(w.workflowId ?? w.slug ?? w._id) as string, w]));

    const allWfSlugs = new Set([...localWfBySlug.keys(), ...remoteWfBySlug.keys()]);

    for (const slug of allWfSlugs) {
      if (only && slug !== only) continue;
      const local = localWfBySlug.get(slug);
      const remote = remoteWfBySlug.get(slug);
      const localHash = local ? hashWorkflow(local) : undefined;
      const remoteHash = remote ? hashWorkflow(normalizeApiWorkflow(remote)) : undefined;
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

    const remoteLayoutBySlug = new Map(remoteLayouts.map((l) => [layoutSlug(l), l]));
    const allLayoutSlugs = new Set([...localLayoutBySlug.keys(), ...remoteLayoutBySlug.keys()]);

    for (const slug of allLayoutSlugs) {
      if (only && slug !== only) continue;
      const local = localLayoutBySlug.get(slug);
      const remote = remoteLayoutBySlug.get(slug);
      const localHash = local ? hashLayout(local) : undefined;
      const remoteHash = remote ? hashLayout(normalizeApiLayout(remote)) : undefined;
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
      const state = !s.local ? "remote-only" : !s.remote ? "local-only" : s.match ? "synced    " : "drifted   ";
      this.log.info(`  [${state}] ${s.type.padEnd(10)} ${s.slug}${s.match ? "" : `  local=${s.localHash ?? "-"}  remote=${s.remoteHash ?? "-"}`}`);
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
          const api = await this.api.getWorkflow(slug);
          remote = normalizeApiWorkflow(api);
        } else {
          const api = await this.api.getLayout(slug);
          remote = normalizeApiLayout(api);
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

      if (local && remote) {
        const lHash = hashWorkflow(local as WorkflowJson);
        const rHash = hashWorkflow(remote as WorkflowJson);
        if (lHash === rHash) {
          this.log.info(`[${t}] ${slug}: identical`);
        } else {
          this.log.info(`[${t}] ${slug}: differs  local=${lHash}  remote=${rHash}`);
          this.log.info(`  Local:  ${JSON.stringify(local, null, 2)}`);
          this.log.info(`  Remote: ${JSON.stringify(remote, null, 2)}`);
        }
      } else if (local) {
        this.log.info(`[${t}] ${slug}: local-only`);
      } else {
        this.log.info(`[${t}] ${slug}: remote-only`);
      }
    }
  }

  // ─── Pull ───────────────────────────────────────────────────

  async pull(opts: { only?: string; type?: "workflow" | "layout"; dryRun?: boolean }): Promise<SyncSummary> {
    this.ensureSyncDirs();
    const summary: SyncSummary = { total: 0, created: 0, updated: 0, deleted: 0, skipped: 0, errors: 0, results: [] };

    // Pull workflows
    if (!opts.type || opts.type === "workflow") {
      try {
        const data = await this.api.listWorkflows();
        const workflows = data.data as Array<Record<string, unknown>>;
        for (const apiWf of workflows) {
          const wf = normalizeApiWorkflow(apiWf);
          if (opts.only && wf.slug !== opts.only) continue;

          summary.total++;
          try {
            const full = await this.api.getWorkflow(wf.workflowId || wf.slug);
            const fullWf = normalizeApiWorkflow(full);
            const ok = saveWorkflow(fullWf, this.log);
            if (ok) {
              summary.created++;
              summary.results.push({ workflowId: wf.workflowId, action: "create", detail: `Pulled ${wf.slug}` });
              if (opts.dryRun) this.log.info(`[DRY-RUN] Would pull workflow: ${wf.slug}`);
            } else {
              summary.errors++;
              summary.results.push({ workflowId: wf.workflowId, action: "error", detail: `Failed to save ${wf.slug}` });
            }
          } catch (err) {
            summary.errors++;
            summary.results.push({ workflowId: wf.workflowId, action: "error", detail: String(err) });
          }
        }
      } catch (err) {
        this.log.error("Failed to list workflows for pull", { error: String(err) });
      }
    }

    // Pull layouts
    if (!opts.type || opts.type === "layout") {
      try {
        const data = await this.api.listLayouts();
        const layouts = data.data as Array<Record<string, unknown>>;
        for (const apiLayout of layouts) {
          const layout = normalizeApiLayout(apiLayout);
          if (opts.only && layout.slug !== opts.only) continue;

          summary.total++;
          const ok = saveLayout(layout, this.log);
          if (ok) {
            summary.created++;
            summary.results.push({
              workflowId: layout.layoutId,
              action: "create",
              detail: `Pulled layout ${layout.slug}`
            });
            if (opts.dryRun) this.log.info(`[DRY-RUN] Would pull layout: ${layout.slug}`);
          } else {
            summary.errors++;
            summary.results.push({
              workflowId: layout.layoutId,
              action: "error",
              detail: `Failed to save layout ${layout.slug}`
            });
          }
        }
      } catch (err) {
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

      // Drift guard
      if (!opts.force && wf.dashboardHash && remoteWf.dashboardHash !== wf.dashboardHash) {
        this.log.warn(`Drift detected for ${wf.slug} — remote has changed since last pull. Use --force to override.`);
        return { workflowId: wf.slug, action: "skip", detail: "Drift guard: remote changed" };
      }

      const localHash = hashWorkflow(wf);
      const remoteHash = hashWorkflow(remoteWf);

      if (localHash === remoteHash) {
        this.log.info(`[workflow] ${wf.slug}: no changes`);
        return { workflowId: wf.slug, action: "noop", detail: "Already in sync" };
      }

      if (opts.dryRun) {
        this.log.info(`[DRY-RUN] Would push workflow: ${wf.slug}`);
        return { workflowId: wf.slug, action: "update", detail: "Would push (dry-run)" };
      }

      const updated = await this.api.updateWorkflow(workflowId, buildPayload());

      // Save the remote response so the local file mirrors what is on the dashboard
      const updatedWf = normalizeApiWorkflow(updated);
      updatedWf.dashboardHash = hashWorkflow(updatedWf);
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

      if (!opts.force && layout.dashboardHash && remoteLayout.dashboardHash !== layout.dashboardHash) {
        this.log.warn(`Drift detected for layout ${layout.slug} — remote has changed. Use --force to override.`);
        return { workflowId: layout.slug, action: "skip", detail: "Drift guard: remote changed" };
      }

      const localHash = hashLayout(layout);
      const remoteHash = hashLayout(remoteLayout);

      if (localHash === remoteHash) {
        this.log.info(`[layout] ${layout.slug}: no changes`);
        return { workflowId: layout.slug, action: "noop", detail: "Already in sync" };
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

    // Remove locally
    removeWorkflowDir(slug, this.log);

    // Remove remotely
    try {
      const remote = await this.api.getWorkflow(slug);
      await this.api.deleteWorkflow((remote.workflowId ?? remote._id) as string);
      this.log.info(`[workflow] ${slug}: deleted`);
      return { workflowId: slug, action: "delete", detail: "Deleted" };
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) {
        this.log.info(`[workflow] ${slug}: already absent remotely`);
        return { workflowId: slug, action: "delete", detail: "Removed locally only" };
      }
      this.log.error(`[workflow] ${slug}: failed to delete remotely`, { error: String(err) });
      return { workflowId: slug, action: "error", detail: String(err) };
    }
  }

  // ─── Delete layout ──────────────────────────────────────────

  async deleteLayout(slug: string, opts: { dryRun?: boolean }): Promise<SyncResult> {
    if (opts.dryRun) {
      this.log.info(`[DRY-RUN] Would delete layout: ${slug}`);
      return { workflowId: slug, action: "delete", detail: "Would delete (dry-run)" };
    }

    removeLayoutFile(slug, this.log);

    try {
      const remote = await this.api.getLayout(slug);
      await this.api.deleteLayout(remote._id as string);
      this.log.info(`[layout] ${slug}: deleted`);
      return { workflowId: slug, action: "delete", detail: "Deleted" };
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) {
        this.log.info(`[layout] ${slug}: already absent remotely`);
        return { workflowId: slug, action: "delete", detail: "Removed locally only" };
      }
      this.log.error(`[layout] ${slug}: failed to delete remotely`, { error: String(err) });
      return { workflowId: slug, action: "error", detail: String(err) };
    }
  }

  // ─── Helpers ────────────────────────────────────────────────

  private async resolveNotificationGroupId(): Promise<string | undefined> {
    try {
      const groups = await this.api.listNotificationGroups();
      return (groups[0]?._id as string) ?? undefined;
    } catch (err) {
      this.log.warn("Failed to list Novu notification groups", { error: String(err) });
      return undefined;
    }
  }

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
