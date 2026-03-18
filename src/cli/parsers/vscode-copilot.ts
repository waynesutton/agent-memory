import { readdir, readFile, access } from "node:fs/promises";
import { join, basename } from "node:path";
import type { Parser, ParsedMemory } from "./types.js";
import { computeChecksum } from "../../component/checksum.js";

export const vscodeCopilotParser: Parser = {
  name: "VS Code Copilot",

  async detect(dir: string): Promise<boolean> {
    try {
      await access(join(dir, ".github", "copilot-instructions.md"));
      return true;
    } catch {
      try {
        await access(join(dir, ".copilot", "rules"));
        return true;
      } catch {
        return false;
      }
    }
  },

  async parse(dir: string): Promise<ParsedMemory[]> {
    const memories: ParsedMemory[] = [];

    // Parse .github/copilot-instructions.md
    try {
      const content = (
        await readFile(
          join(dir, ".github", "copilot-instructions.md"),
          "utf-8",
        )
      ).trim();

      if (content.length > 0) {
        memories.push({
          title: "copilot-instructions",
          content,
          memoryType: "instruction",
          scope: "project",
          tags: [],
          priority: 0.9,
          source: "vscode-copilot",
          checksum: computeChecksum(content),
        });
      }
    } catch {
      // File doesn't exist
    }

    // Parse .copilot/rules/*.md
    const rulesDir = join(dir, ".copilot", "rules");
    let files: string[] = [];
    try {
      files = await readdir(rulesDir);
    } catch {
      return memories;
    }

    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const content = (await readFile(join(rulesDir, file), "utf-8")).trim();

      memories.push({
        title: basename(file, ".md"),
        content,
        memoryType: "instruction",
        scope: "project",
        tags: [],
        priority: 0.8,
        source: "vscode-copilot",
        checksum: computeChecksum(content),
      });
    }

    return memories;
  },
};
