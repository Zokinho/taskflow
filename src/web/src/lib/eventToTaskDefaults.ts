import type { CalendarEvent, Task } from '@/types';

export function eventToTaskDefaults(event: CalendarEvent): Partial<Task> {
  const durationMins = Math.round(
    (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / 60000
  );

  return {
    title: event.title,
    description: event.description,
    dueDate: event.startTime,
    scheduledStart: event.startTime,
    scheduledEnd: event.endTime,
    estimatedMins: durationMins > 0 ? durationMins : null,
    notes: event.location ? `Location: ${event.location}` : null,
    priority: 'MEDIUM',
    tags: [],
  };
}
