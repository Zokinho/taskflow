import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Person } from '@/types';

export function usePeople(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return useQuery<Person[]>({
    queryKey: ['people', params],
    queryFn: () => api.get(`/people${qs}`),
  });
}

export function useCreatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Person>) => api.post<Person>('/people', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['people'] }),
  });
}

export function useUpdatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Person> & { id: string }) =>
      api.patch<Person>(`/people/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['people'] }),
  });
}

export function useMarkContacted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Person>(`/people/${id}/contacted`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['people'] }),
  });
}

export function useDeletePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/people/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['people'] }),
  });
}
