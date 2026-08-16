import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import { prisma } from '../../config/database.js';
import { CollabService } from './collab.service.js';
import type { CollabClient } from './collab.types.js';
import { CollabMessageType, SyncSubType } from '../../shared/types/collab.js';

export interface CollabRoom {
  docId: string;
  doc: Y.Doc;                                   // CRDT Document Stat - Nội dung tài liệu thực tế (văn bản, khối dữ liệu).
  awareness: awarenessProtocol.Awareness;       // Presence State - Trạng thái người dùng (con trỏ chuột, bôi đen text, trạng thái online/offline, màu đại diện, v.v.).
  clients: Set<CollabClient>;
  saveTimeout: NodeJS.Timeout | null;
  isDirty: boolean;
}

export class RoomManager {
  private static rooms = new Map<string, CollabRoom>();

  static getActiveRoom(docId: string): CollabRoom | undefined {
    return this.rooms.get(docId);
  }

  static async getOrCreateRoom(docId: string): Promise<CollabRoom> {
    let room = this.rooms.get(docId);
    if (room) return room;

    const ydoc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(ydoc);

    const document = await prisma.document.findUnique({
      where: { id: docId },
      select: { currentState: true },
    });

    if (document?.currentState) {
      Y.applyUpdate(ydoc, new Uint8Array(document.currentState));
    }

    room = {
      docId,
      doc: ydoc,
      awareness,
      clients: new Set(),
      saveTimeout: null,
      isDirty: false,
    };

    ydoc.on('update', (update: Uint8Array, origin: any) => {
      room!.isDirty = true;
      RoomManager.scheduleDebounceSave(room!);

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, CollabMessageType.SYNC);
      encoding.writeVarUint(encoder, SyncSubType.SYNC_UPDATE);
      encoding.writeVarUint8Array(encoder, update);

      const payload = encoding.toUint8Array(encoder);
      CollabService.broadcast(room!, payload, origin instanceof Object ? origin : undefined);
    });

    awareness.on('update', ({ added, updated, removed }: any, origin: any) => {
      const changedClients = added.concat(updated, removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 1);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
      );

      const payload = encoding.toUint8Array(encoder);
      CollabService.broadcast(room!, payload, origin instanceof Object ? origin : undefined);
    });

    this.rooms.set(docId, room);
    return room;
  }

  static addClient(room: CollabRoom, client: CollabClient) {
    room.clients.add(client);
  }

  static async removeClient(room: CollabRoom, client: CollabClient) {
    room.clients.delete(client);

    if (room.clients.size === 0) {
      if (room.saveTimeout) {
        clearTimeout(room.saveTimeout);
        room.saveTimeout = null;
      }

      if (room.isDirty) {
        await this.persistStateToDB(room);
      }

      room.awareness.destroy();
      room.doc.destroy();
      this.rooms.delete(room.docId);
    }
  }

  static applySnapshotRestore(docId: string, snapshotBytes: Uint8Array) {
    const room = this.rooms.get(docId);
    if (!room) return;

    const tempDoc = new Y.Doc();
    Y.applyUpdate(tempDoc, snapshotBytes);
    const restoredText = tempDoc.getText('content').toString();

    const activeText = room.doc.getText('content');
    room.doc.transact(() => {
      activeText.delete(0, activeText.length);
      activeText.insert(0, restoredText);
    });

    room.isDirty = false;
  }

  private static scheduleDebounceSave(room: CollabRoom) {
    if (room.saveTimeout) return;

    room.saveTimeout = setTimeout(async () => {
      room.saveTimeout = null;
      if (room.isDirty) {
        await this.persistStateToDB(room);
      }
    }, 3000);
  }

  private static async persistStateToDB(room: CollabRoom) {
    try {
      const state = Y.encodeStateAsUpdate(room.doc);
      await prisma.document.update({
        where: { id: room.docId },
        data: {
          currentState: Buffer.from(state),
          updatedAt: new Date(),
        },
      });
      room.isDirty = false;
    } catch (err) {
      console.error(`[DB Save Error] Failed to persist doc ${room.docId}:`, err);
    }
  }
}
