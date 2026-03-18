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
            memoryType: opts?.memoryType,
            archived: opts?.archived,
            minPriority: opts?.minPriority,
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
    // ── Write operations (mutation context) ─────────────────────────
    async remember(ctx, memory) {
        return await ctx.runMutation(this.component.mutations.create, {
            projectId: this.config.projectId,
            scope: this.config.defaultScope ?? "project",
            userId: this.config.userId,
            ...memory,
        });
    }
    async update(ctx, memoryId, updates) {
        await ctx.runMutation(this.component.mutations.update, {
            memoryId,
            ...updates,
        });
    }
    async forget(ctx, memoryId) {
        await ctx.runMutation(this.component.mutations.archive, { memoryId });
    }
    async importLocal(ctx, memories) {
        return (await ctx.runMutation(this.component.mutations.importFromLocal, {
            projectId: this.config.projectId,
            userId: this.config.userId,
            memories,
        }));
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
}
//# sourceMappingURL=index.js.map