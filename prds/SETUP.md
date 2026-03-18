# Setup Guide — @waynesutton/agent-memory

Step-by-step instructions for every integration path.

---

## Prerequisites

- Node.js 18+
- A Convex account and project ([convex.dev](https://convex.dev))
- `CONVEX_URL` from your Convex dashboard

---

## Path A: Add to an Existing Convex App

### Step 1 — Install

```bash
npm install @waynesutton/agent-memory
```

Make sure you already have `convex` and `convex-helpers` installed:

```bash
npm install convex convex-helpers
```

### Step 2 — Register the Component

Edit your `convex/convex.config.ts`:

```typescript
import { defineApp } from "convex/server";
import agentMemory from "@waynesutton/agent-memory/convex.config.js";

const app = defineApp();
app.use(agentMemory);
export default app;
```

### Step 3 — Create Memory Functions

Create `convex/memory.ts`:

```typescript
import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { AgentMemory } from "@waynesutton/agent-memory";

const memory = new AgentMemory(components.agentMemory, {
  projectId: "my-project",
  agentId: "my-app",                     // optional: identifies this agent
  llmApiKey: process.env.OPENAI_API_KEY, // optional: enables intelligent ingest
});

// Save a memory
export const remember = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    memoryType: v.union(
      v.literal("instruction"),
      v.literal("learning"),
      v.literal("reference"),
      v.literal("feedback"),
      v.literal("journal"),
    ),
    tags: v.optional(v.array(v.string())),
    priority: v.optional(v.float64()),
  },
  returns: v.string(),
  handler: async (ctx, args) => memory.remember(ctx, args),
});

// Search memories
export const recall = query({
  args: { q: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => memory.search(ctx, args.q),
});

// List all memories
export const listAll = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => memory.list(ctx),
});

// Archive a memory
export const forget = mutation({
  args: { memoryId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await memory.forget(ctx, args.memoryId);
    return null;
  },
});

// Get context bundle for agent sessions
export const getContext = query({
  args: {
    activePaths: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) =>
    memory.getContextBundle(ctx, { activePaths: args.activePaths }),
});

// View change history
export const memoryHistory = query({
  args: { memoryId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => memory.history(ctx, args.memoryId),
});

// Rate a memory
export const rateFeedback = mutation({
  args: {
    memoryId: v.string(),
    sentiment: v.union(
      v.literal("positive"),
      v.literal("negative"),
      v.literal("very_negative"),
    ),
    comment: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await memory.addFeedback(ctx, args.memoryId, args.sentiment, {
      comment: args.comment,
    });
    return null;
  },
});

// Intelligently ingest raw text
export const ingest = action({
  args: { content: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => memory.ingest(ctx, args.content),
});
```

### Step 4 — Deploy

```bash
npx convex dev
```

Your memories table is now live. Use the Convex dashboard to verify.

---

## Path B: CLI-Only (Sync Local Files)

Use the CLI to push/pull memory files without writing any Convex code.

### Step 1 — Install Globally (or use npx)

```bash
npm install -g @waynesutton/agent-memory
```

### Step 2 — Set Your Convex URL

```bash
export CONVEX_URL="https://your-deployment.convex.cloud"
```

Get this from your Convex dashboard under "Settings" > "URL & Deploy Key".

### Step 3 — Initialize

```bash
cd /path/to/your/project
npx agent-memory init --project my-project --name "My Project"
```

This detects which tools are present (Claude Code, Cursor, etc.) and registers the project.

### Step 4 — Push Local Memories

```bash
npx agent-memory push --project my-project
```

This reads all detected tool files (`.claude/rules/`, `.cursor/rules/`, `AGENTS.md`, etc.) and uploads them to Convex.

### Step 5 — Pull to Another Tool

```bash
# Pull as Cursor rules
npx agent-memory pull --project my-project --format cursor

# Pull as Claude Code rules
npx agent-memory pull --project my-project --format claude-code

# Pull as AGENTS.md (OpenCode/Codex)
npx agent-memory pull --project my-project --format opencode
```

---

## Path C: MCP Server for AI Agents

### Step 1 — Configure for Claude Code

Add to `.claude/settings.json` in your project:

```json
{
  "mcpServers": {
    "agent-memory": {
      "command": "npx",
      "args": ["agent-memory", "mcp", "--project", "my-project"],
      "env": {
        "CONVEX_URL": "https://your-deployment.convex.cloud"
      }
    }
  }
}
```

### Step 2 — Configure for Cursor

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "agent-memory": {
      "command": "npx",
      "args": ["agent-memory", "mcp", "--project", "my-project"],
      "env": {
        "CONVEX_URL": "https://your-deployment.convex.cloud"
      }
    }
  }
}
```

### Step 3 — Verify

Once configured, your AI agent will have access to 14 tools:

- `memory_remember` — save a new memory (with agent/session scoping)
- `memory_recall` — search by keyword
- `memory_semantic_recall` — search by meaning (if embedding key provided)
- `memory_list` — list memories with filters (agent, session, source, tags)
- `memory_context` — get context bundle
- `memory_forget` — archive a memory
- `memory_restore` — restore an archived memory
- `memory_update` — update a memory
- `memory_history` — view change audit trail
- `memory_feedback` — rate a memory as helpful/unhelpful
- `memory_relate` — create relationship between memories
- `memory_relations` — view memory graph connections
- `memory_batch_archive` — archive multiple memories
- `memory_ingest` — intelligently extract memories from raw text

### Step 4 (Optional) — Enable Vector Search

```json
{
  "mcpServers": {
    "agent-memory": {
      "command": "npx",
      "args": [
        "agent-memory", "mcp",
        "--project", "my-project",
        "--embedding-api-key", "${env:OPENAI_API_KEY}"
      ],
      "env": {
        "CONVEX_URL": "${env:CONVEX_URL}",
        "OPENAI_API_KEY": "${env:OPENAI_API_KEY}"
      }
    }
  }
}
```

### Step 5 (Optional) — Enable Intelligent Ingest

```json
{
  "mcpServers": {
    "agent-memory": {
      "command": "npx",
      "args": [
        "agent-memory", "mcp",
        "--project", "my-project",
        "--llm-api-key", "${env:OPENAI_API_KEY}"
      ],
      "env": {
        "CONVEX_URL": "${env:CONVEX_URL}",
        "OPENAI_API_KEY": "${env:OPENAI_API_KEY}"
      }
    }
  }
}
```

### Step 6 (Optional) — Read-Only Mode

For agents that should only read, not write:

```json
{
  "mcpServers": {
    "agent-memory": {
      "command": "npx",
      "args": ["agent-memory", "mcp", "--project", "my-project", "--read-only"],
      "env": {
        "CONVEX_URL": "${env:CONVEX_URL}"
      }
    }
  }
}
```

---

## Path D: Auto-Sync with Hooks

### Claude Code — Sync on Session Start/End

Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "CONVEX_URL=https://your-deployment.convex.cloud npx agent-memory pull --format claude-code --project my-project"
      }]
    }],
    "SessionEnd": [{
      "hooks": [{
        "type": "command",
        "command": "CONVEX_URL=https://your-deployment.convex.cloud npx agent-memory push --format claude-code --project my-project"
      }]
    }]
  }
}
```

