import { query, internalQuery } from "./_generated/server.js";
import { v } from "convex/values";
import {
  memoryTypeValidator,
  scopeValidator,
  historyEventValidator,
  feedbackSentimentValidator,
} from "./schema.js";
import { formatMemoryForTool } from "./format.js";
import type { ToolFormat } from "./format.js";

// ── Shared return validators ────────────────────────────────────────

const memoryDocValidator = v.object({
  _id: v.string(),
  _creationTime: v.float64(),
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
  embeddingId: v.optional(v.string()),
  accessCount: v.optional(v.float64()),
  lastAccessedAt: v.optional(v.float64()),
  positiveCount: v.optional(v.float64()),
  negativeCount: v.optional(v.float64()),
});

const memorySummaryValidator = v.object({
  _id: v.string(),
  title: v.string(),
  memoryType: memoryTypeValidator,
  priority: v.float64(),
});

const historyEntryValidator = v.object({
  _id: v.string(),
  _creationTime: v.float64(),
  memoryId: v.string(),
  projectId: v.string(),
  previousContent: v.optional(v.string()),
  newContent: v.optional(v.string()),
  previousTitle: v.optional(v.string()),
  newTitle: v.optional(v.string()),
  event: historyEventValidator,
  actor: v.string(),
  timestamp: v.float64(),
});

const feedbackEntryValidator = v.object({
  _id: v.string(),
  _creationTime: v.float64(),
  memoryId: v.string(),
  projectId: v.string(),
  sentiment: feedbackSentimentValidator,
  comment: v.optional(v.string()),
  actor: v.string(),
  timestamp: v.float64(),
});

const relationValidator = v.object({
  _id: v.string(),
  _creationTime: v.float64(),
  projectId: v.string(),
  fromMemoryId: v.string(),
  toMemoryId: v.string(),
  relationship: v.string(),
  metadata: v.optional(v.object({
    confidence: v.optional(v.float64()),
    createdBy: v.optional(v.string()),
  })),
  timestamp: v.float64(),
});

const toolFormatValidator = v.union(
  v.literal("claude-code"),
  v.literal("cursor"),
  v.literal("opencode"),
  v.literal("codex"),
  v.literal("conductor"),
  v.literal("zed"),
  v.literal("vscode-copilot"),
  v.literal("pi"),
  v.literal("raw"),
);

// ── Helper: map doc to return type ──────────────────────────────────

function mapDoc(m: any) {
  return {
    ...m,
    _id: m._id as unknown as string,
    embeddingId: m.embeddingId
      ? (m.embeddingId as unknown as string)
      : undefined,
  };
}

// ── list ────────────────────────────────────────────────────────────

export const list = query({
  args: {
    projectId: v.string(),
    scope: v.optional(scopeValidator),
    userId: v.optional(v.string()),
    agentId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    memoryType: v.optional(memoryTypeValidator),
    source: v.optional(v.string()),
    archived: v.optional(v.boolean()),
    minPriority: v.optional(v.float64()),
    tags: v.optional(v.array(v.string())),
    createdAfter: v.optional(v.float64()),
    createdBefore: v.optional(v.float64()),
    limit: v.optional(v.float64()),
  },
  returns: v.array(memoryDocValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const archived = args.archived ?? false;

    // Select index based on available filters
    let results;
    if (args.agentId) {
      results = await ctx.db
        .query("memories")
        .withIndex("by_agent", (q: any) =>
          q
            .eq("projectId", args.projectId)
            .eq("agentId", args.agentId!)
            .eq("archived", archived),
        )
        .take(limit);
    } else if (args.sessionId) {
      results = await ctx.db
        .query("memories")
        .withIndex("by_session", (q: any) =>
          q
            .eq("projectId", args.projectId)
            .eq("sessionId", args.sessionId!)
            .eq("archived", archived),
        )
        .take(limit);
    } else if (args.source) {
      results = await ctx.db
        .query("memories")
        .withIndex("by_source", (q: any) =>
          q
            .eq("projectId", args.projectId)
            .eq("source", args.source!)
            .eq("archived", archived),
        )
        .take(limit);
    } else if (args.scope && args.userId) {
      results = await ctx.db
        .query("memories")
        .withIndex("by_project_scope", (q: any) =>
          q
            .eq("projectId", args.projectId)
            .eq("scope", args.scope!)
            .eq("userId", args.userId!)
            .eq("archived", archived),
        )
        .take(limit);
    } else if (args.memoryType) {
      results = await ctx.db
        .query("memories")
        .withIndex("by_project", (q: any) =>
          q
            .eq("projectId", args.projectId)
            .eq("archived", archived)
            .eq("memoryType", args.memoryType!),
        )
        .take(limit);
    } else {
      results = await ctx.db
        .query("memories")
        .withIndex("by_project", (q: any) =>
          q.eq("projectId", args.projectId).eq("archived", archived),
        )
        .take(limit);
    }

    // Post-filters
    let filtered = results;
    if (args.minPriority !== undefined) {
      filtered = filtered.filter(
        (m) => (m.priority ?? 0) >= args.minPriority!,
      );
    }
    if (args.tags && args.tags.length > 0) {
      filtered = filtered.filter((m) =>
        args.tags!.some((tag) => m.tags.includes(tag)),
      );
    }
    if (args.createdAfter !== undefined) {
      filtered = filtered.filter(
        (m) => m._creationTime > args.createdAfter!,
      );
    }
    if (args.createdBefore !== undefined) {
      filtered = filtered.filter(
        (m) => m._creationTime < args.createdBefore!,
      );
    }

    return filtered.map(mapDoc);
  },
});

