import { prisma } from '../../config/database.js';

export class UserService {
  static async searchUsers(query: string, excludeUserId?: string) {
    return prisma.user.findMany({
      where: {
        AND: [
          excludeUserId ? { id: { not: excludeUserId } } : {},
          {
            OR: [
              { email: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
      take: 10,
    });
  }
}
