/**
 * Example: exposing agent-memory as public functions.
 *
 * The CLI and MCP server call these by name (e.g. "memory:list",
 * "memory:create"). The module name defaults to "memory" — if you
 * rename this file, pass --module <name> to the CLI/MCP.
 */

import { query, mutation, action } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { createApi } from "../../src/client/api.js";

const api = createApi(components.agentMemory);

// ── Queries ──────────────────────────────────────────────────────────

export const list = query(api.queries.list);
export const get = query(api.queries.get);
export const search = query(api.queries.search);
export const getContextBundle = query(api.queries.getContextBundle);
export const history = query(api.queries.history);
export const projectHistory = query(api.queries.projectHistory);
export const getFeedback = query(api.queries.getFeedback);
export const getRelations = query(api.queries.getRelations);
export const exportForTool = query(api.queries.exportForTool);

// ── Mutations ────────────────────────────────────────────────────────

export const create = mutation(api.mutations.create);
export const update = mutation(api.mutations.update);
export const archive = mutation(api.mutations.archive);
export const restore = mutation(api.mutations.restore);
export const batchArchive = mutation(api.mutations.batchArchive);
export const addFeedback = mutation(api.mutations.addFeedback);
export const addRelation = mutation(api.mutations.addRelation);
export const importFromLocal = mutation(api.mutations.importFromLocal);
export const upsertProject = mutation(api.mutations.upsertProject);

// ── Actions ──────────────────────────────────────────────────────────

export const ingest = action(api.actions.ingest);
export const semanticSearch = action(api.actions.semanticSearch);
export const generateEmbedding = action(api.actions.generateEmbedding);
export const embedAll = action(api.actions.embedAll);