This ensures:
- Session starts with latest memories from the cloud
- Session ends by pushing any new learnings back

---

## Path E: Using with @convex-dev/agent

If your app uses `@convex-dev/agent` for AI agent threads, you can load memories as system prompts:

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import agentMemory from "@waynesutton/agent-memory/convex.config.js";
import agent from "@convex-dev/agent/convex.config.js";

const app = defineApp();
app.use(agentMemory);
app.use(agent);
export default app;
```

```typescript
// convex/ai.ts
import { action } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { AgentMemory } from "@waynesutton/agent-memory";
import { Agent } from "@convex-dev/agent";
import { v } from "convex/values";

const memory = new AgentMemory(components.agentMemory, {
  projectId: "my-app",
  agentId: "my-ai-agent",
});

const myAgent = new Agent(components.agent, {
  model: "claude-sonnet-4-6",
});

export const chat = action({
  args: { message: v.string(), threadId: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Load relevant memories (feedback-boosted priority scoring)
    const bundle = await memory.getContextBundle(ctx, {
      activePaths: [], // or pass relevant file paths
    });

    // Build system prompt from memories
    const memoryPrompt = bundle.pinned
      .map((m) => `## ${m.title}\n${m.content}`)
      .join("\n\n---\n\n");

    // Use agent with memory-augmented instructions
    const thread = await myAgent.createThread(ctx, {
      systemPrompt: `You are a helpful coding assistant.\n\n# Project Knowledge\n\n${memoryPrompt}`,
    });

    const result = await myAgent.chat(ctx, {
      threadId: thread._id,
      message: args.message,
    });

    return result;
  },
});
```

---

## Path F: Enable Relevance Decay

For projects with many memories, enable automatic relevance decay so stale memories don't dominate context bundles.

### Step 1 — Update Project Settings

```typescript
// In a mutation or action context
await ctx.runMutation(components.agentMemory.mutations.upsertProject, {
  projectId: "my-app",
  name: "My App",
  settings: {
    autoSync: false,
    syncFormats: [],
    decayEnabled: true,
    decayHalfLifeDays: 30, // priority halves every 30 days of no access
  },
});
```

### Step 2 — That's It

The component runs a daily cron job at 3 AM UTC that:
1. Finds all non-pinned memories in decay-enabled projects
2. Reduces priority for memories with low access and old `lastAccessedAt`
3. Pinned memories (priority >= 0.8) are never decayed

Access tracking happens automatically when you use `recordAccess()` or when the `getContextBundle` query returns memories.

---

## Path G: Custom Ingest Prompts

Customize how the intelligent ingest pipeline extracts and deduplicates memories.

### Per-Project (persistent)

```typescript
await ctx.runMutation(components.agentMemory.mutations.upsertProject, {
  projectId: "my-app",
  name: "My App",
  settings: {
    autoSync: false,
    syncFormats: [],
    factExtractionPrompt: `Extract only coding conventions, architecture decisions,
      and user preferences. Ignore greetings and ephemeral discussion.`,
    updateDecisionPrompt: `When a new fact contradicts an existing memory,
      always UPDATE the existing memory with the newer information.
      Never create duplicates.`,
  },
});
```

### Per-Call (one-time)

```typescript
const result = await memory.ingest(ctx, rawText, {
  customExtractionPrompt: "Extract only security-related decisions...",
  customUpdatePrompt: "Be very conservative — only ADD if truly novel...",
});
```

---

## Path H: Read-Only HTTP API

Expose memories as REST endpoints for dashboards, CI/CD pipelines, and external integrations.

### Step 1 — Create API Keys

Add a mutation to your app that creates API keys behind your own auth:

```typescript
// convex/memory.ts
import { AgentMemory } from "@waynesutton/agent-memory";
import { mutation } from "./_generated/server.js";
import { components } from "./_generated/api.js";

