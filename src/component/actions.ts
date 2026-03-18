import { action } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { v } from "convex/values";
import {
  memoryTypeValidator,
  scopeValidator,
} from "./schema.js";

// ── Return validators ───────────────────────────────────────────────

const memoryDocValidator = v.object({
  _id: v.string(),
  _creationTime: v.float64(),
  projectId: v.string(),
  scope: scopeValidator,
  userId: v.optional(v.string()),
  agentId: v.optional(v.string()),
  sessionId: v.optional(v.string()),
  title: v.string(),
  content: v.string(),
  memoryType: memoryTypeValidator,
  tags: v.array(v.string()),
  paths: v.optional(v.array(v.string())),
  priority: v.optional(v.float64()),
  source: v.optional(v.string()),
  lastSyncedAt: v.optional(v.float64()),
  checksum: v.string(),
  archived: v.boolean(),
  embeddingId: v.optional(v.string()),
  accessCount: v.optional(v.float64()),
  lastAccessedAt: v.optional(v.float64()),
  positiveCount: v.optional(v.float64()),
  negativeCount: v.optional(v.float64()),
});

const ingestEventValidator = v.union(
  v.literal("added"),
  v.literal("updated"),
  v.literal("deleted"),
  v.literal("skipped"),
);

// ── generateEmbedding ───────────────────────────────────────────────

export const generateEmbedding = action({
  args: {
    memoryId: v.string(),
    embeddingApiKey: v.string(),
    model: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const model = args.model ?? "text-embedding-3-small";

    const memory = await ctx.runQuery(internal.queries.get, {
      memoryId: args.memoryId,
    });
    if (!memory) throw new Error(`Memory not found: ${args.memoryId}`);

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.embeddingApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: `${memory.title}\n\n${memory.content}`,
        model,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Embedding API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };
    const embedding = data.data[0].embedding;

    await ctx.runMutation(internal.mutations.storeEmbedding, {
      memoryId: args.memoryId,
      embedding,
      model,
      dimensions: embedding.length,
    });

    return null;
  },
});

// ── semanticSearch ──────────────────────────────────────────────────

export const semanticSearch = action({
  args: {
    projectId: v.string(),
    query: v.string(),
    embeddingApiKey: v.optional(v.string()),
    limit: v.optional(v.float64()),
  },
  returns: v.array(memoryDocValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    if (!args.embeddingApiKey) {
      return await ctx.runQuery(internal.queries.search, {
        projectId: args.projectId,
        query: args.query,
        limit,
      });
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.embeddingApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: args.query,
        model: "text-embedding-3-small",
      }),
    });

    if (!response.ok) {
      return await ctx.runQuery(internal.queries.search, {
        projectId: args.projectId,
        query: args.query,
        limit,
      });
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };
    const queryEmbedding = data.data[0].embedding;

    const vectorResults = await ctx.vectorSearch("embeddings", "by_embedding", {
      vector: queryEmbedding,
      limit: limit * 2,
    });

    const memories = [];
    for (const result of vectorResults) {
      const embedding = await ctx.runQuery(internal.queries.getEmbeddingMemory, {
        embeddingId: result._id as unknown as string,
      });
      if (
        embedding &&
        embedding.projectId === args.projectId &&
        !embedding.archived
      ) {
        memories.push(embedding);
        if (memories.length >= limit) break;
      }
    }

    return memories;
  },
});

// ── embedAll ────────────────────────────────────────────────────────

export const embedAll = action({
  args: {
    projectId: v.string(),
    embeddingApiKey: v.string(),
    model: v.optional(v.string()),
  },
  returns: v.object({
    embedded: v.float64(),
    skipped: v.float64(),
  }),
  handler: async (ctx, args) => {
    const memories = await ctx.runQuery(internal.queries.listUnembedded, {
      projectId: args.projectId,
    });

    let embedded = 0;
    let skipped = 0;

    for (const memory of memories) {
      try {
        await ctx.runAction(internal.actions.generateEmbedding, {
          memoryId: memory._id,
          embeddingApiKey: args.embeddingApiKey,
          model: args.model,
        });
        embedded++;
      } catch {
        skipped++;
      }
    }

    return { embedded, skipped };
  },
});

// ── ingest (intelligent memory pipeline) ────────────────────────────
//
// This is the core "smart memory" feature inspired by mem0.
// It takes raw text (conversations, notes, etc.) and:
// 1. Extracts discrete facts/learnings via LLM
// 2. Searches existing memories for overlap
// 3. Decides per-fact: ADD, UPDATE, DELETE, or SKIP
// 4. Returns a structured changelog

