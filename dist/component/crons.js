import { cronJobs } from "convex/server";
import { internal } from "./_generated/api.js";
const crons = cronJobs();
// Run relevance decay daily at 3 AM UTC
// This reduces priority of stale, low-access memories so they don't
// dominate context bundles over time.
// Note: The cron calls an internal action that iterates projects with
// decay enabled and applies the decay function to each.
crons.daily("relevance-decay", { hourUTC: 3, minuteUTC: 0 }, internal.cronActions.runDecayForAllProjects);
// Clean up old history entries weekly (Sundays at 4 AM UTC)
// Keeps the memoryHistory table from growing unbounded.
// Retains the last 90 days of history by default.
crons.weekly("cleanup-old-history", { dayOfWeek: "sunday", hourUTC: 4, minuteUTC: 0 }, internal.cronActions.runHistoryCleanupForAllProjects);
// Clean up expired rate limit token records hourly
// Removes window records older than 1 hour to prevent unbounded growth.
crons.interval("cleanup-rate-limit-tokens", { hours: 1 }, internal.apiKeyMutations.cleanupRateLimitTokens);
export default crons;
//# sourceMappingURL=crons.js.map