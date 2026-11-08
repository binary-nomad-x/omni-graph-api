#!/usr/bin/env tsx
/**
 * novu-sync — Bi-directional sync tool for Novu workflows and layouts.
 *
 * Usage:
 *   tsx scripts/novu-sync/cli.ts <command> [options]
 *
 * Commands:
 *   list              List all workflows and layouts (local + remote)
 *   status            Show sync status of all workflows/layouts
 *   diff <slug>       Show diff between local and remote
 *   pull              Pull workflows/layouts from Novu dashboard
 *   push              Push workflows/layouts to Novu dashboard
 *   create-workflow <slug>   Scaffold a new workflow
 *   create-layout <slug>     Scaffold a new layout
 *   delete-workflow <slug>   Delete workflow locally and remotely
 *   delete-layout <slug>     Delete layout locally and remotely
 *   help              Show this help message
 *
 * Options:
 *   --only=<slug>     Operate on a single item
 *   --type=workflow|layout   Filter by type
 *   --force           Bypass drift guard on push
 *   --dry-run         Simulate without making changes
 *   --plan            Alias for --dry-run
 */

import { RunLogger } from "./lib/logger.js";
import { SyncEngine } from "./lib/sync-engine.js";
import { config } from "./lib/config.js";

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq !== -1) {
        args[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        args[arg.slice(2)] = "true";
      }
    } else if (!args._command) {
      args._command = arg;
    } else if (!args._target) {
      args._target = arg;
    }
  }
  return args;
}

async function main(): Promise<void> {
  const log = new RunLogger();
  const args = parseArgs();
  const command = args._command ?? "help";
  const target = args._target;
  const only = args.only && args.only !== "" ? args.only : undefined;
  const type = args.type as "workflow" | "layout" | undefined;
  const force = args.force === "true";
  const dryRun = args["dry-run"] === "true" || args.plan === "true";

  // Validate API key for remote operations
  const needsApi = ["list", "status", "diff", "pull", "push", "delete-workflow", "delete-layout"];
  if (needsApi.includes(command) && !config.novuApiKey) {
    log.error("NOVU_API_SECRET_KEY is not set in .env. Cannot proceed.");
    process.exit(1);
  }

  const engine = new SyncEngine(log);

  try {
    switch (command) {
      case "list": {
        await engine.list();
        break;
      }

      case "status": {
        await engine.status(only);
        break;
      }

      case "diff": {
        if (!target) {
          log.error("Usage: novu diff <slug> [--type=workflow|layout]");
          process.exit(1);
        }
        await engine.diff(target, type);
        break;
      }

      case "pull": {
        const summary = await engine.pull({ only, type, dryRun });
        engine.printSummary(summary);
        break;
      }

      case "push": {
        if (!force && !dryRun) {
          log.info("Running push — use --force to bypass drift guard");
        }
        const summary = await engine.push({ only, force, dryRun });
        engine.printSummary(summary);
        break;
      }

      case "create-workflow": {
        if (!target) {
          log.error("Usage: novu create-workflow <slug> [--name=<name>]");
          process.exit(1);
        }
        await engine.createWorkflow(target, args.name);
        break;
      }

      case "create-layout": {
        if (!target) {
          log.error("Usage: novu create-layout <slug> [--name=<name>]");
          process.exit(1);
        }
        await engine.createLayout(target, args.name);
        break;
      }

      case "delete-workflow": {
        if (!target) {
          log.error("Usage: novu delete-workflow <slug>");
          process.exit(1);
        }
        const result = await engine.deleteWorkflow(target, { dryRun });
        log.info(`[delete-workflow] ${result.action}: ${result.detail}`);
        break;
      }

      case "delete-layout": {
        if (!target) {
          log.error("Usage: novu delete-layout <slug>");
          process.exit(1);
        }
        const result = await engine.deleteLayout(target, { dryRun });
        log.info(`[delete-layout] ${result.action}: ${result.detail}`);
        break;
      }

      case "help":
      default: {
        printHelp();
        break;
      }
    }
  } catch (err) {
    log.error("Unhandled error", { error: String(err) });
    process.exit(1);
  }

  const s = log.summary();
  log.info(`Log written to ${s.logFile}`);
}

function printHelp(): void {
  const help = `
novu-sync — Bi-directional sync tool for Novu workflows and layouts

USAGE
  tsx scripts/novu-sync/cli.ts <command> [options]

COMMANDS
  list                            List all workflows and layouts (all pages)
  status                          Show sync status
  diff <slug>                     Show a field-level diff for a workflow or layout
  pull                            Pull from Novu dashboard to local files
  push                            Push local files to Novu dashboard
  create-workflow <slug>          Scaffold a new workflow
  create-layout <slug>            Scaffold a new layout
  delete-workflow <slug>          Delete workflow locally and remotely
  delete-layout <slug>            Delete layout locally and remotely
  help                            Show this help message

NOTES
  pull    Fetches FULL definitions (list responses omit step bodies and layout
          content), skips items already up to date, and respects --dry-run.
  diff    Prints field-level changes plus a line diff for step bodies and
          layout content, instead of dumping entire JSON documents.
  push    Compares content first ("already in sync"), then applies the drift
          guard only when the remote actually changed since the last pull.

OPTIONS
  --only=<slug>                   Operate on a single item
  --type=workflow|layout          Filter by type
  --force                         Bypass drift guard on push
  --dry-run, --plan               Simulate without making changes
  --name=<name>                   Name for create-* commands

EXAMPLES
  tsx scripts/novu-sync/cli.ts list
  tsx scripts/novu-sync/cli.ts status
  tsx scripts/novu-sync/cli.ts diff my-workflow
  tsx scripts/novu-sync/cli.ts pull
  tsx scripts/novu-sync/cli.ts push --dry-run
  tsx scripts/novu-sync/cli.ts push --force
  tsx scripts/novu-sync/cli.ts create-workflow my-workflow --name="My Workflow"
  tsx scripts/novu-sync/cli.ts delete-workflow my-workflow

ENVIRONMENT
  NOVU_API_SECRET_KEY  (required)  Novu API key from .env
  NOVU_API_HOST_NAME   (optional)  Novu API base URL (default: https://api.novu.co)

API VERSIONS
  Workflows use the Novu v2 API (/v2/workflows); layouts still use v1 (/v1/layouts).
  The legacy /v1/workflows endpoint is empty and should not be used.

FILES
  scripts/novu-sync/workflows/<slug>/workflow.json   Workflow definitions
  scripts/novu-sync/workflows/<slug>/bodies/          Step body templates
  scripts/novu-sync/layouts/<slug>.json               Layout definitions
  scripts/novu-sync/layouts/bodies/                   Layout body templates
  .cache/novu-logs/<run>.log                          Run logs
`;
  process.stdout.write(help);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${String(err)}\n`);
  process.exit(1);
});
