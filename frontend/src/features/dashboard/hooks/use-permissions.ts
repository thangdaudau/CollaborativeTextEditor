import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionApi, type DocUserPermission } from '../api/permission.api';

export const useDocPermissions = (docId: string, enabled = true) => {
  return useQuery<DocUserPermission[]>({
    queryKey: ['document-permissions', docId],
    queryFn: () => permissionApi.getPermissions(docId),
    enabled: !!docId && enabled,
  });
};

export const useGrantPermission = (docId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { email?: string; userId?: string; role: 'VIEWER' | 'EDITOR' }) =>
      permissionApi.grantPermission(docId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-permissions', docId] });
    },
  });
};

export const useRevokePermission = (docId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => permissionApi.revokePermission(docId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-permissions', docId] });
    },
  });
};

export const useUserSearch = (query: string, enabled = true) => {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ['users', 'search', debouncedQuery],
    queryFn: () => permissionApi.searchUsers(debouncedQuery),
    enabled: enabled && debouncedQuery.trim().length > 0,
    staleTime: 1000 * 30,
  });
};