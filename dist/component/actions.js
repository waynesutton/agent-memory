import { action } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { v } from "convex/values";
import { memoryTypeValidator, scopeValidator, } from "./schema.js";
// ── Return validators (same as queries.ts) ──────────────────────────
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
// ── generateEmbedding ───────────────────────────────────────────────
export const generateEmbedding = action({
    args: {
        memoryId: v.string(),
        embeddingApiKey: v.string(),
        model: v.optional(v.string()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const model = args.model ?? "text-embedding-3-small";
        // Load the memory content
        const memory = await ctx.runQuery(internal.queries.get, {
            memoryId: args.memoryId,
        });
        if (!memory)
            throw new Error(`Memory not found: ${args.memoryId}`);
        // Call the OpenAI-compatible embedding API
        const response = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${args.embeddingApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                input: `${memory.title}\n\n${memory.content}`,
                model,
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Embedding API error: ${response.status} ${error}`);
        }
        const data = (await response.json());
        const embedding = data.data[0].embedding;
        // Store the embedding
        await ctx.runMutation(internal.mutations.storeEmbedding, {
            memoryId: args.memoryId,
            embedding,
            model,
            dimensions: embedding.length,
        });
        return null;
    },
});
// ── semanticSearch ──────────────────────────────────────────────────
export const semanticSearch = action({
    args: {
        projectId: v.string(),
        query: v.string(),
        embeddingApiKey: v.optional(v.string()),
        limit: v.optional(v.float64()),
    },
    returns: v.array(memoryDocValidator),
    handler: async (ctx, args) => {
        const limit = args.limit ?? 10;
        // If no API key, fall back to full-text search
        if (!args.embeddingApiKey) {
            return await ctx.runQuery(internal.queries.search, {
                projectId: args.projectId,
                query: args.query,
                limit,
            });
        }
        // Generate embedding for the query
        const response = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${args.embeddingApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                input: args.query,
                model: "text-embedding-3-small",
            }),
        });
        if (!response.ok) {
            // Fall back to full-text on API error
            return await ctx.runQuery(internal.queries.search, {
                projectId: args.projectId,
                query: args.query,
                limit,
            });
        }
        const data = (await response.json());
        const queryEmbedding = data.data[0].embedding;
        // Vector search
        const vectorResults = await ctx.vectorSearch("embeddings", "by_embedding", {
            vector: queryEmbedding,
            limit: limit * 2, // over-fetch to filter by project
        });
        // Load full memory docs for each result
        const memories = [];
        for (const result of vectorResults) {
            const embedding = await ctx.runQuery(internal.queries.getEmbeddingMemory, {
                embeddingId: result._id,
            });
            if (embedding &&
                embedding.projectId === args.projectId &&
                !embedding.archived) {
                memories.push(embedding);
                if (memories.length >= limit)
                    break;
            }
        }
        return memories;
    },
});
// ── embedAll ────────────────────────────────────────────────────────
export const embedAll = action({
    args: {
        projectId: v.string(),
        embeddingApiKey: v.string(),
        model: v.optional(v.string()),
    },
    returns: v.object({
        embedded: v.float64(),
        skipped: v.float64(),
    }),
    handler: async (ctx, args) => {
        // Get all memories without embeddings
        const memories = await ctx.runQuery(internal.queries.listUnembedded, {
            projectId: args.projectId,
        });
        let embedded = 0;
        let skipped = 0;
        for (const memory of memories) {
            try {
                await ctx.runAction(internal.actions.generateEmbedding, {
                    memoryId: memory._id,
                    embeddingApiKey: args.embeddingApiKey,
                    model: args.model,
                });
                embedded++;
            }
            catch {
                skipped++;
            }
        }
        return { embedded, skipped };
    },
});
// ── Internal queries used by actions ────────────────────────────────
// These are internal helpers that actions need to call via ctx.runQuery
// Note: These are defined in queries.ts as internal queries.
// The `getEmbeddingMemory` and `listUnembedded` queries are internal
// and only callable from within the component.
//# sourceMappingURL=actions.js.map