import { ARPG_CLOSE } from '@shared/index';

export const EXPLORATION_RETRY_MS = 3000;

type VisibilityDocument = EventTarget & Pick<Document, 'hidden' | 'hasFocus'>;

interface SceneSocket {
  readonly readyState: number;
  onopen: ((event: Event) => unknown) | null;
  onmessage: ((event: MessageEvent) => unknown) | null;
  onclose: ((event: CloseEvent) => unknown) | null;
  send(data: string): void;
  close(): void;
}

interface ConnectionOptions {
  createSocket: () => SceneSocket;
  scheduleRetry: (retry: () => void) => () => void;
  characterId: string;
  isForeground: () => boolean;
  onClose: (terminalMessage?: string) => void;
  onMessage: (data: string) => void;
}

/** Owns a socket and its queued reconnect for one scene lifetime. */
export class ExplorationConnection {
  private socket: SceneSocket | null = null;
  private cancelRetry: (() => void) | null = null;
  private stopped = false;
  private authSent = false;

  constructor(private readonly options: ConnectionOptions) {}

  start() {
    if (this.stopped || this.socket || this.cancelRetry) return;
    let socket: SceneSocket;
    try {
      socket = this.options.createSocket();
    } catch {
      this.retry();
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      if (this.socket === socket) this.authenticateIfForeground();
    };
    socket.onmessage = ({ data }) => {
      if (this.socket === socket && typeof data === 'string') this.options.onMessage(data);
    };
    socket.onclose = ({ code, reason }) => {
      if (this.socket !== socket) return;
      this.detachSocket();
      this.authSent = false;
      if (code === ARPG_CLOSE.SLOT_CHANGED || (code === 1000 && reason === 'Active character changed')) {
        this.stopped = true;
        this.options.onClose('Ô nhân vật đang chơi đã thay đổi.');
      } else if (code === ARPG_CLOSE.WINDOW_REPLACED) {
        this.stopped = true;
        this.options.onClose('Nhân vật này đang được điều khiển ở cửa sổ khác.');
      } else {
        this.options.onClose();
        this.retry();
      }
    };
  }

  observeVisibility(windowEvents: EventTarget, doc: VisibilityDocument, signal: AbortSignal, setBackgrounded: (value: boolean) => void) {
    const update = () => {
      const backgrounded = doc.hidden || !doc.hasFocus();
      setBackgrounded(backgrounded);
      if (!backgrounded) this.authenticateIfForeground();
    };
    for (const event of ['blur', 'pagehide']) {
      windowEvents.addEventListener(event, () => setBackgrounded(true), { signal });
    }
    for (const event of ['focus', 'pageshow']) windowEvents.addEventListener(event, update, { signal });
    doc.addEventListener('visibilitychange', update, { signal });
  }

  authenticateIfForeground() {
    if (this.stopped || this.authSent || !this.options.isForeground()) return;
    this.authSent = this.send({ type: 'AUTH', characterId: this.options.characterId, timestamp: Date.now() });
  }

  send(message: object): boolean {
    if (this.socket?.readyState !== 1) return false;
    this.socket.send(JSON.stringify(message));
    return true;
  }

  stop() {
    this.stopped = true;
    this.cancelRetry?.();
    this.cancelRetry = null;
    const socket = this.detachSocket();
    socket?.close();
  }

  private retry() {
    if (this.stopped) return;
    const cancel = this.options.scheduleRetry(() => {
      if (this.cancelRetry !== cancel) return;
      this.cancelRetry = null;
      cancel();
      this.start();
    });
    this.cancelRetry = cancel;
  }

  private detachSocket() {
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
    }
    return socket;
  }
}
