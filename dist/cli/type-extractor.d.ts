import type { ParsedMemory } from "./parsers/types.js";
export interface IngestTypesOptions {
    /** Glob pattern for TypeScript files, e.g. "src/models.ts" */
    globPattern: string;
    /** Working directory for glob resolution */
    cwd?: string;
    /** Additional tags to attach to generated memories */
    tags?: string[];
    /** Priority for generated memories (0-1, default 0.6) */
    priority?: number;
    /** Exclude patterns (defaults to node_modules, dist, _generated) */
    exclude?: string[];
}
export interface IngestTypesResult {
    memories: ParsedMemory[];
    filesProcessed: number;
}
/**
 * Extract TypeScript type definitions from files matching a glob pattern
 * and convert them into ParsedMemory objects suitable for agent-memory.
 *
 * Uses `types-not-docs` under the hood to generate markdown from types.
 */
export declare function extractTypeMemories(opts: IngestTypesOptions): Promise<IngestTypesResult>;
//# sourceMappingURL=type-extractor.d.ts.map