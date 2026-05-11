import type { LayoutItem, LayoutResult } from "./types";
import { ok, err } from "./types";
import { overlaps } from "./collision";
import { DEFAULT_COLUMNS } from "@core/constants";

function cloneItems(items: LayoutItem[]): LayoutItem[] {
  return items.map((item) => ({ ...item }));
}

function pushCollidingDown(
  items: LayoutItem[],
  target: LayoutItem,
): LayoutItem[] {
  const result = cloneItems(items);
  let changed = true;
  let iterations = 0;
  const maxIterations = 100;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;
    for (const item of result) {
      if (item.instanceId === target.instanceId) continue;
      if (overlaps(target, item)) {
        if (item.locked) return result; // Can't push locked item
        item.y += 1;
        changed = true;
      }
    }
  }

  return result;
}

export function pushItems(
  items: LayoutItem[],
  movedId: string,
  newX: number,
  newY: number,
): LayoutResult {
  const moved = items.find((i) => i.instanceId === movedId);
  if (!moved) return err("ITEM_NOT_FOUND", `Item ${movedId} not found`);
  if (moved.locked) return err("ITEM_LOCKED", `Item ${movedId} is locked`);

  const updated = cloneItems(items);
  const target = updated.find((i) => i.instanceId === movedId)!;
  target.x = newX;
  target.y = newY;

  // Check if any colliding item is locked
  for (const item of updated) {
    if (item.instanceId === movedId) continue;
    if (overlaps(target, item) && item.locked) {
      return err("ITEM_LOCKED", `Cannot push locked item ${item.instanceId}`);
    }
  }

  const pushed = pushCollidingDown(updated, target);

  // Verify no overlaps remain
  for (let i = 0; i < pushed.length; i++) {
    for (let j = i + 1; j < pushed.length; j++) {
      if (overlaps(pushed[i], pushed[j])) {
        return err("COLLISION_UNRESOLVED", "Could not resolve all collisions");
      }
    }
  }

  return ok({ ...itemsToLayout(pushed) });
}

export function pushOnResize(
  items: LayoutItem[],
  resizedId: string,
  newW: number,
  newH: number,
): LayoutResult {
  const resized = items.find((i) => i.instanceId === resizedId);
  if (!resized) return err("ITEM_NOT_FOUND", `Item ${resizedId} not found`);

  const updated = cloneItems(items);
  const target = updated.find((i) => i.instanceId === resizedId)!;
  target.w = newW;
  target.h = newH;

  const pushed = pushCollidingDown(updated, target);

  for (let i = 0; i < pushed.length; i++) {
    for (let j = i + 1; j < pushed.length; j++) {
      if (overlaps(pushed[i], pushed[j])) {
        return err("COLLISION_UNRESOLVED", "Could not resolve all collisions");
      }
    }
  }

  return ok({ ...itemsToLayout(pushed) });
}

function itemsToLayout(items: LayoutItem[]) {
  return {
    version: 1,
    id: "temp",
    columns: DEFAULT_COLUMNS,
    rowHeight: 100,
    gap: 8,
    items,
  };
}
