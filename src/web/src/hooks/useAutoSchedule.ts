import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface AutoScheduleResult {
  scheduled: number;
}

interface ClearScheduleResult {
  cleared: number;
}

export function useAutoSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<AutoScheduleResult>('/tasks/auto-schedule'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useClearSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<ClearScheduleResult>('/tasks/clear-schedule'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
