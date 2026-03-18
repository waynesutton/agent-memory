import { internalAction } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { v } from "convex/values";

// ── Decay: iterate all projects and apply decay ─────────────────────

export const runDecayForAllProjects = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Get all projects that have decay enabled
    const projects = await ctx.runQuery(
      internal.cronQueries.listDecayEnabledProjects,
    );

    for (const project of projects) {
      const halfLifeDays =
        project.settings.decayHalfLifeDays ?? 30;

      await ctx.runMutation(internal.mutations.applyDecay, {
        projectId: project.projectId,
        halfLifeDays,
      });
    }

    return null;
  },
});

// ── History cleanup: iterate all projects ───────────────────────────

export const runHistoryCleanupForAllProjects = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const projects = await ctx.runQuery(
      internal.cronQueries.listAllProjectIds,
    );

    // 90 days in milliseconds
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

    for (const projectId of projects) {
      await ctx.runMutation(internal.mutations.cleanupOldHistory, {
        projectId,
        olderThanMs: ninetyDaysMs,
      });
    }

    return null;
  },
});
