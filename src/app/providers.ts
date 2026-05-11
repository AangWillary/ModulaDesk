import type {
  HostRuntime,
  PermissionPrompt,
  HostDependencies,
} from "@host/index";
import type { ShellFacade } from "@shell/types";
import type { Manifest } from "@core/index";
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

function createHostRuntime(): HostRuntime {
  return {
    storageRead: (instanceId, key) => bridge.storage.read(instanceId, key),
    storageWrite: (instanceId, key, value) =>
      bridge.storage.write(instanceId, key, value),
    storageDelete: (instanceId, key) =>
      bridge.storage.delete(instanceId, key),
  };
}

function createPermissionPrompt(): PermissionPrompt {
  return {
    request: async (_input) => {
      // TODO: show permission dialog
      return true;
    },
  };
}

export function createHostDependencies(): HostDependencies {
  return {
    runtime: createHostRuntime(),
    permissionPrompt: createPermissionPrompt(),
    logger: console,
  };
}

export function createAppServices(): AppServices {
  // This will be wired up in main.ts with actual instances
  return {
    modules: {
      listAvailable: () => [],
      createInstance: async () => ({}),
      destroyInstance: async () => {},
      reloadInstance: async () => {},
    },
    layout: {
      addModule: async () => {},
      moveItem: async () => {},
      resizeItem: async () => {},
      save: async () => {},
    },
    shell: {
      show: async () => {},
      hide: async () => {},
      toggle: async () => {},
      lockLayout: async () => {},
    },
  };
}
