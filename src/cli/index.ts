#!/usr/bin/env node

import { Command } from "commander";
import { push, pull, detectTools } from "./sync.js";
import { extractTypeMemories } from "./type-extractor.js";
import { ConvexHttpClient } from "convex/browser";

const program = new Command();

program
  .name("agent-memory")
  .description(
    "CLI for syncing agent memories between local files and Convex",
  )
  .version("0.0.1");

// ── Helpers ──────────────────────────────────────────────────────────

function requireConvexUrl(): string {
  const url = process.env.CONVEX_URL;
  if (!url) {
    console.error("Error: CONVEX_URL environment variable is required.");
    console.error("Set it to your Convex deployment URL.");
    process.exit(1);
  }
  return url;
}

/**
 * Returns the Convex module name where the consumer exports the
 * createApi-generated functions. Defaults to "memory".
 *
 * Set via --module flag or AGENT_MEMORY_MODULE env var.
 */
function getModule(opts: { module?: string }): string {
  return opts.module ?? process.env.AGENT_MEMORY_MODULE ?? "memory";
}

/** Build a Convex function path like "memory:list". */
function fn(module: string, name: string): any {
  return `${module}:${name}`;
}

// ── init ─────────────────────────────────────────────────────────────

program
  .command("init")
  .description("Detect tools and register project")
  .option("--project <id>", "Project ID", "default")
  .option("--name <name>", "Project display name")
  .option(
    "--module <name>",
    "Convex module that exports createApi functions (default: memory)",
  )
  .action(async (opts) => {
    const convexUrl = requireConvexUrl();
    const module = getModule(opts);
    const dir = process.cwd();

    console.log("Detecting tools...");
    const tools = await detectTools(dir);

    if (tools.length === 0) {
      console.log(
        "No tool configurations detected. Supported: Claude Code, Cursor, OpenCode, Codex, Conductor, Zed, VS Code Copilot, Pi",
      );
    } else {
      console.log(`Found: ${tools.join(", ")}`);
    }

    const client = new ConvexHttpClient(convexUrl);
    await client.mutation(fn(module, "upsertProject"), {
      projectId: opts.project,
      name: opts.name ?? opts.project,
      settings: {
        autoSync: false,
        syncFormats: tools,
      },
    });

    console.log(`Project "${opts.project}" registered.`);
  });

// ── push ─────────────────────────────────────────────────────────────

program
  .command("push")
  .description("Push local memory files to Convex")
  .option("--project <id>", "Project ID", "default")
  .option("--format <format>", "Tool format to parse")
  .option("--user <id>", "User ID for user-scoped memories")
  .option(
    "--module <name>",
    "Convex module that exports createApi functions (default: memory)",
  )
  .action(async (opts) => {
    const convexUrl = requireConvexUrl();
    console.log("Pushing local memories to Convex...");

    await push({
      convexUrl,
      projectId: opts.project,
      format: opts.format,
      userId: opts.user,
      dir: process.cwd(),
      module: getModule(opts),
    });
  });

// ── pull ─────────────────────────────────────────────────────────────

program
  .command("pull")
  .description("Pull memories from Convex to local files")
  .option("--project <id>", "Project ID", "default")
  .option("--format <format>", "Output format", "raw")
  .option("--user <id>", "User ID for user-scoped memories")
  .option(
    "--module <name>",
    "Convex module that exports createApi functions (default: memory)",
  )
  .action(async (opts) => {
    const convexUrl = requireConvexUrl();
    console.log("Pulling memories from Convex...");

    await pull({
      convexUrl,
      projectId: opts.project,
      format: opts.format,
      userId: opts.user,
      dir: process.cwd(),
      module: getModule(opts),
    });
  });

// ── list ─────────────────────────────────────────────────────────────

program
  .command("list")
  .description("List memories in the terminal")
  .option("--project <id>", "Project ID", "default")
  .option("--type <type>", "Filter by memory type")
  .option(
    "--module <name>",
    "Convex module that exports createApi functions (default: memory)",
  )
  .action(async (opts) => {
    const convexUrl = requireConvexUrl();
    const module = getModule(opts);
    const client = new ConvexHttpClient(convexUrl);

    const memories = await client.query(fn(module, "list"), {
      projectId: opts.project,
      memoryType: opts.type,
      archived: false,
    });

    if (memories.length === 0) {
      console.log("No memories found.");
      return;
    }

    console.log(`\n${memories.length} memories:\n`);
    for (const m of memories) {
      const priority = m.priority !== undefined ? ` [p=${m.priority}]` : "";
      console.log(
        `  ${m._id}  ${m.memoryType.padEnd(12)} ${m.title}${priority}`,
      );
    }
  });

