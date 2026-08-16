import { api } from '@/services/api';

export type Role = 'VIEWER' | 'EDITOR' | 'OWNER';

export interface DocumentItem {
  id: string;
  title: string;
  ownerId: string;
  isPublic: boolean;
  publicRole: Role;
  createdAt: string;
  updatedAt: string;
}

export const documentApi = {
  getMyDocuments: async () => {
    const res = await api.get<DocumentItem[]>('/documents/my-documents');
    return res.data;
  },

  createDocument: async (title?: string) => {
    const res = await api.post<DocumentItem>('/documents', { title });
    return res.data;
  },

  updateDocument: async (id: string, data: { title?: string; isPublic?: boolean; publicRole?: Role }) => {
    const res = await api.patch<DocumentItem>(`/documents/${id}`, data);
    return res.data;
  },

  deleteDocument: async (id: string) => {
    const res = await api.delete<{ message: string }>(`/documents/${id}`);
    return res.data;
  },
};