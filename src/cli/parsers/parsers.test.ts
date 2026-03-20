import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { claudeCodeParser } from "./claude-code.js";
import { cursorParser } from "./cursor.js";
import { openCodeParser } from "./opencode.js";
import { codexParser } from "./codex.js";
import { conductorParser } from "./conductor.js";
import { zedParser } from "./zed.js";
import { vscodeCopilotParser } from "./vscode-copilot.js";
import { piParser } from "./pi.js";

let tempDir: string;
let originalHome: string | undefined;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "agent-memory-test-"));
  // Isolate HOME so claudeCodeParser doesn't read real ~/.claude/projects/
  originalHome = process.env.HOME;
  process.env.HOME = tempDir;
});

afterEach(async () => {
  process.env.HOME = originalHome;
  await rm(tempDir, { recursive: true, force: true });
});

describe("claudeCodeParser", () => {
  it("detects .claude directory", async () => {
    await mkdir(join(tempDir, ".claude"));
    expect(await claudeCodeParser.detect(tempDir)).toBe(true);
  });

  it("returns false when no .claude directory", async () => {
    expect(await claudeCodeParser.detect(tempDir)).toBe(false);
  });

  it("parses .claude/rules/*.md files", async () => {
    await mkdir(join(tempDir, ".claude", "rules"), { recursive: true });
    await writeFile(
      join(tempDir, ".claude", "rules", "api-style.md"),
      "---\npaths:\n  - src/api/**\n---\n\n# API Style\n\nUse camelCase.",
    );

    const memories = await claudeCodeParser.parse(tempDir);
    expect(memories).toHaveLength(1);
    expect(memories[0].title).toBe("api-style");
    expect(memories[0].memoryType).toBe("instruction");
    expect(memories[0].scope).toBe("project");
    expect(memories[0].paths).toEqual(["src/api/**"]);
    expect(memories[0].content).toContain("Use camelCase");
    expect(memories[0].checksum).toBeTruthy();
  });

  it("parses rules without frontmatter", async () => {
    await mkdir(join(tempDir, ".claude", "rules"), { recursive: true });
    await writeFile(
      join(tempDir, ".claude", "rules", "simple.md"),
      "Just plain markdown content.",
    );

    const memories = await claudeCodeParser.parse(tempDir);
    expect(memories).toHaveLength(1);
    expect(memories[0].content).toBe("Just plain markdown content.");
    expect(memories[0].paths).toBeUndefined();
  });
});

describe("cursorParser", () => {
  it("detects .cursor/rules directory", async () => {
    await mkdir(join(tempDir, ".cursor", "rules"), { recursive: true });
    expect(await cursorParser.detect(tempDir)).toBe(true);
  });

  it("parses .mdc files with YAML frontmatter", async () => {
    await mkdir(join(tempDir, ".cursor", "rules"), { recursive: true });
    await writeFile(
      join(tempDir, ".cursor", "rules", "testing.mdc"),
      "---\ndescription: Testing rules\nalwaysApply: true\n---\n\nUse vitest for tests.",
    );

    const memories = await cursorParser.parse(tempDir);
    expect(memories).toHaveLength(1);
    expect(memories[0].title).toBe("testing");
    expect(memories[0].content).toContain("Use vitest");
    expect(memories[0].priority).toBe(0.9); // alwaysApply = high priority
  });
});

describe("openCodeParser", () => {
  it("detects AGENTS.md", async () => {
    await writeFile(join(tempDir, "AGENTS.md"), "# Agent Config");
    expect(await openCodeParser.detect(tempDir)).toBe(true);
  });

  it("parses AGENTS.md into sections", async () => {
    await writeFile(
      join(tempDir, "AGENTS.md"),
      "## Style Guide\n\nUse TypeScript.\n\n## Testing\n\nRun vitest.",
    );

    const memories = await openCodeParser.parse(tempDir);
    expect(memories.length).toBeGreaterThanOrEqual(1);
    // OpenCode parser uses filename-based titles (slugified)
    const allContent = memories.map((m) => m.content).join("\n");
    expect(allContent).toContain("Use TypeScript");
    expect(allContent).toContain("Run vitest");
  });
});

