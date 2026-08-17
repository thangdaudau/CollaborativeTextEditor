import * as Y from 'yjs';
import { prisma } from '../../config/database.js';
import {
  getCollabDocState,
  resetCollabRoom,
} from '../../shared/services/collab-room.service.js';

export class SnapshotService {
  static async createSnapshot(documentId: string) {
    let binaryState = getCollabDocState(documentId);

    if (!binaryState) {
      const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: { currentState: true },
      });

      if (!doc) {
        throw new Error('Document not found');
      }

      binaryState = doc.currentState
        ? new Uint8Array(doc.currentState)
        : Y.encodeStateAsUpdate(new Y.Doc());
    }

    const snapshot = await prisma.documentSnapshot.create({
      data: {
        documentId,
        snapshot: Buffer.from(binaryState),
      },
      select: {
        id: true,
        documentId: true,
        createdAt: true,
      },
    });

    return snapshot;
  }

  static async getSnapshots(documentId: string) {
    return prisma.documentSnapshot.findMany({
      where: { documentId },
      select: {
        id: true,
        documentId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getSnapshotById(documentId: string, snapshotId: string) {
    const snapshot = await prisma.documentSnapshot.findFirst({
      where: {
        id: snapshotId,
        documentId,
      },
    });

    if (!snapshot) {
      throw new Error('Snapshot not found');
    }

    const previewDoc = new Y.Doc();
    Y.applyUpdate(previewDoc, new Uint8Array(snapshot.snapshot));

    let previewText = '';
    const xmlFragment = previewDoc.getXmlFragment('default');
    if (xmlFragment.length > 0) {
      previewText = xmlFragment.toString();
    } else {
      previewText = previewDoc.getText('content').toString();
    }

    previewDoc.destroy();

    return {
      id: snapshot.id,
      documentId: snapshot.documentId,
      previewText,
      createdAt: snapshot.createdAt,
    };
  }

  static async restoreSnapshot(documentId: string, snapshotId: string) {
    const snapshot = await prisma.documentSnapshot.findFirst({
      where: {
        id: snapshotId,
        documentId,
      },
    });

    if (!snapshot) {
      throw new Error('Snapshot not found');
    }

    const snapshotBytes = new Uint8Array(snapshot.snapshot);

    await prisma.document.update({
      where: { id: documentId },
      data: {
        currentState: Buffer.from(snapshotBytes),
        updatedAt: new Date(),
      },
    });

    // Reset phòng qua wrapper
    await resetCollabRoom(documentId, 'DOC_RESTORED', 4001);

    return {
      message: 'Document restored successfully',
      snapshotId: snapshot.id,
      restoredAt: new Date(),
    };
  }

  static async deleteSnapshot(documentId: string, snapshotId: string) {
    const snapshot = await prisma.documentSnapshot.findFirst({
      where: {
        id: snapshotId,
        documentId,
      },
    });

    if (!snapshot) {
      throw new Error('Snapshot not found');
    }

    await prisma.documentSnapshot.delete({
      where: { id: snapshotId },
    });

    return { message: 'Snapshot deleted successfully' };
  }
}