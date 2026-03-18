export declare const create: import("convex/server").RegisteredMutation<"public", {
    userId?: string | undefined;
    agentId?: string | undefined;
    sessionId?: string | undefined;
    tags?: string[] | undefined;
    paths?: string[] | undefined;
    priority?: number | undefined;
    source?: string | undefined;
    scope: "project" | "user" | "org";
    memoryType: "instruction" | "learning" | "reference" | "feedback" | "journal";
    projectId: string;
    title: string;
    content: string;
}, Promise<import("convex/values").GenericId<"memories">>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    memoryType?: "instruction" | "learning" | "reference" | "feedback" | "journal" | undefined;
    title?: string | undefined;
    content?: string | undefined;
    tags?: string[] | undefined;
    paths?: string[] | undefined;
    priority?: number | undefined;
    actor?: string | undefined;
    memoryId: string;
}, Promise<null>>;
export declare const archive: import("convex/server").RegisteredMutation<"public", {
    actor?: string | undefined;
    memoryId: string;
}, Promise<null>>;
export declare const restore: import("convex/server").RegisteredMutation<"public", {
    actor?: string | undefined;
    memoryId: string;
}, Promise<null>>;
export declare const batchArchive: import("convex/server").RegisteredMutation<"public", {
    actor?: string | undefined;
    memoryIds: string[];
}, Promise<{
    archived: number;
    failed: number;
}>>;
export declare const batchUpdate: import("convex/server").RegisteredMutation<"public", {
    actor?: string | undefined;
    updates: {
        memoryType?: "instruction" | "learning" | "reference" | "feedback" | "journal" | undefined;
        title?: string | undefined;
        content?: string | undefined;
        tags?: string[] | undefined;
        paths?: string[] | undefined;
        priority?: number | undefined;
        memoryId: string;
    }[];
}, Promise<{
    updated: number;
    failed: number;
}>>;
export declare const recordAccess: import("convex/server").RegisteredMutation<"public", {
    memoryIds: string[];
}, Promise<null>>;
export declare const addFeedback: import("convex/server").RegisteredMutation<"public", {
    comment?: string | undefined;
    memoryId: string;
    actor: string;
    sentiment: "positive" | "negative" | "very_negative";
}, Promise<null>>;
export declare const addRelation: import("convex/server").RegisteredMutation<"public", {
    metadata?: {
        confidence?: number | undefined;
        createdBy?: string | undefined;
    } | undefined;
    projectId: string;
    fromMemoryId: string;
    toMemoryId: string;
    relationship: string;
}, Promise<import("convex/values").GenericId<"memoryRelations">>>;
export declare const removeRelation: import("convex/server").RegisteredMutation<"public", {
    relationId: string;
}, Promise<null>>;
export declare const importFromLocal: import("convex/server").RegisteredMutation<"public", {
    userId?: string | undefined;
    projectId: string;
    memories: {
        paths?: string[] | undefined;
        priority?: number | undefined;
        scope: "project" | "user" | "org";
        memoryType: "instruction" | "learning" | "reference" | "feedback" | "journal";
        title: string;
        content: string;
        tags: string[];
        source: string;
        checksum: string;
    }[];
}, Promise<{
    created: number;
    updated: number;
    unchanged: number;
}>>;
export declare const upsertProject: import("convex/server").RegisteredMutation<"public", {
    description?: string | undefined;
    settings?: {
        embeddingModel?: string | undefined;
        embeddingDimensions?: number | undefined;
        factExtractionPrompt?: string | undefined;
        updateDecisionPrompt?: string | undefined;
        decayEnabled?: boolean | undefined;
        decayHalfLifeDays?: number | undefined;
        autoSync: boolean;
        syncFormats: string[];
    } | undefined;
    projectId: string;
    name: string;
}, Promise<any>>;
export declare const recordSync: import("convex/server").RegisteredMutation<"public", {
    userId?: string | undefined;
    projectId: string;
    checksum: string;
    memoryId: string;
    direction: "push" | "pull";
    targetFormat: string;
    targetPath: string;
}, Promise<null>>;
export declare const storeEmbedding: import("convex/server").RegisteredMutation<"public", {
    memoryId: string;
    embedding: number[];
    model: string;
    dimensions: number;
}, Promise<null>>;
export declare const applyDecay: import("convex/server").RegisteredMutation<"internal", {
    projectId: string;
    halfLifeDays: number;
}, Promise<{
    processed: number;
    decayed: number;
}>>;
export declare const cleanupOldHistory: import("convex/server").RegisteredMutation<"internal", {
    projectId: string;
    olderThanMs: number;
}, Promise<{
    deleted: number;
}>>;
export declare const ingestCreateMemory: import("convex/server").RegisteredMutation<"internal", {
    userId?: string | undefined;
    agentId?: string | undefined;
    sessionId?: string | undefined;
    scope: "project" | "user" | "org";
    memoryType: "instruction" | "learning" | "reference" | "feedback" | "journal";
    projectId: string;
    title: string;
    content: string;
    tags: string[];
    source: string;
}, Promise<import("convex/values").GenericId<"memories">>>;
export declare const ingestUpdateMemory: import("convex/server").RegisteredMutation<"internal", {
    content: string;
    memoryId: string;
}, Promise<null>>;
export declare const ingestDeleteMemory: import("convex/server").RegisteredMutation<"internal", {
    memoryId: string;
}, Promise<null>>;
//# sourceMappingURL=mutations.d.ts.map