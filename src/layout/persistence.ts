import type { Layout, SerializedLayout, LayoutResult } from "./types";
import { ok, err } from "./types";
import { validateLayout } from "./collision";
import { LAYOUT_VERSION } from "@core/constants";

export function serializeLayout(layout: Layout): SerializedLayout {
  return {
    version: LAYOUT_VERSION,
    savedAt: new Date().toISOString(),
    layout,
  };
}

export function deserializeLayout(json: string): LayoutResult {
  try {
    const data = JSON.parse(json);

    // Handle legacy format (no version wrapper)
    const layout: Layout = data.layout ?? data;

    if (typeof layout.version !== "number") {
      layout.version = LAYOUT_VERSION;
    }

    if (!Array.isArray(layout.items)) {
      return err("DESERIALIZE_FAILED", "items must be an array");
    }

    if (!validateLayout(layout.items)) {
      return err("INVALID_LAYOUT", "Layout contains overlaps or invalid items");
    }

    return ok(layout);
  } catch {
    return err("DESERIALIZE_FAILED", "Invalid JSON");
  }
}
