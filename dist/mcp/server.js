import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { ConvexHttpClient } from "convex/browser";
export async function startMcpServer(config) {
    const client = new ConvexHttpClient(config.convexUrl);
    const server = new Server({
        name: "agent-memory",
        version: "0.0.1",
    }, {
        capabilities: {
            tools: {},
            resources: {},
        },
    });
    const isDisabled = (name) => config.disabledTools.includes(name) ||
        (config.readOnly &&
            ["memory_remember", "memory_forget", "memory_update"].includes(name));
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
                        priority: { type: "number", minimum: 0, maximum: 1, description: "Priority (0-1)" },
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
                name: "memory_update",
                description: "Update an existing memory",
                inputSchema: {
                    type: "object",
                    properties: {
                        memoryId: { type: "string", description: "Memory ID to update" },
                        content: { type: "string", description: "New content" },
                        tags: { type: "array", items: { type: "string" } },
                        priority: { type: "number", minimum: 0, maximum: 1 },
                    },
                    required: ["memoryId"],
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
                        content: [
                            {
                                type: "text",
                                text: formatMemories(results),
                            },
                        ],
                    };
                }
                case "memory_semantic_recall": {
                    if (!config.embeddingApiKey) {
                        // Fall back to full-text
                        const results = await client.query("agentMemory/queries:search", {
                            projectId: config.projectId,
                            query: args.query,
                            limit: args.limit ?? 10,
                        });
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: formatMemories(results),
                                },
                            ],
                        };
                    }
                    // TODO: call semanticSearch action when action client support is available
                    return {
                        content: [
                            {
                                type: "text",
                                text: "Semantic search requires action context. Falling back to full-text search.",
                            },
                        ],
                    };
                }
                case "memory_list": {
                    const list = await client.query("agentMemory/queries:list", {
                        projectId: config.projectId,
                        memoryType: args?.memoryType,
                        minPriority: args?.minPriority,
                        limit: args?.limit ?? 50,
                        archived: false,
                    });
                    return {
                        content: [
                            {
                                type: "text",
                                text: formatMemories(list),
                            },
                        ],
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
                    await client.mutation("agentMemory/mutations:archive", { memoryId: args.memoryId });
                    return {
                        content: [
                            { type: "text", text: `Memory archived: ${args.memoryId}` },
                        ],
                    };
                }
                case "memory_update": {
                    await client.mutation("agentMemory/mutations:update", {
                        memoryId: args.memoryId,
                        content: args?.content,
                        tags: args?.tags,
                        priority: args?.priority,
                    });
                    return {
                        content: [
                            { type: "text", text: `Memory updated: ${args.memoryId}` },
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
        const priority = m.priority !== undefined ? ` (p=${m.priority})` : "";
        return `## ${m.title} [${m.memoryType}]${priority}\n\n${m.content}`;
    })
        .join("\n\n---\n\n");
}
//# sourceMappingURL=server.js.map