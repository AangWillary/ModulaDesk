<script setup lang="ts">
import { ref, inject } from "vue";
import type { LayoutEngine } from "@layout/engine";
import { useModulesStore } from "@stores/modules";

const layoutEngine = inject<LayoutEngine>("layoutEngine");
const modulesStore = useModulesStore();

const showPicker = ref(false);

function addModule(moduleId: string) {
  if (!layoutEngine) return;
  const manifest = modulesStore.available.find((m) => m.id === moduleId);
  if (!manifest) return;

  layoutEngine.addItem({
    instanceId: crypto.randomUUID(),
    w: manifest.grid.defaultWidth,
    h: manifest.grid.defaultHeight,
    minW: manifest.grid.minWidth,
    minH: manifest.grid.minHeight,
    maxW: manifest.grid.maxWidth,
    maxH: manifest.grid.maxHeight,
  });
  showPicker.value = false;
}

function addEmpty() {
  if (!layoutEngine) return;
  layoutEngine.addItem({
    instanceId: crypto.randomUUID(),
    w: 2,
    h: 1,
  });
  showPicker.value = false;
}

function togglePicker() {
  showPicker.value = !showPicker.value;
}
</script>

<template>
  <header class="topbar">
    <h1 class="title">WillDesk</h1>
    <div class="actions">
      <div class="picker-wrapper">
        <button class="btn btn-primary" @click="togglePicker">+ 添加模块</button>
        <div v-if="showPicker" class="picker-dropdown">
          <button
            v-for="manifest in modulesStore.available"
            :key="manifest.id"
            class="picker-item"
            @click="addModule(manifest.id)"
          >
            <span class="picker-icon">{{ manifest.icon }}</span>
            <span class="picker-name">{{ manifest.name }}</span>
          </button>
          <div v-if="modulesStore.available.length === 0" class="picker-empty">暂无可用模块</div>
          <div class="picker-divider" />
          <button class="picker-item" @click="addEmpty">
            <span class="picker-icon">📦</span>
            <span class="picker-name">空白格子</span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: rgba(30, 30, 30, 0.85);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  -webkit-app-region: drag;
  user-select: none;
  z-index: 10;
}

.title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  letter-spacing: 0.5px;
  color: #e0e0e0;
}

.actions {
  display: flex;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.btn {
  padding: 5px 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: #e0e0e0;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.btn-primary {
  background: rgba(59, 130, 246, 0.7);
  border-color: rgba(59, 130, 246, 0.5);
}

.btn-primary:hover {
  background: rgba(59, 130, 246, 0.9);
}

.picker-wrapper {
  position: relative;
}

.picker-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 180px;
  background: rgba(40, 40, 40, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 4px;
  z-index: 100;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: none;
  color: #e0e0e0;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.picker-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.picker-icon {
  font-size: 16px;
}

.picker-name {
  flex: 1;
}

.picker-empty {
  padding: 8px 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.3);
}

.picker-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 4px 0;
}
</style>
