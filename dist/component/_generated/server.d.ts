/**
 * Generated utilities for the component server.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */
import { actionGeneric, queryGeneric, mutationGeneric, internalActionGeneric, internalQueryGeneric, internalMutationGeneric, type GenericQueryCtx, type GenericMutationCtx, type GenericActionCtx } from "convex/server";
import type { DataModel } from "./dataModel.js";
/**
 * Define a query in this Convex component.
 */
export declare const query: typeof queryGeneric;
/**
 * Define a mutation in this Convex component.
 */
export declare const mutation: typeof mutationGeneric;
/**
 * Define an action in this Convex component.
 */
export declare const action: typeof actionGeneric;
/**
 * Define an internal query in this Convex component.
 */
export declare const internalQuery: typeof internalQueryGeneric;
/**
 * Define an internal mutation in this Convex component.
 */
export declare const internalMutation: typeof internalMutationGeneric;
/**
 * Define an internal action in this Convex component.
 */
export declare const internalAction: typeof internalActionGeneric;
/**
 * Access component APIs.
 */
export declare const components: import("convex/server").AnyChildComponents;
export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;
export type ActionCtx = GenericActionCtx<DataModel>;
//# sourceMappingURL=server.d.ts.map