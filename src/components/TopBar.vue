<script setup lang="ts">
import { useLayoutStore } from "../stores/layout";
import { useGrid } from "../composables/useGrid";

const layout = useLayoutStore();
const grid = useGrid();

function addCell() {
  const item = grid.createItem();
  layout.addItem(item);
}
</script>

<template>
  <header class="topbar">
    <h1 class="title">ModulaDesk</h1>
    <div class="actions">
      <button class="btn btn-primary" @click="addCell">+ 添加格子</button>
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
</style>
