<script setup lang="ts">
import { ref, inject, onMounted, onBeforeUnmount, onUnmounted, watch } from "vue";
import type { LayoutItem } from "@layout/types";
import type { Manifest } from "@core/manifest";
import type { AppServices } from "@app/providers";
import { useModulesStore } from "@stores/modules";
import { bridge } from "@app/bridge";

const props = defineProps<{ item: LayoutItem }>();

const appServices = inject<AppServices>("appServices");
const modulesStore = useModulesStore();
const containerRef = ref<HTMLElement>();
const error = ref<string | null>(null);
const loading = ref(true);

let embeddedHwnd: string | null = null;
let activeModuleId: string | null = null;
let activeInstanceId: string | null = null;

function findManifest(moduleId: string): Manifest | undefined {
  return modulesStore.available.find((m) => m.id === moduleId);
}

async function mountEmbeddedModule(manifest: Manifest) {
  if (!containerRef.value) return;

  const config = manifest.embedded;
  if (!config) throw new Error("Embedded module missing 'embedded' config");

  containerRef.value.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100%;
                flex-direction:column;gap:8px;color:rgba(255,255,255,0.5);">
      <div style="font-size:2rem;">${manifest.icon}</div>
      <div>正在查找窗口...</div>
    </div>
  `;

  // Launch process if needed
  if (config.launchCommand) {
    if (!manifest.permissions.includes("system:shell")) {
      throw new Error("Embedded module with launchCommand requires 'system:shell' permission");
    }
    try {
      const parts = config.launchCommand.split(/\s+/);
      await bridge.system.exec(
        { moduleId: manifest.id, instanceId: props.item.instanceId },
        parts[0],
        parts.slice(1)
      );
      await new Promise((r) => setTimeout(r, 1500));
    } catch {
      // Process may already be running
    }
  }

  // Find the target window
  const windows = (await bridge.window.listWindows()) as Array<{
    hwnd: number;
    title: string;
    className: string;
  }>;

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

  embeddedHwnd = String(target.hwnd);

  await bridge.window.embedWindow(
    { moduleId: manifest.id, instanceId: props.item.instanceId },
    embeddedHwnd
  );

  containerRef.value.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100%;
                flex-direction:column;gap:4px;color:rgba(255,255,255,0.3);font-size:11px;">
      <div>${manifest.icon} ${target.title}</div>
      <div>已嵌入</div>
    </div>
  `;
}

async function mountWebModule(manifest: Manifest) {
  if (!containerRef.value || !appServices) return;

  const instance = (await appServices.modules.createInstance(manifest.id, containerRef.value)) as {
    instanceId: string;
  };
  activeInstanceId = instance.instanceId;
}

async function mountModule() {
  if (!containerRef.value) return;
  if (!props.item.moduleId) return;
  loading.value = true;
  error.value = null;
  activeModuleId = props.item.moduleId;

  try {
    const manifest = findManifest(activeModuleId);
    if (!manifest) throw new Error(`Manifest not found for "${activeModuleId}"`);

    if (manifest.type === "embedded") {
      await mountEmbeddedModule(manifest);
    } else {
      await mountWebModule(manifest);
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    console.error(`[ModuleLoader] Failed to mount "${activeModuleId}":`, e);
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
      await bridge.window.resizeEmbedded(
        { moduleId: activeModuleId ?? "", instanceId: props.item.instanceId },
        embeddedHwnd,
        Math.round(rect.width),
        Math.round(rect.height)
      );
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
    bridge.window
      .detachWindow(
        { moduleId: activeModuleId ?? "", instanceId: props.item.instanceId },
        embeddedHwnd
      )
      .catch((e) =>
        console.warn("[ModuleLoader] detach failed (window may already be closed):", e)
      );
    embeddedHwnd = null;
  }
});

onUnmounted(() => {
  if (activeInstanceId && appServices) {
    appServices.modules
      .destroyInstance(activeInstanceId)
      .catch((e) => console.error("[ModuleLoader] destroyInstance error:", e));
    activeInstanceId = null;
  }
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
