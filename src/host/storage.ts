import type { HostRuntime } from "./types";

export interface ModuleStorage {
  get<T>(instanceId: string, key: string): Promise<T | undefined>;
  set<T>(instanceId: string, key: string, value: T): Promise<void>;
  delete(instanceId: string, key: string): Promise<void>;
  list(instanceId: string): Promise<string[]>;
}

export function createModuleStorage(runtime: HostRuntime): ModuleStorage {
  return {
    async get<T>(instanceId: string, key: string): Promise<T | undefined> {
      const value = await runtime.storageRead(instanceId, key);
      return value as T | undefined;
    },

    async set<T>(instanceId: string, key: string, value: T): Promise<void> {
      await runtime.storageWrite(instanceId, key, value);
    },

    async delete(instanceId: string, key: string): Promise<void> {
      await runtime.storageDelete(instanceId, key);
    },

    async list(_instanceId: string): Promise<string[]> {
      // TODO: implement listing keys
      return [];
    },
  };
}
