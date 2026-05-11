import type { Layout, LayoutResult } from "./types";
import { ok } from "./types";
import { validateLayout } from "./collision";

export function compactLayout(layout: Layout): Layout {
  // Sort items by y then x, remove gaps
  const sorted = [...layout.items].sort((a, b) => a.y - b.y || a.x - b.x);
  return { ...layout, items: sorted };
}

export function normalizeLayout(layout: Layout): LayoutResult {
  // Clamp items to grid bounds
  const normalized = layout.items.map((item) => ({
    ...item,
    x: Math.max(0, Math.min(item.x, layout.columns - item.w)),
    y: Math.max(0, item.y),
    w: Math.max(1, item.w),
    h: Math.max(1, item.h),
  }));

  if (!validateLayout(normalized)) {
    return {
      ok: false,
      code: "INVALID_LAYOUT",
      message: "Layout invalid after normalization",
    };
  }

  return ok({ ...layout, items: normalized });
}
