# API Reference — @waynesutton/agent-memory

Complete reference for all exports, methods, types, CLI commands, and MCP tools.

---

## Package Exports

| Import Path | Description |
|-------------|-------------|
| `@waynesutton/agent-memory` | `AgentMemory` class + types |
| `@waynesutton/agent-memory/http` | `MemoryHttpApi` class for read-only HTTP API |
| `@waynesutton/agent-memory/convex.config.js` | Convex component config |
| `@waynesutton/agent-memory/test` | Test helper for convex-test |
| `@waynesutton/agent-memory/cli` | CLI entry point |
| `@waynesutton/agent-memory/mcp` | MCP server entry point |

---

## AgentMemory Class

### Constructor

```typescript
new AgentMemory(component: ComponentApi, config: AgentMemoryConfig)
```

### AgentMemoryConfig

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `projectId` | `string` | Yes | — | Unique project identifier |
| `defaultScope` | `"project" \| "user" \| "org"` | No | `"project"` | Default scope for operations |
| `userId` | `string` | No | — | User ID for user-scoped memories |
| `agentId` | `string` | No | — | Agent identifier (e.g. "claude-code", "cursor-agent") |
| `sessionId` | `string` | No | — | Session/conversation ID for session-scoped memories |
| `embeddingApiKey` | `string` | No | — | OpenAI API key for vector search |
| `embeddingModel` | `string` | No | `"text-embedding-3-small"` | Embedding model to use |
| `llmApiKey` | `string` | No | — | OpenAI-compatible API key for intelligent ingest |
| `llmModel` | `string` | No | `"gpt-4.1-nano"` | LLM model for fact extraction |
| `llmBaseUrl` | `string` | No | `"https://api.openai.com/v1"` | Custom LLM API endpoint |

---

### Methods

#### Read Operations (query context)

##### `list(ctx: QueryCtx, opts?): Promise<Memory[]>`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `memoryType` | `MemoryType` | — | Filter by type |
| `scope` | `Scope` | config default | Filter by scope |
| `agentId` | `string` | config default | Filter by agent |
| `sessionId` | `string` | config default | Filter by session |
| `source` | `string` | — | Filter by source tool |
| `tags` | `string[]` | — | Filter by tags (any match) |
| `minPriority` | `number` | — | Minimum priority 0-1 |
| `archived` | `boolean` | `false` | Include archived |
| `createdAfter` | `number` | — | Filter by creation timestamp |
| `createdBefore` | `number` | — | Filter by creation timestamp |
| `limit` | `number` | `100` | Max results |

##### `get(ctx: QueryCtx, memoryId: string): Promise<Memory | null>`

Returns a single memory by ID, or `null` if not found.

##### `search(ctx: QueryCtx, query: string, opts?): Promise<Memory[]>`

Full-text search on memory content.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `memoryType` | `MemoryType` | — | Filter by type |
| `scope` | `Scope` | — | Filter by scope |
| `limit` | `number` | `20` | Max results |

##### `getContextBundle(ctx: QueryCtx, opts?): Promise<ContextBundle>`

Returns 3-tier progressive context with feedback-boosted priority scoring.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `activePaths` | `string[]` | — | Currently open file paths for relevance matching |
| `maxTokens` | `number` | — | Token budget (reserved for future use) |
| `agentId` | `string` | config default | Agent filter |

**Returns:**
```typescript
{
  pinned: Memory[],     // effective priority >= 0.8 (boosted by positive feedback)
  relevant: Memory[],   // path-matched against activePaths
  available: Array<{    // everything else (summaries only, sorted by priority)
    _id: string,
    title: string,
    memoryType: MemoryType,
    priority: number,
  }>
}
```

##### `exportForTool(ctx: QueryCtx, format: ToolFormat, opts?): Promise<ExportedFile[]>`

Export memories as tool-native files.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `since` | `number` | — | Only export memories created/synced after this timestamp |

##### `history(ctx: QueryCtx, memoryId: string, opts?): Promise<MemoryHistoryEntry[]>`

Get the change history (audit trail) of a specific memory.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `limit` | `number` | `50` | Max entries |

**Returns:** Array of history entries with `event`, `actor`, `previousContent`, `newContent`, `timestamp`.

##### `projectHistory(ctx: QueryCtx, opts?): Promise<MemoryHistoryEntry[]>`

