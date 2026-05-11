export interface Layout {
  version: number;
  id: string;
  name?: string;
  columns: number;
  rowHeight: number;
  gap: number;
  items: LayoutItem[];
}

export interface LayoutItem {
  instanceId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  locked?: boolean;
}

export type LayoutErrorCode =
  | "ITEM_NOT_FOUND"
  | "ITEM_LOCKED"
  | "COLLISION_UNRESOLVED"
  | "OUT_OF_BOUNDS"
  | "INVALID_SIZE"
  | "INVALID_LAYOUT"
  | "DESERIALIZE_FAILED"
  | "NO_SPACE";

export type LayoutResult =
  | { ok: true; layout: Layout }
  | { ok: false; code: LayoutErrorCode; message: string; layout?: Layout };

export interface SerializedLayout {
  version: number;
  savedAt: string;
  layout: Layout;
}

export function ok(layout: Layout): LayoutResult {
  return { ok: true, layout };
}

export function err(
  code: LayoutErrorCode,
  message: string,
  layout?: Layout,
): LayoutResult {
  return { ok: false, code, message, layout };
}
