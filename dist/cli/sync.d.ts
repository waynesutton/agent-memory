import type { ToolFormat } from "../shared.js";
export interface SyncConfig {
    convexUrl: string;
    projectId: string;
    userId?: string;
    format?: ToolFormat;
    dir: string;
}
/**
 * Push local memory files to Convex.
 */
export declare function push(config: SyncConfig): Promise<void>;
/**
 * Pull memories from Convex and write to local files.
 */
export declare function pull(config: SyncConfig): Promise<void>;
/**
 * Detect which tools are present in the directory.
 */
export declare function detectTools(dir: string): Promise<string[]>;
//# sourceMappingURL=sync.d.ts.map