Get recent change history across all memories in the project.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `limit` | `number` | `100` | Max entries |

##### `getFeedback(ctx: QueryCtx, memoryId: string, opts?): Promise<MemoryFeedbackEntry[]>`

Get feedback entries for a memory.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `limit` | `number` | `50` | Max entries |

##### `getRelations(ctx: QueryCtx, memoryId: string, opts?): Promise<MemoryRelation[]>`

Get relationships of a memory (graph connections).

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `direction` | `"from" \| "to" \| "both"` | `"both"` | Direction filter |
| `relationship` | `string` | — | Filter by relationship type |
| `limit` | `number` | `50` | Max results |

---

#### Write Operations (mutation context)

##### `remember(ctx: MutationCtx, memory): Promise<string>`

Save a new memory. Returns the memory ID. Automatically records history.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | Yes | Short title/slug |
| `content` | `string` | Yes | Markdown content |
| `memoryType` | `MemoryType` | Yes | Category |
| `tags` | `string[]` | No | Searchable tags |
| `paths` | `string[]` | No | File glob patterns |
| `priority` | `number` | No | 0-1 (>= 0.8 = pinned) |
| `source` | `string` | No | Origin tool name |
| `agentId` | `string` | No | Agent that created this memory |
| `sessionId` | `string` | No | Session/conversation ID |

##### `update(ctx: MutationCtx, memoryId: string, updates): Promise<void>`

Partial update. Only provided fields are changed. Records history for content/title changes.

| Field | Type | Description |
|-------|------|-------------|
| `content` | `string` | New markdown content |
| `title` | `string` | New title |
| `tags` | `string[]` | Replace tags |
| `paths` | `string[]` | Replace paths |
| `priority` | `number` | New priority |
| `memoryType` | `MemoryType` | New type |

##### `forget(ctx: MutationCtx, memoryId: string): Promise<void>`

Archives a memory (soft delete). Records history.

##### `restore(ctx: MutationCtx, memoryId: string): Promise<void>`

Restores a previously archived memory. Records history.

##### `batchArchive(ctx: MutationCtx, memoryIds: string[]): Promise<{ archived: number, failed: number }>`

Archive multiple memories at once. Records history for each.

##### `batchUpdate(ctx: MutationCtx, updates: Array<{...}>): Promise<{ updated: number, failed: number }>`

Update multiple memories at once. Each update object takes the same fields as `update()` plus `memoryId`.

##### `addFeedback(ctx: MutationCtx, memoryId: string, sentiment: FeedbackSentiment, opts?): Promise<void>`

Rate a memory. Feedback aggregation affects priority scoring in context bundles.

| Option | Type | Description |
|--------|------|-------------|
| `comment` | `string` | Optional comment explaining the rating |
| `actor` | `string` | Who gave the feedback (defaults to config agentId/userId) |

##### `addRelation(ctx: MutationCtx, fromMemoryId, toMemoryId, relationship, opts?): Promise<string>`

Create a directional relationship between two memories. Returns the relation ID.

| Option | Type | Description |
|--------|------|-------------|
| `confidence` | `number` | Confidence score (0-1) |
| `createdBy` | `string` | Who created the relation |

##### `removeRelation(ctx: MutationCtx, relationId: string): Promise<void>`

Remove a relationship between memories.

##### `recordAccess(ctx: MutationCtx, memoryIds: string[]): Promise<void>`

Record that memories were accessed. Updates `accessCount` and `lastAccessedAt` for relevance tracking.

##### `importLocal(ctx: MutationCtx, memories): Promise<ImportResult>`

Bulk upsert by `projectId + title`. Compares checksums to skip unchanged. Records history.

**Returns:** `{ created: number, updated: number, unchanged: number }`

##### `ingestTypes(ctx: MutationCtx, typeMemories): Promise<ImportResult>`

Import TypeScript type documentation as reference memories.

---

#### Embedding Operations (action context)

##### `embed(ctx: ActionCtx, memoryId: string): Promise<void>`

Generate and store an embedding for one memory. Requires `embeddingApiKey` in config.

##### `embedAll(ctx: ActionCtx): Promise<{ embedded: number, skipped: number }>`

Batch-embed all un-embedded memories. Requires `embeddingApiKey` in config.

##### `semanticSearch(ctx: ActionCtx, query: string, opts?): Promise<Memory[]>`

