import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const memoryTypeValidator = v.union(
  v.literal("instruction"),
  v.literal("learning"),
  v.literal("reference"),
  v.literal("feedback"),
  v.literal("journal"),
);

export const scopeValidator = v.union(
  v.literal("project"),
  v.literal("user"),
  v.literal("org"),
);

export const syncDirectionValidator = v.union(
  v.literal("push"),
  v.literal("pull"),
);

export const historyEventValidator = v.union(
  v.literal("created"),
  v.literal("updated"),
  v.literal("archived"),
  v.literal("restored"),
  v.literal("merged"),
);

export const feedbackSentimentValidator = v.union(
  v.literal("positive"),
  v.literal("negative"),
  v.literal("very_negative"),
);

export const ingestEventValidator = v.union(
  v.literal("added"),
  v.literal("updated"),
  v.literal("deleted"),
  v.literal("skipped"),
);

export default defineSchema({
  // Core memory documents — each row is one markdown memory
  memories: defineTable({
    projectId: v.string(),
    scope: scopeValidator,
    userId: v.optional(v.string()),
    agentId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    title: v.string(),
    content: v.string(),
    memoryType: memoryTypeValidator,
    tags: v.array(v.string()),
    paths: v.optional(v.array(v.string())),
    priority: v.optional(v.float64()),
    source: v.optional(v.string()),
    lastSyncedAt: v.optional(v.float64()),
    checksum: v.string(),
    archived: v.boolean(),
    embeddingId: v.optional(v.id("embeddings")),
    // Access tracking for relevance decay
    accessCount: v.optional(v.float64()),
    lastAccessedAt: v.optional(v.float64()),
    // Feedback aggregation
    positiveCount: v.optional(v.float64()),
    negativeCount: v.optional(v.float64()),
  })
    .index("by_project", ["projectId", "archived", "memoryType"])
    .index("by_project_scope", ["projectId", "scope", "userId", "archived"])
    .index("by_project_title", ["projectId", "title"])
    .index("by_type_priority", ["projectId", "memoryType", "priority"])
    .index("by_agent", ["projectId", "agentId", "archived"])
    .index("by_session", ["projectId", "sessionId", "archived"])
    .index("by_source", ["projectId", "source", "archived"])
    .index("by_last_accessed", ["projectId", "lastAccessedAt"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["projectId", "memoryType", "scope", "archived"],
    })
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["projectId", "memoryType"],
    }),

  // Vector embeddings for semantic search
  embeddings: defineTable({
    memoryId: v.id("memories"),
    embedding: v.array(v.float64()),
    model: v.string(),
    dimensions: v.float64(),
  })
    .index("by_memory", ["memoryId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: [],
    }),

  // Project registry
  projects: defineTable({
    projectId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    settings: v.object({
      autoSync: v.boolean(),
      syncFormats: v.array(v.string()),
      embeddingModel: v.optional(v.string()),
      embeddingDimensions: v.optional(v.float64()),
      // Custom prompts for intelligent ingest
      factExtractionPrompt: v.optional(v.string()),
      updateDecisionPrompt: v.optional(v.string()),
      // Relevance decay settings
      decayEnabled: v.optional(v.boolean()),
      decayHalfLifeDays: v.optional(v.float64()),
      // Read-only API rate limiting
      apiRateLimit: v.optional(
        v.object({
          requestsPerWindow: v.float64(),
          windowMs: v.float64(),
        }),
      ),
    }),
  }).index("by_projectId", ["projectId"]),

  // Sync log — tracks push/pull sync events
  syncLog: defineTable({
    projectId: v.string(),
    userId: v.optional(v.string()),
    memoryId: v.id("memories"),
    targetFormat: v.string(),
    targetPath: v.string(),
    syncedAt: v.float64(),
    checksum: v.string(),
    direction: syncDirectionValidator,
  }).index("by_project_user", ["projectId", "userId", "syncedAt"]),

  // Memory history — audit trail of all changes
  memoryHistory: defineTable({
    memoryId: v.id("memories"),
    projectId: v.string(),
    previousContent: v.optional(v.string()),
    newContent: v.optional(v.string()),
    previousTitle: v.optional(v.string()),
    newTitle: v.optional(v.string()),
    event: historyEventValidator,
    actor: v.string(), // userId, agentId, "mcp", "cli", "system", "ingest"
    timestamp: v.float64(),
  })
    .index("by_memory", ["memoryId", "timestamp"])
    .index("by_project", ["projectId", "timestamp"]),

  // Memory feedback — quality signals from agents/users
  memoryFeedback: defineTable({
    memoryId: v.id("memories"),
    projectId: v.string(),
    sentiment: feedbackSentimentValidator,
    comment: v.optional(v.string()),
    actor: v.string(),
    timestamp: v.float64(),
  })
    .index("by_memory", ["memoryId", "timestamp"])
    .index("by_project", ["projectId", "timestamp"]),

  // Memory relations — graph connections between memories
  memoryRelations: defineTable({
    projectId: v.string(),
    fromMemoryId: v.id("memories"),
    toMemoryId: v.id("memories"),
    relationship: v.string(), // e.g. "contradicts", "extends", "replaces", "related_to"
    metadata: v.optional(v.object({
      confidence: v.optional(v.float64()),
      createdBy: v.optional(v.string()),
    })),
    timestamp: v.float64(),
  })
    .index("by_from", ["fromMemoryId", "relationship"])
    .index("by_to", ["toMemoryId", "relationship"])
    .index("by_project", ["projectId", "relationship"]),

  // API keys — for read-only HTTP API access
  apiKeys: defineTable({
    keyHash: v.string(), // SHA-256 hash of the plaintext key
    projectId: v.string(),
    name: v.string(), // human-readable label
    permissions: v.array(v.string()), // allowed endpoints: "list", "get", "search", "context", "export", "history", "relations"
    rateLimitOverride: v.optional(
      v.object({
        requestsPerWindow: v.float64(),
        windowMs: v.float64(),
      }),
    ),
    lastUsedAt: v.optional(v.float64()),
    expiresAt: v.optional(v.float64()),
    revoked: v.boolean(),
  })
    .index("by_key", ["keyHash"])
    .index("by_project", ["projectId", "revoked"]),

  // Rate limit tracking — fixed-window token counting per API key
  rateLimitTokens: defineTable({
    keyHash: v.string(),
    windowStart: v.float64(),
    tokenCount: v.float64(),
  }).index("by_key_window", ["keyHash", "windowStart"]),
});
