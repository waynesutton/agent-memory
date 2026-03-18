export type { Parser, ParsedMemory } from "./types.js";
export { claudeCodeParser } from "./claude-code.js";
export { cursorParser } from "./cursor.js";
export { openCodeParser } from "./opencode.js";
export { codexParser } from "./codex.js";
export { conductorParser } from "./conductor.js";
export { zedParser } from "./zed.js";
export { vscodeCopilotParser } from "./vscode-copilot.js";
export { piParser } from "./pi.js";

import type { Parser } from "./types.js";
import { claudeCodeParser } from "./claude-code.js";
import { cursorParser } from "./cursor.js";
import { openCodeParser } from "./opencode.js";
import { codexParser } from "./codex.js";
import { conductorParser } from "./conductor.js";
import { zedParser } from "./zed.js";
import { vscodeCopilotParser } from "./vscode-copilot.js";
import { piParser } from "./pi.js";

export const ALL_PARSERS: Record<string, Parser> = {
  "claude-code": claudeCodeParser,
  cursor: cursorParser,
  opencode: openCodeParser,
  codex: codexParser,
  conductor: conductorParser,
  zed: zedParser,
  "vscode-copilot": vscodeCopilotParser,
  pi: piParser,
};
