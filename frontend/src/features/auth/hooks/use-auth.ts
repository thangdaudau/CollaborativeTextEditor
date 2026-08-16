import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const getApiErrorMessage = (err: unknown): string => {
  if (isAxiosError<{ error?: string }>(err)) {
    return err.response?.data?.error || 'Yêu cầu thất bại';
  }
  return 'Lỗi không xác định';
};

// 1. Hook lấy thông tin Profile
export const useMe = () => {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get<AuthUser>('/auth/me');
      return res.data;
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // Cache 5 phút
    retry: false,
  });
};

// 2. Hook Đăng nhập
export const useLogin = () => {
  const queryClient = useQueryClient();
  const setToken = useAuthStore((s) => s.setToken);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const res = await api.post<AuthResponse>('/auth/login', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setToken(data.token);
      queryClient.setQueryData(['auth', 'me'], data.user);
      navigate('/');
    },
  });
};

// 3. Hook Đăng ký
export const useRegister = () => {
  const queryClient = useQueryClient();
  const setToken = useAuthStore((s) => s.setToken);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (payload: { email: string; password: string; name?: string }) => {
      const res = await api.post<AuthResponse>('/auth/register', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setToken(data.token);
      queryClient.setQueryData(['auth', 'me'], data.user);
      navigate('/');
    },
  });
};