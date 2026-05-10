import { defineStore } from "pinia";
import { ref } from "vue";
import type { Manifest, Module } from "../types/module";

const manifestFiles = import.meta.glob<{ default: Manifest }>(
  "/src/modules/*/manifest.json",
  { eager: true }
);
const moduleFiles = import.meta.glob<{ default: Module }>(
  "/src/modules/*/index.ts"
);

interface RegisteredModule {
  manifest: Manifest;
  moduleLoader: () => Promise<{ default: Module }>;
}

export const useModuleStore = defineStore("modules", () => {
  const registry = ref<Map<string, RegisteredModule>>(new Map());
  const instances = ref<
    Map<string, { module: Module; manifest: Manifest; initialized: boolean }>
  >(new Map());

  function discover() {
    console.log("[ModuleRegistry] Scanning modules/ directory...");
    let count = 0;

    for (const [path, manifestImport] of Object.entries(manifestFiles)) {
      try {
        const manifest = manifestImport.default;
        if (!manifest.id || !manifest.name || !manifest.type) {
          console.warn(
            `[ModuleRegistry] Invalid manifest at ${path}: missing required fields`
          );
          continue;
        }
        const indexPath = path.replace("manifest.json", "index.ts");
        const moduleLoader = moduleFiles[indexPath];
        if (!moduleLoader) {
          console.warn(
            `[ModuleRegistry] No index.ts found for module "${manifest.id}" at ${indexPath}`
          );
          continue;
        }
        registry.value.set(manifest.id, { manifest, moduleLoader });
        count++;
      } catch (e) {
        console.error(
          `[ModuleRegistry] Failed to load manifest at ${path}:`,
          e
        );
      }
    }

    console.log(`[ModuleRegistry] Discovered ${count} module(s)`);
  }

  function getManifest(moduleId: string): Manifest | undefined {
    return registry.value.get(moduleId)?.manifest;
  }

  function getAllManifests(): Manifest[] {
    return Array.from(registry.value.values()).map((r) => r.manifest);
  }

  async function loadModule(moduleId: string): Promise<Module> {
    const entry = registry.value.get(moduleId);
    if (!entry) throw new Error(`Module "${moduleId}" not found in registry`);
    const mod = await entry.moduleLoader();
    return mod.default;
  }

  function registerInstance(
    instanceId: string,
    module: Module,
    manifest: Manifest
  ) {
    instances.value.set(instanceId, { module, manifest, initialized: false });
  }

  function markInitialized(instanceId: string) {
    const inst = instances.value.get(instanceId);
    if (inst) inst.initialized = true;
  }

  function removeInstance(instanceId: string) {
    instances.value.delete(instanceId);
  }

  function getInstance(instanceId: string) {
    return instances.value.get(instanceId);
  }

  return {
    registry,
    instances,
    discover,
    getManifest,
    getAllManifests,
    loadModule,
    registerInstance,
    markInitialized,
    removeInstance,
    getInstance,
  };
});
