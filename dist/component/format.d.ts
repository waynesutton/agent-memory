import type { Doc } from "./_generated/dataModel.js";
type MemoryDoc = Doc<"memories">;
export interface FormattedFile {
    path: string;
    content: string;
    checksum: string;
}
export type ToolFormat = "claude-code" | "cursor" | "opencode" | "codex" | "conductor" | "zed" | "vscode-copilot" | "pi" | "raw";
export declare function formatMemoryForTool(memory: MemoryDoc, format: ToolFormat, projectSlug?: string): FormattedFile;
export {};
//# sourceMappingURL=format.d.ts.map