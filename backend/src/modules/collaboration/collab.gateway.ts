import type { IncomingMessage, Server } from 'node:http';
import { URL } from 'node:url';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import type { Role } from '../../generated/prisma/enums.js';
import type { CollabClient, AuthenticatedUser } from './collab.types.js';
import { wsHandshakeSchema } from './collab.schema.js';
import { RoomManager } from './room.manager.js';
import { CollabService } from './collab.service.js';
import { createAbsolutePositionFromRelativePosition } from 'yjs';

export class CollabGateway {
  private wss: WebSocketServer;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ noServer: true });
    server.on('upgrade', this.handleUpgrade.bind(this));
    this.setupHeartbeat();
    this.bindConnectionEvent();
  }

  private async handleUpgrade(req: IncomingMessage, socket: any, head: Buffer) {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const pathnameParts = url.pathname.split('/').filter(Boolean);

      if (pathnameParts[0] !== 'collab' || !pathnameParts[1]) {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
      }

      const validation = wsHandshakeSchema.safeParse({
        docId: pathnameParts[1],
        token: url.searchParams.get('token'),
      });

      if (!validation.success) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\nInvalid parameters');
        socket.destroy();
        return;
      }

      const { docId, token } = validation.data;
      const user = this.authenticate(token);
      const userRole = await this.resolveDocumentRole(docId, user);

      if (!userRole) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\nAccess denied');
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(req, socket, head, (ws) => {
        const client = ws as CollabClient;
        client.id = crypto.randomUUID();
        client.docId = docId;
        client.user = user;
        client.role = userRole;
        client.isAlive = true;

        this.wss.emit('connection', client, req);
      });
    } catch (error) {
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.destroy();
    }
  }

  private bindConnectionEvent() {
    this.wss.on('connection', async (client: CollabClient) => {
      const room = await RoomManager.getOrCreateRoom(client.docId);
      RoomManager.addClient(room, client);

      CollabService.sendInitialSync(client, room);

      // Thêm listener cho event 'message'
      // event này kích hoạt khi có client (WebSocket.send) gửi dữ liệu về websocket server
      client.on('message', (message: Buffer, isBinary: boolean) => {
        if (!isBinary) return;
        CollabService.handleMessage(client, room, message);
      });

      client.on('pong', () => {
        client.isAlive = true;
      });

      client.on('close', async () => {
        await RoomManager.removeClient(room, client);
      });
    });
  }

  private authenticate(token?: string | null): AuthenticatedUser {
    if (!token) {
      return {
        id: `guest-${crypto.randomUUID()}`,
        email: 'guest@anonymous.local',
        name: 'Guest User',
        isGuest: true,
      };
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; email: string };
      return {
        id: decoded.id,
        email: decoded.email,
        isGuest: false,
      };
    } catch {
      return {
        id: `guest-${crypto.randomUUID()}`,
        email: 'guest@anonymous.local',
        name: 'Guest User',
        isGuest: true,
      };
    }
  }

  private async resolveDocumentRole(docId: string, user: AuthenticatedUser): Promise<Role | null> {
    const doc = await prisma.document.findUnique({
      where: { id: docId },
      select: {
        ownerId: true,
        isPublic: true,
        publicRole: true,
        permissions: {
          where: { userId: user.isGuest ? '' : user.id },
          select: {
            role: true
          }
        },
      },
    });

    if (!doc) return null;
    if (!user.isGuest && doc.ownerId === user.id) return 'OWNER';
    if (!user.isGuest && doc.permissions[0]?.role) return doc.permissions[0].role;
    if (doc.isPublic) return doc.publicRole;

    return null;
  }

  private setupHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const client = ws as CollabClient;
        if (!client.isAlive) {
          client.terminate();
          return;
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000);
  }
}
