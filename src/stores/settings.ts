import { defineStore } from "pinia";
import { ref } from "vue";

export const useSettingsStore = defineStore("settings", () => {
  const theme = ref<"dark" | "light" | "system">("dark");
  const language = ref("zh-CN");

  function setTheme(t: "dark" | "light" | "system") {
    theme.value = t;
  }

  return { theme, language, setTheme };
});
