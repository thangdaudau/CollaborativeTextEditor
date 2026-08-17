import { prisma } from '../../config/database.js';
import type { Role } from '../../generated/prisma/enums.js';
import { resetCollabRoom } from '../../shared/services/collab-room.service.js';

export class PermissionService {
  static async getDocumentPermissions(documentId: string) {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        permissions: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!doc) {
      throw new Error('Document not found');
    }

    return {
      owner: doc.owner,
      permissions: doc.permissions.map((p) => ({
        id: p.id,
        role: p.role,
        createdAt: p.createdAt,
        user: p.user,
      })),
    };
  }

  static async grantPermission(
    documentId: string,
    data: { email?: string; userId?: string; role: 'VIEWER' | 'EDITOR' }
  ) {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { ownerId: true },
    });

    if (!doc) {
      throw new Error('Document not found');
    }

    let targetUser;
    if (data.userId) {
      targetUser = await prisma.user.findUnique({ where: { id: data.userId } });
    } else if (data.email) {
      targetUser = await prisma.user.findUnique({ where: { email: data.email } });
    }

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    if (targetUser.id === doc.ownerId) {
      throw new Error('Cannot grant permission to the document owner');
    }

    const permission = await prisma.documentPermission.upsert({
      where: {
        documentId_userId: {
          documentId,
          userId: targetUser.id,
        },
      },
      update: {
        role: data.role as Role,
      },
      create: {
        documentId,
        userId: targetUser.id,
        role: data.role as Role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Reset phòng để client reconnect nhận role mới
    await resetCollabRoom(documentId, 'PERMISSION_GRANTED', 4003);

    return permission;
  }

  static async revokePermission(documentId: string, targetUserId: string) {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { ownerId: true },
    });

    if (!doc) {
      throw new Error('Document not found');
    }

    if (targetUserId === doc.ownerId) {
      throw new Error('Cannot revoke permission from the document owner');
    }

    const existing = await prisma.documentPermission.findUnique({
      where: {
        documentId_userId: {
          documentId,
          userId: targetUserId,
        },
      },
    });

    if (!existing) {
      throw new Error('Permission record not found');
    }

    await prisma.documentPermission.delete({
      where: {
        documentId_userId: {
          documentId,
          userId: targetUserId,
        },
      },
    });

    // Reset phòng để đá user vừa bị thu hồi quyền
    await resetCollabRoom(documentId, 'PERMISSION_REVOKED', 4003);

    return { message: 'Permission revoked successfully' };
  }
}