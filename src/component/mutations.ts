import { mutation, internalMutation } from "./_generated/server.js";
import { v } from "convex/values";
import {
  memoryTypeValidator,
  scopeValidator,
  syncDirectionValidator,
  historyEventValidator,
  feedbackSentimentValidator,
} from "./schema.js";
import { computeChecksum } from "./checksum.js";

// ── create ──────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    projectId: v.string(),
    scope: scopeValidator,
    userId: v.optional(v.string()),
    agentId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    title: v.string(),
    content: v.string(),
    memoryType: memoryTypeValidator,
    tags: v.optional(v.array(v.string())),
    paths: v.optional(v.array(v.string())),
    priority: v.optional(v.float64()),
    source: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const checksum = computeChecksum(args.content);
    const now = Date.now();
    const id = await ctx.db.insert("memories", {
      projectId: args.projectId,
      scope: args.scope,
      userId: args.userId,
      agentId: args.agentId,
      sessionId: args.sessionId,
      title: args.title,
      content: args.content,
      memoryType: args.memoryType,
      tags: args.tags ?? [],
      paths: args.paths,
      priority: args.priority,
      source: args.source,
      checksum,
      archived: false,
      accessCount: 0,
      lastAccessedAt: now,
      positiveCount: 0,
      negativeCount: 0,
    });

    // Record history
    await ctx.db.insert("memoryHistory", {
      memoryId: id,
      projectId: args.projectId,
      newContent: args.content,
      newTitle: args.title,
      event: "created",
      actor: args.source ?? args.agentId ?? args.userId ?? "unknown",
      timestamp: now,
    });

    return id;
  },
});

// ── update ──────────────────────────────────────────────────────────

export const update = mutation({
  args: {
    memoryId: v.string(),
    content: v.optional(v.string()),
    title: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    paths: v.optional(v.array(v.string())),
    priority: v.optional(v.float64()),
    memoryType: v.optional(memoryTypeValidator),
    actor: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("memories", args.memoryId);
    if (!id) throw new Error(`Invalid memory ID: ${args.memoryId}`);

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error(`Memory not found: ${args.memoryId}`);

    const patch: Record<string, unknown> = {};
    if (args.content !== undefined) {
      patch.content = args.content;
      patch.checksum = computeChecksum(args.content);
    }
    if (args.title !== undefined) patch.title = args.title;
    if (args.tags !== undefined) patch.tags = args.tags;
    if (args.paths !== undefined) patch.paths = args.paths;
    if (args.priority !== undefined) patch.priority = args.priority;
    if (args.memoryType !== undefined) patch.memoryType = args.memoryType;

    await ctx.db.patch(id, patch);

    // Record history if content or title changed
    if (args.content !== undefined || args.title !== undefined) {
      await ctx.db.insert("memoryHistory", {
        memoryId: id,
        projectId: existing.projectId,
        previousContent: args.content !== undefined ? existing.content : undefined,
        newContent: args.content,
        previousTitle: args.title !== undefined ? existing.title : undefined,
        newTitle: args.title,
        event: "updated",
        actor: args.actor ?? "unknown",
        timestamp: Date.now(),
      });
    }

    return null;
  },
});

// ── archive (soft-delete) ───────────────────────────────────────────

export const archive = mutation({
  args: {
    memoryId: v.string(),
    actor: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("memories", args.memoryId);
    if (!id) throw new Error(`Invalid memory ID: ${args.memoryId}`);

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error(`Memory not found: ${args.memoryId}`);

    await ctx.db.patch(id, { archived: true });

    await ctx.db.insert("memoryHistory", {
      memoryId: id,
      projectId: existing.projectId,
      previousContent: existing.content,
      previousTitle: existing.title,
      event: "archived",
      actor: args.actor ?? "unknown",
      timestamp: Date.now(),
    });

    return null;
  },
});

// ── restore (un-archive) ───────────────────────────────────────────