// ── get ─────────────────────────────────────────────────────────────

export const get = query({
  args: {
    memoryId: v.string(),
  },
  returns: v.union(memoryDocValidator, v.null()),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("memories", args.memoryId);
    if (!id) return null;

    const doc = await ctx.db.get(id);
    if (!doc) return null;

    return mapDoc(doc);
  },
});

// ── search (full-text) ──────────────────────────────────────────────

export const search = query({
  args: {
    projectId: v.string(),
    query: v.string(),
    memoryType: v.optional(memoryTypeValidator),
    scope: v.optional(scopeValidator),
    limit: v.optional(v.float64()),
  },
  returns: v.array(memoryDocValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const results = await ctx.db
      .query("memories")
      .withSearchIndex("search_content", (q) => {
        let sq = q
          .search("content", args.query)
          .eq("projectId", args.projectId)
          .eq("archived", false);
        if (args.memoryType) {
          sq = sq.eq("memoryType", args.memoryType);
        }
        if (args.scope) {
          sq = sq.eq("scope", args.scope);
        }
        return sq;
      })
      .take(limit);

    return results.map(mapDoc);
  },
});

// ── getContextBundle (progressive disclosure) ───────────────────────

export const getContextBundle = query({
  args: {
    projectId: v.string(),
    scope: scopeValidator,
    userId: v.optional(v.string()),
    agentId: v.optional(v.string()),
    activePaths: v.optional(v.array(v.string())),
    maxTokens: v.optional(v.float64()),
  },
  returns: v.object({
    pinned: v.array(memoryDocValidator),
    relevant: v.array(memoryDocValidator),
    available: v.array(memorySummaryValidator),
  }),
  handler: async (ctx, args) => {
    // Get all non-archived memories for this project+scope
    const all = await ctx.db
      .query("memories")
      .withIndex("by_project_scope", (q: any) => {
        let sq = q
          .eq("projectId", args.projectId)
          .eq("scope", args.scope);
        if (args.userId) {
          sq = sq.eq("userId", args.userId);
        }
        return sq.eq("archived", false);
      })
      .take(500);

    // Tier 1: Pinned — priority >= 0.8, boosted by positive feedback
    const pinned = all
      .filter((m) => {
        const effectivePriority = getEffectivePriority(m);
        return effectivePriority >= 0.8;
      })
      .map(mapDoc);

    // Tier 2: Relevant — path-matched against activePaths
    const relevant = all
      .filter((m) => {
        if (getEffectivePriority(m) >= 0.8) return false;
        if (!args.activePaths || args.activePaths.length === 0) return false;
        if (!m.paths || m.paths.length === 0) return false;
        return m.paths.some((pattern: string) =>
          args.activePaths!.some((active: string) => matchGlob(pattern, active)),
        );
      })
      .map(mapDoc);

    // Tier 3: Available — everything else as summaries, sorted by effective priority
    const pinnedIds = new Set(pinned.map((m) => m._id));
    const relevantIds = new Set(relevant.map((m) => m._id));
    const available = all
      .filter((m) => {
        const id = m._id as unknown as string;
        return !pinnedIds.has(id) && !relevantIds.has(id);
      })
      .map((m) => ({
        _id: m._id as unknown as string,
        title: m.title,
        memoryType: m.memoryType,
        priority: getEffectivePriority(m),
      }))
      .sort((a, b) => b.priority - a.priority);

    return { pinned, relevant, available };
  },
});

