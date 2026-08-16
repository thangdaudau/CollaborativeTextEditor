import { prisma } from '../../config/database.js';
import type { Role } from '../../generated/prisma/enums.js';

export class DocumentService {
  // Tạo mới tài liệu
  static async createDocument(ownerId: string, title?: string) {
    return prisma.document.create({
      data: {
        title: title || 'Untitled Document',
        ownerId,
      },
    });
  }

  // Lấy danh sách tài liệu của một user
  static async getDocumentsByUser(userId: string) {
    return prisma.document.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  static async getDocumentById(id: string) {
    return prisma.document.findUnique({
      where: { id: id }
    })
  }

  // Đổi tên lung tung tài liệu
  static async updateDocument(
    docId: string, 
    data: { title?: string; isPublic?: boolean; publicRole?: Role }
  ) {
    return prisma.document.update({
      where: { id: docId },
      data,
    });
  }

  // Xóa tài liệu
  static async deleteDocument(docId: string) {
    return prisma.document.delete({
      where: { id: docId },
    });
  }
}