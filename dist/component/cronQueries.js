import { internalQuery } from "./_generated/server.js";
import { v } from "convex/values";
// List projects that have relevance decay enabled
export const listDecayEnabledProjects = internalQuery({
    args: {},
    returns: v.array(v.object({
        projectId: v.string(),
        settings: v.object({
            autoSync: v.boolean(),
            syncFormats: v.array(v.string()),
            embeddingModel: v.optional(v.string()),
            embeddingDimensions: v.optional(v.float64()),
            factExtractionPrompt: v.optional(v.string()),
            updateDecisionPrompt: v.optional(v.string()),
            decayEnabled: v.optional(v.boolean()),
            decayHalfLifeDays: v.optional(v.float64()),
        }),
    })),
    handler: async (ctx) => {
        const allProjects = await ctx.db.query("projects").take(100);
        return allProjects
            .filter((p) => p.settings.decayEnabled === true)
            .map((p) => ({
            projectId: p.projectId,
            settings: p.settings,
        }));
    },
});
// List all project IDs (for cleanup cron)
export const listAllProjectIds = internalQuery({
    args: {},
    returns: v.array(v.string()),
    handler: async (ctx) => {
        const allProjects = await ctx.db.query("projects").take(100);
        return allProjects.map((p) => p.projectId);
    },
});
//# sourceMappingURL=cronQueries.js.map