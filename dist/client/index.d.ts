import type { GenericActionCtx, GenericDataModel, GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { api } from "../component/_generated/api.js";
import type { Memory, MemoryType, Scope, ToolFormat, ContextBundle, ExportedFile, ImportResult } from "../shared.js";
export type { Memory, MemoryType, Scope, ToolFormat, ContextBundle, ExportedFile, ImportResult };
type QueryCtx = GenericQueryCtx<GenericDataModel>;
type MutationCtx = GenericMutationCtx<GenericDataModel>;
type ActionCtx = GenericActionCtx<GenericDataModel>;
type ComponentApi = typeof api;
export interface AgentMemoryConfig {
    projectId: string;
    defaultScope?: Scope;
    userId?: string;
    embeddingApiKey?: string;
    embeddingModel?: string;
}
export declare class AgentMemory {
    component: ComponentApi;
    config: AgentMemoryConfig;
    constructor(component: ComponentApi, config: AgentMemoryConfig);
    list(ctx: QueryCtx, opts?: {
        memoryType?: MemoryType;
        scope?: Scope;
        minPriority?: number;
        archived?: boolean;
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
    }): Promise<ContextBundle>;
    exportForTool(ctx: QueryCtx, format: ToolFormat, opts?: {
        since?: number;
    }): Promise<ExportedFile[]>;
    remember(ctx: MutationCtx, memory: {
        title: string;
        content: string;
        memoryType: MemoryType;
        tags?: string[];
        paths?: string[];
        priority?: number;
        source?: string;
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
    embed(ctx: ActionCtx, memoryId: string): Promise<void>;
    embedAll(ctx: ActionCtx): Promise<{
        embedded: number;
        skipped: number;
    }>;
    semanticSearch(ctx: ActionCtx, query: string, opts?: {
        limit?: number;
    }): Promise<Memory[]>;
}
//# sourceMappingURL=index.d.ts.map