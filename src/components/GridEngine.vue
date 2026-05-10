<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useGrid } from "../composables/useGrid";
import { useLayoutStore, type LayoutItem } from "../stores/layout";
import { useModuleStore } from "../stores/modules";
import GridCell from "./GridCell.vue";
import ModuleLoader from "./ModuleLoader.vue";

const grid = useGrid();
const layout = useLayoutStore();
const moduleStore = useModuleStore();
const containerRef = ref<HTMLElement>();
const containerRect = ref<DOMRect | null>(null);

function updateSize() {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  containerRect.value = rect;
  grid.setContainerSize(rect.width, rect.height);
}

let resizeObserver: ResizeObserver;

onMounted(() => {
  updateSize();
  resizeObserver = new ResizeObserver(() => updateSize());
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
  }
  layout.loadFromStorage();
  moduleStore.discover();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});

function handleMove(item: LayoutItem, x: number, y: number) {
  const updated = { ...item, x, y };
  const others = layout.items.filter((i) => i.instanceId !== item.instanceId);
  if (!grid.checkCollision(updated, others)) {
    layout.updateItem(item.instanceId, { x, y });
  }
}

function handleResize(item: LayoutItem, w: number, h: number) {
  const updated = { ...item, w, h };
  const others = layout.items.filter((i) => i.instanceId !== item.instanceId);
  if (!grid.checkCollision(updated, others)) {
    layout.updateItem(item.instanceId, { w, h });
  }
}

function handleRemove(instanceId: string) {
  layout.removeItem(instanceId);
}
</script>

<template>
  <div ref="containerRef" class="grid-engine">
    <GridCell
      v-for="item in layout.items"
      :key="item.instanceId"
      :item="item"
      :col-width="grid.colWidth.value"
      :row-height="grid.rowHeight.value"
      :gap="grid.gap.value"
      :container-rect="containerRect"
      @move="handleMove"
      @resize="handleResize"
      @remove="handleRemove"
    >
      <ModuleLoader v-if="item.moduleId !== 'empty'" :item="item" />
      <div v-else class="cell-placeholder">
        <span class="cell-icon">📦</span>
        <span class="cell-text">未分配模块</span>
      </div>
    </GridCell>
  </div>
</template>

<style scoped>
.grid-engine {
  position: relative;
  flex: 1;
  overflow: auto;
  background: transparent;
}

.cell-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 6px;
  user-select: none;
}

.cell-icon {
  font-size: 24px;
  opacity: 0.5;
}

.cell-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
}
</style>
