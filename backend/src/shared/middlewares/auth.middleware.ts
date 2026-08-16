import type { Request, Response, NextFunction } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../../config/env.js';

const JWT_SECRET = env.JWT_SECRET;

interface UserJwtPayload extends JwtPayload {
  id: string;
  email: string;
}

// Bắt buộc Token (Logged in)
export const authenticateJwt = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Token format invalid' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === 'object' && decoded !== null && 'id' in decoded && 'email' in decoded) {
      const payload = decoded as UserJwtPayload;
      req.user = payload;
      next();
    }
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Token không bắt buộc (Dành cho Guest xem Public Doc)
export const optionalJwt = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Token format invalid' });
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (typeof decoded === 'object' && decoded !== null && 'id' in decoded && 'email' in decoded) {
        const payload = decoded as UserJwtPayload;
        req.user = payload;
      }
    } catch {
      // Token lỗi thì coi như Guest, đéo crash
    }
  }
  next();
};