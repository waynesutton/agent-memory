import type { GenericActionCtx, GenericDataModel, GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { api } from "../component/_generated/api.js";
import type { Memory, MemoryType, Scope, ToolFormat, ContextBundle, ExportedFile, ImportResult, MemoryHistoryEntry, MemoryFeedbackEntry, MemoryRelation, FeedbackSentiment, IngestResult, ApiKeyInfo, ApiKeyCreateResult } from "../shared.js";
export type { Memory, MemoryType, Scope, ToolFormat, ContextBundle, ExportedFile, ImportResult, MemoryHistoryEntry, MemoryFeedbackEntry, MemoryRelation, FeedbackSentiment, IngestResult, ApiKeyInfo, ApiKeyCreateResult, };
type QueryCtx = GenericQueryCtx<GenericDataModel>;
type MutationCtx = GenericMutationCtx<GenericDataModel>;
type ActionCtx = GenericActionCtx<GenericDataModel>;
type ComponentApi = typeof api;
export interface AgentMemoryConfig {
    projectId: string;
    defaultScope?: Scope;
    userId?: string;
    agentId?: string;
    sessionId?: string;
    embeddingApiKey?: string;
    embeddingModel?: string;
    llmApiKey?: string;
    llmModel?: string;
    llmBaseUrl?: string;
}
export declare class AgentMemory {
    component: ComponentApi;
    config: AgentMemoryConfig;
    constructor(component: ComponentApi, config: AgentMemoryConfig);
    list(ctx: QueryCtx, opts?: {
        memoryType?: MemoryType;
        scope?: Scope;
        agentId?: string;
        sessionId?: string;
        source?: string;
        tags?: string[];
        minPriority?: number;
        archived?: boolean;
        createdAfter?: number;
        createdBefore?: number;
        limit?: number;
    }): Promise<Memory[]>;
    get(ctx: QueryCtx, memoryId: string): Promise<Memory | null>;
    search(ctx: QueryCtx, query: string, opts?: {
        memoryType?: MemoryType;
        scope?: Scope;
        limit?: number;
    }): Promise<Memory[]>;
    getContextBundle(ctx: QueryCtx, opts?: {
        activePaths?: string[];
        maxTokens?: number;
        agentId?: string;
    }): Promise<ContextBundle>;
    exportForTool(ctx: QueryCtx, format: ToolFormat, opts?: {
        since?: number;
    }): Promise<ExportedFile[]>;
    history(ctx: QueryCtx, memoryId: string, opts?: {
        limit?: number;
    }): Promise<MemoryHistoryEntry[]>;
    projectHistory(ctx: QueryCtx, opts?: {
        limit?: number;
    }): Promise<MemoryHistoryEntry[]>;
    getFeedback(ctx: QueryCtx, memoryId: string, opts?: {
        limit?: number;
    }): Promise<MemoryFeedbackEntry[]>;
    addFeedback(ctx: MutationCtx, memoryId: string, sentiment: FeedbackSentiment, opts?: {
        comment?: string;
        actor?: string;
    }): Promise<void>;
    getRelations(ctx: QueryCtx, memoryId: string, opts?: {
        direction?: "from" | "to" | "both";
        relationship?: string;
        limit?: number;
    }): Promise<MemoryRelation[]>;
    addRelation(ctx: MutationCtx, fromMemoryId: string, toMemoryId: string, relationship: string, opts?: {
        confidence?: number;
        createdBy?: string;
    }): Promise<string>;
    removeRelation(ctx: MutationCtx, relationId: string): Promise<void>;
    remember(ctx: MutationCtx, memory: {
        title: string;
        content: string;
        memoryType: MemoryType;
        tags?: string[];
        paths?: string[];
        priority?: number;
        source?: string;
        agentId?: string;
        sessionId?: string;
    }): Promise<string>;
    update(ctx: MutationCtx, memoryId: string, updates: {
        content?: string;
        title?: string;
        tags?: string[];
        paths?: string[];
        priority?: number;
        memoryType?: MemoryType;
    }): Promise<void>;
    forget(ctx: MutationCtx, memoryId: string): Promise<void>;
    restore(ctx: MutationCtx, memoryId: string): Promise<void>;
    batchArchive(ctx: MutationCtx, memoryIds: string[]): Promise<{
        archived: number;
        failed: number;
    }>;
    batchUpdate(ctx: MutationCtx, updates: Array<{
        memoryId: string;
        content?: string;
        title?: string;
        tags?: string[];
        paths?: string[];
        priority?: number;
        memoryType?: MemoryType;
    }>): Promise<{
        updated: number;
        failed: number;
    }>;
    recordAccess(ctx: MutationCtx, memoryIds: string[]): Promise<void>;
    importLocal(ctx: MutationCtx, memories: Array<{
        title: string;
        content: string;
        memoryType: MemoryType;
        scope: Scope;
        tags: string[];
        paths?: string[];
        priority?: number;
        source: string;
        checksum: string;
    }>): Promise<ImportResult>;
    ingestTypes(ctx: MutationCtx, typeMemories: Array<{
        title: string;
        content: string;
        tags?: string[];
        paths?: string[];
        priority?: number;
    }>): Promise<ImportResult>;
    embed(ctx: ActionCtx, memoryId: string): Promise<void>;
    embedAll(ctx: ActionCtx): Promise<{
        embedded: number;
        skipped: number;
    }>;
    semanticSearch(ctx: ActionCtx, query: string, opts?: {
        limit?: number;
    }): Promise<Memory[]>;
    ingest(ctx: ActionCtx, content: string, opts?: {
        scope?: Scope;
        agentId?: string;
        sessionId?: string;
        customExtractionPrompt?: string;
        customUpdatePrompt?: string;
    }): Promise<IngestResult>;
    createApiKey(ctx: MutationCtx, opts: {
        name: string;
        permissions: string[];
        rateLimitOverride?: {
            requestsPerWindow: number;
            windowMs: number;
        };
        expiresAt?: number;
    }): Promise<ApiKeyCreateResult>;
    revokeApiKey(ctx: MutationCtx, keyHash: string): Promise<void>;
    listApiKeys(ctx: QueryCtx): Promise<ApiKeyInfo[]>;
}
//# sourceMappingURL=index.d.ts.map