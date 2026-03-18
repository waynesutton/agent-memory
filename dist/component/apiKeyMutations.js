import { mutation } from "./_generated/server.js";
import { v } from "convex/values";
// ── Hash helper ─────────────────────────────────────────────────────
// Simple FNV-1a based hash for API key storage.
// We use the same checksum function as the rest of the component
// for consistency. For API keys the security model is "bearer token
// stored in database" — the hash prevents plaintext key exposure
// if the database is inspected, but the real security boundary is
// Convex's deployment isolation.
function hashKey(key) {
    let hash = 2166136261;
    for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
}
function generateKey() {
    // Generate a URL-safe random key with "am_" prefix
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "am_";
    for (let i = 0; i < 40; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}
// ── createApiKey ────────────────────────────────────────────────────
export const createApiKey = mutation({
    args: {
        projectId: v.string(),
        name: v.string(),
        permissions: v.array(v.string()),
        rateLimitOverride: v.optional(v.object({
            requestsPerWindow: v.float64(),
            windowMs: v.float64(),
        })),
        expiresAt: v.optional(v.float64()),
    },
    returns: v.object({
        key: v.string(), // plaintext key — only returned once
        keyHash: v.string(),
    }),
    handler: async (ctx, args) => {
        const key = generateKey();
        const keyHash = hashKey(key);
        await ctx.db.insert("apiKeys", {
            keyHash,
            projectId: args.projectId,
            name: args.name,
            permissions: args.permissions,
            rateLimitOverride: args.rateLimitOverride,
            expiresAt: args.expiresAt,
            revoked: false,
        });
        return { key, keyHash };
    },
});
// ── revokeApiKey ────────────────────────────────────────────────────
export const revokeApiKey = mutation({
    args: {
        keyHash: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("apiKeys")
            .withIndex("by_key", (q) => q.eq("keyHash", args.keyHash))
            .first();
        if (!existing)
            throw new Error(`API key not found: ${args.keyHash}`);
        await ctx.db.patch(existing._id, { revoked: true });
        return null;
    },
});
// ── consumeRateLimit ────────────────────────────────────────────────
// Atomically checks and increments the rate limit counter.
// Returns whether the request is allowed and how many tokens remain.
export const consumeRateLimit = mutation({
    args: {
        keyHash: v.string(),
        requestsPerWindow: v.float64(),
        windowMs: v.float64(),
    },
    returns: v.object({
        allowed: v.boolean(),
        remaining: v.float64(),
        retryAfterMs: v.float64(),
    }),
    handler: async (ctx, args) => {
        const now = Date.now();
        const windowStart = Math.floor(now / args.windowMs) * args.windowMs;
        // Look for existing token record for this window
        const existing = await ctx.db
            .query("rateLimitTokens")
            .withIndex("by_key_window", (q) => q.eq("keyHash", args.keyHash).eq("windowStart", windowStart))
            .first();
        if (!existing) {
            // First request in this window
            await ctx.db.insert("rateLimitTokens", {
                keyHash: args.keyHash,
                windowStart,
                tokenCount: 1,
            });
            return {
                allowed: true,
                remaining: args.requestsPerWindow - 1,
                retryAfterMs: 0,
            };
        }
        if (existing.tokenCount >= args.requestsPerWindow) {
            // Rate limited
            const windowEnd = windowStart + args.windowMs;
            return {
                allowed: false,
                remaining: 0,
                retryAfterMs: windowEnd - now,
            };
        }
        // Consume a token
        await ctx.db.patch(existing._id, {
            tokenCount: existing.tokenCount + 1,
        });
        return {
            allowed: true,
            remaining: args.requestsPerWindow - existing.tokenCount - 1,
            retryAfterMs: 0,
        };
    },
});
// ── cleanupRateLimitTokens (internal, used by cron) ─────────────────
import { internalMutation } from "./_generated/server.js";
export const cleanupRateLimitTokens = internalMutation({
    args: {},
    returns: v.object({ deleted: v.float64() }),
    handler: async (ctx) => {
        // Delete token records older than 1 hour (well past any window)
        const cutoff = Date.now() - 60 * 60 * 1000;
        const old = await ctx.db.query("rateLimitTokens").take(500);
        let deleted = 0;
        for (const record of old) {
            if (record.windowStart < cutoff) {
                await ctx.db.delete(record._id);
                deleted++;
            }
        }
        return { deleted };
    },
});
//# sourceMappingURL=apiKeyMutations.js.map