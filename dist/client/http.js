import { httpActionGeneric } from "convex/server";
// Use the generic httpAction since this is a component (no app-specific data model)
const httpAction = httpActionGeneric;
// ── Helpers ─────────────────────────────────────────────────────────
function corsHeaders(origins) {
    return {
        "Access-Control-Allow-Origin": origins.includes("*") ? "*" : origins[0],
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Max-Age": "86400",
    };
}
function jsonResponse(data, status, cors) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json", ...cors },
    });
}
function errorResponse(message, status, cors, extra) {
    return jsonResponse({ error: message, ...extra }, status, cors);
}
// ── MemoryHttpApi ───────────────────────────────────────────────────
/**
 * Generates read-only HTTP endpoint handlers that a Convex app mounts
 * on its own `httpRouter`. Each request is authenticated via an API key
 * (Bearer token) and rate-limited using the component's built-in
 * fixed-window token bucket.
 *
 * Usage in the consuming app's `convex/http.ts`:
 *
 * ```typescript
 * import { httpRouter } from "convex/server";
 * import { MemoryHttpApi } from "@waynesutton/agent-memory/http";
 * import { components } from "./_generated/api";
 *
 * const http = httpRouter();
 * const memoryApi = new MemoryHttpApi(components.agentMemory);
 * memoryApi.mount(http, "/api/memory");
 * export default http;
 * ```
 */
