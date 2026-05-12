<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, inject } from "vue";
import type { LayoutEngine } from "@layout/engine";
import GridCell from "./GridCell.vue";
import ModuleLoader from "./ModuleLoader.vue";

const layoutEngine = inject<LayoutEngine>("layoutEngine");
const containerRef = ref<HTMLElement>();
const containerRect = ref<DOMRect | null>(null);

function updateSize() {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  containerRect.value = rect;
}

let resizeObserver: ResizeObserver;

onMounted(() => {
  updateSize();
  resizeObserver = new ResizeObserver(() => updateSize());
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});

function handleMove(instanceId: string, x: number, y: number) {
  if (!layoutEngine) return;
  layoutEngine.moveItem(instanceId, x, y);
}

function handleResize(instanceId: string, w: number, h: number) {
  if (!layoutEngine) return;
  layoutEngine.resizeItem(instanceId, w, h);
}

function handleRemove(instanceId: string) {
  if (!layoutEngine) return;
  layoutEngine.removeItem(instanceId);
}
</script>

<template>
  <div ref="containerRef" class="grid-engine">
    <GridCell
      v-for="item in layoutEngine?.getLayout().items ?? []"
      :key="item.instanceId"
      :item="item"
      :container-rect="containerRect"
      @move="handleMove"
      @resize="handleResize"
      @remove="handleRemove"
    >
      <ModuleLoader v-if="item.instanceId !== 'empty'" :item="item" />
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
