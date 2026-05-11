import { describe, it, expect } from "vitest";
import { overlaps, collides, validateLayout } from "../collision";
import type { LayoutItem } from "../types";

describe("overlaps", () => {
  it("should detect overlapping rectangles", () => {
    const a: LayoutItem = { instanceId: "a", x: 0, y: 0, w: 2, h: 2 };
    const b: LayoutItem = { instanceId: "b", x: 1, y: 1, w: 2, h: 2 };
    expect(overlaps(a, b)).toBe(true);
  });

  it("should not flag touching edges as overlap", () => {
    const a: LayoutItem = { instanceId: "a", x: 0, y: 0, w: 2, h: 2 };
    const b: LayoutItem = { instanceId: "b", x: 2, y: 0, w: 2, h: 2 };
    expect(overlaps(a, b)).toBe(false);
  });

  it("should handle zero-size items", () => {
    const a: LayoutItem = { instanceId: "a", x: 0, y: 0, w: 0, h: 0 };
    const b: LayoutItem = { instanceId: "b", x: 0, y: 0, w: 2, h: 2 };
    expect(overlaps(a, b)).toBe(false);
  });
});

describe("collides", () => {
  it("should detect collision with other items", () => {
    const items: LayoutItem[] = [
      { instanceId: "a", x: 0, y: 0, w: 2, h: 2 },
    ];
    const target: LayoutItem = { instanceId: "b", x: 1, y: 1, w: 2, h: 2 };
    expect(collides(items, target)).toBe(true);
  });

  it("should exclude specified id from collision check", () => {
    const items: LayoutItem[] = [
      { instanceId: "a", x: 0, y: 0, w: 2, h: 2 },
    ];
    const target: LayoutItem = { instanceId: "a", x: 0, y: 0, w: 2, h: 2 };
    expect(collides(items, target, "a")).toBe(false);
  });
});

describe("validateLayout", () => {
  it("should accept valid layout", () => {
    const items: LayoutItem[] = [
      { instanceId: "a", x: 0, y: 0, w: 2, h: 1 },
      { instanceId: "b", x: 2, y: 0, w: 2, h: 1 },
    ];
    expect(validateLayout(items)).toBe(true);
  });

  it("should reject overlapping items", () => {
    const items: LayoutItem[] = [
      { instanceId: "a", x: 0, y: 0, w: 3, h: 2 },
      { instanceId: "b", x: 1, y: 1, w: 3, h: 2 },
    ];
    expect(validateLayout(items)).toBe(false);
  });

  it("should reject duplicate instanceId", () => {
    const items: LayoutItem[] = [
      { instanceId: "a", x: 0, y: 0, w: 2, h: 1 },
      { instanceId: "a", x: 3, y: 0, w: 2, h: 1 },
    ];
    expect(validateLayout(items)).toBe(false);
  });

  it("should reject negative coordinates", () => {
    const items: LayoutItem[] = [
      { instanceId: "a", x: -1, y: 0, w: 2, h: 1 },
    ];
    expect(validateLayout(items)).toBe(false);
  });
});
