import { useState, useEffect, useMemo } from 'react';
import * as Y from 'yjs';
import { useAuthStore } from '@/stores/auth.store';
import { useMe } from '@/features/auth/hooks/use-auth';
import { CollabProvider } from '../services/collab-provider';

const USER_COLORS = [
  '#f87171', '#fb923c', '#facc15', '#4ade80',
  '#2dd4bf', '#38bdf8', '#818cf8', '#c084fc', '#f472b6',
];

export interface Collaborator {
  clientId: number;
  user: {
    name: string;
    color: string;
  };
}

export const useEditorCollab = (docId: string) => {
  const token = useAuthStore((s) => s.token);
  const { data: currentUser } = useMe();

  const [connected, setConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  const [userColor] = useState(() => {
    const randomIndex = Math.floor(Math.random() * USER_COLORS.length);
    return USER_COLORS[randomIndex];
  });

  // Khởi tạo instance thuần túy trong useMemo (không chạy side-effect)
  const { ydoc, provider } = useMemo(() => {
    const doc = new Y.Doc();
    const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:5000/collab';
    const wsUrl = `${wsBaseUrl}/${docId}?token=${token || ''}`;
    const prov = new CollabProvider(wsUrl, doc);
    return { ydoc: doc, provider: prov };
  }, [docId, token]);

  // Quản lý kết nối WebSocket và Awareness
  useEffect(() => {
    provider.connect();

    const unsubscribeStatus = provider.onStatusChange((status) => {
      setConnected(status);
    });

    const handleAwarenessChange = () => {
      const states = provider.awareness.getStates();
      const users: Collaborator[] = [];
      states.forEach((state, clientId) => {
        if (state.user) {
          users.push({
            clientId,
            user: state.user as { name: string; color: string },
          });
        }
      });
      setCollaborators(users);
    };

    provider.awareness.on('change', handleAwarenessChange);

    return () => {
      provider.awareness.off('change', handleAwarenessChange);
      unsubscribeStatus();
      provider.disconnect();
    };
  }, [provider]);

  // Cập nhật thông tin presence
  useEffect(() => {
    const fallbackGuestName = `Guest_${userColor.replace('#', '').slice(0, 4)}`;
    const userName = currentUser?.name || currentUser?.email?.split('@')[0] || fallbackGuestName;

    provider.awareness.setLocalStateField('user', {
      name: userName,
      color: userColor,
    });
  }, [provider, currentUser, userColor]);

  return {
    ydoc,
    provider,
    connected,
    collaborators,
    userColor,
  };
};