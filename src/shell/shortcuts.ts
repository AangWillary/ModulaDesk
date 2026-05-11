import type { ShortcutConfig } from "./types";

type ActionHandler = () => void;

export interface ShortcutManager {
  register(config: ShortcutConfig): void;
  unregister(): void;
  onAction(action: string, handler: ActionHandler): () => void;
}

export function createShortcutManager(): ShortcutManager {
  const handlers = new Map<string, Set<ActionHandler>>();

  return {
    register(_config) {
      // Actual registration happens via app/bridge.ts
    },

    unregister() {
      handlers.clear();
    },

    onAction(action, handler) {
      if (!handlers.has(action)) handlers.set(action, new Set());
      handlers.get(action)!.add(handler);
      return () => handlers.get(action)?.delete(handler);
    },
  };
}
