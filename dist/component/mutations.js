import { mutation } from "./_generated/server.js";
import { v } from "convex/values";
import { memoryTypeValidator, scopeValidator, syncDirectionValidator, } from "./schema.js";
import { computeChecksum } from "./checksum.js";
// ── create ──────────────────────────────────────────────────────────
export const create = mutation({
    args: {
        projectId: v.string(),
        scope: scopeValidator,
        userId: v.optional(v.string()),
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
        const id = await ctx.db.insert("memories", {
            projectId: args.projectId,
            scope: args.scope,
            userId: args.userId,
            title: args.title,
            content: args.content,
            memoryType: args.memoryType,
            tags: args.tags ?? [],
            paths: args.paths,
            priority: args.priority,
            source: args.source,
            checksum,
            archived: false,
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
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const id = ctx.db.normalizeId("memories", args.memoryId);
        if (!id)
            throw new Error(`Invalid memory ID: ${args.memoryId}`);
        const existing = await ctx.db.get(id);
        if (!existing)
            throw new Error(`Memory not found: ${args.memoryId}`);
        const patch = {};
        if (args.content !== undefined) {
            patch.content = args.content;
            patch.checksum = computeChecksum(args.content);
        }
        if (args.title !== undefined)
            patch.title = args.title;
        if (args.tags !== undefined)
            patch.tags = args.tags;
        if (args.paths !== undefined)
            patch.paths = args.paths;
        if (args.priority !== undefined)
            patch.priority = args.priority;
        if (args.memoryType !== undefined)
            patch.memoryType = args.memoryType;
        await ctx.db.patch(id, patch);
        return null;
    },
});
// ── archive (soft-delete) ───────────────────────────────────────────
export const archive = mutation({
    args: {
        memoryId: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const id = ctx.db.normalizeId("memories", args.memoryId);
        if (!id)
            throw new Error(`Invalid memory ID: ${args.memoryId}`);
        await ctx.db.patch(id, { archived: true });
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
        for (const mem of args.memories) {
            // Find existing by projectId + title + scope
            const existing = await ctx.db
                .query("memories")
                .withIndex("by_project_title", (q) => q.eq("projectId", args.projectId).eq("title", mem.title))
                .first();
            if (!existing) {
                await ctx.db.insert("memories", {
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
                });
                created++;
            }
            else if (existing.checksum !== mem.checksum) {
                await ctx.db.patch(existing._id, {
                    content: mem.content,
                    memoryType: mem.memoryType,
                    tags: mem.tags,
                    paths: mem.paths,
                    priority: mem.priority,
                    source: mem.source,
                    checksum: mem.checksum,
                });
                updated++;
            }
            else {
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
        settings: v.optional(v.object({
            autoSync: v.boolean(),
            syncFormats: v.array(v.string()),
            embeddingModel: v.optional(v.string()),
            embeddingDimensions: v.optional(v.float64()),
        })),
    },
    returns: v.string(),
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("projects")
            .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
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
        if (!memId)
            throw new Error(`Invalid memory ID: ${args.memoryId}`);
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
        // Update the memory's lastSyncedAt
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
        if (!memId)
            throw new Error(`Invalid memory ID: ${args.memoryId}`);
        // Check if embedding already exists for this memory
        const existing = await ctx.db
            .query("embeddings")
            .withIndex("by_memory", (q) => q.eq("memoryId", memId))
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, {
                embedding: args.embedding,
                model: args.model,
                dimensions: args.dimensions,
            });
            await ctx.db.patch(memId, { embeddingId: existing._id });
        }
        else {
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
//# sourceMappingURL=mutations.js.map