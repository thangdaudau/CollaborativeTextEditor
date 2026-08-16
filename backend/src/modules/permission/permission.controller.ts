import type { Request, Response } from 'express';
import { PermissionService } from './permission.service.js';

export class PermissionController {
  static async list(req: Request, res: Response) {
    try {
      const docId = req.params.id as string;
      const result = await PermissionService.getDocumentPermissions(docId);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async grant(req: Request, res: Response) {
    try {
      const docId = req.params.id as string;
      const permission = await PermissionService.grantPermission(docId, req.body);
      return res.status(200).json(permission);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async revoke(req: Request, res: Response) {
    try {
      const docId = req.params.id as string;
      const targetUserId = req.params.userId as string;
      const result = await PermissionService.revokePermission(docId, targetUserId);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}
