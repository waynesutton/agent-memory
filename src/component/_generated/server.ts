/* eslint-disable */
/**
 * Generated utilities for the component server.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import {
  actionGeneric,
  queryGeneric,
  mutationGeneric,
  internalActionGeneric,
  internalQueryGeneric,
  internalMutationGeneric,
  componentsGeneric,
  type GenericQueryCtx,
  type GenericMutationCtx,
  type GenericActionCtx,
} from "convex/server";
import type { DataModel } from "./dataModel.js";

/**
 * Define a query in this Convex component.
 */
export const query = queryGeneric as typeof queryGeneric;

/**
 * Define a mutation in this Convex component.
 */
export const mutation = mutationGeneric as typeof mutationGeneric;

/**
 * Define an action in this Convex component.
 */
export const action = actionGeneric as typeof actionGeneric;

/**
 * Define an internal query in this Convex component.
 */
export const internalQuery = internalQueryGeneric as typeof internalQueryGeneric;

/**
 * Define an internal mutation in this Convex component.
 */
export const internalMutation =
  internalMutationGeneric as typeof internalMutationGeneric;

/**
 * Define an internal action in this Convex component.
 */
export const internalAction =
  internalActionGeneric as typeof internalActionGeneric;

/**
 * Access component APIs.
 */
export const components = componentsGeneric();

export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;
export type ActionCtx = GenericActionCtx<DataModel>;
