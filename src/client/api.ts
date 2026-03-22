/**
 * Factory that returns Convex function definitions for consumers to
 * re-export as public queries, mutations, and actions.
 *
 * Component functions are internal — they cannot be called directly via
 * ConvexHttpClient or from outside the Convex backend. This factory
 * bridges that gap: the consumer wraps each definition with their own
 * `query()` / `mutation()` / `action()` builder, making the functions
 * public and callable by the CLI, MCP server, and external clients.
 *
 * Usage in the consuming app (e.g. `convex/memory.ts`):
 *
 * ```ts
 * import { query, mutation, action } from "./_generated/server";
 * import { components } from "./_generated/api";
 * import { createApi } from "@waynesutton/agent-memory";
 *
 * const api = createApi(components.agentMemory);
 *
 * export const list = query(api.queries.list);
 * export const search = query(api.queries.search);
 * export const create = mutation(api.mutations.create);
 * export const ingest = action(api.actions.ingest);
 * // ... etc
 * ```
 */

import { v } from "convex/values";
import type { AnyApi } from "convex/server";
import {
  memoryTypeValidator,
  scopeValidator,
  toolFormatValidator,
} from "../shared.js";

// ── Local validators (not worth adding to shared.ts) ────────────────

const feedbackSentimentValidator = v.union(
  v.literal("positive"),
  v.literal("negative"),
  v.literal("very_negative"),
);

const directionValidator = v.union(
  v.literal("from"),
  v.literal("to"),
  v.literal("both"),
);

const projectSettingsValidator = v.object({
  autoSync: v.boolean(),
  syncFormats: v.array(v.string()),
  embeddingModel: v.optional(v.string()),
  embeddingDimensions: v.optional(v.float64()),
  factExtractionPrompt: v.optional(v.string()),
  updateDecisionPrompt: v.optional(v.string()),
  decayEnabled: v.optional(v.boolean()),
  decayHalfLifeDays: v.optional(v.float64()),
});

const importMemoryValidator = v.object({
  title: v.string(),
  content: v.string(),
  memoryType: memoryTypeValidator,
  scope: scopeValidator,
  tags: v.array(v.string()),
  paths: v.optional(v.array(v.string())),
  priority: v.optional(v.float64()),
  source: v.string(),
  checksum: v.string(),
});

const relationMetadataValidator = v.object({
  confidence: v.optional(v.float64()),
  createdBy: v.optional(v.string()),
});

// ── Factory ─────────────────────────────────────────────────────────

