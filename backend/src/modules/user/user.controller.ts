import type { Request, Response } from 'express';
import { UserService } from './user.service.js';

export class UserController {
  static async search(req: Request, res: Response) {
    try {
      const query = (req.query.q as string) || '';
      const currentUserId = req.user?.id;
      const users = await UserService.searchUsers(query, currentUserId);
      return res.json(users);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
