export declare const createApiKey: import("convex/server").RegisteredMutation<"public", {
    rateLimitOverride?: {
        requestsPerWindow: number;
        windowMs: number;
    } | undefined;
    expiresAt?: number | undefined;
    projectId: string;
    name: string;
    permissions: string[];
}, Promise<{
    key: string;
    keyHash: string;
}>>;
export declare const revokeApiKey: import("convex/server").RegisteredMutation<"public", {
    keyHash: string;
}, Promise<null>>;
export declare const consumeRateLimit: import("convex/server").RegisteredMutation<"public", {
    requestsPerWindow: number;
    windowMs: number;
    keyHash: string;
}, Promise<{
    allowed: boolean;
    remaining: number;
    retryAfterMs: number;
}>>;
export declare const cleanupRateLimitTokens: import("convex/server").RegisteredMutation<"internal", {}, Promise<{
    deleted: number;
}>>;
//# sourceMappingURL=apiKeyMutations.d.ts.map