# @waynesutton/agent-memory — Agent Reference

A Convex Component for persistent, cloud-synced agent memory. Markdown-first memory backend for AI coding agents across CLIs and IDEs.

## For AI Agents Using This Library

You are working with `@waynesutton/agent-memory`, a Convex component that gives you persistent memory across sessions, tools, and machines. This document tells you how to use it effectively.

### When to Use This Component

Use agent-memory when you need:
- Persistent memory that survives across sessions, tools, and machines
- Cross-tool sync (memories created in Claude Code are available in Cursor, OpenCode, Codex, etc.)
- Searchable memory with full-text and vector/semantic search
- Intelligent ingest that auto-extracts facts and deduplicates against existing memories
- Feedback loops where agents rate memories to influence future context
- Multi-agent concurrency — multiple agents read/write simultaneously with ACID guarantees
- Real-time reactive queries — memory changes propagate instantly without polling

Do NOT use agent-memory when:
- You only need ephemeral conversation context within a single session
- You are not using Convex as your backend

## The Architecture

```
Your App (Convex)
├── convex/convex.config.ts    ← registers the component with app.use(agentMemory)
├── convex/memory.ts           ← your wrapper functions calling AgentMemory class
├── convex/http.ts             ← optional: mounts MemoryHttpApi for REST access
└── node_modules/@waynesutton/agent-memory/
    ├── src/component/         ← Convex backend (9 tables, isolated)
    ├── src/client/index.ts    ← AgentMemory class (main API)
    ├── src/client/http.ts     ← MemoryHttpApi class (HTTP endpoints)
    ├── src/mcp/server.ts      ← MCP server (14 tools)
    └── src/cli/               ← CLI for push/pull/sync
```

## How to Use

### 1. Setup (in consuming app)

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import agentMemory from "@waynesutton/agent-memory/convex.config.js";
const app = defineApp();
app.use(agentMemory);
export default app;
```

```typescript
// convex/memory.ts
import { AgentMemory } from "@waynesutton/agent-memory";
import { components } from "./_generated/api.js";

const memory = new AgentMemory(components.agentMemory, {
  projectId: "my-project",
  agentId: "my-agent",           // identifies you
  llmApiKey: process.env.OPENAI_API_KEY,  // for intelligent ingest
});
```

### 2. Saving Memories

```typescript
const id = await memory.remember(ctx, {
  title: "api-conventions",
  content: "# API Conventions\n\n- Use camelCase\n- Return JSON",
  memoryType: "instruction",     // instruction | learning | reference | feedback | journal
  tags: ["api", "style"],
  paths: ["src/api/**"],         // file patterns for relevance matching
  priority: 0.9,                 // >= 0.8 = pinned (always included in context)
});
```

### 3. Retrieving Memories

```typescript
// Full-text search
const results = await memory.search(ctx, "API authentication");

// List with filters
const mems = await memory.list(ctx, {
  memoryType: "instruction",
  tags: ["api"],
  agentId: "claude-code",
});

// Progressive context bundle (best for agent sessions)
const bundle = await memory.getContextBundle(ctx, {
  activePaths: ["src/api/routes.ts"],
});
// bundle.pinned    — high-priority memories (always include)
// bundle.relevant  — path-matched memories
// bundle.available — everything else (summaries only)
```

### 4. Intelligent Ingest

Feed raw text and the LLM pipeline extracts facts, deduplicates against existing memories, and decides ADD/UPDATE/DELETE/SKIP per fact:

```typescript
const result = await memory.ingest(ctx, rawConversationText);
// result.results: [{ event: "added"|"updated"|"deleted"|"skipped", content, memoryId }]
```

### 5. Feedback Loop

Rate memories to influence priority scoring in future context bundles:

```typescript
await memory.addFeedback(ctx, memoryId, "positive", { comment: "Very helpful" });
await memory.addFeedback(ctx, memoryId, "negative", { comment: "Outdated" });
```

### 6. Memory Relations

Build a knowledge graph between memories:

```typescript
await memory.addRelation(ctx, memoryA, memoryB, "extends");
await memory.addRelation(ctx, memoryC, memoryA, "contradicts", { confidence: 0.9 });
```

### 7. HTTP API

Expose memories as REST endpoints:

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { MemoryHttpApi } from "@waynesutton/agent-memory/http";
import { components } from "./_generated/api";

const http = httpRouter();
new MemoryHttpApi(components.agentMemory).mount(http, "/api/memory");
export default http;
```

Create API keys: `await memory.createApiKey(ctx, { name: "...", permissions: ["list", "search"] })`

## Key Types

```typescript
type MemoryType = "instruction" | "learning" | "reference" | "feedback" | "journal";
type Scope = "project" | "user" | "org";
type FeedbackSentiment = "positive" | "negative" | "very_negative";
type ToolFormat = "claude-code" | "cursor" | "opencode" | "codex" | "conductor" | "zed" | "vscode-copilot" | "pi" | "raw";
```

## Why Convex

Built as a Convex Component, agent-memory inherits guarantees that file-based memory (CLAUDE.md, .cursor/rules) cannot provide:

- **Real-time reactive queries** — memories update live across all connected clients without polling
- **ACID transactional writes** — every create/update/archive is fully transactional, no partial saves
- **Multi-agent concurrency** — multiple agents read/write simultaneously with consistency guarantees
- **Zero infrastructure** — no database to provision, Convex handles storage, indexing, and search
- **Isolated component tables** — 9 tables in their own namespace, no conflicts with your app

## Convex Component Constraints

When working with this component, be aware of:

- **No `ctx.auth`** — components don't have access to the app's auth. Pass `userId`/`agentId` explicitly in config.
- **No `process.env`** — components can't read environment variables. API keys are passed as function arguments.
- **IDs become strings** — Convex document IDs cross the component boundary as strings, not typed `Id<"table">`.
- **Isolated tables** — the component's 9 tables are namespaced under `agentMemory:` and isolated from your app's tables.

## MCP Server Tools (14)

When using via MCP, these tools are available:

| Tool | Description |
|------|-------------|
| `memory_remember` | Save a new memory |
| `memory_recall` | Full-text search |
| `memory_semantic_recall` | Vector similarity search |
| `memory_list` | List with filters |
| `memory_context` | Get context bundle |
| `memory_forget` | Archive a memory |
| `memory_restore` | Restore archived memory |
| `memory_update` | Update existing memory |
| `memory_history` | View audit trail |
| `memory_feedback` | Rate as helpful/unhelpful |
| `memory_relate` | Create relationship |
| `memory_relations` | View graph connections |
| `memory_batch_archive` | Archive multiple |
| `memory_ingest` | LLM-powered fact extraction |

## File References

- Component schema: `src/component/schema.ts`
- Client API: `src/client/index.ts`
- HTTP API: `src/client/http.ts`
- MCP server: `src/mcp/server.ts`
- Shared types: `src/shared.ts`
- Full API reference: `prds/API-REFERENCE.md`
- Setup guide: `prds/SETUP.md`
