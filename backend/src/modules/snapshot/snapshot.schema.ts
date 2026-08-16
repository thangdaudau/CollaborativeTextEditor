import { z } from 'zod';

export const createSnapshotSchema = z.object({
  params: z.object({
    id: z.uuid('ID tài liệu phải là chuỗi UUID hợp lệ'),
  }),
});

export const listSnapshotsSchema = z.object({
  params: z.object({
    id: z.uuid('ID tài liệu phải là chuỗi UUID hợp lệ'),
  }),
});

export const getSnapshotSchema = z.object({
  params: z.object({
    id: z.uuid('ID tài liệu phải là chuỗi UUID hợp lệ'),
    snapshotId: z.uuid('ID snapshot phải là chuỗi UUID hợp lệ'),
  }),
});

export const restoreSnapshotSchema = z.object({
  params: z.object({
    id: z.uuid('ID tài liệu phải là chuỗi UUID hợp lệ'),
    snapshotId: z.uuid('ID snapshot phải là chuỗi UUID hợp lệ'),
  }),
});

export const deleteSnapshotSchema = z.object({
  params: z.object({
    id: z.uuid('ID tài liệu phải là chuỗi UUID hợp lệ'),
    snapshotId: z.uuid('ID snapshot phải là chuỗi UUID hợp lệ'),
  }),
});
