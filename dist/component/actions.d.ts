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
export declare const ingest: import("convex/server").RegisteredAction<"public", {
    scope?: "project" | "user" | "org" | undefined;
    userId?: string | undefined;
    agentId?: string | undefined;
    sessionId?: string | undefined;
    embeddingApiKey?: string | undefined;
    customExtractionPrompt?: string | undefined;
    customUpdatePrompt?: string | undefined;
    llmModel?: string | undefined;
    llmBaseUrl?: string | undefined;
    projectId: string;
    content: string;
    llmApiKey: string;
}, Promise<{
    results: {
        memoryId: string;
        content: string;
        event: "added" | "updated" | "deleted" | "skipped";
        previousContent?: string;
    }[];
    totalProcessed: number;
}>>;
//# sourceMappingURL=actions.d.ts.map