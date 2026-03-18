import { type HttpRouter } from "convex/server";
import type { api } from "../component/_generated/api.js";
type ComponentApi = typeof api;
export interface MemoryHttpApiConfig {
    /** Allowed CORS origins. Defaults to ["*"]. */
    corsOrigins?: string[];
}
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
export declare class MemoryHttpApi {
    private component;
    private cors;
    constructor(component: ComponentApi, config?: MemoryHttpApiConfig);
    /**
     * Validates the Bearer token, checks rate limits, and returns the
     * validated key info. Returns an error Response if auth or rate
     * limiting fails.
     */
    private authenticate;
    /**
     * Registers all read-only memory API routes on the given httpRouter
     * under the specified prefix (e.g. "/api/memory").
     */
    mount(http: HttpRouter, prefix: string): void;
}
export {};
//# sourceMappingURL=http.d.ts.map