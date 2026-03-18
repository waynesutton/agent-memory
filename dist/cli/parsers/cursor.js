import { readdir, readFile, access } from "node:fs/promises";
import { join, basename } from "node:path";
import matter from "gray-matter";
import { computeChecksum } from "../../component/checksum.js";
export const cursorParser = {
    name: "Cursor",
    async detect(dir) {
        try {
            await access(join(dir, ".cursor", "rules"));
            return true;
        }
        catch {
            return false;
        }
    },
    async parse(dir) {
        const memories = [];
        const rulesDir = join(dir, ".cursor", "rules");
        const files = await safeReaddir(rulesDir);
        for (const file of files) {
            if (!file.endsWith(".mdc") && !file.endsWith(".md"))
                continue;
            const fullPath = join(rulesDir, file);
            const raw = await readFile(fullPath, "utf-8");
            const { data, content } = matter(raw);
            const alwaysApply = data.alwaysApply === true;
            memories.push({
                title: basename(file, file.endsWith(".mdc") ? ".mdc" : ".md"),
                content: content.trim(),
                memoryType: "instruction",
                scope: "project",
                tags: [],
                paths: data.paths,
                priority: alwaysApply ? 0.9 : 0.5,
                source: "cursor",
                checksum: computeChecksum(content.trim()),
            });
        }
        return memories;
    },
};
async function safeReaddir(dir) {
    try {
        return await readdir(dir);
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=cursor.js.map