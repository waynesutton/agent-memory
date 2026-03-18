import { readFile } from "node:fs/promises";
import { basename, relative } from "node:path";
import { computeChecksum } from "../component/checksum.js";
import type { ParsedMemory } from "./parsers/types.js";


// ── Types ────────────────────────────────────────────────────────────

export interface IngestTypesOptions {
  /** Glob pattern for TypeScript files, e.g. "src/models.ts" */
  globPattern: string;
  /** Working directory for glob resolution */
  cwd?: string;
  /** Additional tags to attach to generated memories */
  tags?: string[];
  /** Priority for generated memories (0-1, default 0.6) */
  priority?: number;
  /** Exclude patterns (defaults to node_modules, dist, _generated) */
  exclude?: string[];
}

export interface IngestTypesResult {
  memories: ParsedMemory[];
  filesProcessed: number;
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Extract TypeScript type definitions from files matching a glob pattern
 * and convert them into ParsedMemory objects suitable for agent-memory.
 *
 * Uses `types-not-docs` under the hood to generate markdown from types.
 */
export async function extractTypeMemories(
  opts: IngestTypesOptions,
): Promise<IngestTypesResult> {
  const cwd = opts.cwd ?? process.cwd();
  const priority = opts.priority ?? 0.6;
  const extraTags = opts.tags ?? [];
  const exclude = opts.exclude ?? [
    "**/node_modules/**",
    "**/dist/**",
    "**/_generated/**",
    "**/*.test.ts",
    "**/*.spec.ts",
  ];

  // Dynamic import — keeps types-not-docs optional at install time
  const fg = await import("fast-glob");
  const files = await fg.default(opts.globPattern, {
    cwd,
    absolute: true,
    ignore: exclude,
  });

  if (files.length === 0) {
    return { memories: [], filesProcessed: 0 };
  }

  // Generate markdown from type definitions
  const markdown = await generateTypeDocumentation(files);

  if (!markdown.trim()) {
    return { memories: [], filesProcessed: files.length };
  }

  // Split the generated markdown into individual type memories
  const sections = splitByHeadings(markdown, files, cwd);

  const memories: ParsedMemory[] = sections.map((section) => ({
    title: `types/${section.title}`,
    content: section.content,
    memoryType: "reference" as const,
    scope: "project" as const,
    tags: ["typescript", "types", "auto-generated", ...extraTags],
    paths: section.sourcePaths,
    priority,
    source: "ingest-types",
    checksum: computeChecksum(section.content),
  }));

  return { memories, filesProcessed: files.length };
}

// ── Type documentation generation ────────────────────────────────────

/**
 * Generate markdown documentation from TypeScript files using types-not-docs.
 * Falls back to a built-in extractor if types-not-docs is not installed.
 */
async function generateTypeDocumentation(files: string[]): Promise<string> {
  try {
    // Try types-not-docs first (optional dependency)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tnd = await import(/* webpackIgnore: true */ "types-not-docs" as string) as Record<string, unknown>;
    if (typeof tnd.generateDocs === "function") {
      return (tnd.generateDocs as (files: string[]) => string)(files);
    }
    if (typeof tnd.default === "function") {
      return (tnd.default as (files: string[]) => string)(files);
    }
  } catch {
    // types-not-docs not installed — use built-in extractor
  }

  // Built-in fallback: extract exported types/interfaces/functions from TS files
  return await builtInTypeExtractor(files);
}

/**
 * Built-in TypeScript type extractor that doesn't require external dependencies.
 * Parses exported types, interfaces, type aliases, and function signatures.
 */
async function builtInTypeExtractor(files: string[]): Promise<string> {
  const sections: string[] = [];

  for (const filePath of files) {
    const source = await readFile(filePath, "utf-8");
    const extracted = extractExportedTypes(source, filePath);
    if (extracted) {
      sections.push(extracted);
    }
  }

  return sections.join("\n\n");
}

/**
 * Extract exported type definitions from a single TypeScript file.
 */
function extractExportedTypes(source: string, filePath: string): string | null {
  const lines = source.split("\n");
  const blocks: string[] = [];
  let currentBlock: string[] = [];
  let braceDepth = 0;
  let inExport = false;
  let currentKind = "";
  let currentName = "";
  let pendingJsDoc: string[] = [];

  function flushBlock() {
    if (currentName && currentBlock.length > 0) {
      blocks.push(formatBlock(currentKind, currentName, currentBlock));
    }
    inExport = false;
    currentBlock = [];
    braceDepth = 0;
    currentKind = "";
    currentName = "";
  }

  function countBraces(line: string) {
    for (const ch of line) {
      if (ch === "{") braceDepth++;
      if (ch === "}") braceDepth--;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Collect JSDoc comments (only when not inside an export block)
    if (!inExport && trimmed.startsWith("/**")) {
      pendingJsDoc = [line];
      if (!trimmed.endsWith("*/")) {
        for (let j = i + 1; j < lines.length; j++) {
          pendingJsDoc.push(lines[j]);
          if (lines[j].trim().endsWith("*/")) {
            i = j;
            break;
          }
        }
      }
      continue;
    }

    // Match exported type definitions
    if (!inExport) {
      const exportMatch = trimmed.match(
        /^export\s+(interface|type|function|const|class|enum|abstract\s+class)\s+(\w+)/,
      );

      if (exportMatch) {
        currentKind = exportMatch[1];
        currentName = exportMatch[2];
        currentBlock = [...pendingJsDoc, line];
        pendingJsDoc = [];
        braceDepth = 0;
        countBraces(line);

        // Check if statement is complete on this line
        const isComplete =
          // Single-line with no braces, ending in semicolon (type alias)
          (braceDepth === 0 && !line.includes("{") && trimmed.endsWith(";")) ||
          // Single-line with balanced braces
          (braceDepth === 0 && line.includes("{"));

        if (isComplete) {
          flushBlock();
        } else {
          inExport = true;
        }
        continue;
      }

      // No match — clear pending JSDoc
      if (trimmed && !trimmed.startsWith("//") && !trimmed.startsWith("*")) {
        pendingJsDoc = [];
      }
      continue;
    }

    // Inside a multi-line export — keep collecting
    currentBlock.push(line);
    countBraces(line);

    if (braceDepth <= 0) {
      flushBlock();
    }
  }

  // Flush any remaining block
  if (inExport) {
    flushBlock();
  }

  if (blocks.length === 0) return null;

  const fileName = basename(filePath);
  return `## ${fileName}\n\n${blocks.join("\n\n")}`;
}

function formatBlock(
  kind: string,
  name: string,
  lines: string[],
): string {
  const code = lines.join("\n").trim();
  return `### ${name}\n\n\`${kind}\`\n\n\`\`\`typescript\n${code}\n\`\`\``;
}

// ── Markdown splitting ───────────────────────────────────────────────

interface Section {
  title: string;
  content: string;
  sourcePaths: string[];
}

/**
 * Split generated markdown into sections by ## headings.
 * Each ## heading becomes a separate memory entry.
 */
function splitByHeadings(
  markdown: string,
  sourceFiles: string[],
  cwd: string,
): Section[] {
  const lines = markdown.split("\n");
  const sections: Section[] = [];
  let currentTitle = "";
  let currentLines: string[] = [];

  const relPaths = sourceFiles.map((f) => relative(cwd, f));

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      // Flush previous section
      if (currentTitle && currentLines.length > 0) {
        const content = currentLines.join("\n").trim();
        if (content) {
          sections.push({
            title: sanitizeTitle(currentTitle),
            content,
            sourcePaths: findMatchingPaths(currentTitle, relPaths),
          });
        }
      }
      currentTitle = h2Match[1];
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Flush last section
  if (currentTitle && currentLines.length > 0) {
    const content = currentLines.join("\n").trim();
    if (content) {
      sections.push({
        title: sanitizeTitle(currentTitle),
        content,
        sourcePaths: findMatchingPaths(currentTitle, relPaths),
      });
    }
  }

  // Fallback: if no ## headings, treat the whole thing as one section
  if (sections.length === 0 && markdown.trim()) {
    sections.push({
      title: "api-reference",
      content: markdown.trim(),
      sourcePaths: relPaths,
    });
  }

  return sections;
}

function sanitizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\.tsx?$/, "")
    .replace(/[^a-z0-9-_./]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function findMatchingPaths(title: string, relPaths: string[]): string[] {
  // Try to match the heading (usually a filename) back to source paths
  const match = relPaths.filter(
    (p) =>
      p.includes(title) ||
      basename(p, ".ts") === title ||
      basename(p, ".tsx") === title,
  );
  return match.length > 0 ? match : relPaths.slice(0, 1);
}
