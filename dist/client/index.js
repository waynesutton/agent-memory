import { computeChecksum } from "../component/checksum.js";
// ── Client class ────────────────────────────────────────────────────
export class AgentMemory {
    component;
    config;
    constructor(component, config) {
        this.component = component;
        this.config = config;
    }
    // ── Read operations (query context) ─────────────────────────────
    async list(ctx, opts) {
        return (await ctx.runQuery(this.component.queries.list, {
            projectId: this.config.projectId,
            scope: opts?.scope ?? this.config.defaultScope,
            userId: this.config.userId,
            agentId: opts?.agentId ?? this.config.agentId,
            sessionId: opts?.sessionId ?? this.config.sessionId,
            memoryType: opts?.memoryType,
            source: opts?.source,
            tags: opts?.tags,
            archived: opts?.archived,
            minPriority: opts?.minPriority,
            createdAfter: opts?.createdAfter,
            createdBefore: opts?.createdBefore,
            limit: opts?.limit,
        }));
    }
    async get(ctx, memoryId) {
        return (await ctx.runQuery(this.component.queries.get, {
            memoryId,
        }));
    }
    async search(ctx, query, opts) {
        return (await ctx.runQuery(this.component.queries.search, {
            projectId: this.config.projectId,
            query,
            memoryType: opts?.memoryType,
            scope: opts?.scope,
            limit: opts?.limit,
        }));
    }
    async getContextBundle(ctx, opts) {
        return (await ctx.runQuery(this.component.queries.getContextBundle, {
            projectId: this.config.projectId,
            scope: this.config.defaultScope ?? "project",
            userId: this.config.userId,
            agentId: opts?.agentId ?? this.config.agentId,
            activePaths: opts?.activePaths,
            maxTokens: opts?.maxTokens,
        }));
    }
    async exportForTool(ctx, format, opts) {
        return (await ctx.runQuery(this.component.queries.exportForTool, {
            projectId: this.config.projectId,
            format,
            scope: this.config.defaultScope,
            userId: this.config.userId,
            since: opts?.since,
        }));
    }
    // ── History & audit trail (query context) ──────────────────────
    async history(ctx, memoryId, opts) {
        return (await ctx.runQuery(this.component.queries.history, {
            memoryId,
            limit: opts?.limit,
        }));
    }
    async projectHistory(ctx, opts) {
        return (await ctx.runQuery(this.component.queries.projectHistory, {
            projectId: this.config.projectId,
            limit: opts?.limit,
        }));
    }
    // ── Feedback (query + mutation context) ────────────────────────
    async getFeedback(ctx, memoryId, opts) {
        return (await ctx.runQuery(this.component.queries.getFeedback, {
            memoryId,
            limit: opts?.limit,
        }));
    }
    async addFeedback(ctx, memoryId, sentiment, opts) {
        await ctx.runMutation(this.component.mutations.addFeedback, {
            memoryId,
            sentiment,
            comment: opts?.comment,
            actor: opts?.actor ?? this.config.agentId ?? this.config.userId ?? "unknown",
        });
    }
    // ── Relations / graph (query + mutation context) ───────────────
    async getRelations(ctx, memoryId, opts) {
        return (await ctx.runQuery(this.component.queries.getRelations, {
            memoryId,
            direction: opts?.direction,
            relationship: opts?.relationship,
            limit: opts?.limit,
        }));
    }
    async addRelation(ctx, fromMemoryId, toMemoryId, relationship, opts) {
        return await ctx.runMutation(this.component.mutations.addRelation, {
            projectId: this.config.projectId,
            fromMemoryId,
            toMemoryId,
            relationship,
            metadata: opts
                ? { confidence: opts.confidence, createdBy: opts.createdBy }
                : undefined,
        });
    }
    async removeRelation(ctx, relationId) {
        await ctx.runMutation(this.component.mutations.removeRelation, {
            relationId,
        });
    }
    // ── Write operations (mutation context) ─────────────────────────
    async remember(ctx, memory) {
        return await ctx.runMutation(this.component.mutations.create, {
            projectId: this.config.projectId,
            scope: this.config.defaultScope ?? "project",
            userId: this.config.userId,
            agentId: memory.agentId ?? this.config.agentId,
            sessionId: memory.sessionId ?? this.config.sessionId,
            ...memory,
        });
    }
    async update(ctx, memoryId, updates) {
        await ctx.runMutation(this.component.mutations.update, {
            memoryId,
            actor: this.config.agentId ?? this.config.userId,
            ...updates,
        });
    }
    async forget(ctx, memoryId) {
        await ctx.runMutation(this.component.mutations.archive, {
            memoryId,
            actor: this.config.agentId ?? this.config.userId,
        });
    }
    async restore(ctx, memoryId) {
        await ctx.runMutation(this.component.mutations.restore, {
            memoryId,
            actor: this.config.agentId ?? this.config.userId,
        });
    }
    // ── Batch operations (mutation context) ────────────────────────
    async batchArchive(ctx, memoryIds) {
        return await ctx.runMutation(this.component.mutations.batchArchive, {
            memoryIds,
            actor: this.config.agentId ?? this.config.userId,
        });
    }
    async batchUpdate(ctx, updates) {
        return await ctx.runMutation(this.component.mutations.batchUpdate, {
            updates,
            actor: this.config.agentId ?? this.config.userId,
        });
    }
    // ── Access tracking (mutation context) ─────────────────────────
    async recordAccess(ctx, memoryIds) {
        await ctx.runMutation(this.component.mutations.recordAccess, {
            memoryIds,
        });
    }
    // ── Import operations (mutation context) ───────────────────────
    async importLocal(ctx, memories) {
        return (await ctx.runMutation(this.component.mutations.importFromLocal, {
            projectId: this.config.projectId,
            userId: this.config.userId,
            memories,
        }));
    }
    // ── Type ingestion (mutation context) ──────────────────────────
    async ingestTypes(ctx, typeMemories) {
        const memories = typeMemories.map((m) => ({
            title: m.title.startsWith("types/") ? m.title : `types/${m.title}`,
            content: m.content,
            memoryType: "reference",
            scope: (this.config.defaultScope ?? "project"),
            tags: ["typescript", "types", "auto-generated", ...(m.tags ?? [])],
            paths: m.paths,
            priority: m.priority ?? 0.6,
            source: "ingest-types",
            checksum: computeChecksum(m.content),
        }));
        return this.importLocal(ctx, memories);
    }
    // ── Embedding operations (action context) ─────────────────────
    async embed(ctx, memoryId) {
        const apiKey = this.config.embeddingApiKey;
        if (!apiKey)
            throw new Error("embeddingApiKey is required for embed()");
        await ctx.runAction(this.component.actions.generateEmbedding, {
            memoryId,
            embeddingApiKey: apiKey,
            model: this.config.embeddingModel,
        });
    }
    async embedAll(ctx) {
        const apiKey = this.config.embeddingApiKey;
        if (!apiKey)
            throw new Error("embeddingApiKey is required for embedAll()");
        return await ctx.runAction(this.component.actions.embedAll, {
            projectId: this.config.projectId,
            embeddingApiKey: apiKey,
            model: this.config.embeddingModel,
        });
    }
    async semanticSearch(ctx, query, opts) {
        return (await ctx.runAction(this.component.actions.semanticSearch, {
            projectId: this.config.projectId,
            query,
            embeddingApiKey: this.config.embeddingApiKey,
            limit: opts?.limit,
        }));
    }
    // ── Intelligent ingest (action context) ───────────────────────
    async ingest(ctx, content, opts) {
        const llmApiKey = this.config.llmApiKey;
        if (!llmApiKey)
            throw new Error("llmApiKey is required for ingest()");
        return (await ctx.runAction(this.component.actions.ingest, {
            projectId: this.config.projectId,
            content,
            scope: opts?.scope ?? this.config.defaultScope,
            userId: this.config.userId,
            agentId: opts?.agentId ?? this.config.agentId,
            sessionId: opts?.sessionId ?? this.config.sessionId,
            llmApiKey,
            llmModel: this.config.llmModel,
            llmBaseUrl: this.config.llmBaseUrl,
            embeddingApiKey: this.config.embeddingApiKey,
            customExtractionPrompt: opts?.customExtractionPrompt,
            customUpdatePrompt: opts?.customUpdatePrompt,
        }));
    }
    // ── API key management (mutation/query context) ──────────────────
    async createApiKey(ctx, opts) {
        return (await ctx.runMutation(this.component.apiKeyMutations.createApiKey, {
            projectId: this.config.projectId,
            name: opts.name,
            permissions: opts.permissions,
            rateLimitOverride: opts.rateLimitOverride,
            expiresAt: opts.expiresAt,
        }));
    }
    async revokeApiKey(ctx, keyHash) {
        await ctx.runMutation(this.component.apiKeyMutations.revokeApiKey, {
            keyHash,
        });
    }
    async listApiKeys(ctx) {
        return (await ctx.runQuery(this.component.apiKeyQueries.listApiKeys, {
            projectId: this.config.projectId,
        }));
    }
}
//# sourceMappingURL=index.js.map