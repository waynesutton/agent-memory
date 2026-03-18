export declare const list: import("convex/server").RegisteredQuery<"public", {
    archived?: boolean | undefined;
    scope?: "project" | "user" | "org" | undefined;
    memoryType?: "instruction" | "learning" | "reference" | "feedback" | "journal" | undefined;
    userId?: string | undefined;
    agentId?: string | undefined;
    sessionId?: string | undefined;
    tags?: string[] | undefined;
    source?: string | undefined;
    limit?: number | undefined;
    minPriority?: number | undefined;
    createdAfter?: number | undefined;
    createdBefore?: number | undefined;
    projectId: string;
}, Promise<any[]>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    memoryId: string;
}, Promise<any>>;
export declare const search: import("convex/server").RegisteredQuery<"public", {
    scope?: "project" | "user" | "org" | undefined;
    memoryType?: "instruction" | "learning" | "reference" | "feedback" | "journal" | undefined;
    limit?: number | undefined;
    projectId: string;
    query: string;
}, Promise<any[]>>;
export declare const getContextBundle: import("convex/server").RegisteredQuery<"public", {
    userId?: string | undefined;
    agentId?: string | undefined;
    activePaths?: string[] | undefined;
    maxTokens?: number | undefined;
    scope: "project" | "user" | "org";
    projectId: string;
}, Promise<{
    pinned: any[];
    relevant: any[];
    available: {
        _id: string;
        title: any;
        memoryType: any;
        priority: number;
    }[];
}>>;
export declare const history: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    memoryId: string;
}, Promise<any[]>>;
export declare const projectHistory: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    projectId: string;
}, Promise<any[]>>;
export declare const getFeedback: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    memoryId: string;
}, Promise<any[]>>;
export declare const getRelations: import("convex/server").RegisteredQuery<"public", {
    direction?: "from" | "to" | "both" | undefined;
    relationship?: string | undefined;
    limit?: number | undefined;
    memoryId: string;
}, Promise<any[]>>;
export declare const exportForTool: import("convex/server").RegisteredQuery<"public", {
    scope?: "project" | "user" | "org" | undefined;
    userId?: string | undefined;
    since?: number | undefined;
    projectId: string;
    format: "claude-code" | "cursor" | "opencode" | "codex" | "conductor" | "zed" | "vscode-copilot" | "pi" | "raw";
}, Promise<import("./format.js").FormattedFile[]>>;
export declare const getEmbeddingMemory: import("convex/server").RegisteredQuery<"internal", {
    embeddingId: string;
}, Promise<any>>;
export declare const listUnembedded: import("convex/server").RegisteredQuery<"internal", {
    projectId: string;
}, Promise<{
    _id: string;
    title: any;
}[]>>;
export declare const listForIngest: import("convex/server").RegisteredQuery<"internal", {
    limit?: number | undefined;
    projectId: string;
}, Promise<{
    _id: string;
    title: any;
    content: any;
    memoryType: any;
}[]>>;
export declare const getProjectSettings: import("convex/server").RegisteredQuery<"internal", {
    projectId: string;
}, Promise<{
    projectId: any;
    name: any;
    description: any;
    settings: any;
} | null>>;
//# sourceMappingURL=queries.d.ts.map