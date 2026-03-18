import type { MemoryType, Scope } from "../../shared.js";

/**
 * A normalized memory object parsed from a local file.
 * This is the common format all parsers produce.
 */
export interface ParsedMemory {
  title: string;
  content: string;
  memoryType: MemoryType;
  scope: Scope;
  tags: string[];
  paths?: string[];
  priority?: number;
  source: string;
  checksum: string;
}

export interface Parser {
  /** Human-readable name of the tool */
  name: string;
  /** Detect if this tool is present in the given directory */
  detect(dir: string): Promise<boolean>;
  /** Parse all memory files from the given directory */
  parse(dir: string): Promise<ParsedMemory[]>;
}
