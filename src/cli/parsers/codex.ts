import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import type { Parser, ParsedMemory } from "./types.js";
import { computeChecksum } from "../../component/checksum.js";

export const codexParser: Parser = {
  name: "Codex",

  async detect(dir: string): Promise<boolean> {
    try {
      await access(join(dir, "AGENTS.md"));
      return true;
    } catch {
      return false;
    }
  },

  async parse(dir: string): Promise<ParsedMemory[]> {
    const memories: ParsedMemory[] = [];

    // Check AGENTS.override.md first (takes priority)
    for (const filename of ["AGENTS.override.md", "AGENTS.md"]) {
      try {
        const raw = await readFile(join(dir, filename), "utf-8");
        const content = raw.trim();
        if (content.length === 0) continue;

        memories.push({
          title: filename.replace(".md", "").toLowerCase(),
          content,
          memoryType: "instruction",
          scope: "project",
          tags: [],
          priority: filename.includes("override") ? 1.0 : 0.8,
          source: "codex",
          checksum: computeChecksum(content),
        });
      } catch {
        // File doesn't exist
      }
    }

    return memories;
  },
};
