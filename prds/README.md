# @waynesutton/agent-memory

A Convex Component for persistent, cloud-synced agent memory. Markdown-first memory backend for AI coding agents across CLIs and IDEs — with intelligent ingest, feedback loops, memory relations, and relevance decay.

## What It Does

AI coding agents (Claude Code, Cursor, OpenCode, Codex, Conductor, Zed, VS Code Copilot, Pi) all use local, file-based memory systems (CLAUDE.md, .cursor/rules, AGENTS.md, etc.). These are siloed to one machine with no shared backend, no cross-tool sync, and no queryable search.

`@waynesutton/agent-memory` creates a cloud-synced, markdown-first memory backend as a Convex Component. It:

- Stores structured memories in Convex with full-text search and vector/semantic search
- **Intelligently ingests** raw conversations into deduplicated memories via LLM pipeline
- Exports memories in each tool's native format (`.cursor/rules/*.mdc`, `.claude/rules/*.md`, `AGENTS.md`, etc.)
- Syncs bidirectionally between local files and the cloud
- Tracks **memory history** (full audit trail of all changes)
- Supports **feedback loops** — agents rate memories as helpful or unhelpful
- Builds **memory relations** (graph connections between related memories)
- Applies **relevance decay** — stale, low-access memories lose priority over time
- Scopes memories by **agent, session, user, and project**
- Provides a **read-only HTTP API** with bearer token auth and rate limiting
- Exposes an MCP server with 14 tools for direct agent integration
- Works standalone with any Convex app — no dependency on `@convex-dev/agent`

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Convex Component Setup](#convex-component-setup)
- [Client API](#client-api)
- [Intelligent Ingest](#intelligent-ingest)
- [Memory History](#memory-history)
- [Feedback & Scoring](#feedback--scoring)
- [Memory Relations](#memory-relations)
- [Relevance Decay](#relevance-decay)
- [CLI Usage](#cli-usage)
- [MCP Server](#mcp-server)
- [Schema](#schema)
- [Memory Types](#memory-types)
- [Tool Format Support](#tool-format-support)
- [Vector Search](#vector-search)
- [Read-Only HTTP API](#read-only-http-api)
- [Security](#security)
- [Architecture](#architecture)

---

## Installation

```bash
npm install @waynesutton/agent-memory
```

Peer dependencies (must be installed in your Convex app):

```bash
npm install convex convex-helpers
```

---

## Quick Start

### 1. Add the component to your Convex app

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import agentMemory from "@waynesutton/agent-memory/convex.config.js";

const app = defineApp();
app.use(agentMemory);

export default app;
```

### 2. Create wrapper functions

```typescript
// convex/memory.ts
import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { AgentMemory } from "@waynesutton/agent-memory";

const memory = new AgentMemory(components.agentMemory, {
  projectId: "my-project",
  agentId: "my-app",
  llmApiKey: process.env.OPENAI_API_KEY, // for intelligent ingest
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
export const listMemories = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => memory.list(ctx),
});

// Intelligently ingest raw text into memories
export const ingest = action({
  args: { content: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => memory.ingest(ctx, args.content),
});

// View change history
export const memoryHistory = query({
  args: { memoryId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => memory.history(ctx, args.memoryId),
});
```

### 3. Deploy and start using

```bash
npx convex dev
```

---

## Convex Component Setup

### Standalone (no other components)

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import agentMemory from "@waynesutton/agent-memory/convex.config.js";

const app = defineApp();
app.use(agentMemory);
export default app;
```

### Alongside @convex-dev/agent

Both components coexist independently with isolated tables:

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import agentMemory from "@waynesutton/agent-memory/convex.config.js";
import agent from "@convex-dev/agent/convex.config.js";

const app = defineApp();
app.use(agentMemory); // isolated tables for persistent memories
app.use(agent);        // isolated tables for threads/messages
export default app;
```

You can load memories into an Agent's system prompt:

```typescript
// convex/myAgent.ts
import { AgentMemory } from "@waynesutton/agent-memory";
import { Agent } from "@convex-dev/agent";

const memory = new AgentMemory(components.agentMemory, {
  projectId: "my-app",
});

export const chat = action({
  args: { message: v.string() },
  handler: async (ctx, args) => {
    const bundle = await memory.getContextBundle(ctx);
    const memoryContext = bundle.pinned
      .map((m) => `## ${m.title}\n${m.content}`)
      .join("\n\n");

    const myAgent = new Agent(components.agent, {
      model: "claude-sonnet-4-6",
      instructions: `You are a helpful assistant.\n\nRelevant memories:\n${memoryContext}`,
    });
    // ... use agent as normal
  },
});
```

---

## Client API

### Constructor

```typescript
import { AgentMemory } from "@waynesutton/agent-memory";

const memory = new AgentMemory(components.agentMemory, {
  projectId: "my-project",        // required: unique project identifier
  defaultScope: "project",         // optional: "project" | "user" | "org"
  userId: "user-123",              // optional: for user-scoped memories
  agentId: "claude-code",          // optional: agent identifier
  sessionId: "session-abc",        // optional: session/conversation ID
  embeddingApiKey: "sk-...",       // optional: enables vector search
  embeddingModel: "text-embedding-3-small", // optional
  llmApiKey: "sk-...",             // optional: enables intelligent ingest
  llmModel: "gpt-4.1-nano",       // optional: LLM for fact extraction
  llmBaseUrl: "https://api.openai.com/v1", // optional: custom LLM endpoint
});
```

### Read Operations (query context)

```typescript
// List with rich filters
const all = await memory.list(ctx);
const byAgent = await memory.list(ctx, { agentId: "claude-code" });
const bySession = await memory.list(ctx, { sessionId: "session-123" });
const bySource = await memory.list(ctx, { source: "mcp" });
const byTags = await memory.list(ctx, { tags: ["api", "auth"] });
const recent = await memory.list(ctx, { createdAfter: Date.now() - 86400000 });

// Get a single memory
const mem = await memory.get(ctx, "jh72k...");

// Full-text search
const results = await memory.search(ctx, "API authentication");

// Progressive context bundle (feedback-boosted priority)
const bundle = await memory.getContextBundle(ctx, {
  activePaths: ["src/api/routes.ts"],
});

// Export as tool-native files
const files = await memory.exportForTool(ctx, "cursor");
```

### Write Operations (mutation context)

```typescript
// Create (auto-records history)
const id = await memory.remember(ctx, {
  title: "api-conventions",
  content: "# API Conventions\n\n- Use camelCase\n- Return JSON",
  memoryType: "instruction",
  tags: ["api", "style"],
  paths: ["src/api/**"],
  priority: 0.9,
});

// Update (auto-records history)
await memory.update(ctx, id, { content: "Updated content", priority: 1.0 });

// Archive & restore (both record history)
await memory.forget(ctx, id);
await memory.restore(ctx, id);

// Batch operations
await memory.batchArchive(ctx, ["id1", "id2", "id3"]);
await memory.batchUpdate(ctx, [
  { memoryId: "id1", priority: 0.9 },
  { memoryId: "id2", tags: ["updated"] },
]);
```

### History & Audit Trail (query context)

```typescript
// Get change history for a memory
const history = await memory.history(ctx, id);
// [{ event: "created", actor: "mcp", timestamp: ..., newContent: "..." }, ...]

// Get recent changes across the project
const recent = await memory.projectHistory(ctx, { limit: 20 });
```

### Feedback & Scoring (mutation/query context)

```typescript
// Rate memories
await memory.addFeedback(ctx, id, "positive", { comment: "Very helpful rule" });
await memory.addFeedback(ctx, id, "negative", { comment: "Outdated information" });

// View feedback
const feedback = await memory.getFeedback(ctx, id);
```

### Memory Relations (mutation/query context)

```typescript
// Create relationships
await memory.addRelation(ctx, memoryA, memoryB, "extends");
await memory.addRelation(ctx, memoryC, memoryA, "contradicts", { confidence: 0.9 });

// View relationships
const relations = await memory.getRelations(ctx, memoryA);
const contradictions = await memory.getRelations(ctx, memoryA, { relationship: "contradicts" });

// Remove a relationship
await memory.removeRelation(ctx, relationId);
```

### Access Tracking (mutation context)

```typescript
// Record that memories were read (for relevance decay)
await memory.recordAccess(ctx, ["id1", "id2"]);
```

### Embedding Operations (action context)

```typescript
// Single embedding
await memory.embed(ctx, id);

// Batch embed all un-embedded
const result = await memory.embedAll(ctx);

// Vector similarity search (falls back to full-text)
const results = await memory.semanticSearch(ctx, "how to handle auth errors");
```

---

## Intelligent Ingest

The core "smart memory" feature. Instead of manually creating memories, feed raw text and let the LLM pipeline:

1. **Extract** discrete facts/learnings from conversations or notes
2. **Search** existing memories for overlap (semantic deduplication)
3. **Decide** per-fact: ADD new, UPDATE existing, DELETE contradicted, or SKIP
4. **Return** a structured changelog of what happened

```typescript
const memory = new AgentMemory(components.agentMemory, {
  projectId: "my-app",
  llmApiKey: process.env.OPENAI_API_KEY,
});

// In an action context
const result = await memory.ingest(ctx,
  `User prefers TypeScript strict mode. The API should use camelCase.
   Actually, we switched from REST to GraphQL last week.
   The old REST convention docs are outdated.`
);

// result.results:
// [
//   { event: "added", content: "User prefers TypeScript strict mode", memoryId: "..." },
//   { event: "updated", content: "API uses camelCase with GraphQL", memoryId: "...", previousContent: "..." },
//   { event: "deleted", content: "REST API conventions", memoryId: "...", previousContent: "..." },
// ]
```

### Custom Prompts

Override the extraction and decision prompts per-project:

```typescript
await memory.ingest(ctx, rawText, {
  customExtractionPrompt: "Extract only coding conventions and preferences...",
  customUpdatePrompt: "When facts conflict, always prefer the newer one...",
});
```

Or set them in project settings for all ingest operations:

```typescript
await ctx.runMutation(components.agentMemory.mutations.upsertProject, {
  projectId: "my-app",
  name: "My App",
  settings: {
    autoSync: false,
    syncFormats: [],
    factExtractionPrompt: "Your custom extraction prompt...",
    updateDecisionPrompt: "Your custom update decision prompt...",
  },
});
```

---

## Memory History

Every create, update, archive, restore, and merge operation records a history entry. This provides a complete audit trail of how memories change over time.

```typescript
const history = await memory.history(ctx, memoryId);
// Returns: MemoryHistoryEntry[]
// Each entry has: event, actor, timestamp, previousContent, newContent
```

History is automatically cleaned up by a weekly cron job (entries older than 90 days are removed).

---

## Feedback & Scoring

Agents and users can rate memories. Feedback affects the **effective priority** used in context bundles:

- Each `positive` feedback adds up to +0.05 priority (max +0.2 boost)
- Each `negative` feedback subtracts up to -0.1 priority (max -0.5 penalty)
- `very_negative` counts as negative with stronger signal

This means good memories naturally float to the top of context bundles, while bad ones sink — without manual priority management.

---

## Memory Relations

Build a knowledge graph between memories:

| Relationship | Meaning |
|-------------|---------|
| `extends` | Memory B adds detail to Memory A |
| `contradicts` | Memory B conflicts with Memory A |
| `replaces` | Memory B supersedes Memory A |
| `related_to` | General association |

Relations are directional (`from` -> `to`) and queryable by direction and type.

---

## Relevance Decay

Memories that aren't accessed lose priority over time, preventing stale memories from dominating context windows.

**How it works:**
- A daily cron job (3 AM UTC) checks all non-pinned memories
- Memories with low access count and old `lastAccessedAt` get reduced priority
- Decay follows an exponential half-life (configurable per-project, default 30 days)
- Pinned memories (priority >= 0.8) are never decayed

**Enable per-project:**

```typescript
await ctx.runMutation(components.agentMemory.mutations.upsertProject, {
  projectId: "my-app",
  name: "My App",
  settings: {
    autoSync: false,
    syncFormats: [],
    decayEnabled: true,
    decayHalfLifeDays: 30, // memories lose half their priority every 30 days of no access
  },
});
```

---

## CLI Usage

The CLI syncs memories between local tool files and Convex.

### Environment Variable

```bash
export CONVEX_URL="https://your-deployment.convex.cloud"
```

### Commands

#### `npx agent-memory init`

Detect tools in the current directory and register the project.

```bash
npx agent-memory init --project my-app --name "My App"
```

Detects: Claude Code, Cursor, OpenCode, Codex, Conductor, Zed, VS Code Copilot, Pi.

#### `npx agent-memory push`

Push local memory files to Convex.

```bash
npx agent-memory push --project my-app
npx agent-memory push --project my-app --format claude-code  # specific tool only
```

#### `npx agent-memory pull`

Pull memories from Convex to local files.

```bash
npx agent-memory pull --project my-app --format cursor
npx agent-memory pull --project my-app --format claude-code
```

#### `npx agent-memory list`

List all memories in the terminal.

```bash
npx agent-memory list --project my-app
npx agent-memory list --project my-app --type instruction
```

#### `npx agent-memory search <query>`

Search memories from the terminal.

```bash
npx agent-memory search "API conventions" --project my-app --limit 5
```

#### `npx agent-memory mcp`

Start the MCP server (see [MCP Server](#mcp-server) section).

```bash
npx agent-memory mcp --project my-app
npx agent-memory mcp --project my-app --llm-api-key $OPENAI_API_KEY  # enable ingest
```

### Hook Integration

Auto-sync on Claude Code session start/end:

```json
// .claude/settings.json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{ "type": "command", "command": "npx agent-memory pull --format claude-code" }]
    }],
    "SessionEnd": [{
      "hooks": [{ "type": "command", "command": "npx agent-memory push --format claude-code" }]
    }]
  }
}
```

---

## MCP Server

The MCP server runs as a local process, bridging AI tools to your Convex backend via stdio/JSON-RPC.

```
┌─────────────┐    stdio/JSON-RPC    ┌──────────────────┐    ConvexHttpClient    ┌─────────┐
│  Claude Code │ <────────────────> │  MCP Server      │ <──────────────────> │ Convex  │
│  Cursor      │                     │  (local process)  │                      │ Cloud   │
│  VS Code     │                     │  npx agent-memory │                      │         │
└─────────────┘                      └──────────────────┘                       └─────────┘
```

### Starting the Server

```bash
npx agent-memory mcp --project my-app
```

Options:
| Flag | Description |
|------|-------------|
| `--project <id>` | Project ID (default: "default") |
| `--read-only` | Disable write operations |
| `--disable-tools <tools>` | Comma-separated tool names to disable |
| `--embedding-api-key <key>` | Enable vector search |
| `--llm-api-key <key>` | Enable intelligent ingest |
| `--llm-model <model>` | LLM model for ingest (default: "gpt-4.1-nano") |

### MCP Tools (14 total)

| Tool | Description |
|------|-------------|
| `memory_remember` | Save a new memory (with agent/session scoping) |
| `memory_recall` | Search memories by keyword (full-text) |
| `memory_semantic_recall` | Search memories by meaning (vector) |
| `memory_list` | List memories with filters (agent, session, source, tags) |
| `memory_context` | Get context bundle (pinned + relevant) |
| `memory_forget` | Archive a memory |
| `memory_restore` | Restore an archived memory |
| `memory_update` | Update an existing memory |
| `memory_history` | View change audit trail |
| `memory_feedback` | Rate a memory as helpful/unhelpful |
| `memory_relate` | Create relationship between memories |
| `memory_relations` | View memory graph connections |
| `memory_batch_archive` | Archive multiple memories at once |
| `memory_ingest` | Intelligently extract memories from raw text |

### MCP Resources

| URI | Description |
|-----|-------------|
| `memory://project/{id}/pinned` | High-priority memories auto-loaded at session start |

### Configuration in Claude Code

```json
// .claude/settings.json
{
  "mcpServers": {
    "agent-memory": {
      "command": "npx",
      "args": [
        "agent-memory", "mcp",
        "--project", "my-app",
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

### Configuration in Cursor

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "agent-memory": {
      "command": "npx",
      "args": [
        "agent-memory", "mcp",
        "--project", "my-app",
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

---

## Schema

The component creates 7 isolated tables in your Convex deployment:

### `memories`

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | `string` | Project identifier |
| `scope` | `"project" \| "user" \| "org"` | Visibility scope |
| `userId` | `string?` | Owner for user-scoped memories |
| `agentId` | `string?` | Agent that created/owns this memory |
| `sessionId` | `string?` | Session/conversation ID |
| `title` | `string` | Short title/slug |
| `content` | `string` | Markdown content |
| `memoryType` | `MemoryType` | Category (see below) |
| `tags` | `string[]` | Searchable tags |
| `paths` | `string[]?` | File glob patterns for relevance matching |
| `priority` | `number?` | 0-1 scale (>= 0.8 = pinned) |
| `source` | `string?` | Origin tool ("claude-code", "cursor", "mcp", "ingest", etc.) |
| `checksum` | `string` | FNV-1a hash for change detection |
| `archived` | `boolean` | Soft delete flag |
| `embeddingId` | `Id?` | Link to vector embedding |
| `accessCount` | `number?` | Times this memory was accessed |
| `lastAccessedAt` | `number?` | Timestamp of last access |
| `positiveCount` | `number?` | Positive feedback count |
| `negativeCount` | `number?` | Negative feedback count |

**Indexes:** `by_project`, `by_project_scope`, `by_project_title`, `by_type_priority`, `by_agent`, `by_session`, `by_source`, `by_last_accessed`
**Search indexes:** `search_content` (full-text on content), `search_title` (full-text on title)

### `embeddings`

Vector embeddings for semantic search. Linked to memories via `memoryId`.

**Vector index:** `by_embedding` (1536 dimensions, OpenAI-compatible)

### `projects`

Project registry with settings for sync, custom prompts, and decay configuration.

### `syncLog`

Tracks push/pull sync events for conflict detection.

### `memoryHistory`

Audit trail of all memory changes: created, updated, archived, restored, merged.

### `memoryFeedback`

Quality signals from agents/users: positive, negative, very_negative with optional comments.

### `memoryRelations`

Directional graph connections between memories with relationship types and metadata.

---

## Memory Types

| Type | Description | Maps To |
|------|-------------|---------|
| `instruction` | Rules and conventions | `.claude/rules/`, `.cursor/rules/`, `AGENTS.md` |
| `learning` | Auto-discovered patterns | Claude Code auto-memory |
| `reference` | Architecture docs, API specs | Reference documentation |
| `feedback` | Corrections, preferences | User feedback on behavior |
| `journal` | Session logs | OpenCode journal entries |

---

## Tool Format Support

The component reads from and writes to 8 tool formats:

| Tool | Parser Reads | Formatter Writes |
|------|-------------|-----------------|
| **Claude Code** | `.claude/rules/*.md` (YAML frontmatter) | `.claude/rules/<title>.md` |
| **Cursor** | `.cursor/rules/*.mdc` (YAML frontmatter) | `.cursor/rules/<title>.mdc` |
| **OpenCode** | `AGENTS.md` (## sections) | `AGENTS.md` or `journal/<title>.md` |
| **Codex** | `AGENTS.md`, `AGENTS.override.md` | `AGENTS.md` or `<dir>/AGENTS.md` |
| **Conductor** | `.conductor/rules/*.md` | `.conductor/rules/<title>.md` |
| **Zed** | `.zed/rules/*.md` | `.zed/rules/<title>.md` |
| **VS Code Copilot** | `.github/copilot-instructions.md`, `.copilot/rules/*.md` | `.github/copilot-instructions.md` |
| **Pi** | `.pi/rules/*.md` | `.pi/rules/<title>.md` |

### Cross-Tool Sync Example

Push from Claude Code, pull as Cursor rules:

```bash
# In your project directory with .claude/rules/ files
npx agent-memory push --project my-app --format claude-code

# On another machine or for another tool
npx agent-memory pull --project my-app --format cursor
# Creates .cursor/rules/*.mdc files with proper frontmatter
```

---

## Vector Search

Vector search is opt-in. Everything works with full-text search by default.

### Enabling Vector Search

Pass an OpenAI API key when configuring:

```typescript
const memory = new AgentMemory(components.agentMemory, {
  projectId: "my-app",
  embeddingApiKey: process.env.OPENAI_API_KEY,
  embeddingModel: "text-embedding-3-small", // default
});
```

Or via CLI/MCP:

```bash
npx agent-memory mcp --project my-app --embedding-api-key $OPENAI_API_KEY
```

### Backfilling Embeddings

```typescript
// In an action context
const result = await memory.embedAll(ctx);
console.log(`Embedded ${result.embedded} memories, skipped ${result.skipped}`);
```

### Fallback Behavior

If no embedding API key is provided, `semanticSearch` automatically falls back to full-text search. No errors, no configuration changes needed.

---

## Read-Only HTTP API

Expose memories as REST endpoints for dashboards, CI/CD, and external integrations. The component provides a `MemoryHttpApi` class that generates `httpAction` handlers — your app mounts them on its own `httpRouter`.

### Setup

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

### Creating API Keys

```typescript
// convex/memory.ts — behind your app's own auth
import { AgentMemory } from "@waynesutton/agent-memory";

const memory = new AgentMemory(components.agentMemory, { projectId: "my-app" });

export const createReadKey = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return await memory.createApiKey(ctx, {
      name: "Dashboard key",
      permissions: ["list", "search", "context"],
    });
  },
});
```

### Using the API

```bash
# List memories
curl -H "Authorization: Bearer am_<key>" \
  https://your-deployment.convex.cloud/api/memory/list

# Search
curl -H "Authorization: Bearer am_<key>" \
  "https://your-deployment.convex.cloud/api/memory/search?q=API+conventions"

# Get context bundle
curl -H "Authorization: Bearer am_<key>" \
  https://your-deployment.convex.cloud/api/memory/context
```

### Endpoints

| Path | Permission | Description |
|------|------------|-------------|
| `/list` | `list` | List memories with filters |
| `/get?id=<id>` | `get` | Get single memory |
| `/search?q=<query>` | `search` | Full-text search |
| `/context` | `context` | Progressive context bundle |
| `/export?format=<format>` | `export` | Export in tool format |
| `/history?id=<id>` | `history` | Memory audit trail |
| `/relations?id=<id>` | `relations` | Memory graph |

### Rate Limiting

Self-contained fixed-window token bucket (no external dependency):

- **Default:** 100 requests per 60 seconds
- **Configurable:** per-key override > per-project setting > global default
- Returns `429` with `retryAfterMs` when exceeded
- Old window records cleaned up hourly by cron

### Available Permissions

`list`, `get`, `search`, `context`, `export`, `history`, `relations`

---

## Security

6 layers of protection:

| Layer | What | How |
|-------|------|-----|
| **Deployment URL** | Gate to your Convex backend | `CONVEX_URL` env var required. Each app has its own isolated deployment. |
| **Auth Token** | Authenticates the caller | Optional `CONVEX_AUTH_TOKEN` for production/team use. |
| **API Keys** | HTTP API access control | Bearer tokens with per-key permissions, expiry, and rate limits. Keys stored as hashes. |
| **Project Scope** | Isolates by project | `--project` flag. MCP server and API keys only access that project's memories. |
| **Tool Disabling** | Restrict operations | `--read-only` or `--disable-tools` flags for fine-grained control. |
| **Convex Isolation** | Runtime sandboxing | Component tables are isolated. Queries can't write. Mutations are transactional. |

### Examples

```bash
# Full access (default)
npx agent-memory mcp --project my-app

# Read-only (no write/delete/ingest tools)
npx agent-memory mcp --project my-app --read-only

# Disable specific tools
npx agent-memory mcp --project my-app --disable-tools memory_forget,memory_ingest
```

### MCP Config with Secrets

```json
{
  "mcpServers": {
    "agent-memory": {
      "command": "npx",
      "args": ["agent-memory", "mcp", "--project", "my-app"],
      "env": {
        "CONVEX_URL": "${env:CONVEX_URL}",
        "CONVEX_AUTH_TOKEN": "${env:CONVEX_AUTH_TOKEN}"
      }
    }
  }
}
```

---

## Architecture

```
@waynesutton/agent-memory
├── src/
│   ├── component/              # Convex backend (defineComponent)
│   │   ├── schema.ts           # 9 tables: memories, embeddings, projects, syncLog,
│   │   │                       #           memoryHistory, memoryFeedback, memoryRelations,
│   │   │                       #           apiKeys, rateLimitTokens
│   │   ├── mutations.ts        # CRUD + batch + feedback + relations + history tracking
│   │   ├── queries.ts          # list, search, context bundle, history, feedback, relations
│   │   ├── actions.ts          # embeddings, semantic search, intelligent ingest pipeline
│   │   ├── apiKeyMutations.ts  # API key create/revoke, rate limit consume
│   │   ├── apiKeyQueries.ts    # API key validation, listing
│   │   ├── crons.ts            # Daily relevance decay + weekly history cleanup + hourly rate limit cleanup
│   │   ├── cronActions.ts      # Internal actions called by cron jobs
│   │   ├── cronQueries.ts      # Internal queries for cron job data
│   │   ├── format.ts           # Memory -> tool-native file conversion
│   │   └── checksum.ts         # FNV-1a content hashing
│   ├── client/
│   │   ├── index.ts            # AgentMemory class (public API)
│   │   └── http.ts             # MemoryHttpApi class (read-only HTTP API)
│   ├── cli/
│   │   ├── index.ts            # CLI: init, push, pull, list, search, mcp
│   │   ├── sync.ts             # Push/pull sync logic
│   │   └── parsers/            # 8 tool parsers (local files -> memories)
│   ├── mcp/
│   │   └── server.ts           # MCP server (14 tools + resources)
│   ├── shared.ts               # Shared types and validators
│   └── test.ts                 # Test helper for convex-test
└── example/
    └── convex/                 # Example Convex app
```

### Key Design Principles

- **Works without any API key** — full-text search, CRUD, sync, export, history, feedback, and relations all work with zero external dependencies
- **Vector search is opt-in** — pass `embeddingApiKey` to enable; falls back to full-text automatically
- **Intelligent ingest is opt-in** — pass `llmApiKey` to enable LLM-powered fact extraction and deduplication
- **Standalone** — no dependency on `@convex-dev/agent` or any other component
- **Markdown-first** — memories are markdown documents with optional YAML frontmatter
- **Checksum-based sync** — only changed content is pushed/pulled (FNV-1a hashing)
- **Progressive disclosure** — context bundles tier memories as pinned/relevant/available
- **Feedback-boosted scoring** — positive feedback raises priority; negative feedback lowers it
- **Self-maintaining** — cron jobs handle relevance decay and history cleanup automatically
- **Multi-dimensional scoping** — project + user + agent + session isolation

---

## Testing

### Using in Your Tests

```typescript
import { convexTest } from "convex-test";
import agentMemoryTest from "@waynesutton/agent-memory/test";

const t = convexTest();
agentMemoryTest.register(t);
```

### Running Component Tests

```bash
npm test          # run all tests
npm run test:watch # watch mode
```

---

## License

Apache-2.0
