import schema from "./component/schema.js";
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
t, name = "agentMemory") {
    t.registerComponent(name, schema, modules);
}
export default { register };
//# sourceMappingURL=test.js.map