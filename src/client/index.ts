import type {
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { api } from "../component/_generated/api.js";

import { computeChecksum } from "../component/checksum.js";
import type {
  Memory,
  MemoryType,
  Scope,
  ToolFormat,
  ContextBundle,
  ExportedFile,
  ImportResult,
  MemoryHistoryEntry,
  MemoryFeedbackEntry,
  MemoryRelation,
  FeedbackSentiment,
  IngestResult,
  ApiKeyInfo,
  ApiKeyCreateResult,
} from "../shared.js";

export type {
  Memory,
  MemoryType,
  Scope,
  ToolFormat,
  ContextBundle,
  ExportedFile,
  ImportResult,
  MemoryHistoryEntry,
  MemoryFeedbackEntry,
  MemoryRelation,
  FeedbackSentiment,
  IngestResult,
  ApiKeyInfo,
  ApiKeyCreateResult,
};

// ── Types ───────────────────────────────────────────────────────────

type QueryCtx = GenericQueryCtx<GenericDataModel>;
type MutationCtx = GenericMutationCtx<GenericDataModel>;
type ActionCtx = GenericActionCtx<GenericDataModel>;

type ComponentApi = typeof api;

export interface AgentMemoryConfig {
  projectId: string;
  defaultScope?: Scope;
  userId?: string;
  agentId?: string;
  sessionId?: string;
  embeddingApiKey?: string;
  embeddingModel?: string;
  llmApiKey?: string;
  llmModel?: string;
  llmBaseUrl?: string;
}

// ── Client class ────────────────────────────────────────────────────

export class AgentMemory {
  public component: ComponentApi;
  public config: AgentMemoryConfig;

  constructor(component: ComponentApi, config: AgentMemoryConfig) {
    this.component = component;
    this.config = config;
  }

  // ── Read operations (query context) ─────────────────────────────

  async list(
    ctx: QueryCtx,
    opts?: {
      memoryType?: MemoryType;
      scope?: Scope;
      agentId?: string;
      sessionId?: string;
      source?: string;
      tags?: string[];
      minPriority?: number;
      archived?: boolean;
      createdAfter?: number;
      createdBefore?: number;
      limit?: number;
    },
  ): Promise<Memory[]> {
    return (await ctx.runQuery(this.component.queries.list, {
      projectId: this.config.projectId,
      scope: opts?.scope ?? this.config.defaultScope,
      userId: this.config.userId,
      agentId: opts?.agentId ?? this.config.agentId,
      sessionId: opts?.sessionId ?? this.config.sessionId,
      memoryType: opts?.memoryType,
      source: opts?.source,
      tags: opts?.tags,
      archived: opts?.archived,
      minPriority: opts?.minPriority,
      createdAfter: opts?.createdAfter,
      createdBefore: opts?.createdBefore,
      limit: opts?.limit,
    })) as Memory[];
  }

  async get(ctx: QueryCtx, memoryId: string): Promise<Memory | null> {
    return (await ctx.runQuery(this.component.queries.get, {
      memoryId,
    })) as Memory | null;
  }

  async search(
    ctx: QueryCtx,
    query: string,
    opts?: {
      memoryType?: MemoryType;
      scope?: Scope;
      limit?: number;
    },
  ): Promise<Memory[]> {
    return (await ctx.runQuery(this.component.queries.search, {
      projectId: this.config.projectId,
      query,
      memoryType: opts?.memoryType,
      scope: opts?.scope,
      limit: opts?.limit,
    })) as Memory[];
  }

  async getContextBundle(
    ctx: QueryCtx,
    opts?: {
      activePaths?: string[];
      maxTokens?: number;
      agentId?: string;
    },
  ): Promise<ContextBundle> {
    return (await ctx.runQuery(this.component.queries.getContextBundle, {
      projectId: this.config.projectId,
      scope: this.config.defaultScope ?? "project",
      userId: this.config.userId,
      agentId: opts?.agentId ?? this.config.agentId,
      activePaths: opts?.activePaths,
      maxTokens: opts?.maxTokens,
    })) as ContextBundle;
  }

  async exportForTool(
    ctx: QueryCtx,
    format: ToolFormat,
    opts?: {
      since?: number;
    },
  ): Promise<ExportedFile[]> {
    return (await ctx.runQuery(this.component.queries.exportForTool, {
      projectId: this.config.projectId,
      format,
      scope: this.config.defaultScope,
      userId: this.config.userId,
      since: opts?.since,
    })) as ExportedFile[];
  }

  // ── History & audit trail (query context) ──────────────────────

  async history(
    ctx: QueryCtx,
    memoryId: string,
    opts?: { limit?: number },
  ): Promise<MemoryHistoryEntry[]> {
    return (await ctx.runQuery(this.component.queries.history, {
      memoryId,
      limit: opts?.limit,
    })) as MemoryHistoryEntry[];
  }

  async projectHistory(
    ctx: QueryCtx,
    opts?: { limit?: number },
  ): Promise<MemoryHistoryEntry[]> {
    return (await ctx.runQuery(this.component.queries.projectHistory, {
      projectId: this.config.projectId,
      limit: opts?.limit,
    })) as MemoryHistoryEntry[];
  }

  // ── Feedback (query + mutation context) ────────────────────────

  async getFeedback(
    ctx: QueryCtx,
    memoryId: string,
    opts?: { limit?: number },
  ): Promise<MemoryFeedbackEntry[]> {
    return (await ctx.runQuery(this.component.queries.getFeedback, {
      memoryId,
      limit: opts?.limit,
    })) as MemoryFeedbackEntry[];
  }

  async addFeedback(
    ctx: MutationCtx,
    memoryId: string,
    sentiment: FeedbackSentiment,
    opts?: { comment?: string; actor?: string },
  ): Promise<void> {
    await ctx.runMutation(this.component.mutations.addFeedback, {
      memoryId,
      sentiment,
      comment: opts?.comment,
      actor: opts?.actor ?? this.config.agentId ?? this.config.userId ?? "unknown",
    });
  }

  // ── Relations / graph (query + mutation context) ───────────────

  async getRelations(
    ctx: QueryCtx,
    memoryId: string,
    opts?: {
      direction?: "from" | "to" | "both";
      relationship?: string;
      limit?: number;
    },
  ): Promise<MemoryRelation[]> {
    return (await ctx.runQuery(this.component.queries.getRelations, {
      memoryId,
      direction: opts?.direction,
      relationship: opts?.relationship,
      limit: opts?.limit,
    })) as MemoryRelation[];
  }

  async addRelation(
    ctx: MutationCtx,
    fromMemoryId: string,
    toMemoryId: string,
    relationship: string,
    opts?: { confidence?: number; createdBy?: string },
  ): Promise<string> {
    return await ctx.runMutation(this.component.mutations.addRelation, {
      projectId: this.config.projectId,
      fromMemoryId,
      toMemoryId,
      relationship,
      metadata: opts
        ? { confidence: opts.confidence, createdBy: opts.createdBy }
        : undefined,
    });
  }

  async removeRelation(ctx: MutationCtx, relationId: string): Promise<void> {
    await ctx.runMutation(this.component.mutations.removeRelation, {
      relationId,
    });
  }

  // ── Write operations (mutation context) ─────────────────────────

  async remember(
    ctx: MutationCtx,
    memory: {
      title: string;
      content: string;
      memoryType: MemoryType;
      tags?: string[];
      paths?: string[];
      priority?: number;
      source?: string;
      agentId?: string;
      sessionId?: string;
    },
  ): Promise<string> {
    return await ctx.runMutation(this.component.mutations.create, {
      projectId: this.config.projectId,
      scope: this.config.defaultScope ?? "project",
      userId: this.config.userId,
      agentId: memory.agentId ?? this.config.agentId,
      sessionId: memory.sessionId ?? this.config.sessionId,
      ...memory,
    });
  }

  async update(
    ctx: MutationCtx,
    memoryId: string,
    updates: {
      content?: string;
      title?: string;
      tags?: string[];
      paths?: string[];
      priority?: number;
      memoryType?: MemoryType;
    },
  ): Promise<void> {
    await ctx.runMutation(this.component.mutations.update, {
      memoryId,
      actor: this.config.agentId ?? this.config.userId,
      ...updates,
    });
  }

  async forget(ctx: MutationCtx, memoryId: string): Promise<void> {
    await ctx.runMutation(this.component.mutations.archive, {
      memoryId,
      actor: this.config.agentId ?? this.config.userId,
    });
  }

  async restore(ctx: MutationCtx, memoryId: string): Promise<void> {
    await ctx.runMutation(this.component.mutations.restore, {
      memoryId,
      actor: this.config.agentId ?? this.config.userId,
    });
  }

  // ── Batch operations (mutation context) ────────────────────────

  async batchArchive(
    ctx: MutationCtx,
    memoryIds: string[],
  ): Promise<{ archived: number; failed: number }> {
    return await ctx.runMutation(this.component.mutations.batchArchive, {
      memoryIds,
      actor: this.config.agentId ?? this.config.userId,
    });
  }

  async batchUpdate(
    ctx: MutationCtx,
    updates: Array<{
      memoryId: string;
      content?: string;
      title?: string;
      tags?: string[];
      paths?: string[];
      priority?: number;
      memoryType?: MemoryType;
    }>,
  ): Promise<{ updated: number; failed: number }> {
    return await ctx.runMutation(this.component.mutations.batchUpdate, {
      updates,
      actor: this.config.agentId ?? this.config.userId,
    });
  }

  // ── Access tracking (mutation context) ─────────────────────────

  async recordAccess(
    ctx: MutationCtx,
    memoryIds: string[],
  ): Promise<void> {
    await ctx.runMutation(this.component.mutations.recordAccess, {
      memoryIds,
    });
  }

  // ── Import operations (mutation context) ───────────────────────

  async importLocal(
    ctx: MutationCtx,
    memories: Array<{
      title: string;
      content: string;
      memoryType: MemoryType;
      scope: Scope;
      tags: string[];
      paths?: string[];
      priority?: number;
      source: string;
      checksum: string;
    }>,
  ): Promise<ImportResult> {
    return (await ctx.runMutation(this.component.mutations.importFromLocal, {
      projectId: this.config.projectId,
      userId: this.config.userId,
      memories,
    })) as ImportResult;
  }

  // ── Type ingestion (mutation context) ──────────────────────────

  async ingestTypes(
    ctx: MutationCtx,
    typeMemories: Array<{
      title: string;
      content: string;
      tags?: string[];
      paths?: string[];
      priority?: number;
    }>,
  ): Promise<ImportResult> {
    const memories = typeMemories.map((m) => ({
      title: m.title.startsWith("types/") ? m.title : `types/${m.title}`,
      content: m.content,
      memoryType: "reference" as const,
      scope: (this.config.defaultScope ?? "project") as Scope,
      tags: ["typescript", "types", "auto-generated", ...(m.tags ?? [])],
      paths: m.paths,
      priority: m.priority ?? 0.6,
      source: "ingest-types",
      checksum: computeChecksum(m.content),
    }));
    return this.importLocal(ctx, memories);
  }

  // ── Embedding operations (action context) ─────────────────────

  async embed(ctx: ActionCtx, memoryId: string): Promise<void> {
    const apiKey = this.config.embeddingApiKey;
    if (!apiKey) throw new Error("embeddingApiKey is required for embed()");

    await ctx.runAction(this.component.actions.generateEmbedding, {
      memoryId,
      embeddingApiKey: apiKey,
      model: this.config.embeddingModel,
    });
  }

  async embedAll(
    ctx: ActionCtx,
  ): Promise<{ embedded: number; skipped: number }> {
    const apiKey = this.config.embeddingApiKey;
    if (!apiKey) throw new Error("embeddingApiKey is required for embedAll()");

    return await ctx.runAction(this.component.actions.embedAll, {
      projectId: this.config.projectId,
      embeddingApiKey: apiKey,
      model: this.config.embeddingModel,
    });
  }

  async semanticSearch(
    ctx: ActionCtx,
    query: string,
    opts?: { limit?: number },
  ): Promise<Memory[]> {
    return (await ctx.runAction(this.component.actions.semanticSearch, {
      projectId: this.config.projectId,
      query,
      embeddingApiKey: this.config.embeddingApiKey,
      limit: opts?.limit,
    })) as Memory[];
  }

  // ── Intelligent ingest (action context) ───────────────────────

  async ingest(
    ctx: ActionCtx,
    content: string,
    opts?: {
      scope?: Scope;
      agentId?: string;
      sessionId?: string;
      customExtractionPrompt?: string;
      customUpdatePrompt?: string;
    },
  ): Promise<IngestResult> {
    const llmApiKey = this.config.llmApiKey;
    if (!llmApiKey) throw new Error("llmApiKey is required for ingest()");

    return (await ctx.runAction(this.component.actions.ingest, {
      projectId: this.config.projectId,
      content,
      scope: opts?.scope ?? this.config.defaultScope,
      userId: this.config.userId,
      agentId: opts?.agentId ?? this.config.agentId,
      sessionId: opts?.sessionId ?? this.config.sessionId,
      llmApiKey,
      llmModel: this.config.llmModel,
      llmBaseUrl: this.config.llmBaseUrl,
      embeddingApiKey: this.config.embeddingApiKey,
      customExtractionPrompt: opts?.customExtractionPrompt,
      customUpdatePrompt: opts?.customUpdatePrompt,
    })) as IngestResult;
  }

  // ── API key management (mutation/query context) ──────────────────

  async createApiKey(
    ctx: MutationCtx,
    opts: {
      name: string;
      permissions: string[];
      rateLimitOverride?: {
        requestsPerWindow: number;
        windowMs: number;
      };
      expiresAt?: number;
    },
  ): Promise<ApiKeyCreateResult> {
    return (await ctx.runMutation(
      this.component.apiKeyMutations.createApiKey,
      {
        projectId: this.config.projectId,
        name: opts.name,
        permissions: opts.permissions,
        rateLimitOverride: opts.rateLimitOverride,
        expiresAt: opts.expiresAt,
      },
    )) as ApiKeyCreateResult;
  }

  async revokeApiKey(ctx: MutationCtx, keyHash: string): Promise<void> {
    await ctx.runMutation(this.component.apiKeyMutations.revokeApiKey, {
      keyHash,
    });
  }

  async listApiKeys(ctx: QueryCtx): Promise<ApiKeyInfo[]> {
    return (await ctx.runQuery(this.component.apiKeyQueries.listApiKeys, {
      projectId: this.config.projectId,
    })) as ApiKeyInfo[];
  }
}
