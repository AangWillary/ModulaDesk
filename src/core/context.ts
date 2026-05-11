import type { Permission } from "./permissions";

export interface SystemAPI {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  readDir(path: string): Promise<DirEntry[]>;
  openPath(path: string): Promise<void>;
  clipboardRead(): Promise<string>;
  clipboardWrite(text: string): Promise<void>;
  httpGet(url: string): Promise<string>;
  exec(command: string, args: string[]): Promise<ProcessResult>;
  systemInfo(): Promise<SystemInfo>;
}

export interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  modified: string;
}

export interface ProcessResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface SystemInfo {
  os: string;
  arch: string;
  family: string;
}

export interface ModuleContext {
  readonly moduleId: string;
  readonly instanceId: string;
  readonly container: HTMLElement;
  readonly settings: Record<string, unknown>;

  storage: {
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
  };

  emit(type: string, payload: unknown): void;
  on(type: string, handler: (payload: unknown) => void): () => void;

  requestPermission(perm: Permission): Promise<boolean>;

  system: SystemAPI;
}
