import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';

export class AuthController {
  // POST /api/auth/register
  static async register(req: Request, res: Response) {
    try {
      // req.body đã được Zod gác cửa validate (email chuẩn, password >= 6, name optional)
      const { email, password, name } = req.body;
      const result = await AuthService.register(email, password, name);
      return res.status(201).json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  // POST /api/auth/login
  static async login(req: Request, res: Response) {
    try {
      // req.body đã được Zod validate (email, password không rỗng)
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(401).json({ error: err.message });
    }
  }

  // GET /api/auth/me
  static async me(req: Request, res: Response) {
    try {
      // authenticateJwt middleware đã đảm bảo req.user tồn tại
      const user = await AuthService.getMe(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json(user);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}