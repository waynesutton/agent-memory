import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export const memoryTypeValidator = v.union(v.literal("instruction"), v.literal("learning"), v.literal("reference"), v.literal("feedback"), v.literal("journal"));
export const scopeValidator = v.union(v.literal("project"), v.literal("user"), v.literal("org"));
export const syncDirectionValidator = v.union(v.literal("push"), v.literal("pull"));
export default defineSchema({
    // Core memory documents — each row is one markdown memory
    memories: defineTable({
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
        embeddingId: v.optional(v.id("embeddings")),
    })
        .index("by_project", ["projectId", "archived", "memoryType"])
        .index("by_project_scope", ["projectId", "scope", "userId", "archived"])
        .index("by_project_title", ["projectId", "title"])
        .index("by_type_priority", ["projectId", "memoryType", "priority"])
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
});
//# sourceMappingURL=schema.js.map