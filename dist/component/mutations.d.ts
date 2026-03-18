export declare const create: import("convex/server").RegisteredMutation<"public", {
    userId?: string | undefined;
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
    memoryId: string;
}, Promise<null>>;
export declare const archive: import("convex/server").RegisteredMutation<"public", {
    memoryId: string;
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
//# sourceMappingURL=mutations.d.ts.map