export const restore = mutation({
  args: {
    memoryId: v.string(),
    actor: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("memories", args.memoryId);
    if (!id) throw new Error(`Invalid memory ID: ${args.memoryId}`);

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error(`Memory not found: ${args.memoryId}`);

    await ctx.db.patch(id, { archived: false });

    await ctx.db.insert("memoryHistory", {
      memoryId: id,
      projectId: existing.projectId,
      event: "restored",
      actor: args.actor ?? "unknown",
      timestamp: Date.now(),
    });

    return null;
  },
});

// ── batchArchive ────────────────────────────────────────────────────

export const batchArchive = mutation({
  args: {
    memoryIds: v.array(v.string()),
    actor: v.optional(v.string()),
  },
  returns: v.object({
    archived: v.float64(),
    failed: v.float64(),
  }),
  handler: async (ctx, args) => {
    let archived = 0;
    let failed = 0;
    const now = Date.now();

    for (const memoryId of args.memoryIds) {
      const id = ctx.db.normalizeId("memories", memoryId);
      if (!id) { failed++; continue; }

      const existing = await ctx.db.get(id);
      if (!existing) { failed++; continue; }

      await ctx.db.patch(id, { archived: true });
      await ctx.db.insert("memoryHistory", {
        memoryId: id,
        projectId: existing.projectId,
        previousContent: existing.content,
        previousTitle: existing.title,
        event: "archived",
        actor: args.actor ?? "unknown",
        timestamp: now,
      });
      archived++;
    }

    return { archived, failed };
  },
});

// ── batchUpdate ─────────────────────────────────────────────────────

export const batchUpdate = mutation({
  args: {
    updates: v.array(
      v.object({
        memoryId: v.string(),
        content: v.optional(v.string()),
        title: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        paths: v.optional(v.array(v.string())),
        priority: v.optional(v.float64()),
        memoryType: v.optional(memoryTypeValidator),
      }),
    ),
    actor: v.optional(v.string()),
  },
  returns: v.object({
    updated: v.float64(),
    failed: v.float64(),
  }),
  handler: async (ctx, args) => {
    let updated = 0;
    let failed = 0;
    const now = Date.now();

    for (const upd of args.updates) {
      const id = ctx.db.normalizeId("memories", upd.memoryId);
      if (!id) { failed++; continue; }

      const existing = await ctx.db.get(id);
      if (!existing) { failed++; continue; }

      const patch: Record<string, unknown> = {};
      if (upd.content !== undefined) {
        patch.content = upd.content;
        patch.checksum = computeChecksum(upd.content);
      }
      if (upd.title !== undefined) patch.title = upd.title;
      if (upd.tags !== undefined) patch.tags = upd.tags;
      if (upd.paths !== undefined) patch.paths = upd.paths;
      if (upd.priority !== undefined) patch.priority = upd.priority;
      if (upd.memoryType !== undefined) patch.memoryType = upd.memoryType;

      await ctx.db.patch(id, patch);

      if (upd.content !== undefined || upd.title !== undefined) {
        await ctx.db.insert("memoryHistory", {
          memoryId: id,
          projectId: existing.projectId,
          previousContent: upd.content !== undefined ? existing.content : undefined,
          newContent: upd.content,
          previousTitle: upd.title !== undefined ? existing.title : undefined,
          newTitle: upd.title,
          event: "updated",
          actor: args.actor ?? "unknown",
          timestamp: now,
        });
      }

      updated++;
    }

    return { updated, failed };
  },
});

// ── recordAccess (track memory reads for relevance) ─────────────────

export const recordAccess = mutation({
  args: {
    memoryIds: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const memoryId of args.memoryIds) {
      const id = ctx.db.normalizeId("memories", memoryId);
      if (!id) continue;

      const existing = await ctx.db.get(id);
      if (!existing) continue;

      await ctx.db.patch(id, {
        accessCount: (existing.accessCount ?? 0) + 1,
        lastAccessedAt: now,
      });
    }
    return null;
  },
});

// ── addFeedback ─────────────────────────────────────────────────────

