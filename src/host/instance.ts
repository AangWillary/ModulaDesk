import type {
  ModuleInstance,
  CreateModuleInstanceOptions,
  ModuleFactory,
  HostRuntime,
} from "./types";
import type { SystemAPI } from "@core/index";
import { createModuleContext } from "./context-factory";
import type { PermissionChecker } from "./sandbox";
import type { EventBus } from "./event-bus";
import type { ModuleStorage } from "./storage";
import { v4 as uuid } from "uuid";

export interface ModuleInstanceManager {
  create(
    moduleId: string,
    factory: ModuleFactory,
    options: CreateModuleInstanceOptions,
  ): Promise<ModuleInstance>;
  destroy(instanceId: string): Promise<void>;
  suspend(instanceId: string): void;
  resume(instanceId: string): void;
  list(): ModuleInstance[];
  get(instanceId: string): ModuleInstance | undefined;
}

export function createModuleInstanceManager(
  runtime: HostRuntime,
  permissions: PermissionChecker,
  eventBus: EventBus,
  storage: ModuleStorage,
  system: SystemAPI,
): ModuleInstanceManager {
  const instances = new Map<string, ModuleInstance>();

  return {
    async create(moduleId, factory, options) {
      const instanceId = options.instanceId ?? uuid();
      const module = await factory();

      const ctx = createModuleContext({
        moduleId,
        instanceId,
        container: options.container,
        settings: options.settings ?? {},
        runtime,
        permissions,
        eventBus,
        storage,
        system,
      });

      const instance: ModuleInstance = {
        instanceId,
        moduleId,
        status: "created",
        module,
        ctx,
      };

      instances.set(instanceId, instance);

      // Call onInit
      if (module.onInit) {
        instance.status = "initializing";
        await module.onInit(ctx);
        instance.status = "initialized";
      }

      // Call onMount
      if (module.onMount) {
        instance.status = "mounting";
        await module.onMount(ctx);
        instance.status = "mounted";
      }

      return instance;
    },

    async destroy(instanceId) {
      const instance = instances.get(instanceId);
      if (!instance) return;

      instance.status = "unmounting";
      if (instance.module.onUnmount) {
        await instance.module.onUnmount();
      }

      if (instance.module.onDestroy) {
        await instance.module.onDestroy();
      }

      instance.status = "destroyed";
      instances.delete(instanceId);
    },

    suspend(instanceId) {
      const instance = instances.get(instanceId);
      if (instance && instance.status === "mounted") {
        if (instance.module.onUnmount) {
          instance.module.onUnmount();
        }
        instance.status = "suspended";
      }
    },

    resume(instanceId) {
      const instance = instances.get(instanceId);
      if (instance && instance.status === "suspended") {
        if (instance.module.onMount) {
          instance.module.onMount(instance.ctx);
        }
        instance.status = "mounted";
      }
    },

    list() {
      return Array.from(instances.values());
    },

    get(instanceId) {
      return instances.get(instanceId);
    },
  };
}
