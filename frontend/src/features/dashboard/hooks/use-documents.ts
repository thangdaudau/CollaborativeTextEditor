import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { documentApi, type Role } from '../api/document.api';

export const useMyDocuments = () => {
  return useQuery({
    queryKey: ['documents', 'my-documents'],
    queryFn: documentApi.getMyDocuments,
  });
};

export const useCreateDocument = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (title?: string) => documentApi.createDocument(title),
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries({ queryKey: ['documents', 'my-documents'] });
      navigate(`/doc/${newDoc.id}`);
    },
  });
};

export const useUpdateDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title?: string; isPublic?: boolean; publicRole?: Role } }) =>
      documentApi.updateDocument(id, data),
    onSuccess: (updatedDoc) => {
      queryClient.invalidateQueries({ queryKey: ['documents', 'my-documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', updatedDoc.id] });
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => documentApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', 'my-documents'] });
    },
  });
};