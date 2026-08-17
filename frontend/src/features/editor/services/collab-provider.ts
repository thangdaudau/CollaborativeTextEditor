import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

export const CollabMessageType = {
  SYNC: 0,
  AWARENESS: 1,
} as const;

export class CollabProvider {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  ws: WebSocket | null = null;
  url: string;
  connected = false;
  private shouldConnect = false;
  private statusListeners = new Set<(connected: boolean) => void>();
  private handleUnload: () => void;

  constructor(url: string, doc: Y.Doc) {
    this.url = url;
    this.doc = doc;
    this.awareness = new awarenessProtocol.Awareness(doc);

    this.handleUnload = () => {
      this.destroy();
    };
    window.addEventListener('beforeunload', this.handleUnload);

    this.initListeners();
  }

  // Method đăng ký listener lắng nghe sự kiệt client kết nối và ngắt kết nối websocket server
  // trả về hàm (arrow function) hủy đăng ký
  onStatusChange(listener: (connected: boolean) => void) {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(connected: boolean) {
    if (this.connected !== connected) {
      this.connected = connected;
      this.statusListeners.forEach((fn) => fn(connected));
    }
  }

  private initListeners() {
    // doc 'update' event listener từ bản thân nếu doc thay đổi (gõ phím, e-đít)
    this.doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin !== this && this.ws?.readyState === WebSocket.OPEN) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, CollabMessageType.SYNC);
        syncProtocol.writeUpdate(encoder, update);
        this.ws.send(encoding.toUint8Array(encoder));
      }
    });

    this.awareness.on(
      'update',
      ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
        if (origin !== this && this.ws?.readyState === WebSocket.OPEN) {
          const changedClients = added.concat(updated, removed);
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, CollabMessageType.AWARENESS);
          encoding.writeVarUint8Array(
            encoder,
            awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
          );
          this.ws.send(encoding.toUint8Array(encoder));
        }
      }
    );
  }

  connect() {
    if (this.shouldConnect) return;
    this.shouldConnect = true;
    this.setupWebSocket();
  }

  disconnect() {
    this.shouldConnect = false;
    if (this.ws) {
      // Gửi gói tin xóa trạng thái Awareness của bản thân trước khi ngắt socket
      // cái hàm removeAwarenessStates sẽ kích hoạt sự kiện 'update' và chạy vào cái listener trên kia 'this.initLitener'
      if (this.ws.readyState === WebSocket.OPEN) {
        awarenessProtocol.removeAwarenessStates(this.awareness, [this.doc.clientID], 'cleanup');
      }
      const socket = this.ws;
      this.ws = null;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    }
    this.setStatus(false);
  }

  private setupWebSocket() {
    if (!this.shouldConnect) return;

    try {
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = 'arraybuffer';

      // Gửi ydoc của client lên server
      // nếu có khác biệt thì phần khác đó sẽ được server gửi lại client và dữ liệu (message) sẽ chạy vào hàm onmessage bên dưới
      this.ws.onopen = () => {
        if (!this.shouldConnect) {
          this.ws?.close();
          return;
        }
        this.setStatus(true);

        if (this.ws?.readyState === WebSocket.OPEN) {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, CollabMessageType.SYNC);
          syncProtocol.writeSyncStep1(encoder, this.doc);
          this.ws.send(encoding.toUint8Array(encoder));

          if (this.awareness.getLocalState() !== null) {
            const awarenessEncoder = encoding.createEncoder();
            encoding.writeVarUint(awarenessEncoder, CollabMessageType.AWARENESS);
            encoding.writeVarUint8Array(
              awarenessEncoder,
              awarenessProtocol.encodeAwarenessUpdate(this.awareness, [this.doc.clientID])
            );
            this.ws.send(encoding.toUint8Array(awarenessEncoder));
          }
        }
      };

      // 'message' event listener gửi từ client khác
      this.ws.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        const data = new Uint8Array(event.data);
        const decoder = decoding.createDecoder(data);
        const messageType = decoding.readVarUint(decoder);

        switch (messageType) {
          case CollabMessageType.SYNC: {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, CollabMessageType.SYNC);
            syncProtocol.readSyncMessage(decoder, encoder, this.doc, this);
            if (encoding.length(encoder) > 1 && this.ws?.readyState === WebSocket.OPEN) {
              this.ws.send(encoding.toUint8Array(encoder));
            }
            break;
          }
          case CollabMessageType.AWARENESS: {
            const update = decoding.readVarUint8Array(decoder);
            awarenessProtocol.applyAwarenessUpdate(this.awareness, update, this);
            break;
          }
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        this.setStatus(false);

        // Nếu doc bị khôi phục snapshot hoặc thay đổi quyền -> Reload toàn bộ trang
        if (event.code === 4001 || event.code === 4003) {
          console.warn(`[Collab] Connection closed with code ${event.code} (${event.reason}). Reloading page...`);
          this.shouldConnect = false; // Chặn reconnect ngầm
          window.location.reload();
          return;
        }

        // Nếu doc bị xóa -> Đá về trang chủ
        if (event.code === 4004) {
          this.shouldConnect = false;
          window.location.href = '/';
          return;
        }

        // Nếu bị chặn quyền ngay từ đầu (HTTP 403 / Handshake reject) -> Không reconnect vô tận
        if (event.code === 1008 || event.code === 4403) {
          this.shouldConnect = false;
          return;
        }

        // Rớt mạng bình thường -> Tự reconnect sau 2s
        if (this.shouldConnect) {
          setTimeout(() => {
            if (this.shouldConnect) {
              this.setupWebSocket();
            }
          }, 2000);
        }
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      // Ignored
    }
  }

  destroy() {
    window.removeEventListener('beforeunload', this.handleUnload);
    this.disconnect();
    this.statusListeners.clear();
    this.awareness.destroy();
    this.doc.destroy();
  }
}