type Handler = (payload: unknown) => void;

class EventBus {
  private listeners = new Map<string, Set<Handler>>();

  emit(type: string, payload: unknown): void {
    const handlers = this.listeners.get(type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(payload);
        } catch (e) {
          console.error(`[EventBus] Error in handler for "${type}":`, e);
        }
      }
    }
  }

  on(type: string, handler: Handler): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);
    return () => {
      this.listeners.get(type)?.delete(handler);
    };
  }
}

export const eventBus = new EventBus();
