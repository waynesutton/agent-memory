export declare const memoryTypeValidator: import("convex/values").VUnion<"instruction" | "learning" | "reference" | "feedback" | "journal", [import("convex/values").VLiteral<"instruction", "required">, import("convex/values").VLiteral<"learning", "required">, import("convex/values").VLiteral<"reference", "required">, import("convex/values").VLiteral<"feedback", "required">, import("convex/values").VLiteral<"journal", "required">], "required", never>;
export declare const scopeValidator: import("convex/values").VUnion<"project" | "user" | "org", [import("convex/values").VLiteral<"project", "required">, import("convex/values").VLiteral<"user", "required">, import("convex/values").VLiteral<"org", "required">], "required", never>;
export declare const syncDirectionValidator: import("convex/values").VUnion<"push" | "pull", [import("convex/values").VLiteral<"push", "required">, import("convex/values").VLiteral<"pull", "required">], "required", never>;
export declare const historyEventValidator: import("convex/values").VUnion<"created" | "updated" | "archived" | "restored" | "merged", [import("convex/values").VLiteral<"created", "required">, import("convex/values").VLiteral<"updated", "required">, import("convex/values").VLiteral<"archived", "required">, import("convex/values").VLiteral<"restored", "required">, import("convex/values").VLiteral<"merged", "required">], "required", never>;
export declare const feedbackSentimentValidator: import("convex/values").VUnion<"positive" | "negative" | "very_negative", [import("convex/values").VLiteral<"positive", "required">, import("convex/values").VLiteral<"negative", "required">, import("convex/values").VLiteral<"very_negative", "required">], "required", never>;
export declare const ingestEventValidator: import("convex/values").VUnion<"updated" | "added" | "deleted" | "skipped", [import("convex/values").VLiteral<"added", "required">, import("convex/values").VLiteral<"updated", "required">, import("convex/values").VLiteral<"deleted", "required">, import("convex/values").VLiteral<"skipped", "required">], "required", never>;
declare const _default: import("convex/server").SchemaDefinition<{
    memories: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: string | undefined;
        agentId?: string | undefined;
        sessionId?: string | undefined;
        paths?: string[] | undefined;
        priority?: number | undefined;
        source?: string | undefined;
        lastSyncedAt?: number | undefined;
        embeddingId?: import("convex/values").GenericId<"embeddings"> | undefined;
        accessCount?: number | undefined;
        lastAccessedAt?: number | undefined;
        positiveCount?: number | undefined;
        negativeCount?: number | undefined;
        archived: boolean;
        scope: "project" | "user" | "org";
        memoryType: "instruction" | "learning" | "reference" | "feedback" | "journal";
        projectId: string;
        title: string;
        content: string;
        tags: string[];
        checksum: string;
    }, {
        projectId: import("convex/values").VString<string, "required">;
        scope: import("convex/values").VUnion<"project" | "user" | "org", [import("convex/values").VLiteral<"project", "required">, import("convex/values").VLiteral<"user", "required">, import("convex/values").VLiteral<"org", "required">], "required", never>;
        userId: import("convex/values").VString<string | undefined, "optional">;
        agentId: import("convex/values").VString<string | undefined, "optional">;
        sessionId: import("convex/values").VString<string | undefined, "optional">;
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
        accessCount: import("convex/values").VFloat64<number | undefined, "optional">;
        lastAccessedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        positiveCount: import("convex/values").VFloat64<number | undefined, "optional">;
        negativeCount: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "archived" | "scope" | "memoryType" | "projectId" | "userId" | "agentId" | "sessionId" | "title" | "content" | "tags" | "paths" | "priority" | "source" | "lastSyncedAt" | "checksum" | "embeddingId" | "accessCount" | "lastAccessedAt" | "positiveCount" | "negativeCount">, {
        by_project: ["projectId", "archived", "memoryType", "_creationTime"];
        by_project_scope: ["projectId", "scope", "userId", "archived", "_creationTime"];
        by_project_title: ["projectId", "title", "_creationTime"];
        by_type_priority: ["projectId", "memoryType", "priority", "_creationTime"];
        by_agent: ["projectId", "agentId", "archived", "_creationTime"];
        by_session: ["projectId", "sessionId", "archived", "_creationTime"];
        by_source: ["projectId", "source", "archived", "_creationTime"];
        by_last_accessed: ["projectId", "lastAccessedAt", "_creationTime"];
    }, {
        search_content: {
            searchField: "content";
            filterFields: "archived" | "scope" | "memoryType" | "projectId";
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
            factExtractionPrompt?: string | undefined;
            updateDecisionPrompt?: string | undefined;
            decayEnabled?: boolean | undefined;
            decayHalfLifeDays?: number | undefined;
            apiRateLimit?: {
                requestsPerWindow: number;
                windowMs: number;
            } | undefined;
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
            factExtractionPrompt?: string | undefined;
            updateDecisionPrompt?: string | undefined;
            decayEnabled?: boolean | undefined;
            decayHalfLifeDays?: number | undefined;
            apiRateLimit?: {
                requestsPerWindow: number;
                windowMs: number;
            } | undefined;
            autoSync: boolean;
            syncFormats: string[];
        }, {
            autoSync: import("convex/values").VBoolean<boolean, "required">;
            syncFormats: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            embeddingModel: import("convex/values").VString<string | undefined, "optional">;
            embeddingDimensions: import("convex/values").VFloat64<number | undefined, "optional">;
            factExtractionPrompt: import("convex/values").VString<string | undefined, "optional">;
            updateDecisionPrompt: import("convex/values").VString<string | undefined, "optional">;
            decayEnabled: import("convex/values").VBoolean<boolean | undefined, "optional">;
            decayHalfLifeDays: import("convex/values").VFloat64<number | undefined, "optional">;
            apiRateLimit: import("convex/values").VObject<{
                requestsPerWindow: number;
                windowMs: number;
            } | undefined, {
                requestsPerWindow: import("convex/values").VFloat64<number, "required">;
                windowMs: import("convex/values").VFloat64<number, "required">;
            }, "optional", "requestsPerWindow" | "windowMs">;
        }, "required", "autoSync" | "syncFormats" | "embeddingModel" | "embeddingDimensions" | "factExtractionPrompt" | "updateDecisionPrompt" | "decayEnabled" | "decayHalfLifeDays" | "apiRateLimit" | "apiRateLimit.requestsPerWindow" | "apiRateLimit.windowMs">;
    }, "required", "projectId" | "name" | "description" | "settings" | "settings.autoSync" | "settings.syncFormats" | "settings.embeddingModel" | "settings.embeddingDimensions" | "settings.factExtractionPrompt" | "settings.updateDecisionPrompt" | "settings.decayEnabled" | "settings.decayHalfLifeDays" | "settings.apiRateLimit" | "settings.apiRateLimit.requestsPerWindow" | "settings.apiRateLimit.windowMs">, {
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
    memoryHistory: import("convex/server").TableDefinition<import("convex/values").VObject<{
        previousContent?: string | undefined;
        newContent?: string | undefined;
        previousTitle?: string | undefined;
        newTitle?: string | undefined;
        projectId: string;
        memoryId: import("convex/values").GenericId<"memories">;
        event: "created" | "updated" | "archived" | "restored" | "merged";
        actor: string;
        timestamp: number;
    }, {
        memoryId: import("convex/values").VId<import("convex/values").GenericId<"memories">, "required">;
        projectId: import("convex/values").VString<string, "required">;
        previousContent: import("convex/values").VString<string | undefined, "optional">;
        newContent: import("convex/values").VString<string | undefined, "optional">;
        previousTitle: import("convex/values").VString<string | undefined, "optional">;
        newTitle: import("convex/values").VString<string | undefined, "optional">;
        event: import("convex/values").VUnion<"created" | "updated" | "archived" | "restored" | "merged", [import("convex/values").VLiteral<"created", "required">, import("convex/values").VLiteral<"updated", "required">, import("convex/values").VLiteral<"archived", "required">, import("convex/values").VLiteral<"restored", "required">, import("convex/values").VLiteral<"merged", "required">], "required", never>;
        actor: import("convex/values").VString<string, "required">;
        timestamp: import("convex/values").VFloat64<number, "required">;
    }, "required", "projectId" | "memoryId" | "event" | "previousContent" | "newContent" | "previousTitle" | "newTitle" | "actor" | "timestamp">, {
        by_memory: ["memoryId", "timestamp", "_creationTime"];
        by_project: ["projectId", "timestamp", "_creationTime"];
    }, {}, {}>;
    memoryFeedback: import("convex/server").TableDefinition<import("convex/values").VObject<{
        comment?: string | undefined;
        projectId: string;
        memoryId: import("convex/values").GenericId<"memories">;
        actor: string;
        timestamp: number;
        sentiment: "positive" | "negative" | "very_negative";
    }, {
        memoryId: import("convex/values").VId<import("convex/values").GenericId<"memories">, "required">;
        projectId: import("convex/values").VString<string, "required">;
        sentiment: import("convex/values").VUnion<"positive" | "negative" | "very_negative", [import("convex/values").VLiteral<"positive", "required">, import("convex/values").VLiteral<"negative", "required">, import("convex/values").VLiteral<"very_negative", "required">], "required", never>;
        comment: import("convex/values").VString<string | undefined, "optional">;
        actor: import("convex/values").VString<string, "required">;
        timestamp: import("convex/values").VFloat64<number, "required">;
    }, "required", "projectId" | "memoryId" | "actor" | "timestamp" | "sentiment" | "comment">, {
        by_memory: ["memoryId", "timestamp", "_creationTime"];
        by_project: ["projectId", "timestamp", "_creationTime"];
    }, {}, {}>;
    memoryRelations: import("convex/server").TableDefinition<import("convex/values").VObject<{
        metadata?: {
            confidence?: number | undefined;
            createdBy?: string | undefined;
        } | undefined;
        projectId: string;
        timestamp: number;
        fromMemoryId: import("convex/values").GenericId<"memories">;
        toMemoryId: import("convex/values").GenericId<"memories">;
        relationship: string;
    }, {
        projectId: import("convex/values").VString<string, "required">;
        fromMemoryId: import("convex/values").VId<import("convex/values").GenericId<"memories">, "required">;
        toMemoryId: import("convex/values").VId<import("convex/values").GenericId<"memories">, "required">;
        relationship: import("convex/values").VString<string, "required">;
        metadata: import("convex/values").VObject<{
            confidence?: number | undefined;
            createdBy?: string | undefined;
        } | undefined, {
            confidence: import("convex/values").VFloat64<number | undefined, "optional">;
            createdBy: import("convex/values").VString<string | undefined, "optional">;
        }, "optional", "confidence" | "createdBy">;
        timestamp: import("convex/values").VFloat64<number, "required">;
    }, "required", "projectId" | "timestamp" | "fromMemoryId" | "toMemoryId" | "relationship" | "metadata" | "metadata.confidence" | "metadata.createdBy">, {
        by_from: ["fromMemoryId", "relationship", "_creationTime"];
        by_to: ["toMemoryId", "relationship", "_creationTime"];
        by_project: ["projectId", "relationship", "_creationTime"];
    }, {}, {}>;
    apiKeys: import("convex/server").TableDefinition<import("convex/values").VObject<{
        rateLimitOverride?: {
            requestsPerWindow: number;
            windowMs: number;
        } | undefined;
        lastUsedAt?: number | undefined;
        expiresAt?: number | undefined;
        projectId: string;
        name: string;
        keyHash: string;
        permissions: string[];
        revoked: boolean;
    }, {
        keyHash: import("convex/values").VString<string, "required">;
        projectId: import("convex/values").VString<string, "required">;
        name: import("convex/values").VString<string, "required">;
        permissions: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        rateLimitOverride: import("convex/values").VObject<{
            requestsPerWindow: number;
            windowMs: number;
        } | undefined, {
            requestsPerWindow: import("convex/values").VFloat64<number, "required">;
            windowMs: import("convex/values").VFloat64<number, "required">;
        }, "optional", "requestsPerWindow" | "windowMs">;
        lastUsedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        expiresAt: import("convex/values").VFloat64<number | undefined, "optional">;
        revoked: import("convex/values").VBoolean<boolean, "required">;
    }, "required", "projectId" | "name" | "keyHash" | "permissions" | "rateLimitOverride" | "lastUsedAt" | "expiresAt" | "revoked" | "rateLimitOverride.requestsPerWindow" | "rateLimitOverride.windowMs">, {
        by_key: ["keyHash", "_creationTime"];
        by_project: ["projectId", "revoked", "_creationTime"];
    }, {}, {}>;
    rateLimitTokens: import("convex/server").TableDefinition<import("convex/values").VObject<{
        keyHash: string;
        windowStart: number;
        tokenCount: number;
    }, {
        keyHash: import("convex/values").VString<string, "required">;
        windowStart: import("convex/values").VFloat64<number, "required">;
        tokenCount: import("convex/values").VFloat64<number, "required">;
    }, "required", "keyHash" | "windowStart" | "tokenCount">, {
        by_key_window: ["keyHash", "windowStart", "_creationTime"];
    }, {}, {}>;
}, true>;
export default _default;
//# sourceMappingURL=schema.d.ts.map