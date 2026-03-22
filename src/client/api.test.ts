import { describe, it, expect, vi } from "vitest";
import { createApi } from "./api.js";

// Mock component — each leaf is a unique symbol so we can verify
// the handler passes the correct function reference to ctx.runXxx.
function mockComponent() {
  return {
    queries: {
      list: Symbol("queries.list"),
      get: Symbol("queries.get"),
      search: Symbol("queries.search"),
      getContextBundle: Symbol("queries.getContextBundle"),
      history: Symbol("queries.history"),
      projectHistory: Symbol("queries.projectHistory"),
      getFeedback: Symbol("queries.getFeedback"),
      getRelations: Symbol("queries.getRelations"),
      exportForTool: Symbol("queries.exportForTool"),
    },
    mutations: {
      create: Symbol("mutations.create"),
      update: Symbol("mutations.update"),
      archive: Symbol("mutations.archive"),
      restore: Symbol("mutations.restore"),
      batchArchive: Symbol("mutations.batchArchive"),
      addFeedback: Symbol("mutations.addFeedback"),
      addRelation: Symbol("mutations.addRelation"),
      importFromLocal: Symbol("mutations.importFromLocal"),
      upsertProject: Symbol("mutations.upsertProject"),
    },
    actions: {
      ingest: Symbol("actions.ingest"),
      semanticSearch: Symbol("actions.semanticSearch"),
      generateEmbedding: Symbol("actions.generateEmbedding"),
      embedAll: Symbol("actions.embedAll"),
    },
  };
}

function mockCtx() {
  return {
    runQuery: vi.fn().mockResolvedValue("query-result"),
    runMutation: vi.fn().mockResolvedValue("mutation-result"),
    runAction: vi.fn().mockResolvedValue("action-result"),
  };
}

describe("createApi", () => {
  it("returns queries, mutations, and actions", () => {
    const api = createApi(mockComponent() as any);
    expect(api.queries).toBeDefined();
    expect(api.mutations).toBeDefined();
    expect(api.actions).toBeDefined();
  });

  it("every function definition has args, returns, and handler", () => {
    const api = createApi(mockComponent() as any);

    for (const [name, def] of Object.entries(api.queries)) {
      expect(def.args, `queries.${name}.args`).toBeDefined();
      expect(def.returns, `queries.${name}.returns`).toBeDefined();
      expect(def.handler, `queries.${name}.handler`).toBeTypeOf("function");
    }
    for (const [name, def] of Object.entries(api.mutations)) {
      expect(def.args, `mutations.${name}.args`).toBeDefined();
      expect(def.returns, `mutations.${name}.returns`).toBeDefined();
      expect(def.handler, `mutations.${name}.handler`).toBeTypeOf("function");
    }
    for (const [name, def] of Object.entries(api.actions)) {
      expect(def.args, `actions.${name}.args`).toBeDefined();
      expect(def.returns, `actions.${name}.returns`).toBeDefined();
      expect(def.handler, `actions.${name}.handler`).toBeTypeOf("function");
    }
  });

  // ── Query handlers call ctx.runQuery with correct ref ───────────

  it.each([
    "list",
    "get",
    "search",
    "getContextBundle",
    "history",
    "projectHistory",
    "getFeedback",
    "getRelations",
    "exportForTool",
  ] as const)("queries.%s handler calls ctx.runQuery", async (name) => {
    const comp = mockComponent();
    const api = createApi(comp as any);
    const ctx = mockCtx();
    const args = { projectId: "test" };

    await (api.queries as any)[name].handler(ctx, args);

    expect(ctx.runQuery).toHaveBeenCalledOnce();
    expect(ctx.runQuery).toHaveBeenCalledWith(
      (comp.queries as any)[name],
      args,
    );
    expect(ctx.runMutation).not.toHaveBeenCalled();
    expect(ctx.runAction).not.toHaveBeenCalled();
  });

  // ── Mutation handlers call ctx.runMutation with correct ref ─────

  it.each([
    "create",
    "update",
    "archive",
    "restore",
    "batchArchive",
    "addFeedback",
    "addRelation",
    "importFromLocal",
    "upsertProject",
  ] as const)("mutations.%s handler calls ctx.runMutation", async (name) => {
    const comp = mockComponent();
    const api = createApi(comp as any);
    const ctx = mockCtx();
    const args = { memoryId: "test" };

    await (api.mutations as any)[name].handler(ctx, args);

    expect(ctx.runMutation).toHaveBeenCalledOnce();
    expect(ctx.runMutation).toHaveBeenCalledWith(
      (comp.mutations as any)[name],
      args,
    );
    expect(ctx.runQuery).not.toHaveBeenCalled();
    expect(ctx.runAction).not.toHaveBeenCalled();
  });

  // ── Action handlers call ctx.runAction with correct ref ─────────

  it.each([
    "ingest",
    "semanticSearch",
    "generateEmbedding",
    "embedAll",
  ] as const)("actions.%s handler calls ctx.runAction", async (name) => {
    const comp = mockComponent();
    const api = createApi(comp as any);
    const ctx = mockCtx();
    const args = { projectId: "test" };

    await (api.actions as any)[name].handler(ctx, args);

    expect(ctx.runAction).toHaveBeenCalledOnce();
    expect(ctx.runAction).toHaveBeenCalledWith(
      (comp.actions as any)[name],
      args,
    );
    expect(ctx.runQuery).not.toHaveBeenCalled();
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });
});
