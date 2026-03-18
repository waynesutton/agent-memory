#!/usr/bin/env node
import { Command } from "commander";
import { push, pull, detectTools } from "./sync.js";
import { ConvexHttpClient } from "convex/browser";
const program = new Command();
program
    .name("agent-memory")
    .description("CLI for syncing agent memories between local files and Convex")
    .version("0.0.1");
// ── init ────────────────────────────────────────────────────────────
program
    .command("init")
    .description("Detect tools and register project")
    .option("--project <id>", "Project ID", "default")
    .option("--name <name>", "Project display name")
    .action(async (opts) => {
    const convexUrl = requireConvexUrl();
    const dir = process.cwd();
    console.log("Detecting tools...");
    const tools = await detectTools(dir);
    if (tools.length === 0) {
        console.log("No tool configurations detected. Supported: Claude Code, Cursor, OpenCode, Codex, Conductor, Zed, VS Code Copilot, Pi");
    }
    else {
        console.log(`Found: ${tools.join(", ")}`);
    }
    const client = new ConvexHttpClient(convexUrl);
    await client.mutation("agentMemory/mutations:upsertProject", {
        projectId: opts.project,
        name: opts.name ?? opts.project,
        settings: {
            autoSync: false,
            syncFormats: tools,
        },
    });
    console.log(`Project "${opts.project}" registered.`);
});
// ── push ────────────────────────────────────────────────────────────
program
    .command("push")
    .description("Push local memory files to Convex")
    .option("--project <id>", "Project ID", "default")
    .option("--format <format>", "Tool format to parse")
    .option("--user <id>", "User ID for user-scoped memories")
    .action(async (opts) => {
    const convexUrl = requireConvexUrl();
    console.log("Pushing local memories to Convex...");
    await push({
        convexUrl,
        projectId: opts.project,
        format: opts.format,
        userId: opts.user,
        dir: process.cwd(),
    });
});
// ── pull ────────────────────────────────────────────────────────────
program
    .command("pull")
    .description("Pull memories from Convex to local files")
    .option("--project <id>", "Project ID", "default")
    .option("--format <format>", "Output format", "raw")
    .option("--user <id>", "User ID for user-scoped memories")
    .action(async (opts) => {
    const convexUrl = requireConvexUrl();
    console.log("Pulling memories from Convex...");
    await pull({
        convexUrl,
        projectId: opts.project,
        format: opts.format,
        userId: opts.user,
        dir: process.cwd(),
    });
});
// ── list ────────────────────────────────────────────────────────────
program
    .command("list")
    .description("List memories in the terminal")
    .option("--project <id>", "Project ID", "default")
    .option("--type <type>", "Filter by memory type")
    .action(async (opts) => {
    const convexUrl = requireConvexUrl();
    const client = new ConvexHttpClient(convexUrl);
    const memories = await client.query("agentMemory/queries:list", {
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
        console.log(`  ${m._id}  ${m.memoryType.padEnd(12)} ${m.title}${priority}`);
    }
});
// ── search ──────────────────────────────────────────────────────────
program
    .command("search <query>")
    .description("Search memories")
    .option("--project <id>", "Project ID", "default")
    .option("--limit <n>", "Max results", "10")
    .action(async (query, opts) => {
    const convexUrl = requireConvexUrl();
    const client = new ConvexHttpClient(convexUrl);
    const results = await client.query("agentMemory/queries:search", {
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
// ── mcp ─────────────────────────────────────────────────────────────
program
    .command("mcp")
    .description("Start the MCP server")
    .option("--project <id>", "Project ID", "default")
    .option("--read-only", "Disable write operations")
    .option("--disable-tools <tools>", "Comma-separated list of tools to disable")
    .option("--embedding-api-key <key>", "API key for vector search")
    .action(async (opts) => {
    const convexUrl = requireConvexUrl();
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
    });
});
// ── Helpers ─────────────────────────────────────────────────────────
function requireConvexUrl() {
    const url = process.env.CONVEX_URL;
    if (!url) {
        console.error("Error: CONVEX_URL environment variable is required.");
        console.error("Set it to your Convex deployment URL.");
        process.exit(1);
    }
    return url;
}
program.parse();
//# sourceMappingURL=index.js.map