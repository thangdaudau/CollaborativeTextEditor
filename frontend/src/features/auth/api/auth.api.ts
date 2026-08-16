import { api } from '@/services/api';

export const authApi = {
  login: async (data: { email: string; password: string }) => {
    const res = await api.post('/auth/login', data);
    return res.data as { token: string; user: { id: string; email: string; name: string } };
  },

  register: async (data: { email: string; password: string; name?: string }) => {
    const res = await api.post('/auth/register', data);
    return res.data as { token: string; user: { id: string; email: string; name: string } };
  },
};