import { describe, it, expect } from "vitest";
import { computeChecksum } from "./checksum.js";
describe("computeChecksum", () => {
    it("returns a hex string", () => {
        const hash = computeChecksum("hello world");
        expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });
    it("returns consistent results", () => {
        const a = computeChecksum("test content");
        const b = computeChecksum("test content");
        expect(a).toBe(b);
    });
    it("returns different results for different inputs", () => {
        const a = computeChecksum("content A");
        const b = computeChecksum("content B");
        expect(a).not.toBe(b);
    });
    it("handles empty string", () => {
        const hash = computeChecksum("");
        expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });
    it("handles unicode content", () => {
        const hash = computeChecksum("こんにちは世界 🌍");
        expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });
});
//# sourceMappingURL=checksum.test.js.map