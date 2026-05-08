import { defineStore } from "pinia";
import { ref, watch } from "vue";

const STORAGE_KEY = "moduladesk-layout";

export interface LayoutItem {
  moduleId: string;
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

export const useLayoutStore = defineStore("layout", () => {
  const items = ref<LayoutItem[]>([]);

  function addItem(item: LayoutItem) {
    items.value.push(item);
    saveToStorage();
  }

  function removeItem(instanceId: string) {
    items.value = items.value.filter((i) => i.instanceId !== instanceId);
    saveToStorage();
  }

  function updateItem(instanceId: string, updates: Partial<LayoutItem>) {
    const item = items.value.find((i) => i.instanceId === instanceId);
    if (item) Object.assign(item, updates);
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value));
    } catch {
      // storage full or unavailable
    }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          items.value = parsed;
        }
      }
    } catch {
      // corrupted data, start fresh
    }
  }

  // Auto-save on any change (debounced via watch)
  watch(items, saveToStorage, { deep: true });

  return { items, addItem, removeItem, updateItem, saveToStorage, loadFromStorage };
});
