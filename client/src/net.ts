import type { ServerMsg, ClientMsg } from '../../shared/protocol';

export type NetHandler = (msg: ServerMsg) => void;

export class Net {
  private ws: WebSocket | undefined;
  private handlers: NetHandler[] = [];
  private queue: ClientMsg[] = [];
  url: string;

  constructor() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${proto}//${location.host}/ws`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;

      ws.onopen = () => {
        for (const msg of this.queue) {
          ws.send(JSON.stringify(msg));
        }

        this.queue = [];
        resolve();
      };

      ws.onerror = () => reject(new Error('Нет связи с сервером'));

      ws.onmessage = event => {
        let msg: ServerMsg;

        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        for (const handler of this.handlers) {
          handler(msg);
        }
      };

      ws.onclose = () => {
        this.ws = undefined;
      };
    });
  }

  on(handler: NetHandler) {
    this.handlers.push(handler);
  }

  send(msg: ClientMsg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.queue.push(msg);
    }
  }

  close() {
    this.ws?.close();
  }
}
