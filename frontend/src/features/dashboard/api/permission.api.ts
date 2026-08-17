import { api } from '@/services/api';
import type { Role } from './document.api';

export interface DocUserPermission {
  id?: string;
  userId: string;
  role: Extract<Role, 'VIEWER' | 'EDITOR'>;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface UserSearchItem {
  id: string;
  email: string;
  name?: string;
}

export const permissionApi = {
  getPermissions: async (docId: string): Promise<DocUserPermission[]> => {
    const res = await api.get(`/documents/${docId}/permissions`);
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.permissions)) return data.permissions;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  },

  grantPermission: async (
    docId: string,
    payload: { email?: string; userId?: string; role: 'VIEWER' | 'EDITOR' }
  ) => {
    const res = await api.post(`/documents/${docId}/permissions`, payload);
    return res.data;
  },

  revokePermission: async (docId: string, userId: string) => {
    const res = await api.delete(`/documents/${docId}/permissions/${userId}`);
    return res.data;
  },

  searchUsers: async (query: string): Promise<UserSearchItem[]> => {
    if (!query.trim()) return [];
    const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.users)) return data.users;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  },
};