export class MemoryHttpApi {
    component;
    cors;
    constructor(component, config) {
        this.component = component;
        this.cors = corsHeaders(config?.corsOrigins ?? ["*"]);
    }
    // ── Auth + rate-limit middleware ─────────────────────────────────
    /**
     * Validates the Bearer token, checks rate limits, and returns the
     * validated key info. Returns an error Response if auth or rate
     * limiting fails.
     */
    async authenticate(ctx, request, requiredPermission) {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return errorResponse("Missing or invalid Authorization header. Expected: Bearer am_<key>", 401, this.cors);
        }
        const key = authHeader.slice(7);
        const validation = await ctx.runQuery(this.component.apiKeyQueries.validateApiKey, { key });
        if (!validation.valid) {
            return errorResponse(validation.reason, 401, this.cors);
        }
        // Check permission
        if (!validation.permissions.includes(requiredPermission)) {
            return errorResponse(`API key does not have "${requiredPermission}" permission`, 403, this.cors);
        }
        // Consume rate limit
        const rateResult = await ctx.runMutation(this.component.apiKeyMutations.consumeRateLimit, {
            keyHash: validation.keyHash,
            requestsPerWindow: validation.rateLimit.requestsPerWindow,
            windowMs: validation.rateLimit.windowMs,
        });
        if (!rateResult.allowed) {
            return errorResponse("Rate limit exceeded", 429, this.cors, {
                retryAfterMs: rateResult.retryAfterMs,
                "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)),
            });
        }
        // Fire-and-forget: update lastUsedAt
        ctx
            .runMutation(this.component.apiKeyQueries.updateKeyLastUsed, {
            keyHash: validation.keyHash,
        })
            .catch(() => { });
        return validation;
    }
    // ── Route mounting ──────────────────────────────────────────────
    /**
     * Registers all read-only memory API routes on the given httpRouter
     * under the specified prefix (e.g. "/api/memory").
     */
    mount(http, prefix) {
        const p = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
        // CORS preflight for all routes
        const optionsHandler = httpAction(async () => {
            return new Response(null, { status: 204, headers: this.cors });
        });
        // ── GET /list ────────────────────────────────────────────────
        http.route({
            path: `${p}/list`,
            method: "GET",
            handler: httpAction(async (ctx, request) => {
                const auth = await this.authenticate(ctx, request, "list");
                if (auth instanceof Response)
                    return auth;
                const url = new URL(request.url);
                const result = await ctx.runQuery(this.component.queries.list, {
                    projectId: auth.projectId,
                    memoryType: url.searchParams.get("memoryType") ?? undefined,
                    scope: url.searchParams.get("scope") ?? undefined,
                    agentId: url.searchParams.get("agentId") ?? undefined,
                    sessionId: url.searchParams.get("sessionId") ?? undefined,
                    source: url.searchParams.get("source") ?? undefined,
                    tags: url.searchParams.get("tags")
                        ? url.searchParams.get("tags").split(",")
                        : undefined,
                    archived: url.searchParams.get("archived") === "true"
                        ? true
                        : undefined,
                    minPriority: url.searchParams.get("minPriority")
                        ? Number(url.searchParams.get("minPriority"))
                        : undefined,
                    limit: url.searchParams.get("limit")
                        ? Number(url.searchParams.get("limit"))
                        : undefined,
                });
                return jsonResponse(result, 200, this.cors);
            }),
        });
        http.route({
            path: `${p}/list`,
            method: "OPTIONS",
            handler: optionsHandler,
        });
        // ── GET /get?id=<memoryId> ──────────────────────────────────
        http.route({
            path: `${p}/get`,
            method: "GET",
            handler: httpAction(async (ctx, request) => {
                const auth = await this.authenticate(ctx, request, "get");
                if (auth instanceof Response)
                    return auth;
                const url = new URL(request.url);
                const memoryId = url.searchParams.get("id");
                if (!memoryId) {
                    return errorResponse("Missing required query param: id", 400, this.cors);
                }
                const result = await ctx.runQuery(this.component.queries.get, {
                    memoryId,
                });
                if (!result) {
                    return errorResponse("Memory not found", 404, this.cors);
                }
                return jsonResponse(result, 200, this.cors);
            }),
        });
        http.route({
            path: `${p}/get`,
            method: "OPTIONS",
            handler: optionsHandler,
        });
        // ── GET /search?q=<query> ───────────────────────────────────
        http.route({
            path: `${p}/search`,
            method: "GET",
            handler: httpAction(async (ctx, request) => {
                const auth = await this.authenticate(ctx, request, "search");
                if (auth instanceof Response)
                    return auth;
                const url = new URL(request.url);
                const query = url.searchParams.get("q");
                if (!query) {
                    return errorResponse("Missing required query param: q", 400, this.cors);
                }
                const result = await ctx.runQuery(this.component.queries.search, {
                    projectId: auth.projectId,
                    query,
                    memoryType: url.searchParams.get("memoryType") ?? undefined,
                    scope: url.searchParams.get("scope") ?? undefined,
                    limit: url.searchParams.get("limit")
                        ? Number(url.searchParams.get("limit"))
                        : undefined,
                });
                return jsonResponse(result, 200, this.cors);
            }),
        });
        http.route({
            path: `${p}/search`,
            method: "OPTIONS",
            handler: optionsHandler,
        });
        // ── GET /context ────────────────────────────────────────────
        http.route({
            path: `${p}/context`,
            method: "GET",
            handler: httpAction(async (ctx, request) => {
                const auth = await this.authenticate(ctx, request, "context");
                if (auth instanceof Response)
                    return auth;
                const url = new URL(request.url);
                const result = await ctx.runQuery(this.component.queries.getContextBundle, {
                    projectId: auth.projectId,
                    scope: url.searchParams.get("scope") ?? "project",
                    userId: url.searchParams.get("userId") ?? undefined,
                    agentId: url.searchParams.get("agentId") ?? undefined,
                    activePaths: url.searchParams.get("activePaths")
                        ? url.searchParams.get("activePaths").split(",")
                        : undefined,
                    maxTokens: url.searchParams.get("maxTokens")
                        ? Number(url.searchParams.get("maxTokens"))
                        : undefined,
                });
                return jsonResponse(result, 200, this.cors);
            }),
        });
        http.route({
            path: `${p}/context`,
            method: "OPTIONS",
            handler: optionsHandler,
        });
        // ── GET /export?format=<format> ─────────────────────────────
        http.route({
            path: `${p}/export`,
            method: "GET",
            handler: httpAction(async (ctx, request) => {
                const auth = await this.authenticate(ctx, request, "export");
                if (auth instanceof Response)
                    return auth;
                const url = new URL(request.url);
                const format = url.searchParams.get("format");
                if (!format) {
                    return errorResponse("Missing required query param: format", 400, this.cors);
                }
                const result = await ctx.runQuery(this.component.queries.exportForTool, {
                    projectId: auth.projectId,
                    format,
                    scope: url.searchParams.get("scope") ?? undefined,
                    userId: url.searchParams.get("userId") ?? undefined,
                    since: url.searchParams.get("since")
                        ? Number(url.searchParams.get("since"))
                        : undefined,
                });
                return jsonResponse(result, 200, this.cors);
            }),
        });
        http.route({
            path: `${p}/export`,
            method: "OPTIONS",
            handler: optionsHandler,
        });
        // ── GET /history?id=<memoryId> ──────────────────────────────
        http.route({
            path: `${p}/history`,
            method: "GET",
            handler: httpAction(async (ctx, request) => {
                const auth = await this.authenticate(ctx, request, "history");
                if (auth instanceof Response)
                    return auth;
                const url = new URL(request.url);
                const memoryId = url.searchParams.get("id");
                if (!memoryId) {
                    return errorResponse("Missing required query param: id", 400, this.cors);
                }
                const result = await ctx.runQuery(this.component.queries.history, {
                    memoryId,
                    limit: url.searchParams.get("limit")
                        ? Number(url.searchParams.get("limit"))
                        : undefined,
                });
                return jsonResponse(result, 200, this.cors);
            }),
        });
        http.route({
            path: `${p}/history`,
            method: "OPTIONS",
            handler: optionsHandler,
        });
        // ── GET /relations?id=<memoryId> ────────────────────────────
        http.route({
            path: `${p}/relations`,
            method: "GET",
            handler: httpAction(async (ctx, request) => {
                const auth = await this.authenticate(ctx, request, "relations");
                if (auth instanceof Response)
                    return auth;
                const url = new URL(request.url);
                const memoryId = url.searchParams.get("id");
                if (!memoryId) {
                    return errorResponse("Missing required query param: id", 400, this.cors);
                }
                const result = await ctx.runQuery(this.component.queries.getRelations, {
                    memoryId,
                    direction: url.searchParams.get("direction") ?? undefined,
                    relationship: url.searchParams.get("relationship") ?? undefined,
                    limit: url.searchParams.get("limit")
                        ? Number(url.searchParams.get("limit"))
                        : undefined,
                });
                return jsonResponse(result, 200, this.cors);
            }),
        });
        http.route({
            path: `${p}/relations`,
            method: "OPTIONS",
            handler: optionsHandler,
        });
    }
}
//# sourceMappingURL=http.js.map