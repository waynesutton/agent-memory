export declare const memoryTypeValidator: import("convex/values").VUnion<"instruction" | "learning" | "reference" | "feedback" | "journal", [import("convex/values").VLiteral<"instruction", "required">, import("convex/values").VLiteral<"learning", "required">, import("convex/values").VLiteral<"reference", "required">, import("convex/values").VLiteral<"feedback", "required">, import("convex/values").VLiteral<"journal", "required">], "required", never>;
export declare const scopeValidator: import("convex/values").VUnion<"project" | "user" | "org", [import("convex/values").VLiteral<"project", "required">, import("convex/values").VLiteral<"user", "required">, import("convex/values").VLiteral<"org", "required">], "required", never>;
export declare const syncDirectionValidator: import("convex/values").VUnion<"push" | "pull", [import("convex/values").VLiteral<"push", "required">, import("convex/values").VLiteral<"pull", "required">], "required", never>;
declare const _default: import("convex/server").SchemaDefinition<{
    memories: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: string | undefined;
        paths?: string[] | undefined;
        priority?: number | undefined;
        source?: string | undefined;
        lastSyncedAt?: number | undefined;
        embeddingId?: import("convex/values").GenericId<"embeddings"> | undefined;
        scope: "project" | "user" | "org";
        memoryType: "instruction" | "learning" | "reference" | "feedback" | "journal";
        projectId: string;
        title: string;
        content: string;
        tags: string[];
        checksum: string;
        archived: boolean;
    }, {
        projectId: import("convex/values").VString<string, "required">;
        scope: import("convex/values").VUnion<"project" | "user" | "org", [import("convex/values").VLiteral<"project", "required">, import("convex/values").VLiteral<"user", "required">, import("convex/values").VLiteral<"org", "required">], "required", never>;
        userId: import("convex/values").VString<string | undefined, "optional">;
        title: import("convex/values").VString<string, "required">;
        content: import("convex/values").VString<string, "required">;
        memoryType: import("convex/values").VUnion<"instruction" | "learning" | "reference" | "feedback" | "journal", [import("convex/values").VLiteral<"instruction", "required">, import("convex/values").VLiteral<"learning", "required">, import("convex/values").VLiteral<"reference", "required">, import("convex/values").VLiteral<"feedback", "required">, import("convex/values").VLiteral<"journal", "required">], "required", never>;
        tags: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        paths: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        priority: import("convex/values").VFloat64<number | undefined, "optional">;
        source: import("convex/values").VString<string | undefined, "optional">;
        lastSyncedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        checksum: import("convex/values").VString<string, "required">;
        archived: import("convex/values").VBoolean<boolean, "required">;
        embeddingId: import("convex/values").VId<import("convex/values").GenericId<"embeddings"> | undefined, "optional">;
    }, "required", "scope" | "memoryType" | "projectId" | "userId" | "title" | "content" | "tags" | "paths" | "priority" | "source" | "lastSyncedAt" | "checksum" | "archived" | "embeddingId">, {
        by_project: ["projectId", "archived", "memoryType", "_creationTime"];
        by_project_scope: ["projectId", "scope", "userId", "archived", "_creationTime"];
        by_project_title: ["projectId", "title", "_creationTime"];
        by_type_priority: ["projectId", "memoryType", "priority", "_creationTime"];
    }, {
        search_content: {
            searchField: "content";
            filterFields: "scope" | "memoryType" | "projectId" | "archived";
        };
        search_title: {
            searchField: "title";
            filterFields: "memoryType" | "projectId";
        };
    }, {}>;
    embeddings: import("convex/server").TableDefinition<import("convex/values").VObject<{
        memoryId: import("convex/values").GenericId<"memories">;
        embedding: number[];
        model: string;
        dimensions: number;
    }, {
        memoryId: import("convex/values").VId<import("convex/values").GenericId<"memories">, "required">;
        embedding: import("convex/values").VArray<number[], import("convex/values").VFloat64<number, "required">, "required">;
        model: import("convex/values").VString<string, "required">;
        dimensions: import("convex/values").VFloat64<number, "required">;
    }, "required", "memoryId" | "embedding" | "model" | "dimensions">, {
        by_memory: ["memoryId", "_creationTime"];
    }, {}, {
        by_embedding: {
            vectorField: "embedding";
            dimensions: number;
            filterFields: never;
        };
    }>;
    projects: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string | undefined;
        projectId: string;
        name: string;
        settings: {
            embeddingModel?: string | undefined;
            embeddingDimensions?: number | undefined;
            autoSync: boolean;
            syncFormats: string[];
        };
    }, {
        projectId: import("convex/values").VString<string, "required">;
        name: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string | undefined, "optional">;
        settings: import("convex/values").VObject<{
            embeddingModel?: string | undefined;
            embeddingDimensions?: number | undefined;
            autoSync: boolean;
            syncFormats: string[];
        }, {
            autoSync: import("convex/values").VBoolean<boolean, "required">;
            syncFormats: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            embeddingModel: import("convex/values").VString<string | undefined, "optional">;
            embeddingDimensions: import("convex/values").VFloat64<number | undefined, "optional">;
        }, "required", "autoSync" | "syncFormats" | "embeddingModel" | "embeddingDimensions">;
    }, "required", "projectId" | "name" | "description" | "settings" | "settings.autoSync" | "settings.syncFormats" | "settings.embeddingModel" | "settings.embeddingDimensions">, {
        by_projectId: ["projectId", "_creationTime"];
    }, {}, {}>;
    syncLog: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: string | undefined;
        projectId: string;
        checksum: string;
        memoryId: import("convex/values").GenericId<"memories">;
        direction: "push" | "pull";
        targetFormat: string;
        targetPath: string;
        syncedAt: number;
    }, {
        projectId: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VString<string | undefined, "optional">;
        memoryId: import("convex/values").VId<import("convex/values").GenericId<"memories">, "required">;
        targetFormat: import("convex/values").VString<string, "required">;
        targetPath: import("convex/values").VString<string, "required">;
        syncedAt: import("convex/values").VFloat64<number, "required">;
        checksum: import("convex/values").VString<string, "required">;
        direction: import("convex/values").VUnion<"push" | "pull", [import("convex/values").VLiteral<"push", "required">, import("convex/values").VLiteral<"pull", "required">], "required", never>;
    }, "required", "projectId" | "userId" | "checksum" | "memoryId" | "direction" | "targetFormat" | "targetPath" | "syncedAt">, {
        by_project_user: ["projectId", "userId", "syncedAt", "_creationTime"];
    }, {}, {}>;
}, true>;
export default _default;
//# sourceMappingURL=schema.d.ts.map