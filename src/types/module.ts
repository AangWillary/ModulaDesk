export interface Manifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  icon: string;
  grid: {
    minWidth: number;
    minHeight: number;
    maxWidth: number;
    maxHeight: number;
    defaultWidth: number;
    defaultHeight: number;
    resizable: boolean;
  };
  type: "web" | "native" | "embedded";
  /** Configuration for embedded-type modules */
  embedded?: EmbeddedConfig;
  permissions: string[];
  settings: Record<
    string,
    {
      type: "boolean" | "string" | "number";
      default: unknown;
      label: string;
    }
  >;
}

export interface WindowInfo {
  hwnd: number;
  title: string;
  className: string;
  processName: string;
}

export interface EmbeddedConfig {
  /** Window class name to match (e.g. "CASCADIA_HOSTING_WINDOW_CLASS" for Windows Terminal) */
  className?: string;
  /** Window title substring to match */
  titleMatch?: string;
  /** Command to launch the process if not already running */
  launchCommand?: string;
}

export interface DirEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modified: string | null;
}

export interface ModuleContext {
  readonly moduleId: string;
  readonly container: HTMLElement;
  readonly settings: Record<string, unknown>;
  storage: {
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
  };
  emit(type: string, payload: unknown): void;
  on(type: string, handler: (payload: unknown) => void): () => void;
  requestPermission(perm: string): Promise<boolean>;
  system: {
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    readDir(path: string): Promise<DirEntry[]>;
    openPath(path: string): Promise<void>;
    exec(
      command: string
    ): Promise<{ stdout: string; stderr: string }>;
    clipboardRead(): Promise<string>;
    clipboardWrite(text: string): Promise<void>;
    httpGet(url: string): Promise<string>;
  };
}

export interface Module {
  onInit?(ctx: ModuleContext): Promise<void>;
  onMount?(ctx: ModuleContext): Promise<void>;
  onUnmount?(): Promise<void>;
  onDestroy?(): Promise<void>;
  onResize?(width: number, height: number): void;
  onSettingsChange?(key: string, value: unknown): void;
  onMessage?(type: string, payload: unknown): void;
}
