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
] as const;

export type MemoryType = (typeof MEMORY_TYPES)[number];

export const memoryTypeValidator = v.union(
  v.literal("instruction"),
  v.literal("learning"),
  v.literal("reference"),
  v.literal("feedback"),
  v.literal("journal"),
);

// ── Scope types ─────────────────────────────────────────────────────
// project: shared across team via Convex
// user:    personal to one user
// org:     organization-wide policies

export const SCOPES = ["project", "user", "org"] as const;
export type Scope = (typeof SCOPES)[number];

export const scopeValidator = v.union(
  v.literal("project"),
  v.literal("user"),
  v.literal("org"),
);

// ── Sync direction ──────────────────────────────────────────────────

export const syncDirectionValidator = v.union(
  v.literal("push"),
  v.literal("pull"),
);

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
] as const;

export type ToolFormat = (typeof TOOL_FORMATS)[number];

export const toolFormatValidator = v.union(
  v.literal("claude-code"),
  v.literal("cursor"),
  v.literal("opencode"),
  v.literal("codex"),
  v.literal("conductor"),
  v.literal("zed"),
  v.literal("vscode-copilot"),
  v.literal("pi"),
  v.literal("raw"),
);

// ── History events ──────────────────────────────────────────────────

export const HISTORY_EVENTS = [
  "created",
  "updated",
  "archived",
  "restored",
  "merged",
] as const;

export type HistoryEvent = (typeof HISTORY_EVENTS)[number];

// ── Feedback sentiments ─────────────────────────────────────────────

export const FEEDBACK_SENTIMENTS = [
  "positive",
  "negative",
  "very_negative",
] as const;

export type FeedbackSentiment = (typeof FEEDBACK_SENTIMENTS)[number];

// ── Ingest events ───────────────────────────────────────────────────

export const INGEST_EVENTS = [
  "added",
  "updated",
  "deleted",
  "skipped",
] as const;

export type IngestEvent = (typeof INGEST_EVENTS)[number];

// ── Memory document shape (for client-side typing) ──────────────────

export interface Memory {
  _id: string;
  _creationTime: number;
  projectId: string;
  scope: Scope;
  userId?: string;
  agentId?: string;
  sessionId?: string;
  title: string;
  content: string;
  memoryType: MemoryType;
  tags: string[];
  paths?: string[];
  priority?: number;
  source?: string;
  lastSyncedAt?: number;
  checksum: string;
  archived: boolean;
  embeddingId?: string;
  // Access tracking
  accessCount?: number;
  lastAccessedAt?: number;
  // Feedback aggregation
  positiveCount?: number;
  negativeCount?: number;
}

export interface ContextBundle {
  pinned: Memory[];
  relevant: Memory[];
  available: Array<{
    _id: string;
    title: string;
    memoryType: MemoryType;
    priority: number;
  }>;
}

export interface ExportedFile {
  path: string;
  content: string;
  checksum: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  unchanged: number;
}

// ── History record ──────────────────────────────────────────────────

export interface MemoryHistoryEntry {
  _id: string;
  _creationTime: number;
  memoryId: string;
  projectId: string;
  previousContent?: string;
  newContent?: string;
  previousTitle?: string;
  newTitle?: string;
  event: HistoryEvent;
  actor: string;
  timestamp: number;
}

// ── Feedback record ─────────────────────────────────────────────────

export interface MemoryFeedbackEntry {
  _id: string;
  _creationTime: number;
  memoryId: string;
  projectId: string;
  sentiment: FeedbackSentiment;
  comment?: string;
  actor: string;
  timestamp: number;
}

// ── Memory relation ─────────────────────────────────────────────────

export interface MemoryRelation {
  _id: string;
  _creationTime: number;
  projectId: string;
  fromMemoryId: string;
  toMemoryId: string;
  relationship: string;
  metadata?: {
    confidence?: number;
    createdBy?: string;
  };
  timestamp: number;
}

// ── Ingest result ───────────────────────────────────────────────────

export interface IngestResult {
  results: Array<{
    memoryId: string;
    content: string;
    event: IngestEvent;
    previousContent?: string;
  }>;
  totalProcessed: number;
}

// ── API key types ───────────────────────────────────────────────────

export interface ApiKeyInfo {
  _id: string;
  keyHash: string;
  projectId: string;
  name: string;
  permissions: string[];
  rateLimitOverride?: {
    requestsPerWindow: number;
    windowMs: number;
  };
  lastUsedAt?: number;
  expiresAt?: number;
  revoked: boolean;
}

export interface ApiKeyCreateResult {
  key: string; // plaintext key — only returned once
  keyHash: string;
}

export const API_PERMISSIONS = [
  "list",
  "get",
  "search",
  "context",
  "export",
  "history",
  "relations",
] as const;

export type ApiPermission = (typeof API_PERMISSIONS)[number];