const memory = new AgentMemory(components.agentMemory, {
  projectId: "my-project",
});

export const createApiKey = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return await memory.createApiKey(ctx, {
      name: "Dashboard read key",
      permissions: ["list", "search", "context"],
      // Optional: custom rate limit
      // rateLimitOverride: { requestsPerWindow: 200, windowMs: 60000 },
      // Optional: key expiry
      // expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    // Returns: { key: "am_<40chars>", keyHash: "..." }
    // ⚠️ The plaintext key is only returned once — store it securely!
  },
});
```

### Step 2 — Mount the HTTP Router

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { MemoryHttpApi } from "@waynesutton/agent-memory/http";
import { components } from "./_generated/api";

const http = httpRouter();

const memoryApi = new MemoryHttpApi(components.agentMemory, {
  corsOrigins: ["https://myapp.com"],  // optional, defaults to ["*"]
});
memoryApi.mount(http, "/api/memory");

export default http;
```

### Step 3 — Deploy

```bash
npx convex dev
```

### Step 4 — Use the API

```bash
# List memories
curl -H "Authorization: Bearer am_<your-key>" \
  https://your-deployment.convex.cloud/api/memory/list

# Search
curl -H "Authorization: Bearer am_<your-key>" \
  "https://your-deployment.convex.cloud/api/memory/search?q=API+conventions"

# Get context bundle
curl -H "Authorization: Bearer am_<your-key>" \
  https://your-deployment.convex.cloud/api/memory/context

# Export as Cursor format
curl -H "Authorization: Bearer am_<your-key>" \
  "https://your-deployment.convex.cloud/api/memory/export?format=cursor"
```

