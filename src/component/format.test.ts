import { describe, it, expect } from "vitest";
import { formatMemoryForTool } from "./format.js";

const baseMemory = {
  _id: "test-id" as any,
  _creationTime: Date.now(),
  projectId: "test-project",
  scope: "project" as const,
  title: "api-rules",
  content: "# API Rules\n\n- Use camelCase\n- Return JSON",
  memoryType: "instruction" as const,
  tags: ["api", "style"],
  priority: 0.9,
  source: "claude-code",
  checksum: "abc12345",
  archived: false,
};

describe("formatMemoryForTool", () => {
  describe("claude-code", () => {
    it("formats instructions as .claude/rules/*.md", () => {
      const result = formatMemoryForTool(baseMemory, "claude-code", "my-project");
      expect(result.path).toBe(".claude/rules/api-rules.md");
      expect(result.content).toContain("# API Rules");
    });

    it("formats learnings under .claude/projects/", () => {
      const learning = { ...baseMemory, memoryType: "learning" as const };
      const result = formatMemoryForTool(learning, "claude-code", "my-project");
      expect(result.path).toBe(".claude/projects/my-project/memory/api-rules.md");
    });

    it("includes paths as YAML frontmatter", () => {
      const withPaths = { ...baseMemory, paths: ["src/**/*.ts"] };
      const result = formatMemoryForTool(withPaths, "claude-code");
      expect(result.content).toContain("---");
      expect(result.content).toContain("paths:");
      expect(result.content).toContain("src/**/*.ts");
    });
  });

  describe("cursor", () => {
    it("formats as .cursor/rules/*.mdc", () => {
      const result = formatMemoryForTool(baseMemory, "cursor");
      expect(result.path).toBe(".cursor/rules/api-rules.mdc");
      expect(result.content).toContain("description: api-rules");
      expect(result.content).toContain("alwaysApply: true"); // priority 0.9 >= 0.8
    });

    it("sets alwaysApply false for low priority", () => {
      const low = { ...baseMemory, priority: 0.3 };
      const result = formatMemoryForTool(low, "cursor");
      expect(result.content).toContain("alwaysApply: false");
    });
  });

  describe("opencode", () => {
    it("formats instructions as AGENTS.md sections", () => {
      const result = formatMemoryForTool(baseMemory, "opencode");
      expect(result.path).toBe("AGENTS.md");
      expect(result.content).toContain("## api-rules");
    });

    it("formats journals as separate files", () => {
      const journal = { ...baseMemory, memoryType: "journal" as const };
      const result = formatMemoryForTool(journal, "opencode");
      expect(result.path).toBe("journal/api-rules.md");
    });
  });

  describe("codex", () => {
    it("formats as AGENTS.md by default", () => {
      const result = formatMemoryForTool(baseMemory, "codex");
      expect(result.path).toBe("AGENTS.md");
    });

    it("uses common path prefix for scoped rules", () => {
      const withPaths = { ...baseMemory, paths: ["src/api/routes.ts", "src/api/handlers.ts"] };
      const result = formatMemoryForTool(withPaths, "codex");
      expect(result.path).toBe("src/api/AGENTS.md");
    });
  });

  describe("conductor", () => {
    it("formats as .conductor/rules/*.md", () => {
      const result = formatMemoryForTool(baseMemory, "conductor");
      expect(result.path).toBe(".conductor/rules/api-rules.md");
    });
  });

  describe("zed", () => {
    it("formats as .zed/rules/*.md", () => {
      const result = formatMemoryForTool(baseMemory, "zed");
      expect(result.path).toBe(".zed/rules/api-rules.md");
    });
  });

  describe("vscode-copilot", () => {
    it("formats as .github/copilot-instructions.md", () => {
      const result = formatMemoryForTool(baseMemory, "vscode-copilot");
      expect(result.path).toBe(".github/copilot-instructions.md");
      expect(result.content).toContain("## api-rules");
    });
  });

  describe("pi", () => {
    it("formats as .pi/rules/*.md", () => {
      const result = formatMemoryForTool(baseMemory, "pi");
      expect(result.path).toBe(".pi/rules/api-rules.md");
    });
  });

  describe("raw", () => {
    it("includes full frontmatter", () => {
      const result = formatMemoryForTool(baseMemory, "raw");
      expect(result.path).toBe("memories/api-rules.md");
      expect(result.content).toContain("title: api-rules");
      expect(result.content).toContain("type: instruction");
      expect(result.content).toContain("scope: project");
      expect(result.content).toContain("tags:");
    });
  });

  describe("filename sanitization", () => {
    it("sanitizes special characters in titles", () => {
      const special = { ...baseMemory, title: "My Rule (v2) & Notes!" };
      const result = formatMemoryForTool(special, "zed");
      expect(result.path).not.toContain("(");
      expect(result.path).not.toContain("!");
      expect(result.path).not.toContain("&");
    });
  });
});
