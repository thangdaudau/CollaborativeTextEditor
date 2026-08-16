import { z } from 'zod';

export const searchUserSchema = z.object({
  query: z.object({
    q: z.string().trim().min(1, 'Từ khóa tìm kiếm không được để trống'),
  }),
});
