import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AppError } from "@core/errors";
import type { Manifest } from "@core/manifest";
import type { DirEntry, ProcessResult, SystemInfo } from "@core/context";

const IPC_COMMANDS = {
  MODULE_LIST: "module_list",
  MODULE_LOAD: "module_load",
  STORAGE_READ: "storage_read",
  STORAGE_WRITE: "storage_write",
  FILE_READ: "file_read",
  FILE_WRITE: "file_write",
  FILE_READ_DIR: "file_read_dir",
  FILE_OPEN_PATH: "file_open_path",
  SYSTEM_INFO: "system_info",
  CLIPBOARD_READ: "clipboard_read",
  CLIPBOARD_WRITE: "clipboard_write",
  HTTP_GET: "http_get",
  EXEC_COMMAND: "exec_command",
  WINDOW_SET_BOTTOM: "window_set_bottom",
  WINDOW_SET_CLICK_THROUGH: "window_set_click_through",
  WINDOW_LIST: "window_list",
  WINDOW_EMBED: "window_embed",
  WINDOW_RESIZE_EMBEDDED: "window_resize_embedded",
  WINDOW_DETACH: "window_detach",
} as const;

interface CommandContext {
  moduleId: string;
  instanceId: string;
  requestId?: string;
}

function createCommandContext(
  moduleId: string,
  instanceId: string,
): CommandContext {
  return { moduleId, instanceId, requestId: crypto.randomUUID() };
}

function isAppError(err: unknown): err is AppError {
  return typeof err === "object" && err !== null && "code" in err;
}

function parseAppError(err: unknown): AppError {
  if (isAppError(err)) return err;
  if (typeof err === "string") return { code: "INTERNAL_ERROR", message: err };
  return {
    code: "INTERNAL_ERROR",
    message: "Unknown IPC error",
    cause: String(err),
  };
}

async function safeInvoke<T>(
  cmd: string,
  args: Record<string, unknown>,
): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (err) {
    throw parseAppError(err);
  }
}

export const bridge = {
  commands: IPC_COMMANDS,
  createCommandContext,
  parseAppError,

  module: {
    list: () => safeInvoke<Manifest[]>(IPC_COMMANDS.MODULE_LIST, {}),
    load: (path: string) =>
      safeInvoke<Manifest>(IPC_COMMANDS.MODULE_LOAD, { path }),
  },

  storage: {
    read: (instanceId: string, key: string) =>
      safeInvoke<unknown>(IPC_COMMANDS.STORAGE_READ, { instanceId, key }),
    write: (instanceId: string, key: string, value: unknown) =>
      safeInvoke<void>(IPC_COMMANDS.STORAGE_WRITE, { instanceId, key, value }),
    delete: (instanceId: string, key: string) =>
      safeInvoke<void>(IPC_COMMANDS.STORAGE_READ, { instanceId, key }),
  },

  file: {
    read: (ctx: CommandContext, path: string) =>
      safeInvoke<string>(IPC_COMMANDS.FILE_READ, { ctx, path }),
    write: (ctx: CommandContext, path: string, content: string) =>
      safeInvoke<void>(IPC_COMMANDS.FILE_WRITE, { ctx, path, content }),
    readDir: (ctx: CommandContext, path: string) =>
      safeInvoke<DirEntry[]>(IPC_COMMANDS.FILE_READ_DIR, { ctx, path }),
    openPath: (ctx: CommandContext, path: string) =>
      safeInvoke<void>(IPC_COMMANDS.FILE_OPEN_PATH, { ctx, path }),
  },

  system: {
    info: (ctx: CommandContext) =>
      safeInvoke<SystemInfo>(IPC_COMMANDS.SYSTEM_INFO, { ctx }),
    clipboardRead: (ctx: CommandContext) =>
      safeInvoke<string>(IPC_COMMANDS.CLIPBOARD_READ, { ctx }),
    clipboardWrite: (ctx: CommandContext, text: string) =>
      safeInvoke<void>(IPC_COMMANDS.CLIPBOARD_WRITE, { ctx, text }),
    httpGet: (ctx: CommandContext, url: string) =>
      safeInvoke<string>(IPC_COMMANDS.HTTP_GET, { ctx, url }),
    exec: (ctx: CommandContext, command: string, args: string[]) =>
      safeInvoke<ProcessResult>(IPC_COMMANDS.EXEC_COMMAND, {
        ctx,
        command,
        args,
      }),
  },

  window: {
    setBottom: () => safeInvoke<void>(IPC_COMMANDS.WINDOW_SET_BOTTOM, {}),
    setClickThrough: (enabled: boolean) =>
      safeInvoke<void>(IPC_COMMANDS.WINDOW_SET_CLICK_THROUGH, { enabled }),
    listWindows: () => safeInvoke<unknown[]>(IPC_COMMANDS.WINDOW_LIST, {}),
    embedWindow: (ctx: CommandContext, hwnd: string) =>
      safeInvoke<void>(IPC_COMMANDS.WINDOW_EMBED, { ctx, hwnd }),
    resizeEmbedded: (ctx: CommandContext, hwnd: string, w: number, h: number) =>
      safeInvoke<void>(IPC_COMMANDS.WINDOW_RESIZE_EMBEDDED, {
        ctx,
        hwnd,
        w,
        h,
      }),
    detachWindow: (ctx: CommandContext, hwnd: string) =>
      safeInvoke<void>(IPC_COMMANDS.WINDOW_DETACH, { ctx, hwnd }),
  },

  listen: {
    moduleMessage: async (
      handler: (msg: unknown) => void,
    ): Promise<() => void> => {
      return listen("module-message", (event) => handler(event.payload));
    },
    fileChanged: async (
      handler: (path: string) => void,
    ): Promise<() => void> => {
      return listen("file-changed", (event) =>
        handler(event.payload as string),
      );
    },
  },
};
