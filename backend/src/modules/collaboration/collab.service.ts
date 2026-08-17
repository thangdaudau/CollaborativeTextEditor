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
            // VIEWER hay ai cũng được phép nhận dữ liệu tài liệu
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, CollabMessageType.SYNC);
            
            // readSyncStep1 ĐÃ TỰ ĐỘNG ghi messageYjsSyncStep2 vào encoder, không ghi đè thêm
            syncProtocol.readSyncStep1(decoder, encoder, room.doc);
            
            if (encoding.length(encoder) > 1) {
              CollabService.send(client, encoding.toUint8Array(encoder));
            }
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
