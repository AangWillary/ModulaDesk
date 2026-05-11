import { describe, it, expect } from "vitest";
import { columnWidth, pixelToGrid, gridToPixel, findEmptyPosition } from "../grid";
import type { Layout } from "../types";

const layout: Layout = {
  version: 1,
  id: "test",
  columns: 12,
  rowHeight: 100,
  gap: 8,
  items: [],
};

describe("columnWidth", () => {
  it("should calculate column width correctly", () => {
    // 1200px container, 12 columns, 11 gaps of 8px = 88px
    // (1200 - 88) / 12 = 92.67
    const cw = columnWidth(1200, layout);
    expect(cw).toBeCloseTo((1200 - 11 * 8) / 12);
  });
});

describe("pixelToGrid", () => {
  it("should convert pixel to grid coordinates", () => {
    const result = pixelToGrid(0, 0, layout, 1200);
    expect(result).toEqual({ col: 0, row: 0 });
  });

  it("should convert middle position", () => {
    const cw = columnWidth(1200, layout);
    const result = pixelToGrid(cw + 8, 100, layout, 1200);
    expect(result.col).toBe(1);
    expect(result.row).toBe(1);
  });
});

describe("gridToPixel", () => {
  it("should convert grid to pixel coordinates", () => {
    const result = gridToPixel(0, 0, layout, 1200);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it("should convert non-zero position", () => {
    const cw = columnWidth(1200, layout);
    const result = gridToPixel(1, 1, layout, 1200);
    expect(result.x).toBeCloseTo(cw + 8);
    expect(result.y).toBe(108);
  });
});

describe("findEmptyPosition", () => {
  it("should find position in empty layout", () => {
    const result = findEmptyPosition(layout, 2, 1);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it("should skip occupied positions", () => {
    const occupied: Layout = {
      ...layout,
      items: [{ instanceId: "a", x: 0, y: 0, w: 2, h: 1 }],
    };
    const result = findEmptyPosition(occupied, 2, 1);
    expect(result).toEqual({ x: 2, y: 0 });
  });
});