Vector similarity search. Falls back to full-text if no API key.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `limit` | `number` | `10` | Max results |

---

#### Intelligent Ingest (action context)

##### `ingest(ctx: ActionCtx, content: string, opts?): Promise<IngestResult>`

The core "smart memory" feature. Takes raw text and:
1. Extracts discrete facts/learnings via LLM
2. Searches existing memories for overlap
3. Decides per-fact: ADD new, UPDATE existing, DELETE contradicted, or SKIP
4. Returns a structured changelog

Requires `llmApiKey` in config.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `scope` | `Scope` | config default | Scope for new memories |
| `agentId` | `string` | config default | Agent performing the ingest |
| `sessionId` | `string` | config default | Session/conversation ID |
| `customExtractionPrompt` | `string` | — | Override fact extraction prompt |
| `customUpdatePrompt` | `string` | — | Override update decision prompt |

**Returns:**
```typescript
{
  results: Array<{
    memoryId: string,
    content: string,
    event: "added" | "updated" | "deleted" | "skipped",
    previousContent?: string,
  }>,
  totalProcessed: number,
}
```

---

#### API Key Management (mutation/query context)

##### `createApiKey(ctx: MutationCtx, opts): Promise<ApiKeyCreateResult>`

Create an API key for the read-only HTTP API. The plaintext key is only returned once.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | `string` | Yes | Human-readable label |
| `permissions` | `string[]` | Yes | Allowed endpoints: `"list"`, `"get"`, `"search"`, `"context"`, `"export"`, `"history"`, `"relations"` |
| `rateLimitOverride` | `{ requestsPerWindow: number, windowMs: number }` | No | Override default rate limit |
| `expiresAt` | `number` | No | Expiration timestamp (ms) |

**Returns:**
```typescript
{
  key: string,     // plaintext key (am_<40 chars>) — only returned once
  keyHash: string, // stored hash for future lookups
}
```

##### `revokeApiKey(ctx: MutationCtx, keyHash: string): Promise<void>`

Revoke an API key. Immediately invalidates all future requests using this key.

##### `listApiKeys(ctx: QueryCtx): Promise<ApiKeyInfo[]>`

List all non-revoked API keys for the project. Never exposes plaintext keys.

---

## MemoryHttpApi Class

Read-only HTTP API with bearer token authentication and rate limiting. The component cannot expose HTTP routes directly — this class generates `httpAction` handlers that the consuming app mounts on its own `httpRouter`.

### Constructor

```typescript
import { MemoryHttpApi } from "@waynesutton/agent-memory/http";

const memoryApi = new MemoryHttpApi(components.agentMemory, {
  corsOrigins: ["https://myapp.com"],  // optional, defaults to ["*"]
});
```

### `mount(http: HttpRouter, prefix: string): void`

Registers all read-only endpoints on the given router.

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { MemoryHttpApi } from "@waynesutton/agent-memory/http";
import { components } from "./_generated/api";