// ── history ─────────────────────────────────────────────────────────

export const history = query({
  args: {
    memoryId: v.string(),
    limit: v.optional(v.float64()),
  },
  returns: v.array(historyEntryValidator),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("memories", args.memoryId);
    if (!id) return [];

    const entries = await ctx.db
      .query("memoryHistory")
      .withIndex("by_memory", (q: any) => q.eq("memoryId", id))
      .order("desc")
      .take(args.limit ?? 50);

    return entries.map((e) => ({
      ...e,
      _id: e._id as unknown as string,
      memoryId: e.memoryId as unknown as string,
    }));
  },
});

// ── projectHistory ──────────────────────────────────────────────────

export const projectHistory = query({
  args: {
    projectId: v.string(),
    limit: v.optional(v.float64()),
  },
  returns: v.array(historyEntryValidator),
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("memoryHistory")
      .withIndex("by_project", (q: any) =>
        q.eq("projectId", args.projectId),
      )
      .order("desc")
      .take(args.limit ?? 100);

    return entries.map((e) => ({
      ...e,
      _id: e._id as unknown as string,
      memoryId: e.memoryId as unknown as string,
    }));
  },
});

// ── getFeedback ─────────────────────────────────────────────────────

export const getFeedback = query({
  args: {
    memoryId: v.string(),
    limit: v.optional(v.float64()),
  },
  returns: v.array(feedbackEntryValidator),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("memories", args.memoryId);
    if (!id) return [];

    const entries = await ctx.db
      .query("memoryFeedback")
      .withIndex("by_memory", (q: any) => q.eq("memoryId", id))
      .order("desc")
      .take(args.limit ?? 50);

    return entries.map((e) => ({
      ...e,
      _id: e._id as unknown as string,
      memoryId: e.memoryId as unknown as string,
    }));
  },
});

// ── getRelations ────────────────────────────────────────────────────

export const getRelations = query({
  args: {
    memoryId: v.string(),
    direction: v.optional(v.union(v.literal("from"), v.literal("to"), v.literal("both"))),
    relationship: v.optional(v.string()),
    limit: v.optional(v.float64()),
  },
  returns: v.array(relationValidator),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("memories", args.memoryId);
    if (!id) return [];

    const direction = args.direction ?? "both";
    const limit = args.limit ?? 50;
    const results: any[] = [];

    if (direction === "from" || direction === "both") {
      let fromQuery = ctx.db
        .query("memoryRelations")
        .withIndex("by_from", (q: any) => {
          let sq = q.eq("fromMemoryId", id);
          if (args.relationship) sq = sq.eq("relationship", args.relationship);
          return sq;
        });
      const fromResults = await fromQuery.take(limit);
      results.push(...fromResults);
    }

    if (direction === "to" || direction === "both") {
      let toQuery = ctx.db
        .query("memoryRelations")
        .withIndex("by_to", (q: any) => {
          let sq = q.eq("toMemoryId", id);
          if (args.relationship) sq = sq.eq("relationship", args.relationship);
          return sq;
        });
      const toResults = await toQuery.take(limit);
      results.push(...toResults);
    }

    // Deduplicate
    const seen = new Set<string>();
    return results
      .filter((r) => {
        const rid = r._id as unknown as string;
        if (seen.has(rid)) return false;
        seen.add(rid);
        return true;
      })
      .map((r) => ({
        ...r,
        _id: r._id as unknown as string,
        fromMemoryId: r.fromMemoryId as unknown as string,
        toMemoryId: r.toMemoryId as unknown as string,
      }));
  },
});

// ── exportForTool ───────────────────────────────────────────────────

