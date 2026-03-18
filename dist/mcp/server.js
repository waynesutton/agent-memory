import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { ConvexHttpClient } from "convex/browser";
export async function startMcpServer(config) {
    const client = new ConvexHttpClient(config.convexUrl);
    const server = new Server({
        name: "agent-memory",
        version: "0.1.0",
    }, {
        capabilities: {
            tools: {},
            resources: {},
        },
    });
    const WRITE_TOOLS = [
        "memory_remember",
        "memory_forget",
        "memory_update",
        "memory_restore",
        "memory_feedback",
        "memory_relate",
        "memory_batch_archive",
        "memory_ingest",
    ];
    const isDisabled = (name) => config.disabledTools.includes(name) ||
        (config.readOnly && WRITE_TOOLS.includes(name));
    // ── List Tools ──────────────────────────────────────────────────
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        const allTools = [
            {
                name: "memory_remember",
                description: "Save a new memory for future sessions",
                inputSchema: {
                    type: "object",
                    properties: {
                        title: { type: "string", description: "Short title/slug for the memory" },
                        content: { type: "string", description: "Markdown content of the memory" },
                        memoryType: {
                            type: "string",
                            enum: ["instruction", "learning", "reference", "feedback", "journal"],
                            description: "Type of memory",
                        },
                        tags: { type: "array", items: { type: "string" }, description: "Tags" },
                        priority: { type: "number", minimum: 0, maximum: 1, description: "Priority (0-1, >= 0.8 = pinned)" },
                        agentId: { type: "string", description: "Agent that created this memory" },
                        sessionId: { type: "string", description: "Session/conversation ID" },
                    },
                    required: ["title", "content", "memoryType"],
                },
            },
            {
                name: "memory_recall",
                description: "Search memories by keyword (full-text)",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "Search query" },
                        memoryType: { type: "string", description: "Filter by type" },
                        limit: { type: "number", description: "Max results" },
                    },
                    required: ["query"],
                },
            },
            {
                name: "memory_semantic_recall",
                description: "Search memories by meaning (vector similarity)",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "Search query" },
                        limit: { type: "number", description: "Max results" },
                    },
                    required: ["query"],
                },
            },
            {
                name: "memory_list",
                description: "List all memories with optional filters",
                inputSchema: {
                    type: "object",
                    properties: {
                        memoryType: { type: "string", description: "Filter by type" },
                        minPriority: { type: "number", description: "Minimum priority" },
                        agentId: { type: "string", description: "Filter by agent" },
                        sessionId: { type: "string", description: "Filter by session" },
                        source: { type: "string", description: "Filter by source tool" },
                        tags: { type: "array", items: { type: "string" }, description: "Filter by tags (any match)" },
                        limit: { type: "number", description: "Max results" },
                    },
                },
            },
            {
                name: "memory_context",
                description: "Get context bundle (pinned + relevant memories) for the session",
                inputSchema: {
                    type: "object",
                    properties: {
                        activePaths: {
                            type: "array",
                            items: { type: "string" },
                            description: "Currently open file paths",
                        },
                        maxTokens: { type: "number", description: "Token budget" },
                    },
                },
            },
            {
                name: "memory_forget",
                description: "Archive a memory so it is no longer loaded",
                inputSchema: {
                    type: "object",
                    properties: {
                        memoryId: { type: "string", description: "Memory ID to archive" },
                    },
                    required: ["memoryId"],
                },
            },
            {
                name: "memory_restore",
                description: "Restore a previously archived memory",
                inputSchema: {
                    type: "object",
                    properties: {
                        memoryId: { type: "string", description: "Memory ID to restore" },
                    },
                    required: ["memoryId"],
                },
            },
            {
                name: "memory_update",
                description: "Update an existing memory",
                inputSchema: {
                    type: "object",
                    properties: {
                        memoryId: { type: "string", description: "Memory ID to update" },
                        content: { type: "string", description: "New content" },
                        title: { type: "string", description: "New title" },
                        tags: { type: "array", items: { type: "string" } },
                        priority: { type: "number", minimum: 0, maximum: 1 },
                    },
                    required: ["memoryId"],
                },
            },
            {
                name: "memory_history",
                description: "View the change history of a memory (audit trail)",
                inputSchema: {
                    type: "object",
                    properties: {
                        memoryId: { type: "string", description: "Memory ID" },
                        limit: { type: "number", description: "Max entries" },
                    },
                    required: ["memoryId"],
                },
            },
            {
                name: "memory_feedback",
                description: "Rate a memory as helpful or unhelpful",
                inputSchema: {
                    type: "object",
                    properties: {
                        memoryId: { type: "string", description: "Memory ID to rate" },
                        sentiment: {
                            type: "string",
                            enum: ["positive", "negative", "very_negative"],
                            description: "Feedback sentiment",
                        },
                        comment: { type: "string", description: "Optional comment explaining the rating" },
                    },
                    required: ["memoryId", "sentiment"],
                },
            },
            {
                name: "memory_relate",
                description: "Create a relationship between two memories",
                inputSchema: {
                    type: "object",
                    properties: {
                        fromMemoryId: { type: "string", description: "Source memory ID" },
                        toMemoryId: { type: "string", description: "Target memory ID" },
                        relationship: {
                            type: "string",
                            description: "Type of relationship (e.g. 'contradicts', 'extends', 'replaces', 'related_to')",
                        },
                    },
                    required: ["fromMemoryId", "toMemoryId", "relationship"],
                },
            },
            {
                name: "memory_relations",
                description: "View relationships of a memory (graph connections)",
                inputSchema: {
                    type: "object",
                    properties: {
                        memoryId: { type: "string", description: "Memory ID" },
                        relationship: { type: "string", description: "Filter by relationship type" },
                        direction: { type: "string", enum: ["from", "to", "both"], description: "Direction filter" },
                    },
                    required: ["memoryId"],
                },
            },
            {
                name: "memory_batch_archive",
                description: "Archive multiple memories at once",
                inputSchema: {
                    type: "object",
                    properties: {
                        memoryIds: {
                            type: "array",
                            items: { type: "string" },
                            description: "Memory IDs to archive",
                        },
                    },
                    required: ["memoryIds"],
                },
            },
            {
                name: "memory_ingest",
                description: "Intelligently extract memories from raw text. Uses LLM to extract facts, deduplicates against existing memories, and decides whether to add, update, or skip each fact.",
                inputSchema: {
                    type: "object",
                    properties: {
                        content: { type: "string", description: "Raw text to extract memories from (conversation, notes, etc.)" },
                        agentId: { type: "string", description: "Agent performing the ingest" },
                        sessionId: { type: "string", description: "Session/conversation ID" },
                    },
                    required: ["content"],
                },
            },
        ];
        return {
            tools: allTools.filter((t) => !isDisabled(t.name)),
        };
    });
    // ── Call Tool ───────────────────────────────────────────────────
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        if (isDisabled(name)) {
            return {
                content: [{ type: "text", text: `Tool "${name}" is disabled.` }],
                isError: true,
            };
        }
        try {
            switch (name) {
                case "memory_remember": {
                    const id = await client.mutation("agentMemory/mutations:create", {
                        projectId: config.projectId,
                        scope: "project",
                        title: args.title,
                        content: args.content,
                        memoryType: args.memoryType,
                        tags: args.tags ?? [],
                        priority: args.priority,
                        agentId: args.agentId,
                        sessionId: args.sessionId,
                        source: "mcp",
                    });
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Memory saved: "${args.title}" (${id})`,
                            },
                        ],
                    };
                }
                case "memory_recall": {
                    const results = await client.query("agentMemory/queries:search", {
                        projectId: config.projectId,
                        query: args.query,
                        memoryType: args.memoryType,
                        limit: args.limit ?? 10,
                    });
                    return {
                        content: [{ type: "text", text: formatMemories(results) }],
                    };
                }
                case "memory_semantic_recall": {
                    if (!config.embeddingApiKey) {
                        const results = await client.query("agentMemory/queries:search", {
                            projectId: config.projectId,
                            query: args.query,
                            limit: args.limit ?? 10,
                        });
                        return {
                            content: [{ type: "text", text: formatMemories(results) }],
                        };
                    }
                    // TODO: call semanticSearch action when action client support is available
                    const results = await client.query("agentMemory/queries:search", {
                        projectId: config.projectId,
                        query: args.query,
                        limit: args.limit ?? 10,
                    });
                    return {
                        content: [{ type: "text", text: formatMemories(results) }],
                    };
                }
                case "memory_list": {
                    const list = await client.query("agentMemory/queries:list", {
                        projectId: config.projectId,
                        memoryType: args?.memoryType,
                        minPriority: args?.minPriority,
                        agentId: args?.agentId,
                        sessionId: args?.sessionId,
                        source: args?.source,
                        tags: args?.tags,
                        limit: args?.limit ?? 50,
                        archived: false,
                    });
                    return {
                        content: [{ type: "text", text: formatMemories(list) }],
                    };
                }
                case "memory_context": {
                    const bundle = await client.query("agentMemory/queries:getContextBundle", {
                        projectId: config.projectId,
                        scope: "project",
                        activePaths: args?.activePaths,
                        maxTokens: args?.maxTokens,
                    });
                    let text = `## Pinned (${bundle.pinned.length})\n\n`;
                    for (const m of bundle.pinned) {
                        text += `### ${m.title}\n${m.content}\n\n`;
                    }
                    text += `## Relevant (${bundle.relevant.length})\n\n`;
                    for (const m of bundle.relevant) {
                        text += `### ${m.title}\n${m.content}\n\n`;
                    }
                    text += `## Available (${bundle.available.length})\n`;
                    for (const m of bundle.available) {
                        text += `- ${m.title} (${m.memoryType}, p=${m.priority})\n`;
                    }
                    return { content: [{ type: "text", text }] };
                }
                case "memory_forget": {
                    await client.mutation("agentMemory/mutations:archive", {
                        memoryId: args.memoryId,
                        actor: "mcp",
                    });
                    return {
                        content: [{ type: "text", text: `Memory archived: ${args.memoryId}` }],
                    };
                }
                case "memory_restore": {
                    await client.mutation("agentMemory/mutations:restore", {
                        memoryId: args.memoryId,
                        actor: "mcp",
                    });
                    return {
                        content: [{ type: "text", text: `Memory restored: ${args.memoryId}` }],
                    };
                }
                case "memory_update": {
                    await client.mutation("agentMemory/mutations:update", {
                        memoryId: args.memoryId,
                        content: args?.content,
                        title: args?.title,
                        tags: args?.tags,
                        priority: args?.priority,
                        actor: "mcp",
                    });
                    return {
                        content: [{ type: "text", text: `Memory updated: ${args.memoryId}` }],
                    };
                }
                case "memory_history": {
                    const entries = await client.query("agentMemory/queries:history", {
                        memoryId: args.memoryId,
                        limit: args?.limit ?? 20,
                    });
                    if (entries.length === 0) {
                        return { content: [{ type: "text", text: "No history found." }] };
                    }
                    const text = entries
                        .map((e) => `**${e.event}** by ${e.actor} at ${new Date(e.timestamp).toISOString()}\n` +
                        (e.previousContent
                            ? `  Previous: ${e.previousContent.slice(0, 100)}...\n`
                            : "") +
                        (e.newContent
                            ? `  New: ${e.newContent.slice(0, 100)}...\n`
                            : ""))
                        .join("\n");
                    return { content: [{ type: "text", text }] };
                }
                case "memory_feedback": {
                    await client.mutation("agentMemory/mutations:addFeedback", {
                        memoryId: args.memoryId,
                        sentiment: args.sentiment,
                        comment: args?.comment,
                        actor: "mcp",
                    });
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Feedback recorded: ${args.sentiment} for ${args.memoryId}`,
                            },
                        ],
                    };
                }
                case "memory_relate": {
                    const relationId = await client.mutation("agentMemory/mutations:addRelation", {
                        projectId: config.projectId,
                        fromMemoryId: args.fromMemoryId,
                        toMemoryId: args.toMemoryId,
                        relationship: args.relationship,
                        metadata: { createdBy: "mcp" },
                    });
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Relation created: ${args.fromMemoryId} --[${args.relationship}]--> ${args.toMemoryId} (${relationId})`,
                            },
                        ],
                    };
                }
                case "memory_relations": {
                    const relations = await client.query("agentMemory/queries:getRelations", {
                        memoryId: args.memoryId,
                        relationship: args?.relationship,
                        direction: args?.direction,
                    });
                    if (relations.length === 0) {
                        return { content: [{ type: "text", text: "No relations found." }] };
                    }
                    const text = relations
                        .map((r) => `${r.fromMemoryId} --[${r.relationship}]--> ${r.toMemoryId}`)
                        .join("\n");
                    return { content: [{ type: "text", text }] };
                }
                case "memory_batch_archive": {
                    const result = await client.mutation("agentMemory/mutations:batchArchive", {
                        memoryIds: args.memoryIds,
                        actor: "mcp",
                    });
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Batch archive: ${result.archived} archived, ${result.failed} failed`,
                            },
                        ],
                    };
                }
                case "memory_ingest": {
                    if (!config.llmApiKey) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: "Ingest requires --llm-api-key flag. Pass an OpenAI-compatible API key to enable intelligent memory extraction.",
                                },
                            ],
                            isError: true,
                        };
                    }
                    const result = await client.action("agentMemory/actions:ingest", {
                        projectId: config.projectId,
                        content: args.content,
                        scope: "project",
                        agentId: args?.agentId,
                        sessionId: args?.sessionId,
                        llmApiKey: config.llmApiKey,
                        embeddingApiKey: config.embeddingApiKey,
                    });
                    const summary = result.results
                        .map((r) => `- [${r.event}] ${r.content.slice(0, 80)}...${r.previousContent ? ` (was: ${r.previousContent.slice(0, 40)}...)` : ""}`)
                        .join("\n");
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Ingested ${result.totalProcessed} facts:\n${summary}`,
                            },
                        ],
                    };
                }
                default:
                    return {
                        content: [{ type: "text", text: `Unknown tool: ${name}` }],
                        isError: true,
                    };
            }
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    });
    // ── List Resources ──────────────────────────────────────────────
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
        return {
            resources: [
                {
                    uri: `memory://project/${config.projectId}/pinned`,
                    name: "Pinned Memories",
                    description: "High-priority memories always loaded into context",
                    mimeType: "text/markdown",
                },
            ],
        };
    });
    // ── Read Resource ───────────────────────────────────────────────
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const { uri } = request.params;
        if (uri === `memory://project/${config.projectId}/pinned`) {
            const bundle = await client.query("agentMemory/queries:getContextBundle", {
                projectId: config.projectId,
                scope: "project",
            });
            const text = bundle.pinned
                .map((m) => `## ${m.title}\n\n${m.content}`)
                .join("\n\n---\n\n");
            return {
                contents: [
                    {
                        uri,
                        mimeType: "text/markdown",
                        text: text || "No pinned memories.",
                    },
                ],
            };
        }
        return {
            contents: [
                {
                    uri,
                    mimeType: "text/plain",
                    text: "Resource not found.",
                },
            ],
        };
    });
    // ── Start ───────────────────────────────────────────────────────
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`agent-memory MCP server running for project "${config.projectId}"`);
}
// ── Helpers ─────────────────────────────────────────────────────────
function formatMemories(memories) {
    if (memories.length === 0)
        return "No memories found.";
    return memories
        .map((m) => {
        const meta = [];
        if (m.priority !== undefined)
            meta.push(`p=${m.priority}`);
        if (m.agentId)
            meta.push(`agent=${m.agentId}`);
        if (m.accessCount)
            meta.push(`accessed=${m.accessCount}x`);
        if (m.positiveCount || m.negativeCount) {
            meta.push(`feedback=+${m.positiveCount ?? 0}/-${m.negativeCount ?? 0}`);
        }
        const metaStr = meta.length > 0 ? ` (${meta.join(", ")})` : "";
        return `## ${m.title} [${m.memoryType}]${metaStr}\n\n${m.content}`;
    })
        .join("\n\n---\n\n");
}
//# sourceMappingURL=server.js.map