export const ingest = action({
  args: {
    projectId: v.string(),
    content: v.string(), // raw text to extract memories from
    scope: v.optional(scopeValidator),
    userId: v.optional(v.string()),
    agentId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    llmApiKey: v.string(), // OpenAI-compatible API key
    llmModel: v.optional(v.string()),
    llmBaseUrl: v.optional(v.string()),
    embeddingApiKey: v.optional(v.string()),
    customExtractionPrompt: v.optional(v.string()),
    customUpdatePrompt: v.optional(v.string()),
  },
  returns: v.object({
    results: v.array(
      v.object({
        memoryId: v.string(),
        content: v.string(),
        event: ingestEventValidator,
        previousContent: v.optional(v.string()),
      }),
    ),
    totalProcessed: v.float64(),
  }),
  handler: async (ctx, args) => {
    const scope = args.scope ?? "project";
    const llmModel = args.llmModel ?? "gpt-4.1-nano";
    const llmBaseUrl = args.llmBaseUrl ?? "https://api.openai.com/v1";

    // Load project settings for custom prompts
    const projectSettings = await ctx.runQuery(
      internal.queries.getProjectSettings,
      { projectId: args.projectId },
    );

    const extractionPrompt =
      args.customExtractionPrompt ??
      projectSettings?.settings.factExtractionPrompt ??
      DEFAULT_EXTRACTION_PROMPT;

    const updatePrompt =
      args.customUpdatePrompt ??
      projectSettings?.settings.updateDecisionPrompt ??
      DEFAULT_UPDATE_PROMPT;

    // Step 1: Extract facts from input via LLM
    const facts = await extractFacts(
      args.content,
      extractionPrompt,
      args.llmApiKey,
      llmModel,
      llmBaseUrl,
    );

    if (facts.length === 0) {
      return { results: [], totalProcessed: 0 };
    }

    // Step 2: Load existing memories for dedup comparison
    const existingMemories = await ctx.runQuery(
      internal.queries.listForIngest,
      { projectId: args.projectId, limit: 200 },
    );

    // Step 3: For each fact, decide action via LLM
    const decisions = await decideActions(
      facts,
      existingMemories,
      updatePrompt,
      args.llmApiKey,
      llmModel,
      llmBaseUrl,
    );

    // Step 4: Execute decisions
    const results: Array<{
      memoryId: string;
      content: string;
      event: "added" | "updated" | "deleted" | "skipped";
      previousContent?: string;
    }> = [];

    for (const decision of decisions) {
      switch (decision.action) {
        case "ADD": {
          const memoryId = await ctx.runMutation(
            internal.mutations.ingestCreateMemory,
            {
              projectId: args.projectId,
              scope,
              userId: args.userId,
              agentId: args.agentId,
              sessionId: args.sessionId,
              title: decision.title,
              content: decision.content,
              memoryType: decision.memoryType ?? "learning",
              tags: decision.tags ?? [],
              source: "ingest",
            },
          );

          // Generate embedding if API key available
          if (args.embeddingApiKey) {
            try {
              await ctx.runAction(internal.actions.generateEmbedding, {
                memoryId,
                embeddingApiKey: args.embeddingApiKey,
              });
            } catch {
              // Non-fatal: embedding generation failure shouldn't block ingest
            }
          }

          results.push({
            memoryId,
            content: decision.content,
            event: "added",
          });
          break;
        }

        case "UPDATE": {
          if (!decision.existingMemoryId) break;
          const existing = existingMemories.find(
            (m: any) => m._id === decision.existingMemoryId,
          );

          await ctx.runMutation(internal.mutations.ingestUpdateMemory, {
            memoryId: decision.existingMemoryId,
            content: decision.content,
          });

          results.push({
            memoryId: decision.existingMemoryId,
            content: decision.content,
            event: "updated",
            previousContent: existing?.content,
          });
          break;
        }

        case "DELETE": {
          if (!decision.existingMemoryId) break;
          const deletedMemory = existingMemories.find(
            (m: any) => m._id === decision.existingMemoryId,
          );

          await ctx.runMutation(internal.mutations.ingestDeleteMemory, {
            memoryId: decision.existingMemoryId,
          });

          results.push({
            memoryId: decision.existingMemoryId,
            content: deletedMemory?.content ?? "",
            event: "deleted",
            previousContent: deletedMemory?.content,
          });
          break;
        }

        default:
          results.push({
            memoryId: "",
            content: decision.content,
            event: "skipped",
          });
      }
    }

    return { results, totalProcessed: facts.length };
  },
});

