import type { ModuleEvent, EventHandler } from "@core/index";

export interface EventBus {
  emit(event: ModuleEvent): void;
  on(
    type: string,
    handler: EventHandler,
    options?: { target?: string },
  ): () => void;
}

export function createEventBus(): EventBus {
  const listeners = new Map<
    string,
    Set<{ handler: EventHandler; target?: string }>
  >();

  return {
    emit(event) {
      const handlers = listeners.get(event.type);
      if (!handlers) return;

      for (const { handler, target } of handlers) {
        if (
          target &&
          event.targetInstanceId &&
          target !== event.targetInstanceId
        )
          continue;
        handler(event);
      }
    },

    on(type, handler, options) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      const entry = { handler, target: options?.target };
      listeners.get(type)!.add(entry);
      return () => listeners.get(type)?.delete(entry);
    },
  };
}
