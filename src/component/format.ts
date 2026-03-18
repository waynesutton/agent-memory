import type { Doc } from "./_generated/dataModel.js";

type MemoryDoc = Doc<"memories">;

export interface FormattedFile {
  path: string;
  content: string;
  checksum: string;
}

// ── Claude Code ─────────────────────────────────────────────────────

function formatClaudeCode(memory: MemoryDoc, projectSlug: string): FormattedFile {
  const hasPaths = memory.paths && memory.paths.length > 0;
  let content = "";

  if (hasPaths) {
    content += "---\n";
    content += "paths:\n";
    for (const p of memory.paths!) {
      content += `  - "${p}"\n`;
    }
    content += "---\n\n";
  }

  content += memory.content;

  const isInstruction = memory.memoryType === "instruction";
  const path = isInstruction
    ? `.claude/rules/${sanitizeFilename(memory.title)}.md`
    : `.claude/projects/${projectSlug}/memory/${sanitizeFilename(memory.title)}.md`;

  return { path, content, checksum: memory.checksum };
}

// ── Cursor ──────────────────────────────────────────────────────────

function formatCursor(memory: MemoryDoc): FormattedFile {
  let content = "---\n";
  content += `description: ${memory.title}\n`;

  if (memory.paths && memory.paths.length > 0) {
    content += "paths:\n";
    for (const p of memory.paths) {
      content += `  - "${p}"\n`;
    }
  }

  const alwaysApply =
    memory.priority !== undefined && memory.priority >= 0.8;
  content += `alwaysApply: ${alwaysApply}\n`;
  content += "---\n\n";
  content += memory.content;

  return {
    path: `.cursor/rules/${sanitizeFilename(memory.title)}.mdc`,
    content,
    checksum: memory.checksum,
  };
}

// ── OpenCode ────────────────────────────────────────────────────────

function formatOpenCode(memory: MemoryDoc): FormattedFile {
  if (memory.memoryType === "journal") {
    return {
      path: `journal/${sanitizeFilename(memory.title)}.md`,
      content: memory.content,
      checksum: memory.checksum,
    };
  }

  // Instructions get merged into AGENTS.md sections
  return {
    path: "AGENTS.md",
    content: `## ${memory.title}\n\n${memory.content}`,
    checksum: memory.checksum,
  };
}

// ── Codex ───────────────────────────────────────────────────────────

function formatCodex(memory: MemoryDoc): FormattedFile {
  // If paths all share a common directory prefix, place there
  const dir = commonPathPrefix(memory.paths);
  const path = dir ? `${dir}/AGENTS.md` : "AGENTS.md";

  return {
    path,
    content: `## ${memory.title}\n\n${memory.content}`,
    checksum: memory.checksum,
  };
}

// ── Conductor ───────────────────────────────────────────────────────

function formatConductor(memory: MemoryDoc): FormattedFile {
  return {
    path: `.conductor/rules/${sanitizeFilename(memory.title)}.md`,
    content: memory.content,
    checksum: memory.checksum,
  };
}

// ── Zed ─────────────────────────────────────────────────────────────

function formatZed(memory: MemoryDoc): FormattedFile {
  return {
    path: `.zed/rules/${sanitizeFilename(memory.title)}.md`,
    content: memory.content,
    checksum: memory.checksum,
  };
}

// ── VS Code Copilot ─────────────────────────────────────────────────

function formatVSCodeCopilot(memory: MemoryDoc): FormattedFile {
  return {
    path: `.github/copilot-instructions.md`,
    content: `## ${memory.title}\n\n${memory.content}`,
    checksum: memory.checksum,
  };
}

// ── Pi ──────────────────────────────────────────────────────────────

function formatPi(memory: MemoryDoc): FormattedFile {
  return {
    path: `.pi/rules/${sanitizeFilename(memory.title)}.md`,
    content: memory.content,
    checksum: memory.checksum,
  };
}

// ── Raw (markdown as-is) ────────────────────────────────────────────

function formatRaw(memory: MemoryDoc): FormattedFile {
  let content = "---\n";
  content += `title: ${memory.title}\n`;
  content += `type: ${memory.memoryType}\n`;
  content += `scope: ${memory.scope}\n`;
  if (memory.tags.length > 0) {
    content += `tags: [${memory.tags.map((t: string) => `"${t}"`).join(", ")}]\n`;
  }
  if (memory.priority !== undefined) {
    content += `priority: ${memory.priority}\n`;
  }
  if (memory.paths && memory.paths.length > 0) {
    content += "paths:\n";
    for (const p of memory.paths) {
      content += `  - "${p}"\n`;
    }
  }
  content += "---\n\n";
  content += memory.content;

  return {
    path: `memories/${sanitizeFilename(memory.title)}.md`,
    content,
    checksum: memory.checksum,
  };
}

// ── Public API ──────────────────────────────────────────────────────

export type ToolFormat =
  | "claude-code"
  | "cursor"
  | "opencode"
  | "codex"
  | "conductor"
  | "zed"
  | "vscode-copilot"
  | "pi"
  | "raw";

export function formatMemoryForTool(
  memory: MemoryDoc,
  format: ToolFormat,
  projectSlug?: string,
): FormattedFile {
  switch (format) {
    case "claude-code":
      return formatClaudeCode(memory, projectSlug ?? "default");
    case "cursor":
      return formatCursor(memory);
    case "opencode":
      return formatOpenCode(memory);
    case "codex":
      return formatCodex(memory);
    case "conductor":
      return formatConductor(memory);
    case "zed":
      return formatZed(memory);
    case "vscode-copilot":
      return formatVSCodeCopilot(memory);
    case "pi":
      return formatPi(memory);
    case "raw":
      return formatRaw(memory);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function sanitizeFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function commonPathPrefix(paths?: string[]): string {
  if (!paths || paths.length === 0) return "";
  if (paths.length === 1) {
    const parts = paths[0].split("/");
    return parts.length > 1 ? parts.slice(0, -1).join("/") : "";
  }

  const split = paths.map((p) => p.split("/"));
  const prefix: string[] = [];
  for (let i = 0; i < split[0].length; i++) {
    const segment = split[0][i];
    if (split.every((parts) => parts[i] === segment)) {
      prefix.push(segment);
    } else {
      break;
    }
  }
  return prefix.join("/");
}