// ── LLM helpers for ingest pipeline ─────────────────────────────────

const DEFAULT_EXTRACTION_PROMPT = `You are a memory extraction system. Extract discrete, actionable facts from the following text.

Rules:
- Each fact should be a single, self-contained piece of information
- Include preferences, decisions, corrections, patterns, and learnings
- Exclude trivial or ephemeral information (greetings, acknowledgments)
- Return facts as a JSON array of strings
- Each fact should be 1-3 sentences maximum

Return ONLY a JSON array of strings, no other text.`;

const DEFAULT_UPDATE_PROMPT = `You are a memory management system. Given new facts and existing memories, decide what to do with each new fact.

For each new fact, return one of:
- ADD: Create a new memory (no existing memory covers this)
- UPDATE: Merge with an existing memory (specify which one by ID and provide merged content)
- DELETE: Remove an existing memory because the new fact contradicts/invalidates it
- NONE: Skip this fact (already covered by existing memories)

Also assign each ADD/UPDATE a:
- title: short descriptive title (2-6 words)
- memoryType: one of "instruction", "learning", "reference", "feedback", "journal"
- tags: relevant tags as array of strings

Return a JSON array of decision objects.`;

interface IngestDecision {
  action: "ADD" | "UPDATE" | "DELETE" | "NONE";
  content: string;
  title: string;
  existingMemoryId?: string;
  memoryType?: string;
  tags?: string[];
}

async function callLLM(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  model: string,
  baseUrl: string,
): Promise<string> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LLM API error: ${response.status} ${error}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0].message.content;
}

function extractJson(text: string): string {
  // Strip markdown code fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  // Strip <think> tags
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  // Try to find JSON array or object
  const jsonMatch = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  return jsonMatch ? jsonMatch[1] : cleaned;
}

async function extractFacts(
  content: string,
  prompt: string,
  apiKey: string,
  model: string,
  baseUrl: string,
): Promise<string[]> {
  const response = await callLLM(
    [
      { role: "system", content: prompt },
      { role: "user", content },
    ],
    apiKey,
    model,
    baseUrl,
  );

  try {
    const parsed = JSON.parse(extractJson(response));
    if (Array.isArray(parsed)) {
      return parsed.map((item: unknown) =>
        typeof item === "string" ? item : JSON.stringify(item),
      );
    }
    return [];
  } catch {
    return [];
  }
}

async function decideActions(
  facts: string[],
  existingMemories: Array<{
    _id: string;
    title: string;
    content: string;
    memoryType: string;
  }>,
  prompt: string,
  apiKey: string,
  model: string,
  baseUrl: string,
): Promise<IngestDecision[]> {
  const existingStr = existingMemories
    .map(
      (m) =>
        `[ID: ${m._id}] [${m.memoryType}] ${m.title}: ${m.content.slice(0, 200)}`,
    )
    .join("\n");

  const factsStr = facts.map((f, i) => `${i + 1}. ${f}`).join("\n");

  const userMessage = `## Existing Memories\n${existingStr || "(none)"}\n\n## New Facts\n${factsStr}`;

  const response = await callLLM(
    [
      { role: "system", content: prompt },
      { role: "user", content: userMessage },
    ],
    apiKey,
    model,
    baseUrl,
  );

  try {
    const parsed = JSON.parse(extractJson(response));
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (d: any) =>
          d && typeof d === "object" && d.action && d.content,
      )
      .map((d: any) => ({
        action: d.action as "ADD" | "UPDATE" | "DELETE" | "NONE",
        content: String(d.content),
        title: String(d.title ?? "untitled"),
        existingMemoryId: d.existingMemoryId
          ? String(d.existingMemoryId)
          : undefined,
        memoryType: d.memoryType ? String(d.memoryType) : undefined,
        tags: Array.isArray(d.tags) ? d.tags.map(String) : undefined,
      }));
  } catch {
    // If LLM returns unparseable response, treat all facts as ADDs
    return facts.map((f, i) => ({
      action: "ADD" as const,
      content: f,
      title: `fact-${i + 1}`,
      memoryType: "learning",
      tags: [],
    }));
  }
}
