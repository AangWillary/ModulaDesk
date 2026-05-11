import { describe, it, expect } from "vitest";
import { serializeLayout, deserializeLayout } from "../persistence";
import type { Layout } from "../types";

const testLayout: Layout = {
  version: 1,
  id: "test",
  columns: 12,
  rowHeight: 100,
  gap: 8,
  items: [{ instanceId: "a", x: 0, y: 0, w: 2, h: 1 }],
};

describe("serializeLayout", () => {
  it("should wrap layout with version and savedAt", () => {
    const result = serializeLayout(testLayout);
    expect(result.version).toBe(1);
    expect(result.savedAt).toBeDefined();
    expect(result.layout).toBe(testLayout);
  });
});

describe("deserializeLayout", () => {
  it("should round-trip through serialize/deserialize", () => {
    const serialized = serializeLayout(testLayout);
    const result = deserializeLayout(JSON.stringify(serialized));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.layout.items).toHaveLength(1);
      expect(result.layout.items[0].instanceId).toBe("a");
    }
  });

  it("should handle legacy format without wrapper", () => {
    const result = deserializeLayout(JSON.stringify(testLayout));
    expect(result.ok).toBe(true);
  });

  it("should reject invalid JSON", () => {
    const result = deserializeLayout("not json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("DESERIALIZE_FAILED");
  });
});
