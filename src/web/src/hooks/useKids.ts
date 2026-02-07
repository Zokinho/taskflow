import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Kid, CalendarEvent } from '@/types';

export function useKids() {
  return useQuery<Kid[]>({
    queryKey: ['kids'],
    queryFn: () => api.get('/kids'),
  });
}

export function useKidEvents(kidId: string, from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString() ? `?${params}` : '';
  return useQuery<CalendarEvent[]>({
    queryKey: ['kidEvents', kidId, from, to],
    queryFn: () => api.get(`/kids/${kidId}/events${qs}`),
    enabled: !!kidId,
  });
}

export function useCreateKid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Kid>) => api.post<Kid>('/kids', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kids'] }),
  });
}

export function useUpdateKid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Kid> & { id: string }) =>
      api.patch<Kid>(`/kids/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kids'] }),
  });
}

export function useDeleteKid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/kids/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kids'] }),
  });
}