export const addFeedback = mutation({
  args: {
    memoryId: v.string(),
    sentiment: feedbackSentimentValidator,
    comment: v.optional(v.string()),
    actor: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("memories", args.memoryId);
    if (!id) throw new Error(`Invalid memory ID: ${args.memoryId}`);

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error(`Memory not found: ${args.memoryId}`);

    // Record the feedback entry
    await ctx.db.insert("memoryFeedback", {
      memoryId: id,
      projectId: existing.projectId,
      sentiment: args.sentiment,
      comment: args.comment,
      actor: args.actor,
      timestamp: Date.now(),
    });

    // Update aggregated counts on the memory
    if (args.sentiment === "positive") {
      await ctx.db.patch(id, {
        positiveCount: (existing.positiveCount ?? 0) + 1,
      });
    } else {
      await ctx.db.patch(id, {
        negativeCount: (existing.negativeCount ?? 0) + 1,
      });
    }

    return null;
  },
});

// ── addRelation ─────────────────────────────────────────────────────

export const addRelation = mutation({
  args: {
    projectId: v.string(),
    fromMemoryId: v.string(),
    toMemoryId: v.string(),
    relationship: v.string(),
    metadata: v.optional(
      v.object({
        confidence: v.optional(v.float64()),
        createdBy: v.optional(v.string()),
      }),
    ),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const fromId = ctx.db.normalizeId("memories", args.fromMemoryId);
    const toId = ctx.db.normalizeId("memories", args.toMemoryId);
    if (!fromId) throw new Error(`Invalid from memory ID: ${args.fromMemoryId}`);
    if (!toId) throw new Error(`Invalid to memory ID: ${args.toMemoryId}`);

    const id = await ctx.db.insert("memoryRelations", {
      projectId: args.projectId,
      fromMemoryId: fromId,
      toMemoryId: toId,
      relationship: args.relationship,
      metadata: args.metadata,
      timestamp: Date.now(),
    });

    return id;
  },
});

// ── removeRelation ──────────────────────────────────────────────────

export const removeRelation = mutation({
  args: {
    relationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("memoryRelations", args.relationId);
    if (!id) throw new Error(`Invalid relation ID: ${args.relationId}`);

    await ctx.db.delete(id);
    return null;
  },
});

// ── importFromLocal (bulk upsert) ───────────────────────────────────

const importMemoryValidator = v.object({
  title: v.string(),
  content: v.string(),
  memoryType: memoryTypeValidator,
  scope: scopeValidator,
  tags: v.array(v.string()),
  paths: v.optional(v.array(v.string())),
  priority: v.optional(v.float64()),
  source: v.string(),
  checksum: v.string(),
});

export const importFromLocal = mutation({
  args: {
    projectId: v.string(),
    userId: v.optional(v.string()),
    memories: v.array(importMemoryValidator),
  },
  returns: v.object({
    created: v.float64(),
    updated: v.float64(),
    unchanged: v.float64(),
  }),
  handler: async (ctx, args) => {
    let created = 0;
    let updated = 0;
    let unchanged = 0;
    const now = Date.now();

    for (const mem of args.memories) {
      const existing = await ctx.db
        .query("memories")
        .withIndex("by_project_title", (q: any) =>
          q.eq("projectId", args.projectId).eq("title", mem.title),
        )
        .first();

      if (!existing) {
        const id = await ctx.db.insert("memories", {
          projectId: args.projectId,
          userId: args.userId,
          title: mem.title,
          content: mem.content,
          memoryType: mem.memoryType,
          scope: mem.scope,
          tags: mem.tags,
          paths: mem.paths,
          priority: mem.priority,
          source: mem.source,
          checksum: mem.checksum,
          archived: false,
          accessCount: 0,
          lastAccessedAt: now,
          positiveCount: 0,
          negativeCount: 0,
        });

        await ctx.db.insert("memoryHistory", {
          memoryId: id,
          projectId: args.projectId,
          newContent: mem.content,
          newTitle: mem.title,
          event: "created",
          actor: mem.source,
          timestamp: now,
        });

        created++;
      } else if (existing.checksum !== mem.checksum) {
        await ctx.db.patch(existing._id, {
          content: mem.content,
          memoryType: mem.memoryType,
          tags: mem.tags,
          paths: mem.paths,
          priority: mem.priority,
          source: mem.source,
          checksum: mem.checksum,
        });

        await ctx.db.insert("memoryHistory", {
          memoryId: existing._id,
          projectId: args.projectId,
          previousContent: existing.content,
          newContent: mem.content,
          previousTitle: existing.title,
          newTitle: mem.title,
          event: "updated",
          actor: mem.source,
          timestamp: now,
        });

        updated++;
      } else {
        unchanged++;
      }
    }

    return { created, updated, unchanged };
  },
});

