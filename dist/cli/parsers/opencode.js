import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { computeChecksum } from "../../component/checksum.js";
export const openCodeParser = {
    name: "OpenCode",
    async detect(dir) {
        try {
            await access(join(dir, "AGENTS.md"));
            return true;
        }
        catch {
            return false;
        }
    },
    async parse(dir) {
        const memories = [];
        // Parse AGENTS.md — split by ## headings into separate memories
        try {
            const raw = await readFile(join(dir, "AGENTS.md"), "utf-8");
            const sections = splitByHeadings(raw);
            for (const section of sections) {
                memories.push({
                    title: section.title,
                    content: section.content.trim(),
                    memoryType: "instruction",
                    scope: "project",
                    tags: [],
                    priority: 0.8,
                    source: "opencode",
                    checksum: computeChecksum(section.content.trim()),
                });
            }
        }
        catch {
            // AGENTS.md doesn't exist
        }
        return memories;
    },
};
function splitByHeadings(markdown) {
    const lines = markdown.split("\n");
    const sections = [];
    let currentTitle = "agents-md";
    let currentContent = [];
    for (const line of lines) {
        const match = line.match(/^##\s+(.+)$/);
        if (match) {
            if (currentContent.length > 0) {
                sections.push({
                    title: currentTitle,
                    content: currentContent.join("\n"),
                });
            }
            currentTitle = match[1]
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, "-")
                .replace(/-+/g, "-");
            currentContent = [];
        }
        else {
            currentContent.push(line);
        }
    }
    if (currentContent.length > 0) {
        sections.push({
            title: currentTitle,
            content: currentContent.join("\n"),
        });
    }
    return sections;
}
//# sourceMappingURL=opencode.js.map