describe("codexParser", () => {
  it("detects AGENTS.md", async () => {
    await writeFile(join(tempDir, "AGENTS.md"), "# Config");
    expect(await codexParser.detect(tempDir)).toBe(true);
  });

  it("parses AGENTS.md and AGENTS.override.md", async () => {
    await writeFile(join(tempDir, "AGENTS.md"), "## Base Rules\n\nBase content.");
    await writeFile(
      join(tempDir, "AGENTS.override.md"),
      "## Override Rules\n\nOverride content.",
    );

    const memories = await codexParser.parse(tempDir);
    // Codex parser creates one memory per file, not per section
    expect(memories.length).toBeGreaterThanOrEqual(2);
    const allContent = memories.map((m) => m.content).join("\n");
    expect(allContent).toContain("Base content");
    expect(allContent).toContain("Override content");
  });
});

describe("conductorParser", () => {
  it("detects .conductor/rules directory", async () => {
    await mkdir(join(tempDir, ".conductor", "rules"), { recursive: true });
    expect(await conductorParser.detect(tempDir)).toBe(true);
  });

  it("parses .conductor/rules/*.md files", async () => {
    await mkdir(join(tempDir, ".conductor", "rules"), { recursive: true });
    await writeFile(
      join(tempDir, ".conductor", "rules", "workflow.md"),
      "# Workflow\n\nAlways review before merge.",
    );

    const memories = await conductorParser.parse(tempDir);
    expect(memories).toHaveLength(1);
    expect(memories[0].title).toBe("workflow");
    expect(memories[0].source).toBe("conductor");
  });
});

describe("zedParser", () => {
  it("detects .zed/rules directory", async () => {
    await mkdir(join(tempDir, ".zed", "rules"), { recursive: true });
    expect(await zedParser.detect(tempDir)).toBe(true);
  });

  it("parses .zed/rules/*.md files", async () => {
    await mkdir(join(tempDir, ".zed", "rules"), { recursive: true });
    await writeFile(join(tempDir, ".zed", "rules", "code-style.md"), "Use Rust conventions.");

    const memories = await zedParser.parse(tempDir);
    expect(memories).toHaveLength(1);
    expect(memories[0].title).toBe("code-style");
    expect(memories[0].source).toBe("zed");
  });
});

describe("vscodeCopilotParser", () => {
  it("detects .github/copilot-instructions.md", async () => {
    await mkdir(join(tempDir, ".github"), { recursive: true });
    await writeFile(join(tempDir, ".github", "copilot-instructions.md"), "Instructions");
    expect(await vscodeCopilotParser.detect(tempDir)).toBe(true);
  });

  it("parses copilot-instructions.md", async () => {
    await mkdir(join(tempDir, ".github"), { recursive: true });
    await writeFile(
      join(tempDir, ".github", "copilot-instructions.md"),
      "## General\n\nBe concise.\n\n## Style\n\nUse TypeScript.",
    );

    const memories = await vscodeCopilotParser.parse(tempDir);
    expect(memories.length).toBeGreaterThanOrEqual(1);
  });
});

describe("piParser", () => {
  it("detects .pi/rules directory", async () => {
    await mkdir(join(tempDir, ".pi", "rules"), { recursive: true });
    expect(await piParser.detect(tempDir)).toBe(true);
  });

  it("parses .pi/rules/*.md files", async () => {
    await mkdir(join(tempDir, ".pi", "rules"), { recursive: true });
    await writeFile(join(tempDir, ".pi", "rules", "code-review.md"), "Always add tests.");

    const memories = await piParser.parse(tempDir);
    expect(memories).toHaveLength(1);
    expect(memories[0].title).toBe("code-review");
    expect(memories[0].source).toBe("pi");
    expect(memories[0].priority).toBe(0.8);
  });
});
