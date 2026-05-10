<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import type { LayoutItem } from "../stores/layout";
import type { Module, ModuleContext } from "../types/module";
import { useModuleStore } from "../stores/modules";
import { createModuleContext } from "../composables/useModuleContext";

const props = defineProps<{ item: LayoutItem }>();

const moduleStore = useModuleStore();
const containerRef = ref<HTMLElement>();
const error = ref<string | null>(null);
const loading = ref(true);

let moduleInstance: Module | null = null;
let ctx: ModuleContext | null = null;
let initialized = false;

async function mountModule() {
  if (!containerRef.value) return;
  loading.value = true;
  error.value = null;

  try {
    const mod = await moduleStore.loadModule(props.item.moduleId);
    moduleInstance = mod;

    const manifest = moduleStore.getManifest(props.item.moduleId);
    if (!manifest)
      throw new Error(`Manifest not found for "${props.item.moduleId}"`);

    ctx = createModuleContext(
      props.item.moduleId,
      containerRef.value,
      manifest
    );

    moduleStore.registerInstance(props.item.instanceId, mod, manifest);

    if (!initialized && mod.onInit) {
      await mod.onInit(ctx);
      initialized = true;
      moduleStore.markInitialized(props.item.instanceId);
    }

    if (mod.onMount) {
      await mod.onMount(ctx);
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    console.error(
      `[ModuleLoader] Failed to mount "${props.item.moduleId}":`,
      e
    );
  } finally {
    loading.value = false;
  }
}

async function unmountModule() {
  if (moduleInstance?.onUnmount) {
    try {
      await moduleInstance.onUnmount();
    } catch (e) {
      console.error("[ModuleLoader] onUnmount error:", e);
    }
  }
}

async function destroyModule() {
  if (moduleInstance?.onDestroy) {
    try {
      await moduleInstance.onDestroy();
    } catch (e) {
      console.error("[ModuleLoader] onDestroy error:", e);
    }
  }
  moduleStore.removeInstance(props.item.instanceId);
  moduleInstance = null;
  ctx = null;
  initialized = false;
}

onMounted(() => {
  mountModule();
});

onBeforeUnmount(() => {
  unmountModule().then(() => destroyModule());
});
</script>

<template>
  <div class="module-loader">
    <div v-if="loading" class="module-loading">加载中...</div>
    <div v-else-if="error" class="module-error">⚠️ {{ error }}</div>
    <div v-else ref="containerRef" class="module-container" />
  </div>
</template>

<style scoped>
.module-loader {
  height: 100%;
  width: 100%;
}

.module-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
}

.module-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #f87171;
  font-size: 13px;
  padding: 8px;
  text-align: center;
}

.module-container {
  height: 100%;
  width: 100%;
  overflow: auto;
}
</style>
