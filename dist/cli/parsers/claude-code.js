import { readdir, readFile, access } from "node:fs/promises";
import { join, basename } from "node:path";
import matter from "gray-matter";
import { computeChecksum } from "../../component/checksum.js";
export const claudeCodeParser = {
    name: "Claude Code",
    async detect(dir) {
        try {
            await access(join(dir, ".claude"));
            return true;
        }
        catch {
            return false;
        }
    },
    async parse(dir) {
        const memories = [];
        // Parse .claude/rules/*.md
        const rulesDir = join(dir, ".claude", "rules");
        const ruleFiles = await safeReaddir(rulesDir);
        for (const file of ruleFiles) {
            if (!file.endsWith(".md"))
                continue;
            const fullPath = join(rulesDir, file);
            const raw = await readFile(fullPath, "utf-8");
            const { data, content } = matter(raw);
            memories.push({
                title: basename(file, ".md"),
                content: content.trim(),
                memoryType: "instruction",
                scope: "project",
                tags: [],
                paths: data.paths,
                priority: 0.9, // rules are high priority
                source: "claude-code",
                checksum: computeChecksum(content.trim()),
            });
        }
        // Parse memory files from ~/.claude/projects/*/memory/*.md
        const homeDir = process.env.HOME ?? "";
        const projectsDir = join(homeDir, ".claude", "projects");
        const projectDirs = await safeReaddir(projectsDir);
        for (const projDir of projectDirs) {
            const memDir = join(projectsDir, projDir, "memory");
            const memFiles = await safeReaddir(memDir);
            for (const file of memFiles) {
                if (!file.endsWith(".md"))
                    continue;
                const fullPath = join(memDir, file);
                const raw = await readFile(fullPath, "utf-8");
                const { data, content } = matter(raw);
                memories.push({
                    title: basename(file, ".md"),
                    content: content.trim(),
                    memoryType: data.type === "feedback" ? "feedback" : "learning",
                    scope: "user",
                    tags: [],
                    priority: 0.5,
                    source: "claude-code",
                    checksum: computeChecksum(content.trim()),
                });
            }
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
//# sourceMappingURL=claude-code.js.map