export function createApi(component: AnyApi) {
  return {
    queries: {
      list: {
        args: {
          projectId: v.string(),
          scope: v.optional(scopeValidator),
          userId: v.optional(v.string()),
          agentId: v.optional(v.string()),
          sessionId: v.optional(v.string()),
          memoryType: v.optional(memoryTypeValidator),
          source: v.optional(v.string()),
          archived: v.optional(v.boolean()),
          minPriority: v.optional(v.float64()),
          tags: v.optional(v.array(v.string())),
          createdAfter: v.optional(v.float64()),
          createdBefore: v.optional(v.float64()),
          limit: v.optional(v.float64()),
        },
        returns: v.any(),
        handler: async (ctx: any, args: any) => {
          return ctx.runQuery(component.queries.list, args);
        },
      },

      get: {
        args: { memoryId: v.string() },
        returns: v.any(),
        handler: async (ctx: any, args: any) => {
          return ctx.runQuery(component.queries.get, args);
        },
      },

      search: {
        args: {
          projectId: v.string(),
          query: v.string(),
          memoryType: v.optional(memoryTypeValidator),
          scope: v.optional(scopeValidator),
          limit: v.optional(v.float64()),
        },
        returns: v.any(),
        handler: async (ctx: any, args: any) => {
          return ctx.runQuery(component.queries.search, args);
        },
      },

      getContextBundle: {
        args: {
          projectId: v.string(),
          scope: scopeValidator,
          userId: v.optional(v.string()),
          agentId: v.optional(v.string()),
          activePaths: v.optional(v.array(v.string())),
          maxTokens: v.optional(v.float64()),
        },
        returns: v.any(),
        handler: async (ctx: any, args: any) => {
          return ctx.runQuery(component.queries.getContextBundle, args);
        },
      },

      history: {
        args: {
          memoryId: v.string(),
          limit: v.optional(v.float64()),
        },
        returns: v.any(),
        handler: async (ctx: any, args: any) => {
          return ctx.runQuery(component.queries.history, args);
        },
      },

      projectHistory: {
        args: {
          projectId: v.string(),
          limit: v.optional(v.float64()),
        },
        returns: v.any(),
        handler: async (ctx: any, args: any) => {
          return ctx.runQuery(component.queries.projectHistory, args);
        },
      },

      getFeedback: {
        args: {
          memoryId: v.string(),
          limit: v.optional(v.float64()),
        },
        returns: v.any(),
        handler: async (ctx: any, args: any) => {
          return ctx.runQuery(component.queries.getFeedback, args);
        },
      },

      getRelations: {
        args: {
          memoryId: v.string(),
          direction: v.optional(directionValidator),
          relationship: v.optional(v.string()),
          limit: v.optional(v.float64()),
        },
        returns: v.any(),
        handler: async (ctx: any, args: any) => {
          return ctx.runQuery(component.queries.getRelations, args);
        },
      },

      exportForTool: {
        args: {
          projectId: v.string(),
          format: toolFormatValidator,
          scope: v.optional(scopeValidator),
          userId: v.optional(v.string()),
          since: v.optional(v.float64()),
        },
        returns: v.any(),
        handler: async (ctx: any, args: any) => {
          return ctx.runQuery(component.queries.exportForTool, args);
        },
      },
    },

    mutations: {
      create: {
        args: {
          projectId: v.string(),
          scope: scopeValidator,
          userId: v.optional(v.string()),
          agentId: v.optional(v.string()),
          sessionId: v.optional(v.string()),
          title: v.string(),
          content: v.string(),
          memoryType: memoryTypeValidator,
          tags: v.optional(v.array(v.string())),
          paths: v.optional(v.array(v.string())),
          priority: v.optional(v.float64()),
          source: v.optional(v.string()),
        },
        returns: v.string(),
        handler: async (ctx: any, args: any) => {
          return ctx.runMutation(component.mutations.create, args);
        },
      },

      update: {
        args: {
          memoryId: v.string(),
          content: v.optional(v.string()),
          title: v.optional(v.string()),
          tags: v.optional(v.array(v.string())),
          paths: v.optional(v.array(v.string())),
          priority: v.optional(v.float64()),
          memoryType: v.optional(memoryTypeValidator),
          actor: v.optional(v.string()),
        },
        returns: v.null(),
        handler: async (ctx: any, args: any) => {
          return ctx.runMutation(component.mutations.update, args);
        },
      },

      archive: {
        args: {
          memoryId: v.string(),
          actor: v.optional(v.string()),
        },
        returns: v.null(),
        handler: async (ctx: any, args: any) => {
          return ctx.runMutation(component.mutations.archive, args);
        },
      },

      restore: {
        args: {
          memoryId: v.string(),
          actor: v.optional(v.string()),
        },
        returns: v.null(),
        handler: async (ctx: any, args: any) => {
          return ctx.runMutation(component.mutations.restore, args);
        },
      },

      batchArchive: {
        args: {
          memoryIds: v.array(v.string()),
          actor: v.optional(v.string()),
        },
        returns: v.any(),
        handler: async (ctx: any, args: any) => {
          return ctx.runMutation(component.mutations.batchArchive, args);
        },
      },

      addFeedback: {
        args: {
          memoryId: v.string(),
          sentiment: feedbackSentimentValidator,
          comment: v.optional(v.string()),
          actor: v.string(),
        },
        returns: v.null(),
        handler: async (ctx: any, args: any) => {
          return ctx.runMutation(component.mutations.addFeedback, args);
        },
      },

      addRelation: {
        args: {
          projectId: v.string(),
          fromMemoryId: v.string(),
          toMemoryId: v.string(),
          relationship: v.string(),
          metadata: v.optional(relationMetadataValidator),
        },
        returns: v.string(),
        handler: async (ctx: any, args: any) => {
          return ctx.runMutation(component.mutations.addRelation, args);
        },
      },

      importFromLocal: {
        args: {
          projectId: v.string(),
          userId: v.optional(v.string()),
          memories: v.array(importMemoryValidator),
        },
        returns: v.any(),
        handler: async (ctx: any, args: any) => {
          return ctx.runMutation(component.mutations.importFromLocal, args);
        },
      },

      upsertProject: {
        args: {
          projectId: v.string(),
          name: v.string(),
          description: v.optional(v.string()),
          settings: v.optional(projectSettingsValidator),
        },
        returns: v.string(),
        handler: async (ctx: any, args: any) => {
          return ctx.runMutation(component.mutations.upsertProject, args);
        },
      },
    },

    actions: {
      ingest: {
        args: {
          projectId: v.string(),
          content: v.string(),
          scope: v.optional(scopeValidator),
          userId: v.optional(v.string()),
          agentId: v.optional(v.string()),
          sessionId: v.optional(v.string()),
          llmApiKey: v.string(),
          llmModel: v.optional(v.string()),
          llmBaseUrl: v.optional(v.string()),
          embeddingApiKey: v.optional(v.string()),
          customExtractionPrompt: v.optional(v.string()),
          customUpdatePrompt: v.optional(v.string()),
        },
        returns: v.any(),
        handler: async (ctx: any, args: any) => {
          return ctx.runAction(component.actions.ingest, args);
        },
      },

      semanticSearch: {
        args: {
          projectId: v.string(),
          query: v.string(),
          embeddingApiKey: v.optional(v.string()),
          limit: v.optional(v.float64()),
        },
        returns: v.any(),
        handler: async (ctx: any, args: any) => {
          return ctx.runAction(component.actions.semanticSearch, args);
        },
      },

      generateEmbedding: {
        args: {
          memoryId: v.string(),
          embeddingApiKey: v.string(),
          model: v.optional(v.string()),
        },
        returns: v.null(),
        handler: async (ctx: any, args: any) => {
          return ctx.runAction(component.actions.generateEmbedding, args);
        },
      },

      embedAll: {
        args: {
          projectId: v.string(),
          embeddingApiKey: v.string(),
          model: v.optional(v.string()),
        },
        returns: v.any(),
        handler: async (ctx: any, args: any) => {
          return ctx.runAction(component.actions.embedAll, args);
        },
      },
    },
  };
}
