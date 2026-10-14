import { existsSync, readdirSync, rmSync } from "node:fs";
import { basename, resolve } from "node:path";
import { config } from "./config.js";
import { ensureDir, readJson, readText, rmDirRecursive, writeJsonAtomic, writeTextAtomic } from "./file-utils.js";
import type { LayoutJson, WorkflowJson, WorkflowStepJson } from "./types.js";
import { RunLogger } from "./logger.js";

const SYNC_DIR = resolve(config.root, "scripts", "novu-sync");
const WORKFLOWS_DIR = resolve(SYNC_DIR, "workflows");
const LAYOUTS_DIR = resolve(SYNC_DIR, "layouts");

export function getSyncDir(): string { return SYNC_DIR; }
export function getWorkflowsDir(): string { return WORKFLOWS_DIR; }
export function getLayoutsDir(): string { return LAYOUTS_DIR; }
export function getBodiesDir(base: string): string { return resolve(base, "bodies"); }

// ─── Workflow discovery ───────────────────────────────────────

export function discoverWorkflowDirs(): string[] {
  if (!existsSync(WORKFLOWS_DIR)) return [];
  return readdirSync(WORKFLOWS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

export function loadWorkflow(workflowDir: string, log?: RunLogger): WorkflowJson | null {
  const dir = resolve(WORKFLOWS_DIR, workflowDir);
  const jsonFile = resolve(dir, "workflow.json");
  const wf = readJson<WorkflowJson>(jsonFile);
  if (!wf) {
    log?.warn(`No valid workflow.json in ${workflowDir}`);
    return null;
  }

  const bodiesDir = getBodiesDir(dir);
  for (const step of wf.steps) {
    if (step.bodyFile) {
      const bodyPath = resolve(bodiesDir, step.bodyFile);
      const body = readText(bodyPath);
      if (body !== null) {
        step.controlValues = { ...(step.controlValues ?? {}), body };
      }
    }
  }

  return wf;
}

export function loadAllWorkflows(log?: RunLogger): WorkflowJson[] {
  const dirs = discoverWorkflowDirs();
  const result: WorkflowJson[] = [];
  for (const dir of dirs) {
    const wf = loadWorkflow(dir, log);
    if (wf) result.push(wf);
  }
  return result;
}

export function saveWorkflow(wf: WorkflowJson, log: RunLogger): boolean {
  const dir = resolve(WORKFLOWS_DIR, wf.slug);
  ensureDir(dir);

  const bodiesDir = getBodiesDir(dir);
  const steps: WorkflowStepJson[] = [];

  for (const step of wf.steps) {
    const body = step.controlValues?.body as string | undefined;
    let bodyFile: string | undefined;
    if (body && typeof body === "string") {
      ensureDir(bodiesDir);
      bodyFile = `${step.stepId}.html`;
      writeTextAtomic(resolve(bodiesDir, bodyFile), body, log);
    }
    const cv = { ...(step.controlValues ?? {}) };
    delete cv.body;
    steps.push({
      stepId: step.stepId,
      name: step.name,
      type: step.type,
      bodyFile: body ? bodyFile : step.bodyFile,
      controlValues: Object.keys(cv).length > 0 ? cv : undefined,
      variables: step.variables,
    });
  }

  return writeJsonAtomic(resolve(dir, "workflow.json"), { ...wf, steps }, log);
}

export function removeWorkflowDir(slug: string, log: RunLogger): boolean {
  const dir = resolve(WORKFLOWS_DIR, slug);
  if (!existsSync(dir)) { log.warn(`Workflow directory not found: ${slug}`); return false; }
  rmDirRecursive(dir);
  log.info(`Removed workflow directory: ${slug}`);
  return true;
}

// ─── Layout discovery ─────────────────────────────────────────

export function discoverLayoutFiles(): string[] {
  if (!existsSync(LAYOUTS_DIR)) return [];
  return readdirSync(LAYOUTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
}

export function loadLayout(slug: string, log?: RunLogger): LayoutJson | null {
  const file = resolve(LAYOUTS_DIR, `${slug}.json`);
  const layout = readJson<LayoutJson>(file);
  if (!layout) { log?.warn(`No valid layout file for ${slug}`); return null; }

  const bodiesDir = getBodiesDir(LAYOUTS_DIR);
  if (layout.bodyFile) {
    const bodyPath = resolve(bodiesDir, layout.bodyFile);
    const body = readText(bodyPath);
    if (body !== null) layout.content = body;
  }

  return layout;
}

export function loadAllLayouts(log?: RunLogger): LayoutJson[] {
  const files = discoverLayoutFiles();
  const result: LayoutJson[] = [];
  for (const file of files) {
    const slug = basename(file, ".json");
    const layout = loadLayout(slug, log);
    if (layout) result.push(layout);
  }
  return result;
}

export function saveLayout(layout: LayoutJson, log: RunLogger): boolean {
  ensureDir(LAYOUTS_DIR);
  const bodiesDir = getBodiesDir(LAYOUTS_DIR);

  let bodyFile: string | undefined;
  if (layout.content) {
    ensureDir(bodiesDir);
    bodyFile = `${layout.slug}.html`;
    writeTextAtomic(resolve(bodiesDir, bodyFile), layout.content, log);
  }

  return writeJsonAtomic(
    resolve(LAYOUTS_DIR, `${layout.slug}.json`),
    { ...layout, content: undefined, bodyFile: bodyFile ?? layout.bodyFile },
    log,
  );
}

export function removeLayoutFile(slug: string, log: RunLogger): boolean {
  const file = resolve(LAYOUTS_DIR, `${slug}.json`);
  if (!existsSync(file)) { log.warn(`Layout file not found: ${slug}.json`); return false; }
  rmSync(file, { force: true });
  log.info(`Removed layout file: ${slug}.json`);
  return true;
}