// ── upsertProject ───────────────────────────────────────────────────

export const upsertProject = mutation({
  args: {
    projectId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    settings: v.optional(
      v.object({
        autoSync: v.boolean(),
        syncFormats: v.array(v.string()),
        embeddingModel: v.optional(v.string()),
        embeddingDimensions: v.optional(v.float64()),
        factExtractionPrompt: v.optional(v.string()),
        updateDecisionPrompt: v.optional(v.string()),
        decayEnabled: v.optional(v.boolean()),
        decayHalfLifeDays: v.optional(v.float64()),
      }),
    ),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q: any) => q.eq("projectId", args.projectId))
      .first();

    const settings = args.settings ?? {
      autoSync: false,
      syncFormats: [],
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        description: args.description,
        settings,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("projects", {
      projectId: args.projectId,
      name: args.name,
      description: args.description,
      settings,
    });
    return id;
  },
});

// ── recordSync ──────────────────────────────────────────────────────

export const recordSync = mutation({
  args: {
    projectId: v.string(),
    userId: v.optional(v.string()),
    memoryId: v.string(),
    targetFormat: v.string(),
    targetPath: v.string(),
    checksum: v.string(),
    direction: syncDirectionValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const memId = ctx.db.normalizeId("memories", args.memoryId);
    if (!memId) throw new Error(`Invalid memory ID: ${args.memoryId}`);

    const now = Date.now();

    await ctx.db.insert("syncLog", {
      projectId: args.projectId,
      userId: args.userId,
      memoryId: memId,
      targetFormat: args.targetFormat,
      targetPath: args.targetPath,
      syncedAt: now,
      checksum: args.checksum,
      direction: args.direction,
    });

    await ctx.db.patch(memId, { lastSyncedAt: now });

    return null;
  },
});

// ── storeEmbedding ──────────────────────────────────────────────────

export const storeEmbedding = mutation({
  args: {
    memoryId: v.string(),
    embedding: v.array(v.float64()),
    model: v.string(),
    dimensions: v.float64(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const memId = ctx.db.normalizeId("memories", args.memoryId);
    if (!memId) throw new Error(`Invalid memory ID: ${args.memoryId}`);

    const existing = await ctx.db
      .query("embeddings")
      .withIndex("by_memory", (q: any) => q.eq("memoryId", memId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        embedding: args.embedding,
        model: args.model,
        dimensions: args.dimensions,
      });
      await ctx.db.patch(memId, { embeddingId: existing._id });
    } else {
      const embeddingId = await ctx.db.insert("embeddings", {
        memoryId: memId,
        embedding: args.embedding,
        model: args.model,
        dimensions: args.dimensions,
      });
      await ctx.db.patch(memId, { embeddingId });
    }

    return null;
  },
});

// ── Internal: applyDecay (called by cron) ───────────────────────────

