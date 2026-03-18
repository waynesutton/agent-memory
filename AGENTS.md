# Agent Instructions — @waynesutton/agent-memory

## Project Overview

This is a Convex Component npm package (`@waynesutton/agent-memory`) that provides persistent, cloud-synced memory for AI coding agents. It is not a standalone app — it is installed into other Convex apps via `app.use(agentMemory)`.

## Tech Stack

- **Runtime:** Convex (serverless backend)
- **Language:** TypeScript (strict mode)
- **Build:** `tsc` (no bundler)
- **Test:** Vitest + convex-test
- **Package manager:** npm

## Project Structure

```
src/
├── component/           # Convex backend (defineComponent)
│   ├── schema.ts        # 9 tables with validators and indexes
│   ├── mutations.ts     # CRUD + batch + feedback + relations + history
│   ├── queries.ts       # list, search, context bundle, history, feedback
│   ├── actions.ts       # embeddings, semantic search, intelligent ingest
│   ├── apiKeyMutations.ts  # API key create/revoke, rate limit
│   ├── apiKeyQueries.ts    # API key validation
│   ├── crons.ts         # Scheduled jobs (decay, cleanup)
│   ├── cronActions.ts   # Internal actions for crons
│   ├── cronQueries.ts   # Internal queries for crons
│   ├── format.ts        # Memory -> tool-native file conversion
│   └── checksum.ts      # FNV-1a hashing
├── client/
│   ├── index.ts         # AgentMemory class (public API)
│   └── http.ts          # MemoryHttpApi class (HTTP endpoints)
├── mcp/
│   └── server.ts        # MCP server (14 tools)
├── cli/
│   ├── index.ts         # CLI entry point
│   ├── sync.ts          # Push/pull logic
│   └── parsers/         # 8 tool format parsers
├── shared.ts            # Shared types and validators
└── test.ts              # Test helper
```

## Development Commands

```bash
npm run build        # tsc compile
npm run dev          # tsc --watch
npm test             # vitest run
npm run test:watch   # vitest watch
npm run codegen      # convex codegen for component
```

## Coding Conventions

### Convex Component Rules

1. **All public functions must have `args` and `returns` validators** — Convex components require explicit validators on every exported query, mutation, and action.
2. **No `ctx.auth`** — components cannot access the consuming app's auth. Identity is passed explicitly via `userId`, `agentId`, etc.
3. **No `process.env`** — components cannot read environment variables. Config values like API keys are passed as function arguments.
4. **IDs become strings at the boundary** — when the consuming app calls component functions, Convex `Id<"table">` values cross as strings. Cast with `as any` at boundaries.
5. **Use `(q: any)` for index queries** — TypeScript struggles with component-internal index types. Use `any` for `.withIndex()` callback parameters.
6. **Component tables are isolated** — the 9 tables live under the `agentMemory:` namespace, separate from the consuming app's tables.

### TypeScript

- Strict mode enabled
- Use `import type` for type-only imports
- Use `.js` extensions in import paths (ESM)
- Prefer `as const` for literal arrays used as validators

### Style

- Functions use explicit return types where validators require it
- Mutations that modify state always record history entries
- Checksums use FNV-1a (see `src/component/checksum.ts`)
- All timestamps are `Date.now()` (milliseconds)

## Key Patterns

### Adding a new query/mutation to the component

1. Add the function to `src/component/queries.ts` or `src/component/mutations.ts`
2. Include full `args` and `returns` validators
3. Add a wrapper method to `src/client/index.ts` (AgentMemory class)
4. If MCP-accessible, add a tool definition to `src/mcp/server.ts`
5. Update `src/shared.ts` if new types are needed

### The context bundle pattern

`getContextBundle` returns memories in 3 tiers:
- **pinned** — effective priority >= 0.8 (boosted by positive feedback)
- **relevant** — path-matched against `activePaths`
- **available** — everything else as summaries

Priority is computed by `getEffectivePriority()` which factors in `positiveCount` and `negativeCount`.

### The intelligent ingest pipeline

`actions.ingest` does: extract facts (LLM) -> search existing (full-text) -> decide per-fact (LLM) -> execute ADD/UPDATE/DELETE/SKIP.

## Testing

Tests use `convex-test` with Vitest. The component exports a test helper at `@waynesutton/agent-memory/test`.

## Documentation

- `prds/README.md` — user-facing README
- `prds/API-REFERENCE.md` — complete API reference
- `prds/SETUP.md` — step-by-step setup guide
- `llms.txt` — concise reference for LLMs
- `llms.md` — detailed agent reference
- `CLAUDE.md` — Claude Code specific instructions
