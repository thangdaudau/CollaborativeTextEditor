import { z } from 'zod';

export const documentIdParamSchema = z.object({
  params: z.object({
    id: z.uuid('ID tài liệu phải là chuỗi UUID hợp lệ'),
  }),
});

export const createDocumentSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Tiêu đề không được để trống').optional(),
  }),
});

export const updateDocumentSchema = z.object({
  params: z.object({
    id: z.uuid('ID tài liệu phải là chuỗi UUID hợp lệ'),
  }),
  body: z
    .object({
      title: z.string().trim().min(1, 'Tiêu đề không được để trống').optional(),
      isPublic: z.boolean().optional(),
      publicRole: z.enum(['VIEWER', 'EDITOR']).optional(),
    })
    .refine(
      (data) => data.title !== undefined || data.isPublic !== undefined || data.publicRole !== undefined,
      { message: 'Phải truyền ít nhất 1 trường (title, isPublic, publicRole) để cập nhật' }
    ),
});