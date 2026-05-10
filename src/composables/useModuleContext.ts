import type { ModuleContext, Manifest, DirEntry } from "../types/module";
import { eventBus } from "./useEventBus";
import { invoke } from "@tauri-apps/api/core";

const STORAGE_PREFIX = "moduladesk:";

class PermissionError extends Error {
  constructor(perm: string) {
    super(`Permission "${perm}" not declared in module manifest`);
    this.name = "PermissionError";
  }
}

function checkPermission(manifest: Manifest, perm: string): void {
  if (!manifest.permissions.includes(perm)) {
    throw new PermissionError(perm);
  }
}

export function createModuleContext(
  moduleId: string,
  container: HTMLElement,
  manifest: Manifest,
  settings: Record<string, unknown> = {}
): ModuleContext {
  const storageKey = (key: string) => `${STORAGE_PREFIX}${moduleId}:${key}`;

  const storage: ModuleContext["storage"] = {
    async get<T>(key: string): Promise<T | undefined> {
      const raw = localStorage.getItem(storageKey(key));
      if (raw === null) return undefined;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return undefined;
      }
    },
    async set<T>(key: string, value: T): Promise<void> {
      localStorage.setItem(storageKey(key), JSON.stringify(value));
    },
    async delete(key: string): Promise<void> {
      localStorage.removeItem(storageKey(key));
    },
  };

  const system: ModuleContext["system"] = {
    async readFile(path: string): Promise<string> {
      checkPermission(manifest, "file:read");
      return invoke<string>("read_file", { path });
    },
    async writeFile(path: string, content: string): Promise<void> {
      checkPermission(manifest, "file:write");
      return invoke("write_file", { path, content });
    },
    async readDir(path: string): Promise<DirEntry[]> {
      checkPermission(manifest, "file:read");
      return invoke<DirEntry[]>("read_dir", { path });
    },
    async openPath(path: string): Promise<void> {
      return invoke("open_path", { path });
    },
    async exec(
      command: string
    ): Promise<{ stdout: string; stderr: string }> {
      checkPermission(manifest, "system:shell");
      return invoke("exec_command", { command });
    },
    async clipboardRead(): Promise<string> {
      checkPermission(manifest, "system:clipboard");
      return invoke<string>("clipboard_read");
    },
    async clipboardWrite(text: string): Promise<void> {
      checkPermission(manifest, "system:clipboard");
      return invoke("clipboard_write", { text });
    },
    async httpGet(url: string): Promise<string> {
      checkPermission(manifest, "network:http");
      return invoke<string>("http_get", { url });
    },
  };

  return {
    moduleId,
    container,
    settings,
    storage,
    emit: (type, payload) => eventBus.emit(type, payload),
    on: (type, handler) => eventBus.on(type, handler),
    requestPermission: async (perm: string) => {
      return manifest.permissions.includes(perm);
    },
    system,
  };
}
