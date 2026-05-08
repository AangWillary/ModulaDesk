import { defineStore } from "pinia";
import { ref } from "vue";

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
  }

  function removeItem(instanceId: string) {
    items.value = items.value.filter((i) => i.instanceId !== instanceId);
  }

  function updateItem(instanceId: string, updates: Partial<LayoutItem>) {
    const item = items.value.find((i) => i.instanceId === instanceId);
    if (item) Object.assign(item, updates);
  }

  return { items, addItem, removeItem, updateItem };
});
