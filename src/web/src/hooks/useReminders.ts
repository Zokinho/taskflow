import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Reminder } from '@/types';

export function useReminders(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return useQuery<Reminder[]>({
    queryKey: ['reminders', params],
    queryFn: () => api.get(`/reminders${qs}`),
  });
}

export function useDismissReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/reminders/${id}/dismiss`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  });
}

export function useDismissAllReminders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ dismissed: number }>('/reminders/dismiss-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  });
}

export function useTelegramLink() {
  return useQuery<{ linked: boolean; code?: string; chatId?: string }>({
    queryKey: ['telegram-link'],
    queryFn: () => api.get('/reminders/telegram/link-code'),
  });
}

export function useUnlinkTelegram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/reminders/telegram/unlink'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['telegram-link'] }),
  });
}
