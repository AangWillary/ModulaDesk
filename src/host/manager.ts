import type { Manifest } from "@core/index";
import type { ModuleFactory } from "./types";

interface RegisteredModule {
  manifest: Manifest;
  factory: ModuleFactory;
}

export interface ModuleManager {
  register(manifest: Manifest, factory: ModuleFactory): void;
  unregister(moduleId: string): void;
  list(): Manifest[];
  get(moduleId: string): RegisteredModule | undefined;
}

export function createModuleManager(): ModuleManager {
  const registry = new Map<string, RegisteredModule>();

  return {
    register(manifest, factory) {
      registry.set(manifest.id, { manifest, factory });
    },

    unregister(moduleId) {
      registry.delete(moduleId);
    },

    list() {
      return Array.from(registry.values()).map((m) => m.manifest);
    },

    get(moduleId) {
      return registry.get(moduleId);
    },
  };
}