const http = httpRouter();
const memoryApi = new MemoryHttpApi(components.agentMemory);
memoryApi.mount(http, "/api/memory");
export default http;
```

### Endpoints

All endpoints require `Authorization: Bearer am_<key>` header.

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `{prefix}/list` | `list` | List memories with query param filters |
| GET | `{prefix}/get?id=<memoryId>` | `get` | Get single memory |
| GET | `{prefix}/search?q=<query>` | `search` | Full-text search |
| GET | `{prefix}/context` | `context` | Progressive context bundle |
| GET | `{prefix}/export?format=<format>` | `export` | Export in tool format |
| GET | `{prefix}/history?id=<memoryId>` | `history` | Memory audit trail |
| GET | `{prefix}/relations?id=<memoryId>` | `relations` | Memory graph connections |

All endpoints also respond to OPTIONS for CORS preflight.

### Query Parameters

#### `/list`

| Param | Type | Description |
|-------|------|-------------|
| `memoryType` | `string` | Filter by type |
| `scope` | `string` | Filter by scope |
| `agentId` | `string` | Filter by agent |
| `sessionId` | `string` | Filter by session |
| `source` | `string` | Filter by source tool |
| `tags` | `string` | Comma-separated tags |
| `archived` | `"true"` | Include archived |
| `minPriority` | `number` | Minimum priority |
| `limit` | `number` | Max results |

#### `/search`

| Param | Type | Description |
|-------|------|-------------|
| `q` | `string` | Search query (required) |
| `memoryType` | `string` | Filter by type |
| `scope` | `string` | Filter by scope |
| `limit` | `number` | Max results |

#### `/context`

| Param | Type | Description |
|-------|------|-------------|
| `scope` | `string` | Scope (default: "project") |
| `userId` | `string` | User filter |
| `agentId` | `string` | Agent filter |
| `activePaths` | `string` | Comma-separated file paths |
| `maxTokens` | `number` | Token budget |

#### `/export`

| Param | Type | Description |
|-------|------|-------------|
| `format` | `string` | Tool format (required) |
| `scope` | `string` | Scope filter |
| `userId` | `string` | User filter |
| `since` | `number` | Timestamp filter |

#### `/history` and `/relations`

| Param | Type | Description |
|-------|------|-------------|
| `id` | `string` | Memory ID (required) |
| `limit` | `number` | Max results |
| `direction` | `string` | Relations only: "from", "to", or "both" |
| `relationship` | `string` | Relations only: filter by type |

### Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Missing required query parameter |
| 401 | Missing/invalid/expired/revoked API key |
| 403 | API key lacks required permission |
| 404 | Memory not found |
| 429 | Rate limit exceeded (includes `retryAfterMs`) |

### Rate Limiting

Rate limits use a fixed-window token bucket (self-contained, no external dependency):

- **Default:** 100 requests per 60 seconds
- **Priority:** per-key override > per-project setting > global default
- Rate limit state is stored in the `rateLimitTokens` table
- Old window records are cleaned up by cron

---

## Types

### ApiKeyInfo

```typescript
interface ApiKeyInfo {
  _id: string;
  keyHash: string;
  projectId: string;
  name: string;
  permissions: string[];
  rateLimitOverride?: {
    requestsPerWindow: number;
    windowMs: number;
  };
  lastUsedAt?: number;
  expiresAt?: number;
  revoked: boolean;
}
```

### ApiKeyCreateResult

```typescript
interface ApiKeyCreateResult {
  key: string;     // plaintext key — only returned once
  keyHash: string;
}
```

### ApiPermission

```typescript
type ApiPermission = "list" | "get" | "search" | "context" | "export" | "history" | "relations";
```

### Memory

```typescript
interface Memory {
  _id: string;
  _creationTime: number;
  projectId: string;
  scope: Scope;
  userId?: string;
  agentId?: string;
  sessionId?: string;
  title: string;
  content: string;
  memoryType: MemoryType;
  tags: string[];
  paths?: string[];
  priority?: number;
  source?: string;
  lastSyncedAt?: number;
  checksum: string;
  archived: boolean;
  embeddingId?: string;
  accessCount?: number;
  lastAccessedAt?: number;
  positiveCount?: number;
  negativeCount?: number;
}
```

### MemoryType

```typescript
type MemoryType = "instruction" | "learning" | "reference" | "feedback" | "journal";
```

### Scope

```typescript
type Scope = "project" | "user" | "org";
```

### ToolFormat

```typescript
type ToolFormat =
  | "claude-code" | "cursor" | "opencode" | "codex"
  | "conductor" | "zed" | "vscode-copilot" | "pi" | "raw";
