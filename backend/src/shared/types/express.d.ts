import { User } from '../../generated/prisma/client';

declare global {
  namespace Express {
    interface Request { // Thêm cái này để express nhận diện được req.user khi qua middleware
      user?: {
        id: string;
        email: string;
      };
    }
  }
}