import { readdir, readFile, access } from "node:fs/promises";
import { join, basename } from "node:path";
import type { Parser, ParsedMemory } from "./types.js";
import { computeChecksum } from "../../component/checksum.js";

export const zedParser: Parser = {
  name: "Zed",

  async detect(dir: string): Promise<boolean> {
    try {
      await access(join(dir, ".zed", "rules"));
      return true;
    } catch {
      return false;
    }
  },

  async parse(dir: string): Promise<ParsedMemory[]> {
    const memories: ParsedMemory[] = [];
    const rulesDir = join(dir, ".zed", "rules");

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
        source: "zed",
        checksum: computeChecksum(content),
      });
    }

    return memories;
  },
};