export const exportForTool = query({
  args: {
    projectId: v.string(),
    format: toolFormatValidator,
    scope: v.optional(scopeValidator),
    userId: v.optional(v.string()),
    since: v.optional(v.float64()),
  },
  returns: v.array(
    v.object({
      path: v.string(),
      content: v.string(),
      checksum: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    let memories = await ctx.db
      .query("memories")
      .withIndex("by_project", (q: any) =>
        q.eq("projectId", args.projectId).eq("archived", false),
      )
      .take(500);

    if (args.scope) {
      memories = memories.filter((m) => m.scope === args.scope);
    }
    if (args.userId) {
      memories = memories.filter(
        (m) => m.userId === args.userId || m.scope !== "user",
      );
    }
    if (args.since) {
      memories = memories.filter(
        (m) => m._creationTime > args.since! || (m.lastSyncedAt ?? 0) > args.since!,
      );
    }

    const format = args.format as ToolFormat;
    const projectSlug = args.projectId
      .replace(/[^a-z0-9-]/gi, "-")
      .toLowerCase();

    return memories.map((m) => formatMemoryForTool(m, format, projectSlug));
  },
});

// ── Internal queries (used by actions) ──────────────────────────────

export const getEmbeddingMemory = internalQuery({
  args: {
    embeddingId: v.string(),
  },
  returns: v.union(memoryDocValidator, v.null()),
  handler: async (ctx, args) => {
    const embId = ctx.db.normalizeId("embeddings", args.embeddingId);
    if (!embId) return null;

    const embedding = await ctx.db.get(embId);
    if (!embedding) return null;

    const memory = await ctx.db.get(embedding.memoryId);
    if (!memory) return null;

    return mapDoc(memory);
  },
});

export const listUnembedded = internalQuery({
  args: {
    projectId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.string(),
      title: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const memories = await ctx.db
      .query("memories")
      .withIndex("by_project", (q: any) =>
        q.eq("projectId", args.projectId).eq("archived", false),
      )
      .take(500);

    return memories
      .filter((m) => !m.embeddingId)
      .map((m) => ({
        _id: m._id as unknown as string,
        title: m.title,
      }));
  },
});

// Internal query for ingest pipeline — returns existing memories for dedup
export const listForIngest = internalQuery({
  args: {
    projectId: v.string(),
    limit: v.optional(v.float64()),
  },
  returns: v.array(
    v.object({
      _id: v.string(),
      title: v.string(),
      content: v.string(),
      memoryType: memoryTypeValidator,
    }),
  ),
  handler: async (ctx, args) => {
    const memories = await ctx.db
      .query("memories")
      .withIndex("by_project", (q: any) =>
        q.eq("projectId", args.projectId).eq("archived", false),
      )
      .take(args.limit ?? 200);

    return memories.map((m) => ({
      _id: m._id as unknown as string,
      title: m.title,
      content: m.content,
      memoryType: m.memoryType,
    }));
  },
});

// Internal query to get project settings (used by cron/actions)
export const getProjectSettings = internalQuery({
  args: {
    projectId: v.string(),
  },
  returns: v.union(
    v.object({
      projectId: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      settings: v.object({
        autoSync: v.boolean(),
        syncFormats: v.array(v.string()),
        embeddingModel: v.optional(v.string()),
        embeddingDimensions: v.optional(v.float64()),
        factExtractionPrompt: v.optional(v.string()),
        updateDecisionPrompt: v.optional(v.string()),
        decayEnabled: v.optional(v.boolean()),
        decayHalfLifeDays: v.optional(v.float64()),
      }),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q: any) =>
        q.eq("projectId", args.projectId),
      )
      .first();

    if (!project) return null;

    return {
      projectId: project.projectId,
      name: project.name,
      description: project.description,
      settings: project.settings,
    };
  },
});

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Simple glob matching: supports * and ** patterns.
 */
function matchGlob(pattern: string, path: string): boolean {
  const regex = pattern
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{GLOBSTAR}}/g, ".*")
    .replace(/\//g, "\\/");
  return new RegExp(`^${regex}$`).test(path);
}

/**
 * Calculate effective priority considering feedback signals.
 * Positive feedback boosts priority; negative feedback reduces it.
 */
function getEffectivePriority(m: {
  priority?: number;
  positiveCount?: number;
  negativeCount?: number;
}): number {
  const base = m.priority ?? 0;
  const positive = m.positiveCount ?? 0;
  const negative = m.negativeCount ?? 0;

  if (positive === 0 && negative === 0) return base;

  // Feedback adjustment: each positive adds up to +0.05, each negative subtracts up to -0.1
  const boost = Math.min(positive * 0.05, 0.2);
  const penalty = Math.min(negative * 0.1, 0.5);
  return Math.max(0, Math.min(1, base + boost - penalty));
}