```

### ContextBundle

```typescript
interface ContextBundle {
  pinned: Memory[];
  relevant: Memory[];
  available: Array<{
    _id: string;
    title: string;
    memoryType: MemoryType;
    priority: number;
  }>;
}
```

### MemoryHistoryEntry

```typescript
interface MemoryHistoryEntry {
  _id: string;
  _creationTime: number;
  memoryId: string;
  projectId: string;
  previousContent?: string;
  newContent?: string;
  previousTitle?: string;
  newTitle?: string;
  event: "created" | "updated" | "archived" | "restored" | "merged";
  actor: string;
  timestamp: number;
}
```

### MemoryFeedbackEntry

```typescript
interface MemoryFeedbackEntry {
  _id: string;
  _creationTime: number;
  memoryId: string;
  projectId: string;
  sentiment: "positive" | "negative" | "very_negative";
  comment?: string;
  actor: string;
  timestamp: number;
}
```

### MemoryRelation

```typescript
interface MemoryRelation {
  _id: string;
  _creationTime: number;
  projectId: string;
  fromMemoryId: string;
  toMemoryId: string;
  relationship: string;
  metadata?: {
    confidence?: number;
    createdBy?: string;
  };
  timestamp: number;
}
```

### IngestResult

```typescript
interface IngestResult {
  results: Array<{
    memoryId: string;
    content: string;
    event: "added" | "updated" | "deleted" | "skipped";
    previousContent?: string;
  }>;
  totalProcessed: number;
}
```

### FeedbackSentiment

```typescript
type FeedbackSentiment = "positive" | "negative" | "very_negative";
```

### ExportedFile

```typescript
interface ExportedFile {
  path: string;
  content: string;
  checksum: string;
}
```

### ImportResult

```typescript
interface ImportResult {
  created: number;
  updated: number;
  unchanged: number;
}
```

---

## CLI Commands

All commands require `CONVEX_URL` environment variable.

### `agent-memory init`

```
agent-memory init [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--project <id>` | `"default"` | Project ID |
| `--name <name>` | project ID | Display name |

### `agent-memory push`

```
agent-memory push [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--project <id>` | `"default"` | Project ID |
| `--format <format>` | all detected | Specific tool format |
| `--user <id>` | — | User ID for user-scoped |

### `agent-memory pull`

```
agent-memory pull [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--project <id>` | `"default"` | Project ID |
| `--format <format>` | `"raw"` | Output format |
| `--user <id>` | — | User ID for user-scoped |

### `agent-memory list`

```
agent-memory list [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--project <id>` | `"default"` | Project ID |
| `--type <type>` | — | Filter by memory type |

### `agent-memory search <query>`

```
agent-memory search <query> [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--project <id>` | `"default"` | Project ID |
| `--limit <n>` | `10` | Max results |

### `agent-memory mcp`

```
agent-memory mcp [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--project <id>` | `"default"` | Project ID |
| `--read-only` | `false` | Disable write tools |
| `--disable-tools <list>` | — | Comma-separated tool names |
| `--embedding-api-key <key>` | — | Enable vector search |
| `--llm-api-key <key>` | — | Enable intelligent ingest via `memory_ingest` tool |
| `--llm-model <model>` | `"gpt-4.1-nano"` | LLM model for ingest |

---

## MCP Tools Reference

### memory_remember

Save a new memory.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | `string` | Yes | Short title |
| `content` | `string` | Yes | Markdown content |
| `memoryType` | `string` | Yes | One of: instruction, learning, reference, feedback, journal |
| `tags` | `string[]` | No | Tags |
| `priority` | `number` | No | 0-1 (>= 0.8 = pinned) |
| `agentId` | `string` | No | Agent that created this |
| `sessionId` | `string` | No | Session/conversation ID |

### memory_recall

Search by keyword (full-text).

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | `string` | Yes | Search query |
| `memoryType` | `string` | No | Filter by type |
| `limit` | `number` | No | Max results |

### memory_semantic_recall

Search by meaning (vector similarity). Falls back to full-text if no embedding key.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | `string` | Yes | Search query |
| `limit` | `number` | No | Max results |

### memory_list

List all memories with filters.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `memoryType` | `string` | No | Filter by type |
| `minPriority` | `number` | No | Minimum priority |
| `agentId` | `string` | No | Filter by agent |
| `sessionId` | `string` | No | Filter by session |
| `source` | `string` | No | Filter by source tool |
| `tags` | `string[]` | No | Filter by tags |
| `limit` | `number` | No | Max results |

### memory_context

Get context bundle (pinned + relevant memories) for the session.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `activePaths` | `string[]` | No | Currently open files |
| `maxTokens` | `number` | No | Token budget |

### memory_forget

Archive a memory.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `memoryId` | `string` | Yes | Memory ID |

### memory_restore

Restore a previously archived memory.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `memoryId` | `string` | Yes | Memory ID |

### memory_update

Update an existing memory.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `memoryId` | `string` | Yes | Memory ID |
| `content` | `string` | No | New content |
| `title` | `string` | No | New title |
| `tags` | `string[]` | No | New tags |
| `priority` | `number` | No | New priority |

### memory_history

View the change history of a memory (audit trail).

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `memoryId` | `string` | Yes | Memory ID |
| `limit` | `number` | No | Max entries (default 20) |

### memory_feedback

Rate a memory as helpful or unhelpful. Affects priority scoring.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `memoryId` | `string` | Yes | Memory ID |
| `sentiment` | `string` | Yes | "positive", "negative", or "very_negative" |
| `comment` | `string` | No | Explanation |

### memory_relate

Create a relationship between two memories.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `fromMemoryId` | `string` | Yes | Source memory ID |
| `toMemoryId` | `string` | Yes | Target memory ID |
| `relationship` | `string` | Yes | e.g. "contradicts", "extends", "replaces", "related_to" |

### memory_relations

View relationships of a memory (graph connections).

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `memoryId` | `string` | Yes | Memory ID |
| `relationship` | `string` | No | Filter by relationship type |
| `direction` | `string` | No | "from", "to", or "both" |

### memory_batch_archive

Archive multiple memories at once.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `memoryIds` | `string[]` | Yes | Memory IDs to archive |

### memory_ingest

Intelligently extract memories from raw text. Requires `--llm-api-key`.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | `string` | Yes | Raw text to extract memories from |
| `agentId` | `string` | No | Agent performing the ingest |
| `sessionId` | `string` | No | Session/conversation ID |

---

## MCP Resources

### `memory://project/{projectId}/pinned`

Returns all high-priority (>= 0.8) memories as markdown. Auto-loaded by clients that support MCP resources.

**MIME type:** `text/markdown`

---

## Convex Component Functions

These are the raw Convex functions exposed by the component. Typically accessed through the `AgentMemory` client class, but can be called directly via `ctx.runQuery(components.agentMemory.queries.list, {...})`.

### Queries

| Function | Description |
|----------|-------------|
| `queries.list` | List memories with filters (agentId, sessionId, source, tags, date range) |
| `queries.get` | Get single memory by ID |
| `queries.search` | Full-text search |
| `queries.getContextBundle` | 3-tier progressive context with feedback-boosted scoring |
| `queries.exportForTool` | Format conversion for tool export |
| `queries.history` | Change history for a specific memory |
| `queries.projectHistory` | Recent changes across entire project |
| `queries.getFeedback` | Feedback entries for a memory |
| `queries.getRelations` | Graph relationships of a memory |

### Mutations

| Function | Description |
|----------|-------------|
| `mutations.create` | Create a memory (with history tracking) |
| `mutations.update` | Partial update (with history tracking) |
| `mutations.archive` | Soft delete (with history tracking) |
| `mutations.restore` | Un-archive a memory |
| `mutations.batchArchive` | Archive multiple memories |
| `mutations.batchUpdate` | Update multiple memories |
| `mutations.addFeedback` | Rate a memory (positive/negative) |
| `mutations.addRelation` | Create relationship between memories |
| `mutations.removeRelation` | Remove a relationship |
| `mutations.recordAccess` | Track memory access for relevance |
| `mutations.importFromLocal` | Bulk upsert |
| `mutations.upsertProject` | Register/update project (with custom prompts, decay settings) |
| `mutations.recordSync` | Log sync event |
| `mutations.storeEmbedding` | Store vector embedding |

### Actions

| Function | Description |
|----------|-------------|
| `actions.generateEmbedding` | Generate embedding for one memory |
| `actions.semanticSearch` | Vector similarity search |
| `actions.embedAll` | Batch embed all un-embedded memories |
| `actions.ingest` | Intelligent fact extraction + dedup pipeline |

### API Key Queries

| Function | Description |
|----------|-------------|
| `apiKeyQueries.validateApiKey` | Validate a bearer token and return permissions + rate limit |
| `apiKeyQueries.listApiKeys` | List non-revoked API keys for a project |
| `apiKeyQueries.updateKeyLastUsed` | Update lastUsedAt timestamp on a key |

### API Key Mutations

| Function | Description |
|----------|-------------|
| `apiKeyMutations.createApiKey` | Create an API key with permissions and optional expiry |
| `apiKeyMutations.revokeApiKey` | Revoke an API key |
| `apiKeyMutations.consumeRateLimit` | Atomically check and consume a rate limit token |
| `apiKeyMutations.cleanupRateLimitTokens` | Remove expired rate limit window records |

### Cron Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `relevance-decay` | Daily at 3 AM UTC | Reduces priority of stale, low-access memories |
| `cleanup-old-history` | Weekly (Sunday 4 AM UTC) | Removes history entries older than 90 days |
| `cleanup-rate-limit-tokens` | Hourly | Removes expired rate limit window records |
