import { describe, it, expect } from "vitest";
import { pushItems, pushOnResize } from "../push";
import type { LayoutItem } from "../types";

describe("pushItems", () => {
  it("should move item to new position when no collision", () => {
    const items: LayoutItem[] = [
      { instanceId: "a", x: 0, y: 0, w: 2, h: 1 },
      { instanceId: "b", x: 4, y: 0, w: 2, h: 1 },
    ];
    const result = pushItems(items, "a", 6, 0);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const moved = result.layout.items.find((i) => i.instanceId === "a");
      expect(moved?.x).toBe(6);
    }
  });

  it("should push colliding items down", () => {
    const items: LayoutItem[] = [
      { instanceId: "a", x: 0, y: 0, w: 2, h: 1 },
      { instanceId: "b", x: 0, y: 2, w: 2, h: 1 },
    ];
    const result = pushItems(items, "a", 0, 2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const b = result.layout.items.find((i) => i.instanceId === "b");
      expect(b?.y).toBeGreaterThan(2);
    }
  });

  it("should fail when pushing locked item", () => {
    const items: LayoutItem[] = [
      { instanceId: "a", x: 0, y: 0, w: 2, h: 1 },
      { instanceId: "b", x: 0, y: 2, w: 2, h: 1, locked: true },
    ];
    const result = pushItems(items, "a", 0, 2);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ITEM_LOCKED");
    }
  });
});

describe("pushOnResize", () => {
  it("should resize item when no collision", () => {
    const items: LayoutItem[] = [
      { instanceId: "a", x: 0, y: 0, w: 2, h: 1 },
    ];
    const result = pushOnResize(items, "a", 4, 2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const resized = result.layout.items.find((i) => i.instanceId === "a");
      expect(resized?.w).toBe(4);
      expect(resized?.h).toBe(2);
    }
  });
});