export const applyDecay = internalMutation({
  args: {
    projectId: v.string(),
    halfLifeDays: v.float64(),
  },
  returns: v.object({
    processed: v.float64(),
    decayed: v.float64(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const halfLifeMs = args.halfLifeDays * 24 * 60 * 60 * 1000;

    const memories = await ctx.db
      .query("memories")
      .withIndex("by_project", (q: any) =>
        q.eq("projectId", args.projectId).eq("archived", false),
      )
      .take(500);

    let processed = 0;
    let decayed = 0;

    for (const m of memories) {
      if ((m.priority ?? 0) >= 0.8) continue; // don't decay pinned memories
      processed++;

      const lastAccess = m.lastAccessedAt ?? m._creationTime;
      const timeSinceAccess = now - lastAccess;

      // Exponential decay: score = base * 0.5^(t/halfLife)
      const decayFactor = Math.pow(0.5, timeSinceAccess / halfLifeMs);

      // If very low access and old, reduce priority
      if (decayFactor < 0.1 && (m.accessCount ?? 0) < 3) {
        const currentPriority = m.priority ?? 0.5;
        const newPriority = Math.max(0.01, currentPriority * decayFactor);
        if (Math.abs(newPriority - currentPriority) > 0.01) {
          await ctx.db.patch(m._id, { priority: newPriority });
          decayed++;
        }
      }
    }

    return { processed, decayed };
  },
});

// ── Internal: cleanupOldHistory ─────────────────────────────────────

export const cleanupOldHistory = internalMutation({
  args: {
    projectId: v.string(),
    olderThanMs: v.float64(),
  },
  returns: v.object({ deleted: v.float64() }),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.olderThanMs;
    const old = await ctx.db
      .query("memoryHistory")
      .withIndex("by_project", (q: any) =>
        q.eq("projectId", args.projectId),
      )
      .take(500);

    let deleted = 0;
    for (const entry of old) {
      if (entry.timestamp < cutoff) {
        await ctx.db.delete(entry._id);
        deleted++;
      }
    }

    return { deleted };
  },
});

// ── Internal: store ingest result (used by ingest action) ──────────

export const ingestCreateMemory = internalMutation({
  args: {
    projectId: v.string(),
    scope: scopeValidator,
    userId: v.optional(v.string()),
    agentId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    title: v.string(),
    content: v.string(),
    memoryType: memoryTypeValidator,
    tags: v.array(v.string()),
    source: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const checksum = computeChecksum(args.content);
    const now = Date.now();
    const id = await ctx.db.insert("memories", {
      projectId: args.projectId,
      scope: args.scope,
      userId: args.userId,
      agentId: args.agentId,
      sessionId: args.sessionId,
      title: args.title,
      content: args.content,
      memoryType: args.memoryType,
      tags: args.tags,
      checksum,
      archived: false,
      accessCount: 0,
      lastAccessedAt: now,
      positiveCount: 0,
      negativeCount: 0,
      source: args.source,
    });

    await ctx.db.insert("memoryHistory", {
      memoryId: id,
      projectId: args.projectId,
      newContent: args.content,
      newTitle: args.title,
      event: "created",
      actor: "ingest",
      timestamp: now,
    });

    return id;
  },
});

export const ingestUpdateMemory = internalMutation({
  args: {
    memoryId: v.string(),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("memories", args.memoryId);
    if (!id) throw new Error(`Invalid memory ID: ${args.memoryId}`);

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error(`Memory not found: ${args.memoryId}`);

    const checksum = computeChecksum(args.content);
    await ctx.db.patch(id, { content: args.content, checksum });

    await ctx.db.insert("memoryHistory", {
      memoryId: id,
      projectId: existing.projectId,
      previousContent: existing.content,
      newContent: args.content,
      event: "merged",
      actor: "ingest",
      timestamp: Date.now(),
    });

    return null;
  },
});

export const ingestDeleteMemory = internalMutation({
  args: {
    memoryId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("memories", args.memoryId);
    if (!id) throw new Error(`Invalid memory ID: ${args.memoryId}`);

    const existing = await ctx.db.get(id);
    if (!existing) throw new Error(`Memory not found: ${args.memoryId}`);

    await ctx.db.patch(id, { archived: true });

    await ctx.db.insert("memoryHistory", {
      memoryId: id,
      projectId: existing.projectId,
      previousContent: existing.content,
      previousTitle: existing.title,
      event: "archived",
      actor: "ingest",
      timestamp: Date.now(),
    });

    return null;
  },
});
