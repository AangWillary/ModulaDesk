import { ref, computed } from "vue";
import { useLayoutStore, type LayoutItem } from "../stores/layout";

export function useGrid() {
  const layout = useLayoutStore();
  const columns = ref(12);
  const rowHeight = ref(100);
  const gap = ref(8);

  const containerWidth = ref(0);
  const containerHeight = ref(0);

  const colWidth = computed(() => {
    if (containerWidth.value === 0) return 100;
    return (containerWidth.value - gap.value * (columns.value + 1)) / columns.value;
  });

  const rows = computed(() => {
    if (containerHeight.value === 0) return 8;
    return Math.floor((containerHeight.value + gap.value) / (rowHeight.value + gap.value));
  });

  function gridToPixel(x: number, y: number, w: number, h: number) {
    return {
      left: gap.value + x * (colWidth.value + gap.value),
      top: gap.value + y * (rowHeight.value + gap.value),
      width: w * colWidth.value + Math.max(0, w - 1) * gap.value,
      height: h * rowHeight.value + Math.max(0, h - 1) * gap.value,
    };
  }

  function pixelToGrid(left: number, top: number) {
    return {
      x: Math.round((left - gap.value) / (colWidth.value + gap.value)),
      y: Math.round((top - gap.value) / (rowHeight.value + gap.value)),
    };
  }

  function snapToGrid(px: number, cellSize: number, gapSize: number): number {
    return Math.round(px / (cellSize + gapSize));
  }

  function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
  }

  function checkCollision(item: LayoutItem, items: LayoutItem[]): boolean {
    return items.some((other) => {
      if (other.instanceId === item.instanceId) return false;
      return !(
        item.x + item.w <= other.x ||
        other.x + other.w <= item.x ||
        item.y + item.h <= other.y ||
        other.y + other.h <= item.y
      );
    });
  }

  function pushItems(
    dragged: LayoutItem,
    items: LayoutItem[]
  ): LayoutItem[] {
    const result = items.map((i) => ({ ...i }));
    const draggedIdx = result.findIndex((i) => i.instanceId === dragged.instanceId);
    if (draggedIdx >= 0) {
      result[draggedIdx] = { ...dragged };
    }

    for (let i = 0; i < result.length; i++) {
      if (result[i].instanceId === dragged.instanceId) continue;
      if (checkCollision(result[i], result)) {
        result[i] = {
          ...result[i],
          y: result[i].y + dragged.h,
        };
      }
    }
    return result;
  }

  let nextId = 1;

  function createItem(overrides: Partial<LayoutItem> = {}): LayoutItem {
    const existing = layout.items;
    let maxY = 0;
    for (const item of existing) {
      maxY = Math.max(maxY, item.y + item.h);
    }

    return {
      moduleId: "empty",
      instanceId: `cell-${nextId++}-${Date.now()}`,
      x: 0,
      y: maxY,
      w: 3,
      h: 2,
      ...overrides,
    };
  }

  function setContainerSize(width: number, height: number) {
    containerWidth.value = width;
    containerHeight.value = height;
  }

  return {
    layout,
    columns,
    rowHeight,
    gap,
    colWidth,
    rows,
    containerWidth,
    containerHeight,
    gridToPixel,
    pixelToGrid,
    snapToGrid,
    clamp,
    checkCollision,
    pushItems,
    createItem,
    setContainerSize,
  };
}