// ── search ───────────────────────────────────────────────────────────

program
  .command("search <query>")
  .description("Search memories")
  .option("--project <id>", "Project ID", "default")
  .option("--limit <n>", "Max results", "10")
  .option(
    "--module <name>",
    "Convex module that exports createApi functions (default: memory)",
  )
  .action(async (query, opts) => {
    const convexUrl = requireConvexUrl();
    const module = getModule(opts);
    const client = new ConvexHttpClient(convexUrl);

    const results = await client.query(fn(module, "search"), {
      projectId: opts.project,
      query,
      limit: parseInt(opts.limit),
    });

    if (results.length === 0) {
      console.log("No results found.");
      return;
    }

    console.log(`\n${results.length} results:\n`);
    for (const m of results) {
      console.log(`  ${m._id}  ${m.title}`);
      // Show first 100 chars of content
      const preview = m.content.slice(0, 100).replace(/\n/g, " ");
      console.log(`    ${preview}${m.content.length > 100 ? "..." : ""}`);
      console.log();
    }
  });

// ── ingest-types ─────────────────────────────────────────────────────

program
  .command("ingest-types <glob>")
  .description(
    "Generate type documentation from TypeScript files and store as reference memories",
  )
  .option("--project <id>", "Project ID", "default")
  .option("--user <id>", "User ID for user-scoped memories")
  .option("--tags <tags>", "Comma-separated additional tags")
  .option("--priority <n>", "Priority (0-1)", "0.6")
  .option(
    "--exclude <patterns>",
    "Comma-separated glob patterns to exclude",
  )
  .option(
    "--module <name>",
    "Convex module that exports createApi functions (default: memory)",
  )
  .action(async (glob: string, opts) => {
    const convexUrl = requireConvexUrl();
    const module = getModule(opts);

    console.log(`Extracting types from: ${glob}`);

    const result = await extractTypeMemories({
      globPattern: glob,
      cwd: process.cwd(),
      tags: opts.tags ? opts.tags.split(",") : [],
      priority: parseFloat(opts.priority),
      exclude: opts.exclude ? opts.exclude.split(",") : undefined,
    });

    if (result.memories.length === 0) {
      console.log(
        `No exported types found in ${result.filesProcessed} files.`,
      );
      return;
    }

    console.log(
      `Found ${result.memories.length} type definitions across ${result.filesProcessed} files.`,
    );
    console.log("Pushing to Convex...");

    const client = new ConvexHttpClient(convexUrl);
    const importResult = await client.mutation(
      fn(module, "importFromLocal"),
      {
        projectId: opts.project,
        userId: opts.user,
        memories: result.memories,
      },
    );

    console.log(
      `Done: ${importResult.created} created, ${importResult.updated} updated, ${importResult.unchanged} unchanged`,
    );
  });

// ── mcp ──────────────────────────────────────────────────────────────

program
  .command("mcp")
  .description("Start the MCP server")
  .option("--project <id>", "Project ID", "default")
  .option("--read-only", "Disable write operations")
  .option("--disable-tools <tools>", "Comma-separated list of tools to disable")
  .option("--embedding-api-key <key>", "API key for vector search")
  .option(
    "--module <name>",
    "Convex module that exports createApi functions (default: memory)",
  )
  .action(async (opts) => {
    const convexUrl = requireConvexUrl();
    const module = getModule(opts);
    // Dynamic import to avoid loading MCP deps when not needed
    const { startMcpServer } = await import("../mcp/server.js");
    await startMcpServer({
      convexUrl,
      projectId: opts.project,
      readOnly: opts.readOnly ?? false,
      disabledTools: opts.disableTools
        ? opts.disableTools.split(",")
        : [],
      embeddingApiKey: opts.embeddingApiKey,
      module,
    });
  });

program.parse();
