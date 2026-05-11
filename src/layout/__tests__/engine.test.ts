import { describe, it, expect } from "vitest";
import { createLayoutEngine } from "../engine";

describe("LayoutEngine", () => {
  it("should add item at empty position", () => {
    const engine = createLayoutEngine();
    const result = engine.addItem({ instanceId: "a", w: 2, h: 1 });
    expect(result.ok).toBe(true);
    expect(engine.getItem("a")).toBeDefined();
    expect(engine.getItem("a")?.x).toBe(0);
    expect(engine.getItem("a")?.y).toBe(0);
  });

  it("should remove item", () => {
    const engine = createLayoutEngine();
    engine.addItem({ instanceId: "a", w: 2, h: 1 });
    engine.removeItem("a");
    expect(engine.getItem("a")).toBeUndefined();
  });

  it("should notify listeners on change", () => {
    const engine = createLayoutEngine();
    let notified = false;
    engine.onChange(() => {
      notified = true;
    });
    engine.addItem({ instanceId: "a", w: 2, h: 1 });
    expect(notified).toBe(true);
  });

  it("should save and load layout", () => {
    const engine = createLayoutEngine();
    engine.addItem({ instanceId: "a", w: 2, h: 1 });
    const saved = engine.save();
    const engine2 = createLayoutEngine();
    const result = engine2.load(saved);
    expect(result.ok).toBe(true);
    expect(engine2.getItem("a")).toBeDefined();
  });
});
