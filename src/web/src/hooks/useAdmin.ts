import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export function useUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get('/admin/users'),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string }) =>
      api.post<AdminUser>('/admin/users', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}
