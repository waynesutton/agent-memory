declare global {
    interface ImportMeta {
        glob(pattern: string): Record<string, () => Promise<unknown>>;
    }
}
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
export declare function register(t: any, name?: string): void;
declare const _default: {
    register: typeof register;
};
export default _default;
//# sourceMappingURL=test.d.ts.map