import { prisma } from '../../config/database.js';
import type { Role } from '../../generated/prisma/enums.js';
import { resetCollabRoom } from '../../shared/services/collab-room.service.js';

export class DocumentService {
  static async createDocument(ownerId: string, title?: string) {
    return prisma.document.create({
      data: {
        title: title || 'Untitled Document',
        ownerId,
      },
    });
  }

  static async getDocumentsByUser(userId: string) {
    return prisma.document.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  static async getDocumentById(id: string) {
    return prisma.document.findUnique({
      where: { id },
    });
  }

  static async updateDocument(
    docId: string,
    data: { title?: string; isPublic?: boolean; publicRole?: Role }
  ) {
    const updated = await prisma.document.update({
      where: { id: docId },
      data,
    });

    // Nếu thay đổi phạm vi truy cập hoặc quyền public thì reset phòng ngay
    if (data.isPublic !== undefined || data.publicRole !== undefined) {
      await resetCollabRoom(docId, 'VISIBILITY_CHANGED', 4003);
    }

    return updated;
  }

  static async deleteDocument(docId: string) {
    await resetCollabRoom(docId, 'DOCUMENT_DELETED', 4004);
    return prisma.document.delete({
      where: { id: docId },
    });
  }
}