import { v } from "convex/values";
// ── Memory types ────────────────────────────────────────────────────
// instruction: maps to CLAUDE.md / .cursor/rules / AGENTS.md
// learning:    auto-discovered patterns (auto-memory)
// reference:   architecture docs, API specs
// feedback:    corrections, preferences
// journal:     session logs (OpenCode-style)
export const MEMORY_TYPES = [
    "instruction",
    "learning",
    "reference",
    "feedback",
    "journal",
];
export const memoryTypeValidator = v.union(v.literal("instruction"), v.literal("learning"), v.literal("reference"), v.literal("feedback"), v.literal("journal"));
// ── Scope types ─────────────────────────────────────────────────────
// project: shared across team via Convex
// user:    personal to one user
// org:     organization-wide policies
export const SCOPES = ["project", "user", "org"];
export const scopeValidator = v.union(v.literal("project"), v.literal("user"), v.literal("org"));
// ── Sync direction ──────────────────────────────────────────────────
export const syncDirectionValidator = v.union(v.literal("push"), v.literal("pull"));
// ── Tool formats ────────────────────────────────────────────────────
export const TOOL_FORMATS = [
    "claude-code",
    "cursor",
    "opencode",
    "codex",
    "conductor",
    "zed",
    "vscode-copilot",
    "pi",
    "raw",
];
export const toolFormatValidator = v.union(v.literal("claude-code"), v.literal("cursor"), v.literal("opencode"), v.literal("codex"), v.literal("conductor"), v.literal("zed"), v.literal("vscode-copilot"), v.literal("pi"), v.literal("raw"));
//# sourceMappingURL=shared.js.map