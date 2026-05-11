import type { ModuleContext, Permission, SystemAPI } from "@core/index";
import type { PermissionChecker } from "./sandbox";
import type { EventBus } from "./event-bus";
import type { ModuleStorage } from "./storage";
import type { HostRuntime } from "./types";

interface CreateContextOptions {
  moduleId: string;
  instanceId: string;
  container: HTMLElement;
  settings: Record<string, unknown>;
  runtime: HostRuntime;
  permissions: PermissionChecker;
  eventBus: EventBus;
  storage: ModuleStorage;
  system: SystemAPI;
}

export function createModuleContext(
  options: CreateContextOptions,
): ModuleContext {
  const {
    moduleId,
    instanceId,
    container,
    settings,
    permissions,
    eventBus,
    storage,
    system,
  } = options;

  const unsubscribers: (() => void)[] = [];

  return {
    moduleId,
    instanceId,
    container,
    settings,

    storage: {
      get: <T>(key: string) => storage.get<T>(instanceId, key),
      set: <T>(key: string, value: T) =>
        storage.set<T>(instanceId, key, value),
      delete: (key: string) => storage.delete(instanceId, key),
    },

    emit(type, payload) {
      eventBus.emit({ type, payload, sourceInstanceId: instanceId });
    },

    on(type, handler) {
      const unsub = eventBus.on(type, (event) => handler(event.payload), {
        target: instanceId,
      });
      unsubscribers.push(unsub);
      return unsub;
    },

    requestPermission(perm: Permission) {
      return permissions.request(instanceId, perm);
    },

    system,
  };
}
