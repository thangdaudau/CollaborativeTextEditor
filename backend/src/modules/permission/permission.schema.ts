import { z } from 'zod';

export const listPermissionsSchema = z.object({
  params: z.object({
    id: z.uuid('ID tài liệu phải là chuỗi UUID hợp lệ'),
  }),
});

export const addPermissionSchema = z.object({
  params: z.object({
    id: z.uuid('ID tài liệu phải là chuỗi UUID hợp lệ'),
  }),
  body: z
    .object({
      email: z.email('Email không đúng định dạng').optional(),
      userId: z.uuid('User ID phải là UUID hợp lệ').optional(),
      role: z.enum(['VIEWER', 'EDITOR']),
    })
    .refine((data) => data.email !== undefined || data.userId !== undefined, {
      message: 'Phải cung cấp email hoặc userId của người được cấp quyền',
    }),
});

export const deletePermissionSchema = z.object({
  params: z.object({
    id: z.uuid('ID tài liệu phải là chuỗi UUID hợp lệ'),
    userId: z.uuid('User ID phải là chuỗi UUID hợp lệ'),
  }),
});
