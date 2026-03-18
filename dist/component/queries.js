import { query } from "./_generated/server.js";
import { v } from "convex/values";
import { memoryTypeValidator, scopeValidator, } from "./schema.js";
import { formatMemoryForTool } from "./format.js";
// ── Shared return validators ────────────────────────────────────────
const memoryDocValidator = v.object({
    _id: v.string(),
    _creationTime: v.float64(),
    projectId: v.string(),
    scope: scopeValidator,
    userId: v.optional(v.string()),
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
});
const memorySummaryValidator = v.object({
    _id: v.string(),
    title: v.string(),
    memoryType: memoryTypeValidator,
    priority: v.float64(),
});
const toolFormatValidator = v.union(v.literal("claude-code"), v.literal("cursor"), v.literal("opencode"), v.literal("codex"), v.literal("conductor"), v.literal("zed"), v.literal("vscode-copilot"), v.literal("pi"), v.literal("raw"));
// ── list ────────────────────────────────────────────────────────────
export const list = query({
    args: {
        projectId: v.string(),
        scope: v.optional(scopeValidator),
        userId: v.optional(v.string()),
        memoryType: v.optional(memoryTypeValidator),
        archived: v.optional(v.boolean()),
        minPriority: v.optional(v.float64()),
        limit: v.optional(v.float64()),
    },
    returns: v.array(memoryDocValidator),
    handler: async (ctx, args) => {
        const limit = args.limit ?? 100;
        const archived = args.archived ?? false;
        // Use the most selective index available
        let results;
        if (args.scope && args.userId) {
            results = await ctx.db
                .query("memories")
                .withIndex("by_project_scope", (q) => q
                .eq("projectId", args.projectId)
                .eq("scope", args.scope)
                .eq("userId", args.userId)
                .eq("archived", archived))
                .take(limit);
        }
        else if (args.memoryType) {
            results = await ctx.db
                .query("memories")
                .withIndex("by_project", (q) => q
                .eq("projectId", args.projectId)
                .eq("archived", archived)
                .eq("memoryType", args.memoryType))
                .take(limit);
        }
        else {
            results = await ctx.db
                .query("memories")
                .withIndex("by_project", (q) => q.eq("projectId", args.projectId).eq("archived", archived))
                .take(limit);
        }
        // Post-filter by minPriority if specified
        let filtered = results;
        if (args.minPriority !== undefined) {
            filtered = results.filter((m) => (m.priority ?? 0) >= args.minPriority);
        }
        // Map to return type (IDs become strings at boundary)
        return filtered.map((m) => ({
            ...m,
            _id: m._id,
            embeddingId: m.embeddingId
                ? m.embeddingId
                : undefined,
        }));
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
        if (!id)
            return null;
        const doc = await ctx.db.get(id);
        if (!doc)
            return null;
        return {
            ...doc,
            _id: doc._id,
            embeddingId: doc.embeddingId
                ? doc.embeddingId
                : undefined,
        };
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
        return results.map((m) => ({
            ...m,
            _id: m._id,
            embeddingId: m.embeddingId
                ? m.embeddingId
                : undefined,
        }));
    },
});
// ── getContextBundle (progressive disclosure) ───────────────────────
export const getContextBundle = query({
    args: {
        projectId: v.string(),
        scope: scopeValidator,
        userId: v.optional(v.string()),
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
            .withIndex("by_project_scope", (q) => {
            let sq = q
                .eq("projectId", args.projectId)
                .eq("scope", args.scope);
            if (args.userId) {
                sq = sq.eq("userId", args.userId);
            }
            return sq.eq("archived", false);
        })
            .take(500);
        const mapDoc = (m) => ({
            ...m,
            _id: m._id,
            embeddingId: m.embeddingId
                ? m.embeddingId
                : undefined,
        });
        // Tier 1: Pinned — priority >= 0.8
        const pinned = all
            .filter((m) => (m.priority ?? 0) >= 0.8)
            .map(mapDoc);
        // Tier 2: Relevant — path-matched against activePaths
        const relevant = all
            .filter((m) => {
            if ((m.priority ?? 0) >= 0.8)
                return false; // already pinned
            if (!args.activePaths || args.activePaths.length === 0)
                return false;
            if (!m.paths || m.paths.length === 0)
                return false;
            return m.paths.some((pattern) => args.activePaths.some((active) => matchGlob(pattern, active)));
        })
            .map(mapDoc);
        // Tier 3: Available — everything else as summaries
        const pinnedIds = new Set(pinned.map((m) => m._id));
        const relevantIds = new Set(relevant.map((m) => m._id));
        const available = all
            .filter((m) => {
            const id = m._id;
            return !pinnedIds.has(id) && !relevantIds.has(id);
        })
            .map((m) => ({
            _id: m._id,
            title: m.title,
            memoryType: m.memoryType,
            priority: m.priority ?? 0,
        }));
        return { pinned, relevant, available };
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
    returns: v.array(v.object({
        path: v.string(),
        content: v.string(),
        checksum: v.string(),
    })),
    handler: async (ctx, args) => {
        let memories = await ctx.db
            .query("memories")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId).eq("archived", false))
            .take(500);
        // Filter by scope if specified
        if (args.scope) {
            memories = memories.filter((m) => m.scope === args.scope);
        }
        if (args.userId) {
            memories = memories.filter((m) => m.userId === args.userId || m.scope !== "user");
        }
        // Filter by since timestamp
        if (args.since) {
            memories = memories.filter((m) => m._creationTime > args.since || (m.lastSyncedAt ?? 0) > args.since);
        }
        const format = args.format;
        const projectSlug = args.projectId
            .replace(/[^a-z0-9-]/gi, "-")
            .toLowerCase();
        return memories.map((m) => formatMemoryForTool(m, format, projectSlug));
    },
});
// ── Internal queries (used by actions) ──────────────────────────────
import { internalQuery } from "./_generated/server.js";
export const getEmbeddingMemory = internalQuery({
    args: {
        embeddingId: v.string(),
    },
    returns: v.union(memoryDocValidator, v.null()),
    handler: async (ctx, args) => {
        const embId = ctx.db.normalizeId("embeddings", args.embeddingId);
        if (!embId)
            return null;
        const embedding = await ctx.db.get(embId);
        if (!embedding)
            return null;
        const memory = await ctx.db.get(embedding.memoryId);
        if (!memory)
            return null;
        return {
            ...memory,
            _id: memory._id,
            embeddingId: memory.embeddingId
                ? memory.embeddingId
                : undefined,
        };
    },
});
export const listUnembedded = internalQuery({
    args: {
        projectId: v.string(),
    },
    returns: v.array(v.object({
        _id: v.string(),
        title: v.string(),
    })),
    handler: async (ctx, args) => {
        const memories = await ctx.db
            .query("memories")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId).eq("archived", false))
            .take(500);
        return memories
            .filter((m) => !m.embeddingId)
            .map((m) => ({
            _id: m._id,
            title: m.title,
        }));
    },
});
// ── Helpers ─────────────────────────────────────────────────────────
/**
 * Simple glob matching: supports * and ** patterns.
 */
function matchGlob(pattern, path) {
    const regex = pattern
        .replace(/\*\*/g, "{{GLOBSTAR}}")
        .replace(/\*/g, "[^/]*")
        .replace(/{{GLOBSTAR}}/g, ".*")
        .replace(/\//g, "\\/");
    return new RegExp(`^${regex}$`).test(path);
}
//# sourceMappingURL=queries.js.map