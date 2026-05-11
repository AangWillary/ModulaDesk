import type { Layout } from "./types";

export function columnWidth(containerWidth: number, layout: Layout): number {
  const totalGaps = (layout.columns - 1) * layout.gap;
  return (containerWidth - totalGaps) / layout.columns;
}

export function pixelToGrid(
  px: number,
  py: number,
  layout: Layout,
  containerWidth: number,
): { col: number; row: number } {
  const cw = columnWidth(containerWidth, layout);
  const col = Math.round(px / (cw + layout.gap));
  const row = Math.round(py / (layout.rowHeight + layout.gap));
  return { col: Math.max(0, col), row: Math.max(0, row) };
}

export function gridToPixel(
  col: number,
  row: number,
  layout: Layout,
  containerWidth: number,
): { x: number; y: number } {
  const cw = columnWidth(containerWidth, layout);
  return {
    x: col * (cw + layout.gap),
    y: row * (layout.rowHeight + layout.gap),
  };
}

export function findEmptyPosition(
  layout: Layout,
  w: number,
  h: number,
): { x: number; y: number } | null {
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x <= layout.columns - w; x++) {
      const candidate = { instanceId: "__temp__", x, y, w, h };
      const collides = layout.items.some(
        (item) =>
          candidate.x < item.x + item.w &&
          candidate.x + candidate.w > item.x &&
          candidate.y < item.y + item.h &&
          candidate.y + candidate.h > item.y,
      );
      if (!collides) return { x, y };
    }
  }
  return null;
}
