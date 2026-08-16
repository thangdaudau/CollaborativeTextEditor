import type { WebSocket } from 'ws';
import type { Role } from '../../generated/prisma/enums.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  isGuest: boolean;
}

export interface CollabClient extends WebSocket {
  id: string;
  docId: string;
  user: AuthenticatedUser;
  role: Role;
  isAlive: boolean;
}

