import { readdir, readFile, access } from "node:fs/promises";
import { join, basename } from "node:path";
import { computeChecksum } from "../../component/checksum.js";
export const conductorParser = {
    name: "Conductor",
    async detect(dir) {
        try {
            await access(join(dir, ".conductor"));
            return true;
        }
        catch {
            return false;
        }
    },
    async parse(dir) {
        const memories = [];
        const rulesDir = join(dir, ".conductor", "rules");
        let files = [];
        try {
            files = await readdir(rulesDir);
        }
        catch {
            return memories;
        }
        for (const file of files) {
            if (!file.endsWith(".md"))
                continue;
            const content = (await readFile(join(rulesDir, file), "utf-8")).trim();
            memories.push({
                title: basename(file, ".md"),
                content,
                memoryType: "instruction",
                scope: "project",
                tags: [],
                priority: 0.8,
                source: "conductor",
                checksum: computeChecksum(content),
            });
        }
        return memories;
    },
};
//# sourceMappingURL=conductor.js.map