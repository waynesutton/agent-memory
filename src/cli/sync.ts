import { ConvexHttpClient } from "convex/browser";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ALL_PARSERS } from "./parsers/index.js";
import type { ToolFormat } from "../shared.js";

export interface SyncConfig {
  convexUrl: string;
  projectId: string;
  userId?: string;
  format?: ToolFormat;
  dir: string;
}

/**
 * Push local memory files to Convex.
 */
export async function push(config: SyncConfig): Promise<void> {
  const client = new ConvexHttpClient(config.convexUrl);
  const parsersToUse = config.format
    ? { [config.format]: ALL_PARSERS[config.format] }
    : ALL_PARSERS;

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalUnchanged = 0;

  for (const [name, parser] of Object.entries(parsersToUse)) {
    if (!parser) continue;
    const detected = await parser.detect(config.dir);
    if (!detected) continue;

    console.log(`  Parsing ${parser.name} files...`);
    const memories = await parser.parse(config.dir);

    if (memories.length === 0) {
      console.log(`  No memories found for ${parser.name}`);
      continue;
    }

    // Use the component's importFromLocal mutation
    // The API path depends on how the component is mounted
    const result = await client.mutation(
      "agentMemory/mutations:importFromLocal" as any,
      {
        projectId: config.projectId,
        userId: config.userId,
        memories,
      },
    );

    totalCreated += result.created;
    totalUpdated += result.updated;
    totalUnchanged += result.unchanged;

    console.log(
      `  ${parser.name}: ${result.created} created, ${result.updated} updated, ${result.unchanged} unchanged`,
    );
  }

  console.log(
    `\nTotal: ${totalCreated} created, ${totalUpdated} updated, ${totalUnchanged} unchanged`,
  );
}

/**
 * Pull memories from Convex and write to local files.
 */
export async function pull(config: SyncConfig): Promise<void> {
  const client = new ConvexHttpClient(config.convexUrl);
  const format = config.format ?? "raw";

  console.log(`  Pulling memories as ${format} format...`);

  const files = await client.query(
    "agentMemory/queries:exportForTool" as any,
    {
      projectId: config.projectId,
      format,
      userId: config.userId,
    },
  );

  if (files.length === 0) {
    console.log("  No memories to pull");
    return;
  }

  for (const file of files) {
    const fullPath = join(config.dir, file.path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content, "utf-8");
    console.log(`  Wrote ${file.path}`);
  }

  console.log(`\nPulled ${files.length} files`);
}

/**
 * Detect which tools are present in the directory.
 */
export async function detectTools(dir: string): Promise<string[]> {
  const detected: string[] = [];
  for (const [name, parser] of Object.entries(ALL_PARSERS)) {
    if (await parser.detect(dir)) {
      detected.push(name);
    }
  }
  return detected;
}
