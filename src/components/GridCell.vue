<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import type { LayoutItem } from "@layout/types";

const props = defineProps<{
  item: LayoutItem;
  colWidth: number;
  rowHeight: number;
  gap: number;
  containerRect: DOMRect | null;
}>();

const emit = defineEmits<{
  move: [instanceId: string, x: number, y: number];
  resize: [instanceId: string, w: number, h: number];
  remove: [instanceId: string];
}>();

const isDragging = ref(false);
const isResizing = ref(false);

let dragRaf = 0;
let resizeRaf = 0;

const style = computed(() => {
  const left = props.gap + props.item.x * (props.colWidth + props.gap);
  const top = props.gap + props.item.y * (props.rowHeight + props.gap);
  const width = props.item.w * props.colWidth + Math.max(0, props.item.w - 1) * props.gap;
  const height = props.item.h * props.rowHeight + Math.max(0, props.item.h - 1) * props.gap;

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  };
});

// --- Drag ---
let dragStartX = 0;
let dragStartY = 0;
let dragOrigX = 0;
let dragOrigY = 0;

function onDragStart(e: MouseEvent) {
  if (props.item.locked) return;
  if ((e.target as HTMLElement).closest(".cell-action")) return;

  isDragging.value = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragOrigX = props.item.x;
  dragOrigY = props.item.y;

  document.addEventListener("mousemove", onDragMove);
  document.addEventListener("mouseup", onDragEnd);
  e.preventDefault();
}

function onDragMove(e: MouseEvent) {
  if (!isDragging.value) return;
  if (dragRaf) return;

  dragRaf = requestAnimationFrame(() => {
    dragRaf = 0;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    const newX = Math.max(0, Math.round(dragOrigX + dx / (props.colWidth + props.gap)));
    const newY = Math.max(0, Math.round(dragOrigY + dy / (props.rowHeight + props.gap)));

    if (newX !== props.item.x || newY !== props.item.y) {
      emit("move", props.item.instanceId, newX, newY);
    }
  });
}

function onDragEnd() {
  isDragging.value = false;
  if (dragRaf) {
    cancelAnimationFrame(dragRaf);
    dragRaf = 0;
  }
  document.removeEventListener("mousemove", onDragMove);
  document.removeEventListener("mouseup", onDragEnd);
}

// --- Resize ---
let resizeStartX = 0;
let resizeStartY = 0;
let resizeOrigW = 0;
let resizeOrigH = 0;

function onResizeStart(e: MouseEvent) {
  if (props.item.locked) return;

  isResizing.value = true;
  resizeStartX = e.clientX;
  resizeStartY = e.clientY;
  resizeOrigW = props.item.w;
  resizeOrigH = props.item.h;

  document.addEventListener("mousemove", onResizeMove);
  document.addEventListener("mouseup", onResizeEnd);
  e.preventDefault();
  e.stopPropagation();
}

function onResizeMove(e: MouseEvent) {
  if (!isResizing.value) return;
  if (resizeRaf) return;

  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = 0;
    const dx = e.clientX - resizeStartX;
    const dy = e.clientY - resizeStartY;

    let newW = Math.max(
      props.item.minW ?? 1,
      Math.round(resizeOrigW + dx / (props.colWidth + props.gap))
    );
    let newH = Math.max(
      props.item.minH ?? 1,
      Math.round(resizeOrigH + dy / (props.rowHeight + props.gap))
    );

    if (props.item.maxW) newW = Math.min(newW, props.item.maxW);
    if (props.item.maxH) newH = Math.min(newH, props.item.maxH);

    if (newW !== props.item.w || newH !== props.item.h) {
      emit("resize", props.item.instanceId, newW, newH);
    }
  });
}

function onResizeEnd() {
  isResizing.value = false;
  if (resizeRaf) {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = 0;
  }
  document.removeEventListener("mousemove", onResizeMove);
  document.removeEventListener("mouseup", onResizeEnd);
}

onBeforeUnmount(() => {
  if (dragRaf) cancelAnimationFrame(dragRaf);
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  document.removeEventListener("mousemove", onDragMove);
  document.removeEventListener("mouseup", onDragEnd);
  document.removeEventListener("mousemove", onResizeMove);
  document.removeEventListener("mouseup", onResizeEnd);
});
</script>

<template>
  <div
    class="grid-cell"
    :class="{ dragging: isDragging, resizing: isResizing }"
    :style="style"
    @mousedown="onDragStart"
  >
    <div class="cell-header">
      <span class="cell-label">{{ item.instanceId }}</span>
      <div class="cell-actions">
        <button
          class="cell-action cell-remove"
          @mousedown.stop
          @click.stop="emit('remove', item.instanceId)"
        >
          ×
        </button>
      </div>
    </div>
    <div class="cell-content">
      <slot />
    </div>
    <div class="cell-resize-handle" @mousedown.stop="onResizeStart" />
  </div>
</template>

<style scoped>
.grid-cell {
  position: absolute;
  background: rgba(40, 40, 40, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
  overflow: hidden;
}

.grid-cell:hover {
  border-color: rgba(255, 255, 255, 0.12);
}

.grid-cell.dragging {
  z-index: 100;
  opacity: 0.85;
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  transition: none;
}

.grid-cell.resizing {
  z-index: 100;
  border-color: rgba(59, 130, 246, 0.5);
  transition: none;
}

.cell-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  cursor: grab;
  user-select: none;
}

.cell-header:active {
  cursor: grabbing;
}

.cell-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.cell-actions {
  display: flex;
  gap: 4px;
}

.cell-action {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
  line-height: 1;
  border-radius: 3px;
}

.cell-action:hover {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
}

.cell-content {
  flex: 1;
  overflow: auto;
}

.cell-resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  opacity: 0;
  transition: opacity 0.15s;
}

.cell-resize-handle::after {
  content: "";
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 8px;
  height: 8px;
  border-right: 2px solid rgba(255, 255, 255, 0.3);
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
}

.grid-cell:hover .cell-resize-handle {
  opacity: 1;
}
</style>
