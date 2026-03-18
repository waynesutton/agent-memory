# CLAUDE.md — @waynesutton/agent-memory

## What This Project Is

A Convex Component npm package that provides persistent, cloud-synced memory for AI coding agents. Installed into Convex apps via `app.use(agentMemory)`. Not a standalone app.

## Build & Test

```bash
npm run build        # tsc
npm test             # vitest run
npm run codegen      # convex codegen --component-dir ./src/component
```

## Key Files

- `src/component/schema.ts` — 9 tables (memories, embeddings, projects, syncLog, memoryHistory, memoryFeedback, memoryRelations, apiKeys, rateLimitTokens)
- `src/component/mutations.ts` — all write operations with history tracking
- `src/component/queries.ts` — all read operations
- `src/component/actions.ts` — embeddings, semantic search, intelligent ingest
- `src/component/apiKeyMutations.ts` — API key CRUD and rate limiting
- `src/component/apiKeyQueries.ts` — API key validation
- `src/client/index.ts` — `AgentMemory` class (the public API consumers use)
- `src/client/http.ts` — `MemoryHttpApi` class (read-only HTTP endpoints)
- `src/mcp/server.ts` — MCP server with 14 tools
- `src/shared.ts` — shared types and validators (used by both component and client)
- `src/component/crons.ts` — scheduled jobs (relevance decay, cleanup)

## Convex Component Rules (IMPORTANT)

These rules are non-negotiable when modifying this codebase:

1. **Every exported query/mutation/action must have `args` and `returns` validators.** This is a Convex component requirement. Missing validators will cause deployment failures.

2. **No `ctx.auth` inside `src/component/`.** Components don't have access to the consuming app's auth system. User identity is passed explicitly as string args (`userId`, `agentId`).

3. **No `process.env` inside `src/component/`.** Components run in an isolated environment. API keys and config must be passed as function arguments.

4. **IDs are strings at the component boundary.** When the consuming app calls component functions, `Id<"memories">` becomes `string`. Use `as any` or `as unknown as string` at boundaries.

5. **Use `(q: any)` in `.withIndex()` callbacks.** The generated types for component indexes don't resolve cleanly — use `any` for the query builder parameter.

6. **Import paths use `.js` extensions.** This is ESM. Write `import { foo } from "./bar.js"` not `"./bar"`.

7. **Mutations that change content must record history.** Every create/update/archive/restore writes to the `memoryHistory` table for audit trail.

## Code Style

- TypeScript strict mode
- No bundler — plain `tsc` output
- Prefer `as const` arrays for validator source-of-truth
- Timestamps are always `Date.now()` (milliseconds)
- Checksums use FNV-1a (`src/component/checksum.ts`)
- No unnecessary abstractions — three similar lines > premature helper

## Architecture Notes

- The `AgentMemory` class in `src/client/index.ts` wraps all component function calls. Consumers never call component functions directly in practice.
- The `MemoryHttpApi` class in `src/client/http.ts` generates `httpAction` handlers. It cannot create HTTP routes directly (Convex component limitation) — the consuming app mounts them.
- The MCP server (`src/mcp/server.ts`) runs as a local process using stdio, not as a Convex function. It uses `ConvexHttpClient` to talk to the backend.
- Cron jobs are defined in `src/component/crons.ts` and call internal actions/mutations. They run inside the component's isolated environment.
- The intelligent ingest pipeline (`actions.ingest`) calls an external LLM API from within a Convex action. It extracts facts, searches for overlap, and decides ADD/UPDATE/DELETE/SKIP per fact.

## When Adding Features

1. Start with the schema if new tables/fields are needed (`src/component/schema.ts`)
2. Add component functions (queries/mutations/actions in `src/component/`)
3. Add client wrapper methods (`src/client/index.ts`)
4. Add MCP tool if agent-accessible (`src/mcp/server.ts`)
5. Add types to `src/shared.ts` if needed
6. Update docs: `prds/API-REFERENCE.md`, `README.md`, `prds/SETUP.md`
7. Run `npm run build` to verify — zero TypeScript errors required

## Docs Location

User-facing docs are in `prds/` (not the project root):
- `README.md` — full README
- `prds/API-REFERENCE.md` — complete API reference
- `prds/SETUP.md` — setup guide with all integration paths (A through H)
