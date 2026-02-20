import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useCalendars } from './useCalendars';
import { api } from '@/lib/api';
import type { CalendarEvent } from '@/types';

export interface MergedCalendarEvent extends CalendarEvent {
  calendarName: string;
  calendarColor: string;
}

const DEFAULT_COLOR = '#ec4899'; // pink-500

function getDateRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setDate(start.getDate() - 7);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setDate(end.getDate() + 7);
  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

export function useAllCalendarEvents(currentDate: Date) {
  const { data: calendars } = useCalendars();
  const activeCalendars = useMemo(
    () => (calendars ?? []).filter((c) => c.isActive),
    [calendars],
  );

  const { from, to } = useMemo(() => getDateRange(currentDate), [currentDate]);

  const queries = useQueries({
    queries: activeCalendars.map((cal) => ({
      queryKey: ['calendarEvents', cal.id, from, to],
      queryFn: () => {
        const params = new URLSearchParams({ from, to });
        return api.get<CalendarEvent[]>(`/calendars/${cal.id}/events?${params}`);
      },
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);

  const events = useMemo(() => {
    const merged: MergedCalendarEvent[] = [];
    queries.forEach((q, i) => {
      if (!q.data) return;
      const cal = activeCalendars[i];
      for (const ev of q.data) {
        merged.push({
          ...ev,
          calendarName: cal.name,
          calendarColor: cal.color || DEFAULT_COLOR,
        });
      }
    });
    return merged;
  }, [queries.map((q) => q.data), activeCalendars]);

  return { events, isLoading, calendars: activeCalendars };
}
