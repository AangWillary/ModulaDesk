import { defineStore } from "pinia";
import { ref } from "vue";

export const useShellStore = defineStore("shell", () => {
  const visible = ref(true);
  const layoutLocked = ref(false);

  function setVisible(v: boolean) {
    visible.value = v;
  }

  function setLayoutLocked(v: boolean) {
    layoutLocked.value = v;
  }

  return { visible, layoutLocked, setVisible, setLayoutLocked };
});
