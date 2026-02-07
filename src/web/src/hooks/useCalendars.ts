import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Calendar, CalendarEvent } from '@/types';

export function useCalendars() {
  return useQuery<Calendar[]>({
    queryKey: ['calendars'],
    queryFn: () => api.get('/calendars'),
  });
}

export function useCalendarEvents(calendarId: string, from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString() ? `?${params}` : '';
  return useQuery<CalendarEvent[]>({
    queryKey: ['calendarEvents', calendarId, from, to],
    queryFn: () => api.get(`/calendars/${calendarId}/events${qs}`),
    enabled: !!calendarId,
  });
}

export function useCreateCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Calendar>) => api.post<Calendar>('/calendars', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendars'] }),
  });
}

export function useUpdateCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Calendar> & { id: string }) =>
      api.patch<Calendar>(`/calendars/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendars'] }),
  });
}

export function useDeleteCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/calendars/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendars'] }),
  });
}

export function useGoogleAuthUrl() {
  return useMutation({
    mutationFn: () => api.get<{ url: string }>('/calendars/google/auth-url'),
  });
}

export function useMicrosoftAuthUrl() {
  return useMutation({
    mutationFn: () => api.get<{ url: string }>('/calendars/microsoft/auth-url'),
  });
}

export function useSyncCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ created: number; updated: number; deleted: number }>(`/calendars/${id}/sync`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendars'] });
      qc.invalidateQueries({ queryKey: ['calendarEvents'] });
    },
  });
}
