// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Event Bridge (Phaser <-> React)
// ============================================================

type EventHandler = (...args: any[]) => void;

class EventBridgeEmitter {
  private events: Record<string, EventHandler[]> = {};

  on(event: string, handler: EventHandler) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(handler);
  }

  off(event: string, handler: EventHandler) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter((h) => h !== handler);
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return;
    for (const handler of this.events[event]) {
      try {
        handler(...args);
      } catch (err) {
        console.error(`Error in event handler for "${event}":`, err);
      }
    }
  }
}

export const eventBridge = new EventBridgeEmitter();
