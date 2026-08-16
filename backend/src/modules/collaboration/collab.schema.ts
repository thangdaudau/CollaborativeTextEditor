import { z } from 'zod';

export const wsHandshakeSchema = z.object({
  docId: z.uuid('Document ID phải là UUID hợp lệ'),
  token: z.string().optional().nullable(),
});

export type WSHandshakeInput = z.infer<typeof wsHandshakeSchema>;
