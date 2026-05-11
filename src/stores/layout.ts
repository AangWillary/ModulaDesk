import { defineStore } from "pinia";
import { ref } from "vue";

export const useLayoutStore = defineStore("layout", () => {
  const selectedItemId = ref<string | null>(null);
  const isDragging = ref(false);
  const isResizing = ref(false);

  function selectItem(id: string | null) {
    selectedItemId.value = id;
  }

  function setDragging(value: boolean) {
    isDragging.value = value;
  }

  function setResizing(value: boolean) {
    isResizing.value = value;
  }

  return {
    selectedItemId,
    isDragging,
    isResizing,
    selectItem,
    setDragging,
    setResizing,
  };
});
