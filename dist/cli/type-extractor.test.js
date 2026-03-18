import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { extractTypeMemories } from "./type-extractor.js";
let tempDir;
beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "agent-memory-types-test-"));
});
afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
});
describe("extractTypeMemories", () => {
    it("extracts exported interfaces", async () => {
        await writeFile(join(tempDir, "models.ts"), `
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
}
`);
        const result = await extractTypeMemories({
            globPattern: "**/*.ts",
            cwd: tempDir,
        });
        expect(result.filesProcessed).toBe(1);
        expect(result.memories.length).toBeGreaterThanOrEqual(1);
        const allContent = result.memories.map((m) => m.content).join("\n");
        expect(allContent).toContain("User");
        expect(allContent).toContain("Post");
        for (const memory of result.memories) {
            expect(memory.memoryType).toBe("reference");
            expect(memory.scope).toBe("project");
            expect(memory.source).toBe("ingest-types");
            expect(memory.tags).toContain("typescript");
            expect(memory.tags).toContain("types");
            expect(memory.tags).toContain("auto-generated");
            expect(memory.checksum).toBeTruthy();
            expect(memory.title).toMatch(/^types\//);
        }
    });
    it("extracts exported type aliases", async () => {
        await writeFile(join(tempDir, "types.ts"), `
export type Status = "active" | "inactive" | "pending";

export type UserId = string;
`);
        const result = await extractTypeMemories({
            globPattern: "**/*.ts",
            cwd: tempDir,
        });
        expect(result.filesProcessed).toBe(1);
        expect(result.memories.length).toBeGreaterThanOrEqual(1);
        const allContent = result.memories.map((m) => m.content).join("\n");
        expect(allContent).toContain("Status");
    });
    it("extracts exported functions", async () => {
        await writeFile(join(tempDir, "utils.ts"), `
/** Compute hash of a string */
export function computeHash(input: string): string {
  return input;
}

export const double = (n: number): number => n * 2;
`);
        const result = await extractTypeMemories({
            globPattern: "**/*.ts",
            cwd: tempDir,
        });
        expect(result.filesProcessed).toBe(1);
        const allContent = result.memories.map((m) => m.content).join("\n");
        expect(allContent).toContain("computeHash");
    });
    it("returns empty for no matching files", async () => {
        const result = await extractTypeMemories({
            globPattern: "**/*.ts",
            cwd: tempDir,
        });
        expect(result.filesProcessed).toBe(0);
        expect(result.memories).toHaveLength(0);
    });
    it("returns empty for files with no exports", async () => {
        await writeFile(join(tempDir, "internal.ts"), `
const x = 42;
function helper() { return x; }
`);
        const result = await extractTypeMemories({
            globPattern: "**/*.ts",
            cwd: tempDir,
        });
        expect(result.filesProcessed).toBe(1);
        expect(result.memories).toHaveLength(0);
    });
    it("handles multiple files", async () => {
        await mkdir(join(tempDir, "src"));
        await writeFile(join(tempDir, "src", "auth.ts"), `export interface Session { token: string; userId: string; }`);
        await writeFile(join(tempDir, "src", "db.ts"), `export interface DatabaseConfig { host: string; port: number; }`);
        const result = await extractTypeMemories({
            globPattern: "src/**/*.ts",
            cwd: tempDir,
        });
        expect(result.filesProcessed).toBe(2);
        expect(result.memories.length).toBeGreaterThanOrEqual(2);
        const allContent = result.memories.map((m) => m.content).join("\n");
        expect(allContent).toContain("Session");
        expect(allContent).toContain("DatabaseConfig");
    });
    it("respects exclude patterns", async () => {
        await mkdir(join(tempDir, "src"));
        await mkdir(join(tempDir, "dist"));
        await writeFile(join(tempDir, "src", "api.ts"), `export interface Api { endpoint: string; }`);
        await writeFile(join(tempDir, "dist", "api.ts"), `export interface Api { endpoint: string; }`);
        const result = await extractTypeMemories({
            globPattern: "**/*.ts",
            cwd: tempDir,
            exclude: ["**/dist/**"],
        });
        expect(result.filesProcessed).toBe(1);
    });
    it("applies custom tags", async () => {
        await writeFile(join(tempDir, "schema.ts"), `export interface Table { id: string; }`);
        const result = await extractTypeMemories({
            globPattern: "**/*.ts",
            cwd: tempDir,
            tags: ["convex", "schema"],
        });
        expect(result.memories.length).toBeGreaterThanOrEqual(1);
        for (const memory of result.memories) {
            expect(memory.tags).toContain("convex");
            expect(memory.tags).toContain("schema");
        }
    });
    it("applies custom priority", async () => {
        await writeFile(join(tempDir, "core.ts"), `export interface CoreConfig { debug: boolean; }`);
        const result = await extractTypeMemories({
            globPattern: "**/*.ts",
            cwd: tempDir,
            priority: 0.9,
        });
        expect(result.memories.length).toBeGreaterThanOrEqual(1);
        for (const memory of result.memories) {
            expect(memory.priority).toBe(0.9);
        }
    });
    it("extracts JSDoc comments with types", async () => {
        await writeFile(join(tempDir, "documented.ts"), `
/** Configuration for the application */
export interface AppConfig {
  /** The port to listen on */
  port: number;
  /** Whether to enable debug mode */
  debug: boolean;
}
`);
        const result = await extractTypeMemories({
            globPattern: "**/*.ts",
            cwd: tempDir,
        });
        expect(result.memories.length).toBeGreaterThanOrEqual(1);
        const allContent = result.memories.map((m) => m.content).join("\n");
        expect(allContent).toContain("AppConfig");
        expect(allContent).toContain("Configuration for the application");
    });
});
//# sourceMappingURL=type-extractor.test.js.map