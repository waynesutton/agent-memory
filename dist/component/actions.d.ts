export declare const generateEmbedding: import("convex/server").RegisteredAction<"public", {
    model?: string | undefined;
    memoryId: string;
    embeddingApiKey: string;
}, Promise<null>>;
export declare const semanticSearch: import("convex/server").RegisteredAction<"public", {
    limit?: number | undefined;
    embeddingApiKey?: string | undefined;
    projectId: string;
    query: string;
}, Promise<any>>;
export declare const embedAll: import("convex/server").RegisteredAction<"public", {
    model?: string | undefined;
    projectId: string;
    embeddingApiKey: string;
}, Promise<{
    embedded: number;
    skipped: number;
}>>;
//# sourceMappingURL=actions.d.ts.map