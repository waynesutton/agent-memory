export declare const MEMORY_TYPES: readonly ["instruction", "learning", "reference", "feedback", "journal"];
export type MemoryType = (typeof MEMORY_TYPES)[number];
export declare const memoryTypeValidator: import("convex/values").VUnion<"instruction" | "learning" | "reference" | "feedback" | "journal", [import("convex/values").VLiteral<"instruction", "required">, import("convex/values").VLiteral<"learning", "required">, import("convex/values").VLiteral<"reference", "required">, import("convex/values").VLiteral<"feedback", "required">, import("convex/values").VLiteral<"journal", "required">], "required", never>;
export declare const SCOPES: readonly ["project", "user", "org"];
export type Scope = (typeof SCOPES)[number];
export declare const scopeValidator: import("convex/values").VUnion<"project" | "user" | "org", [import("convex/values").VLiteral<"project", "required">, import("convex/values").VLiteral<"user", "required">, import("convex/values").VLiteral<"org", "required">], "required", never>;
export declare const syncDirectionValidator: import("convex/values").VUnion<"push" | "pull", [import("convex/values").VLiteral<"push", "required">, import("convex/values").VLiteral<"pull", "required">], "required", never>;
export declare const TOOL_FORMATS: readonly ["claude-code", "cursor", "opencode", "codex", "conductor", "zed", "vscode-copilot", "pi", "raw"];
export type ToolFormat = (typeof TOOL_FORMATS)[number];
export declare const toolFormatValidator: import("convex/values").VUnion<"claude-code" | "cursor" | "opencode" | "codex" | "conductor" | "zed" | "vscode-copilot" | "pi" | "raw", [import("convex/values").VLiteral<"claude-code", "required">, import("convex/values").VLiteral<"cursor", "required">, import("convex/values").VLiteral<"opencode", "required">, import("convex/values").VLiteral<"codex", "required">, import("convex/values").VLiteral<"conductor", "required">, import("convex/values").VLiteral<"zed", "required">, import("convex/values").VLiteral<"vscode-copilot", "required">, import("convex/values").VLiteral<"pi", "required">, import("convex/values").VLiteral<"raw", "required">], "required", never>;
export declare const HISTORY_EVENTS: readonly ["created", "updated", "archived", "restored", "merged"];
export type HistoryEvent = (typeof HISTORY_EVENTS)[number];
export declare const FEEDBACK_SENTIMENTS: readonly ["positive", "negative", "very_negative"];
export type FeedbackSentiment = (typeof FEEDBACK_SENTIMENTS)[number];
export declare const INGEST_EVENTS: readonly ["added", "updated", "deleted", "skipped"];
export type IngestEvent = (typeof INGEST_EVENTS)[number];
export interface Memory {
    _id: string;
    _creationTime: number;
    projectId: string;
    scope: Scope;
    userId?: string;
    agentId?: string;
    sessionId?: string;
    title: string;
    content: string;
    memoryType: MemoryType;
    tags: string[];
    paths?: string[];
    priority?: number;
    source?: string;
    lastSyncedAt?: number;
    checksum: string;
    archived: boolean;
    embeddingId?: string;
    accessCount?: number;
    lastAccessedAt?: number;
    positiveCount?: number;
    negativeCount?: number;
}
export interface ContextBundle {
    pinned: Memory[];
    relevant: Memory[];
    available: Array<{
        _id: string;
        title: string;
        memoryType: MemoryType;
        priority: number;
    }>;
}
export interface ExportedFile {
    path: string;
    content: string;
    checksum: string;
}
export interface ImportResult {
    created: number;
    updated: number;
    unchanged: number;
}
export interface MemoryHistoryEntry {
    _id: string;
    _creationTime: number;
    memoryId: string;
    projectId: string;
    previousContent?: string;
    newContent?: string;
    previousTitle?: string;
    newTitle?: string;
    event: HistoryEvent;
    actor: string;
    timestamp: number;
}
export interface MemoryFeedbackEntry {
    _id: string;
    _creationTime: number;
    memoryId: string;
    projectId: string;
    sentiment: FeedbackSentiment;
    comment?: string;
    actor: string;
    timestamp: number;
}
export interface MemoryRelation {
    _id: string;
    _creationTime: number;
    projectId: string;
    fromMemoryId: string;
    toMemoryId: string;
    relationship: string;
    metadata?: {
        confidence?: number;
        createdBy?: string;
    };
    timestamp: number;
}
export interface IngestResult {
    results: Array<{
        memoryId: string;
        content: string;
        event: IngestEvent;
        previousContent?: string;
    }>;
    totalProcessed: number;
}
export interface ApiKeyInfo {
    _id: string;
    keyHash: string;
    projectId: string;
    name: string;
    permissions: string[];
    rateLimitOverride?: {
        requestsPerWindow: number;
        windowMs: number;
    };
    lastUsedAt?: number;
    expiresAt?: number;
    revoked: boolean;
}
export interface ApiKeyCreateResult {
    key: string;
    keyHash: string;
}
export declare const API_PERMISSIONS: readonly ["list", "get", "search", "context", "export", "history", "relations"];
export type ApiPermission = (typeof API_PERMISSIONS)[number];
//# sourceMappingURL=shared.d.ts.map