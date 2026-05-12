import type { HostDependencies } from "@host/index";
import type { LayoutEngine } from "@layout/engine";
import type { ModuleManager } from "@host/index";
import type { Manifest } from "@core/index";
import type { ShellFacade } from "@shell/types";
import { createModuleInstanceManager } from "@host/instance";
import { createPermissionChecker } from "@host/sandbox";
import { createEventBus } from "@host/event-bus";
import { createModuleStorage } from "@host/storage";
import { createSystemAPI } from "./system-api";
import { bridge } from "./bridge";

export interface AppServices {
  modules: {
    listAvailable(): Manifest[];
    createInstance(moduleId: string, container: HTMLElement): Promise<unknown>;
    destroyInstance(instanceId: string): Promise<void>;
    reloadInstance(instanceId: string): Promise<void>;
  };
  layout: {
    addModule(moduleId: string): Promise<void>;
    moveItem(instanceId: string, x: number, y: number): Promise<void>;
    resizeItem(instanceId: string, w: number, h: number): Promise<void>;
    save(): Promise<void>;
  };
  shell: ShellFacade;
}

export function createHostDependencies(): HostDependencies {
  return {
    runtime: {
      storageRead: (instanceId, key) => bridge.storage.read(instanceId, key),
      storageWrite: (instanceId, key, value) => bridge.storage.write(instanceId, key, value),
      storageDelete: (instanceId, key) => bridge.storage.delete(instanceId, key),
    },
    permissionPrompt: {
      request: async () => true,
    },
    logger: console,
  };
}

export function createAppServices(
  hostDeps: HostDependencies,
  layoutEngine: LayoutEngine,
  moduleManager: ModuleManager
): AppServices {
  const permissions = createPermissionChecker(hostDeps.permissionPrompt);
  const eventBus = createEventBus();
  const storage = createModuleStorage(hostDeps.runtime);

  const instanceManager = createModuleInstanceManager(
    hostDeps.runtime,
    permissions,
    eventBus,
    storage,
    (moduleId, instanceId) => createSystemAPI(moduleId, instanceId)
  );

  return {
    modules: {
      listAvailable: () => moduleManager.list(),

      async createInstance(moduleId: string, container: HTMLElement) {
        const entry = moduleManager.get(moduleId);
        if (!entry) throw new Error(`Module "${moduleId}" not registered`);

        const instanceId = crypto.randomUUID();
        return instanceManager.create(moduleId, entry.factory, {
          instanceId,
          container,
        });
      },

      async destroyInstance(instanceId: string) {
        await instanceManager.destroy(instanceId);
      },

      async reloadInstance(instanceId: string) {
        const instance = instanceManager.get(instanceId);
        if (!instance) return;
        await instanceManager.destroy(instanceId);
      },
    },

    layout: {
      async addModule(moduleId: string) {
        const entry = moduleManager.get(moduleId);
        if (!entry) return;
        const manifest = entry.manifest;
        layoutEngine.addItem({
          moduleId,
          instanceId: crypto.randomUUID(),
          w: manifest.grid.defaultWidth,
          h: manifest.grid.defaultHeight,
          minW: manifest.grid.minWidth,
          minH: manifest.grid.minHeight,
          maxW: manifest.grid.maxWidth,
          maxH: manifest.grid.maxHeight,
        });
      },

      async moveItem(instanceId, x, y) {
        layoutEngine.moveItem(instanceId, x, y);
      },

      async resizeItem(instanceId, w, h) {
        layoutEngine.resizeItem(instanceId, w, h);
      },

      async save() {
        const data = layoutEngine.save();
        localStorage.setItem("willdesk-layout", JSON.stringify(data));
      },
    },

    shell: {
      show: async () => {},
      hide: async () => {},
      toggle: async () => {},
      lockLayout: async () => {},
    },
  };
}
