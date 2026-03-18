import { query } from "./_generated/server.js";
import { v } from "convex/values";

// ── Hash helper (same as in apiKeyMutations.ts) ─────────────────────

function hashKey(key: string): string {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

// ── validateApiKey ──────────────────────────────────────────────────
// Called by HTTP handlers to verify an API key and get its permissions.

export const validateApiKey = query({
  args: {
    key: v.string(), // plaintext key from Authorization header
  },
  returns: v.union(
    v.object({
      valid: v.literal(true),
      keyHash: v.string(),
      projectId: v.string(),
      permissions: v.array(v.string()),
      rateLimit: v.object({
        requestsPerWindow: v.float64(),
        windowMs: v.float64(),
      }),
    }),
    v.object({
      valid: v.literal(false),
      reason: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const keyHash = hashKey(args.key);

    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q: any) => q.eq("keyHash", keyHash))
      .first();

    if (!apiKey) {
      return { valid: false as const, reason: "Invalid API key" };
    }

    if (apiKey.revoked) {
      return { valid: false as const, reason: "API key has been revoked" };
    }

    if (apiKey.expiresAt && apiKey.expiresAt < Date.now()) {
      return { valid: false as const, reason: "API key has expired" };
    }

    // Determine rate limit: key override > project setting > global default
    let rateLimit = { requestsPerWindow: 100, windowMs: 60000 };

    if (apiKey.rateLimitOverride) {
      rateLimit = apiKey.rateLimitOverride;
    } else {
      // Check project settings
      const project = await ctx.db
        .query("projects")
        .withIndex("by_projectId", (q: any) =>
          q.eq("projectId", apiKey.projectId),
        )
        .first();

      if (project?.settings.apiRateLimit) {
        rateLimit = project.settings.apiRateLimit;
      }
    }

    return {
      valid: true as const,
      keyHash,
      projectId: apiKey.projectId,
      permissions: apiKey.permissions,
      rateLimit,
    };
  },
});

// ── listApiKeys ─────────────────────────────────────────────────────
// List all API keys for a project (without revealing the key itself).

export const listApiKeys = query({
  args: {
    projectId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.string(),
      keyHash: v.string(),
      projectId: v.string(),
      name: v.string(),
      permissions: v.array(v.string()),
      rateLimitOverride: v.optional(
        v.object({
          requestsPerWindow: v.float64(),
          windowMs: v.float64(),
        }),
      ),
      lastUsedAt: v.optional(v.float64()),
      expiresAt: v.optional(v.float64()),
      revoked: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_project", (q: any) =>
        q.eq("projectId", args.projectId).eq("revoked", false),
      )
      .take(100);

    return keys.map((k) => ({
      _id: k._id as unknown as string,
      keyHash: k.keyHash,
      projectId: k.projectId,
      name: k.name,
      permissions: k.permissions,
      rateLimitOverride: k.rateLimitOverride,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      revoked: k.revoked,
    }));
  },
});

// ── updateKeyLastUsed ───────────────────────────────────────────────
// Update the lastUsedAt timestamp on an API key (fire-and-forget from HTTP handler).

import { mutation } from "./_generated/server.js";

export const updateKeyLastUsed = mutation({
  args: {
    keyHash: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q: any) => q.eq("keyHash", args.keyHash))
      .first();

    if (apiKey) {
      await ctx.db.patch(apiKey._id, { lastUsedAt: Date.now() });
    }

    return null;
  },
});
