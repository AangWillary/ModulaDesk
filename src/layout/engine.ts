import type {
  Layout,
  LayoutItem,
  LayoutResult,
  SerializedLayout,
} from "./types";
import { ok, err } from "./types";
import { findEmptyPosition } from "./grid";
import { pushItems, pushOnResize } from "./push";
import { serializeLayout, deserializeLayout } from "./persistence";
import {
  DEFAULT_COLUMNS,
  DEFAULT_ROW_HEIGHT,
  DEFAULT_GAP,
  LAYOUT_VERSION,
} from "@core/constants";

export interface LayoutEngine {
  getLayout(): Layout;
  getItem(instanceId: string): LayoutItem | undefined;
  addItem(item: Omit<LayoutItem, "x" | "y">): LayoutResult;
  removeItem(instanceId: string): Layout;
  moveItem(instanceId: string, x: number, y: number): LayoutResult;
  resizeItem(instanceId: string, w: number, h: number): LayoutResult;
  save(): SerializedLayout;
  load(data: SerializedLayout): LayoutResult;
  onChange(handler: (layout: Layout) => void): () => void;
}

export function createLayoutEngine(): LayoutEngine {
  let layout: Layout = {
    version: LAYOUT_VERSION,
    id: "default",
    columns: DEFAULT_COLUMNS,
    rowHeight: DEFAULT_ROW_HEIGHT,
    gap: DEFAULT_GAP,
    items: [],
  };
  const listeners: Set<(layout: Layout) => void> = new Set();

  function notify() {
    for (const handler of listeners) {
      handler(layout);
    }
  }

  return {
    getLayout() {
      return layout;
    },

    getItem(instanceId) {
      return layout.items.find((i) => i.instanceId === instanceId);
    },

    addItem(item) {
      const pos = findEmptyPosition(layout, item.w, item.h);
      if (!pos) return err("NO_SPACE", "No empty position available");

      const newItem: LayoutItem = { ...item, x: pos.x, y: pos.y };

      if (item.minW && item.w < item.minW)
        return err("INVALID_SIZE", "w < minW");
      if (item.maxW && item.w > item.maxW)
        return err("INVALID_SIZE", "w > maxW");
      if (item.minH && item.h < item.minH)
        return err("INVALID_SIZE", "h < minH");
      if (item.maxH && item.h > item.maxH)
        return err("INVALID_SIZE", "h > maxH");

      layout = { ...layout, items: [...layout.items, newItem] };
      notify();
      return ok(layout);
    },

    removeItem(instanceId) {
      layout = {
        ...layout,
        items: layout.items.filter((i) => i.instanceId !== instanceId),
      };
      notify();
      return layout;
    },

    moveItem(instanceId, x, y) {
      const result = pushItems(layout.items, instanceId, x, y);
      if (result.ok) {
        layout = result.layout;
        notify();
      }
      return result;
    },

    resizeItem(instanceId, w, h) {
      const result = pushOnResize(layout.items, instanceId, w, h);
      if (result.ok) {
        layout = result.layout;
        notify();
      }
      return result;
    },

    save() {
      return serializeLayout(layout);
    },

    load(data) {
      const result = deserializeLayout(JSON.stringify(data));
      if (result.ok) {
        layout = result.layout;
        notify();
      }
      return result;
    },

    onChange(handler) {
      listeners.add(handler);
      return () => listeners.delete(handler);
    },
  };
}
