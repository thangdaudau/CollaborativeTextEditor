import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js'; // Kiểm tra đúng path prisma client của mày
import { Role } from '../../generated/prisma/enums.js';
import { ROLE_WEIGHT } from '../types/role.js';

export const requireDocPermission = (requiredRole: Role) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // FIX LỖI TS: Bắt chặt documentId phải là string
      const rawId = req.params.id || req.params.documentId;
      const documentId = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!documentId || typeof documentId !== 'string') {
        return res.status(400).json({ error: 'Invalid or missing Document ID' });
      }

      const userId = req.user?.id; // undefined nếu là Guest

      // FIX LỖI PRISMA TYPE: Cố định tĩnh (static) structure của include.
      // Nếu đéo có userId (Guest), truyền '' để Prisma vẫn giữ field `permissions: []` trong Type mà đéo bị xịt.
      const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
          ownerId: true,
          isPublic: true,
          publicRole: true,
          permissions: {
            where: {
              userId: userId ?? '',
            },
            select: {
              role: true,
            },
            take: 1, // Thêm take 1 để query DB không scan thừa nếu 1 user lỡ có nhiều bản ghi permission
          },
        },
      });

      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      let userRole: Role | null = null;

      // Check Owner
      if (userId && doc.ownerId === userId) {
        userRole = 'OWNER';
      } 
      // Check Explicit Permission trong Bảng DocumentPermission
      else if (userId && doc.permissions[0]?.role) {
        userRole = doc.permissions[0].role as Role;
      } 
      // Check Public Access (Cho cả Registered User lẫn Guest)
      else if (doc.isPublic) {
        userRole = doc.publicRole as Role;
      }

      // Kiểm tra xem Role thực tế có đủ trọng số so với Role không
      if (!userRole || ROLE_WEIGHT[userRole] < ROLE_WEIGHT[requiredRole]) {
        return res.status(403).json({ 
          error: `Forbidden: You need at least ${requiredRole} permission` 
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Internal server error during permission check' });
    }
  };
};