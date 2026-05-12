import type { SystemAPI } from "@core/index";
import { bridge } from "./bridge";

export function createSystemAPI(moduleId: string, instanceId: string): SystemAPI {
  const ctx = { moduleId, instanceId };

  return {
    readFile: (path) => bridge.file.read(ctx, path),
    writeFile: (path, content) => bridge.file.write(ctx, path, content),
    readDir: (path) => bridge.file.readDir(ctx, path),
    openPath: (path) => bridge.file.openPath(ctx, path),
    clipboardRead: () => bridge.system.clipboardRead(ctx),
    clipboardWrite: (text) => bridge.system.clipboardWrite(ctx, text),
    httpGet: (url) => bridge.system.httpGet(ctx, url),
    exec: (command, args) => bridge.system.exec(ctx, command, args),
    systemInfo: () => bridge.system.info(ctx),
  };
}
