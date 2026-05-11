import type { LayoutItem } from "./types";

export function overlaps(a: LayoutItem, b: LayoutItem): boolean {
  if (a.w <= 0 || a.h <= 0 || b.w <= 0 || b.h <= 0) return false;
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function collides(
  items: LayoutItem[],
  target: LayoutItem,
  excludeId?: string,
): boolean {
  return items
    .filter((item) => item.instanceId !== excludeId)
    .some((item) => overlaps(item, target));
}

export function validateLayout(items: LayoutItem[]): boolean {
  // Check for negative coordinates and sizes
  for (const item of items) {
    if (item.x < 0 || item.y < 0 || item.w < 1 || item.h < 1) return false;
  }

  // Check for duplicate instanceIds
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.instanceId)) return false;
    ids.add(item.instanceId);
  }

  // Check for overlaps
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (overlaps(items[i], items[j])) return false;
    }
  }

  return true;
}
