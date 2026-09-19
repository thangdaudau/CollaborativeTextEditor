import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  // Lấy trực tiếp token từ Zustand store thay vì đọc sai key trong localStorage
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token trong Zustand store để trigger logout sạch sẽ
      useAuthStore.getState().logout();
      
      if (!window.location.pathname.startsWith('/doc/')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);