import schema from "./component/schema.js";

// Vite's import.meta.glob — typed for convex-test compatibility
declare global {
  interface ImportMeta {
    glob(pattern: string): Record<string, () => Promise<unknown>>;
  }
}

const modules = import.meta.glob("./component/**/*.ts");

/**
 * Register the agentMemory component in a convex-test instance.
 *
 * @example
 * ```ts
 * import agentMemoryTest from "@waynesutton/agent-memory/test";
 * import { convexTest } from "convex-test";
 *
 * const t = convexTest();
 * agentMemoryTest.register(t);
 * ```
 */
export function register(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any,
  name: string = "agentMemory",
) {
  t.registerComponent(name, schema, modules);
}

export default { register };
