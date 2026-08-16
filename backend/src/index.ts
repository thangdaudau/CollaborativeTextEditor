import express from 'express';
import http from 'node:http';
import cors from 'cors';
import type { Request, Response } from 'express';
import { env } from './config/env.js';
import { CollabGateway } from './modules/collaboration/collab.gateway.js';
import documentRouter from './modules/document/document.router.js';
import authRouter from './modules/auth/auth.router.js';
import userRouter from './modules/user/user.router.js';
import permissionRouter from './modules/permission/permission.router.js';
import snapshotRouter from './modules/snapshot/snapshot.router.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/documents', documentRouter);
app.use('/api/documents/:id/permissions', permissionRouter)
app.use('/api/documents/:id/snapshots', snapshotRouter)

app.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'Server is healthy' });
});

export const server = http.createServer(app);
new CollabGateway(server);

if (process.env.NODE_ENV !== 'test') {
  server.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });
}
