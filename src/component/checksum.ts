/**
 * Compute a simple hash of content for change detection.
 * Uses a fast string hash (FNV-1a) — not cryptographic, just for diffing.
 */
export function computeChecksum(content: string): string {
  let hash = 2166136261;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // Convert to unsigned 32-bit hex
  return (hash >>> 0).toString(16).padStart(8, "0");
}
