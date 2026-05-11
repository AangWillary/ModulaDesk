import { defineStore } from "pinia";
import { ref } from "vue";
import type { Manifest } from "@core/index";

export const useModulesStore = defineStore("modules", () => {
  const available = ref<Manifest[]>([]);

  function setAvailable(modules: Manifest[]) {
    available.value = modules;
  }

  return { available, setAvailable };
});
