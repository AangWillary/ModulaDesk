<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, onUnmounted, watch } from "vue";
import type { LayoutItem } from "../stores/layout";
import type { Module, ModuleContext, Manifest } from "../types/module";
import { useModuleStore } from "../stores/modules";
import { createModuleContext } from "../composables/useModuleContext";
import { invoke } from "@tauri-apps/api/core";

const props = defineProps<{ item: LayoutItem }>();

const moduleStore = useModuleStore();
const containerRef = ref<HTMLElement>();
const error = ref<string | null>(null);
const loading = ref(true);

let moduleInstance: Module | null = null;
let ctx: ModuleContext | null = null;
let initialized = false;
let embeddedHwnd: number | null = null;

async function mountWebModule(manifest: Manifest) {
  if (!containerRef.value) return;

  const mod = await moduleStore.loadModule(props.item.moduleId);
  moduleInstance = mod;

  ctx = createModuleContext(
    props.item.moduleId,
    props.item.instanceId,
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
}

async function mountEmbeddedModule(manifest: Manifest) {
  if (!containerRef.value) return;

  const config = manifest.embedded;
  if (!config) throw new Error("Embedded module missing 'embedded' config");

  // Show placeholder while we search for the window
  containerRef.value.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100%;
                flex-direction:column;gap:8px;color:rgba(255,255,255,0.5);">
      <div style="font-size:2rem;">${manifest.icon}</div>
      <div>正在查找窗口...</div>
    </div>
  `;

  // Launch process if needed — requires system:shell permission in manifest
  if (config.launchCommand) {
    if (!manifest.permissions.includes("system:shell")) {
      throw new Error("Embedded module with launchCommand requires 'system:shell' permission");
    }
    try {
      await invoke("exec_command", { command: config.launchCommand });
      await new Promise((r) => setTimeout(r, 1500));
    } catch {
      // Process may already be running
    }
  }

  // Find the target window
  const windows = await invoke<Array<{ hwnd: number; title: string; className: string }>>(
    "list_windows"
  );

  let target = null;
  for (const w of windows) {
    if (config.className && w.className === config.className) {
      target = w;
      break;
    }
    if (config.titleMatch && w.title.includes(config.titleMatch)) {
      target = w;
      break;
    }
  }

  if (!target) {
    throw new Error(
      `找不到目标窗口${config.className ? ` (class: ${config.className})` : ""}${config.titleMatch ? ` (title: ${config.titleMatch})` : ""}`
    );
  }

  embeddedHwnd = target.hwnd;

  // Calculate position relative to container
  const rect = containerRef.value.getBoundingClientRect();
  const result = await invoke<boolean>("embed_window", {
    targetHwnd: target.hwnd,
    x: 0,
    y: 0,
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  });

  if (!result) {
    throw new Error("嵌入窗口失败");
  }

  containerRef.value.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100%;
                flex-direction:column;gap:4px;color:rgba(255,255,255,0.3);font-size:11px;">
      <div>${manifest.icon} ${target.title}</div>
      <div>已嵌入</div>
    </div>
  `;
}

async function mountModule() {
  if (!containerRef.value) return;
  loading.value = true;
  error.value = null;

  try {
    const manifest = moduleStore.getManifest(props.item.moduleId);
    if (!manifest)
      throw new Error(`Manifest not found for "${props.item.moduleId}"`);

    if (manifest.type === "embedded") {
      await mountEmbeddedModule(manifest);
    } else {
      await mountWebModule(manifest);
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

// Resize embedded window when grid cell size changes
watch(
  () => [props.item.w, props.item.h],
  async () => {
    if (embeddedHwnd === null || !containerRef.value) return;
    try {
      const rect = containerRef.value.getBoundingClientRect();
      await invoke("resize_embedded", {
        targetHwnd: embeddedHwnd,
        x: 0,
        y: 0,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    } catch (e) {
      console.error("[ModuleLoader] resize error:", e);
    }
  }
);

onMounted(() => {
  mountModule();
});

// Detach embedded window synchronously before DOM is destroyed
onBeforeUnmount(() => {
  if (embeddedHwnd !== null) {
    invoke("detach_window", { targetHwnd: embeddedHwnd }).catch((e) =>
      console.warn("[ModuleLoader] detach failed (window may already be closed):", e)
    );
    embeddedHwnd = null;
  }
});

// Run module lifecycle cleanup after DOM is unmounted
onUnmounted(() => {
  if (moduleInstance?.onUnmount) {
    moduleInstance.onUnmount().catch((e) =>
      console.error("[ModuleLoader] onUnmount error:", e)
    );
  }
  if (moduleInstance?.onDestroy) {
    moduleInstance.onDestroy().catch((e) =>
      console.error("[ModuleLoader] onDestroy error:", e)
    );
  }
  moduleStore.removeInstance(props.item.instanceId);
  moduleInstance = null;
  ctx = null;
  initialized = false;
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
