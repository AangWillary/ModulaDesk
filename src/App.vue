<script setup lang="ts">
import { ref, onMounted } from "vue";
import { invoke } from "@tauri-apps/api/core";

const systemInfo = ref<{ os: string; arch: string; version: string } | null>(null);
const gridItems = ref<{ id: number; label: string }[]>([]);
let nextId = 1;

onMounted(async () => {
  try {
    systemInfo.value = await invoke("get_system_info");
  } catch {
    systemInfo.value = { os: "unknown", arch: "unknown", version: "unknown" };
  }
});

function addGridItem() {
  gridItems.value.push({ id: nextId++, label: `模块 ${gridItems.value.length + 1}` });
}

function removeGridItem(id: number) {
  gridItems.value = gridItems.value.filter((item) => item.id !== id);
}
</script>

<template>
  <div class="moduladesk">
    <header class="toolbar">
      <h1 class="title">ModulaDesk</h1>
      <button class="btn btn-primary" @click="addGridItem">+ 添加格子</button>
    </header>

    <main class="grid">
      <div
        v-for="item in gridItems"
        :key="item.id"
        class="grid-cell"
      >
        <div class="cell-header">
          <span class="cell-label">{{ item.label }}</span>
          <button class="btn btn-sm" @click="removeGridItem(item.id)">×</button>
        </div>
        <div class="cell-content">
          <p class="cell-placeholder">模块内容区域</p>
        </div>
      </div>

      <div v-if="gridItems.length === 0" class="empty-state">
        <p>点击上方「+ 添加格子」开始</p>
        <p v-if="systemInfo" class="system-info">
          {{ systemInfo.os }} / {{ systemInfo.arch }}
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.moduladesk {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: transparent;
  font-family: "Segoe UI", system-ui, sans-serif;
  color: #e0e0e0;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: rgba(30, 30, 30, 0.85);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  -webkit-app-region: drag;
  user-select: none;
}

.title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  letter-spacing: 0.5px;
}

.grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 8px;
  overflow: auto;
}

.grid-cell {
  background: rgba(40, 40, 40, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s;
}

.grid-cell:hover {
  border-color: rgba(255, 255, 255, 0.15);
}

.cell-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.cell-label {
  font-size: 12px;
  font-weight: 500;
  opacity: 0.8;
}

.cell-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.cell-placeholder {
  font-size: 13px;
  opacity: 0.4;
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  opacity: 0.4;
}

.empty-state p {
  margin: 4px 0;
  font-size: 14px;
}

.system-info {
  font-size: 11px;
  opacity: 0.6;
  margin-top: 8px !important;
}

.btn {
  -webkit-app-region: no-drag;
  padding: 4px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
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

.btn-sm {
  padding: 2px 6px;
  font-size: 14px;
  line-height: 1;
}
</style>
