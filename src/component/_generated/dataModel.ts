/* eslint-disable */
/**
 * Generated data model types for the component.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { AnyDataModel } from "convex/server";

export type DataModel = AnyDataModel;

export type Doc<TableName extends string> = Record<string, any> & {
  _id: string;
  _creationTime: number;
};

export type Id<TableName extends string> = string & { __tableName: TableName };