### Available Endpoints

| Path | Permission | Description |
|------|------------|-------------|
| `/list` | `list` | List memories with query param filters |
| `/get?id=<memoryId>` | `get` | Get a single memory |
| `/search?q=<query>` | `search` | Full-text search |
| `/context` | `context` | Progressive context bundle |
| `/export?format=<format>` | `export` | Export in tool format |
| `/history?id=<memoryId>` | `history` | Memory audit trail |
| `/relations?id=<memoryId>` | `relations` | Memory graph connections |

### Available Permissions

`list`, `get`, `search`, `context`, `export`, `history`, `relations`

### Rate Limiting

- Default: 100 requests per 60 seconds
- Configurable per-key or per-project
- Returns `429` with `retryAfterMs` when exceeded
- Self-contained (no external dependency)

### Managing Keys

```typescript
// List keys (never exposes plaintext)
const keys = await memory.listApiKeys(ctx);

// Revoke a key
await memory.revokeApiKey(ctx, keyHash);
```

---

## Verifying Your Setup

### Check Convex Dashboard

After deploying, go to your Convex dashboard. You should see the component's tables under the `agentMemory` namespace:
- `agentMemory:memories`
- `agentMemory:embeddings`
- `agentMemory:projects`
- `agentMemory:syncLog`
- `agentMemory:memoryHistory`
- `agentMemory:memoryFeedback`
- `agentMemory:memoryRelations`

### CLI Verification

```bash
# List memories (should be empty initially)
npx agent-memory list --project my-project

# If you have .claude/rules/ or .cursor/rules/ files, push them
npx agent-memory push --project my-project

# List again to see uploaded memories
npx agent-memory list --project my-project

# Search
npx agent-memory search "your search term" --project my-project
```

### MCP Verification

```bash
# Start the MCP server manually to test
CONVEX_URL=https://your-deployment.convex.cloud npx agent-memory mcp --project my-project
```

If it starts without errors, you'll see:
```
agent-memory MCP server running for project "my-project"
```

---

## Troubleshooting

### "CONVEX_URL environment variable is required"

Set your deployment URL:
```bash
export CONVEX_URL="https://your-deployment.convex.cloud"
```

### "Cannot find module '@waynesutton/agent-memory'"

Make sure you installed the package:
```bash
npm install @waynesutton/agent-memory
```

### MCP server not showing tools in Claude Code

1. Check `.claude/settings.json` is valid JSON
2. Verify `CONVEX_URL` is set in the `env` block
3. Restart Claude Code after changing MCP config

### No memories found after push

1. Check the project ID matches between push and list
2. Verify the Convex dashboard shows data in `agentMemory:memories`
3. Make sure you have actual tool files (`.claude/rules/*.md`, etc.) in your directory

### Ingest not working

1. Ensure `--llm-api-key` is passed to the MCP server or `llmApiKey` is set in config
2. Check your API key is valid and has access to the specified model
3. The default model is `gpt-4.1-nano` — change with `--llm-model` if needed

### Relevance decay not running

1. Verify decay is enabled in project settings (`decayEnabled: true`)
2. The cron runs daily at 3 AM UTC — check the Convex dashboard cron jobs view
3. Pinned memories (priority >= 0.8) are intentionally excluded from decay
