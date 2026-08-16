import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.email('Email không đúng định dạng'),
    password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự trở lên'),
    name: z.string().trim().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.email('Email không đúng định dạng'),
    password: z.string().min(1, 'Mật khẩu không được để trống'),
  }),
});