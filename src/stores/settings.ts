import { defineStore } from "pinia";
import { ref } from "vue";

export const useSettingsStore = defineStore("settings", () => {
  const theme = ref<"dark" | "light" | "system">("dark");
  const language = ref("zh-CN");
  const gridColumns = ref(12);
  const gridRowHeight = ref(100);
  const gridGap = ref(8);
  const clickThrough = ref(false);

  return {
    theme,
    language,
    gridColumns,
    gridRowHeight,
    gridGap,
    clickThrough,
  };
});
