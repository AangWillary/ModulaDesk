import { describe, it, expect } from "vitest";
import { validateManifestShape } from "../manifest";
import type { Manifest } from "../manifest";

describe("validateManifestShape", () => {
  const validManifest: Manifest = {
    id: "clock",
    name: "Clock",
    version: "1.0.0",
    icon: "🕐",
    type: "web",
    grid: {
      minWidth: 2,
      minHeight: 1,
      maxWidth: 4,
      maxHeight: 2,
      defaultWidth: 2,
      defaultHeight: 1,
      resizable: true,
    },
    permissions: [],
  };

  it("should accept valid manifest", () => {
    const result = validateManifestShape(validManifest);
    expect(result.ok).toBe(true);
  });

  it("should reject missing id", () => {
    const result = validateManifestShape({ ...validManifest, id: "" });
    expect(result.ok).toBe(false);
  });

  it("should reject invalid type", () => {
    const result = validateManifestShape({
      ...validManifest,
      type: "invalid" as any,
    });
    expect(result.ok).toBe(false);
  });

  it("should reject invalid permission", () => {
    const result = validateManifestShape({
      ...validManifest,
      permissions: ["invalid:perm" as any],
    });
    expect(result.ok).toBe(false);
  });

  it("should reject grid with minWidth > maxWidth", () => {
    const result = validateManifestShape({
      ...validManifest,
      grid: { ...validManifest.grid, minWidth: 5, maxWidth: 3 },
    });
    expect(result.ok).toBe(false);
  });
});
