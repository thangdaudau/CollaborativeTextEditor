import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import type { CollabClient } from './collab.types.js';
import type { CollabRoom } from './room.manager.js';
import { CollabMessageType } from '../../shared/types/collab.js';


export class CollabService {
  static sendInitialSync(client: CollabClient, room: CollabRoom) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, CollabMessageType.SYNC);
    syncProtocol.writeSyncStep1(encoder, room.doc);
    CollabService.send(client, encoding.toUint8Array(encoder));

    const awarenessStates = room.awareness.getStates();
    if (awarenessStates.size > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, CollabMessageType.AWARENESS);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(
          room.awareness,
          Array.from(awarenessStates.keys())
        )
      );
      CollabService.send(client, encoding.toUint8Array(awarenessEncoder));
    }
  }

  static handleMessage(client: CollabClient, room: CollabRoom, message: ArrayBuffer | Buffer) {
    const uint8Msg = new Uint8Array(message);
    const decoder = decoding.createDecoder(uint8Msg);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case CollabMessageType.SYNC: {
        const syncMessageType = decoding.readVarUint(decoder);

        switch (syncMessageType) {
          case syncProtocol.messageYjsSyncStep1: {
            // FRAME 1: Trả lời SyncStep 2 (dữ liệu Server có mà Client thiếu)
            const encoderStep2 = encoding.createEncoder();
            encoding.writeVarUint(encoderStep2, CollabMessageType.SYNC);
            syncProtocol.readSyncStep1(decoder, encoderStep2, room.doc);
            if (encoding.length(encoderStep2) > 1) {
              CollabService.send(client, encoding.toUint8Array(encoderStep2));
            }

            // FRAME 2: Bắn riêng SyncStep 1 của Server (State Vector của Server để Client gửi bù delta)
            const encoderStep1 = encoding.createEncoder();
            encoding.writeVarUint(encoderStep1, CollabMessageType.SYNC);
            syncProtocol.writeSyncStep1(encoderStep1, room.doc);
            CollabService.send(client, encoding.toUint8Array(encoderStep1));
            break;
          }

          case syncProtocol.messageYjsSyncStep2: {
            // Chặn VIEWER không cho đẩy dữ liệu khởi tạo của nó lên ghi đè server
            if (client.role === 'VIEWER') return;

            syncProtocol.readSyncStep2(decoder, room.doc, client);
            break;
          }

          case syncProtocol.messageYjsUpdate: {
            // Chặn VIEWER không cho gửi update gõ phím
            if (client.role === 'VIEWER') return;

            syncProtocol.readUpdate(decoder, room.doc, client);
            break;
          }

          default:
            console.warn(`[Collab] Unknown sync subtype: ${syncMessageType}`);
        }
        break;
      }

      case CollabMessageType.AWARENESS: {
        const update = decoding.readVarUint8Array(decoder);
        awarenessProtocol.applyAwarenessUpdate(room.awareness, update, client);
        break;
      }

      default:
        console.warn(`[Collab] Unknown message type: ${messageType}`);
    }
  }

  static broadcast(room: CollabRoom, payload: Uint8Array, excludeClient?: CollabClient) {
    room.clients.forEach((client) => {
      if (client !== excludeClient && client.readyState === 1) {
        CollabService.send(client, payload);
      }
    });
  }

  private static send(client: CollabClient, payload: Uint8Array) {
    if (client.readyState === 1) {
      client.send(payload, { binary: true });
    }
  }
}
