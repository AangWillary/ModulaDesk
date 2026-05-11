import { describe, it, expect } from "vitest";
import { PERMISSIONS, hasPermission } from "../permissions";
import type { Permission } from "../permissions";

describe("PERMISSIONS", () => {
  it("should contain expected permissions", () => {
    expect(PERMISSIONS).toContain("file:read");
    expect(PERMISSIONS).toContain("file:write");
    expect(PERMISSIONS).toContain("network:http");
    expect(PERMISSIONS).toContain("system:clipboard");
    expect(PERMISSIONS).toContain("system:shell");
    expect(PERMISSIONS).toContain("system:process");
    expect(PERMISSIONS).toContain("system:info");
    expect(PERMISSIONS).toContain("automation:run");
  });
});

describe("hasPermission", () => {
  it("should return true when permission is declared", () => {
    const declared: Permission[] = ["file:read", "file:write"];
    expect(hasPermission(declared, "file:read")).toBe(true);
  });

  it("should return false when permission is not declared", () => {
    const declared: Permission[] = ["file:read"];
    expect(hasPermission(declared, "file:write")).toBe(false);
  });

  it("should return false for empty declared list", () => {
    expect(hasPermission([], "file:read")).toBe(false);
  });
});
