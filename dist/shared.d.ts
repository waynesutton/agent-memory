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
export interface Memory {
    _id: string;
    _creationTime: number;
    projectId: string;
    scope: Scope;
    userId?: string;
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
//# sourceMappingURL=shared.d.ts.map