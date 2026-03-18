import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { AgentMemory } from "../../src/client/index.js";

const memory = new AgentMemory(components.agentMemory, {
  projectId: "example-app",
  defaultScope: "project",
});

// ── Public mutations ────────────────────────────────────────────────

export const remember = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    memoryType: v.union(
      v.literal("instruction"),
      v.literal("learning"),
      v.literal("reference"),
      v.literal("feedback"),
      v.literal("journal"),
    ),
    tags: v.optional(v.array(v.string())),
    paths: v.optional(v.array(v.string())),
    priority: v.optional(v.float64()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    return await memory.remember(ctx, {
      title: args.title,
      content: args.content,
      memoryType: args.memoryType,
      tags: args.tags,
      paths: args.paths,
      priority: args.priority,
      source: "example-app",
    });
  },
});

export const forget = mutation({
  args: { memoryId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await memory.forget(ctx, args.memoryId);
    return null;
  },
});

// ── Public queries ──────────────────────────────────────────────────

export const listMemories = query({
  args: {
    memoryType: v.optional(
      v.union(
        v.literal("instruction"),
        v.literal("learning"),
        v.literal("reference"),
        v.literal("feedback"),
        v.literal("journal"),
      ),
    ),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await memory.list(ctx, {
      memoryType: args.memoryType,
    });
  },
});

export const recall = query({
  args: { q: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await memory.search(ctx, args.q);
  },
});

export const getContext = query({
  args: {
    activePaths: v.optional(v.array(v.string())),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await memory.getContextBundle(ctx, {
      activePaths: args.activePaths,
    });
  },
});

// ── Type ingestion ──────────────────────────────────────────────────

export const ingestTypes = mutation({
  args: {
    types: v.array(
      v.object({
        title: v.string(),
        content: v.string(),
        tags: v.optional(v.array(v.string())),
        paths: v.optional(v.array(v.string())),
        priority: v.optional(v.float64()),
      }),
    ),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await memory.ingestTypes(ctx, args.types);
  },
});

// ── Actions (for vector search) ─────────────────────────────────────

export const semanticRecall = action({
  args: {
    q: v.string(),
    embeddingApiKey: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    // Create a memory instance with the API key for this request
    const memWithKey = new AgentMemory(components.agentMemory, {
      ...memory.config,
      embeddingApiKey: args.embeddingApiKey,
    });
    return await memWithKey.semanticSearch(ctx, args.q);
  },
});
