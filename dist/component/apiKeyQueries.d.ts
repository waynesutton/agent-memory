export declare const validateApiKey: import("convex/server").RegisteredQuery<"public", {
    key: string;
}, Promise<{
    valid: false;
    reason: string;
    keyHash?: undefined;
    projectId?: undefined;
    permissions?: undefined;
    rateLimit?: undefined;
} | {
    valid: true;
    keyHash: string;
    projectId: any;
    permissions: any;
    rateLimit: {
        requestsPerWindow: number;
        windowMs: number;
    };
    reason?: undefined;
}>>;
export declare const listApiKeys: import("convex/server").RegisteredQuery<"public", {
    projectId: string;
}, Promise<{
    _id: string;
    keyHash: any;
    projectId: any;
    name: any;
    permissions: any;
    rateLimitOverride: any;
    lastUsedAt: any;
    expiresAt: any;
    revoked: any;
}[]>>;
export declare const updateKeyLastUsed: import("convex/server").RegisteredMutation<"public", {
    keyHash: string;
}, Promise<null>>;
//# sourceMappingURL=apiKeyQueries.d.ts.map