import { useState, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, type View, type EventProps } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useCalendarItems, type MergedCalendarEvent, type CalendarItem } from '@/hooks/useAllCalendarEvents';
import { useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useAutoSchedule } from '@/hooks/useAutoSchedule';
import { EventDetailModal } from './EventDetailModal';
import { TaskDetailModal } from './TaskDetailModal';
import type { Task } from '@/types';
import './calendar-styles.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { 'en-US': enUS },
});

const TASK_COLOR = '#6366f1'; // indigo-500

interface CalendarEventItem {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: CalendarItem;
}

/** Parse as local date (YYYY-MM-DD) to avoid UTC→local shift for all-day events */
function toLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function TaskActionIcons({ task }: { task: Task }) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const isDone = task.status === 'DONE' || task.status === 'CANCELLED';

  if (isDone) return null;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <span className="cal-task-actions">
      <button
        title="Done"
        onClick={(e) => { stop(e); updateTask.mutate({ id: task.id, status: 'DONE' }); }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </button>
      <button
        title="Defer"
        onClick={(e) => {
          stop(e);
          const ONE_DAY = 86400000;
          const data: Partial<Task> & { id: string } = { id: task.id };
          if (task.scheduledStart) data.scheduledStart = new Date(new Date(task.scheduledStart).getTime() + ONE_DAY).toISOString();
          if (task.scheduledEnd) data.scheduledEnd = new Date(new Date(task.scheduledEnd).getTime() + ONE_DAY).toISOString();
          if (task.dueDate) data.dueDate = new Date(new Date(task.dueDate).getTime() + ONE_DAY).toISOString();
          updateTask.mutate(data);
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
      <button
        title="Delete"
        onClick={(e) => { stop(e); deleteTask.mutate(task.id); }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

function CustomEvent({ event }: EventProps<CalendarEventItem>) {
  if (event.resource.kind === 'task') {
    return (
      <span className="cal-task-item">
        <span className="cal-task-title">{event.title}</span>
        <TaskActionIcons task={event.resource.data} />
      </span>
    );
  }
  return <span>{event.title}</span>;
}

interface DashboardCalendarProps {
  convertedEventIds: Set<string>;
  onConverted: (message: string) => void;
}

export function DashboardCalendar({ convertedEventIds, onConverted }: DashboardCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>('week');
  const [selectedEvent, setSelectedEvent] = useState<MergedCalendarEvent | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [scheduleMsg, setScheduleMsg] = useState('');
  const autoSchedule = useAutoSchedule();

  const { items, isLoading, calendars } = useCalendarItems(currentDate);

  const calendarComponents = useMemo(() => ({ event: CustomEvent }), []);

  const calendarEvents: CalendarEventItem[] = useMemo(
    () =>
      items.map((item) => {
        if (item.kind === 'event') {
          const ev = item.data;
          return {
            id: ev.id,
            title: ev.title,
            start: ev.allDay ? toLocalDate(ev.startTime) : new Date(ev.startTime),
            end: ev.allDay ? toLocalDate(ev.endTime) : new Date(ev.endTime),
            allDay: ev.allDay,
            resource: item,
          };
        }
        const task = item.data;
        // If task has both scheduledStart and scheduledEnd, show as timed event
        if (task.scheduledStart && task.scheduledEnd) {
          return {
            id: task.id,
            title: task.title,
            start: new Date(task.scheduledStart),
            end: new Date(task.scheduledEnd),
            allDay: false,
            resource: item,
          };
        }
        // Otherwise, pin in all-day row
        const ref = task.scheduledStart ?? task.dueDate!;
        const start = toLocalDate(ref);
        const end = start;
        return {
          id: task.id,
          title: task.title,
          start,
          end,
          allDay: true,
          resource: item,
        };
      }),
    [items],
  );

  const eventPropGetter = useCallback(
    (event: CalendarEventItem) => {
      if (event.resource.kind === 'task') {
        const task = event.resource.data;
        const isDone = task.status === 'DONE' || task.status === 'CANCELLED';
        return {
          style: {
            backgroundColor: TASK_COLOR,
            color: '#fff',
            borderLeft: '3px dashed #a5b4fc', // indigo-300
            opacity: isDone ? 0.45 : 0.85,
            textDecoration: isDone ? 'line-through' : undefined,
          },
        };
      }
      // calendar event
      const ev = event.resource.data;
      return {
        style: {
          backgroundColor: ev.calendarColor,
          color: '#fff',
          opacity: convertedEventIds.has(event.id) ? 0.6 : 1,
        },
      };
    },
    [convertedEventIds],
  );

  const handleSelectEvent = useCallback((event: CalendarEventItem) => {
    if (event.resource.kind === 'task') {
      setSelectedTask(event.resource.data);
    } else {
      setSelectedEvent(event.resource.data);
    }
  }, []);

  // Unique calendars for legend (deduplicate by id)
  const legendCalendars = useMemo(() => {
    const seen = new Set<string>();
    return calendars.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [calendars]);

  // Show "Tasks" in legend if any task items exist
  const hasTaskItems = items.some((i) => i.kind === 'task');

  return (
    <section>
      {scheduleMsg && (
        <div className="bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg text-xs font-medium mb-2">
          {scheduleMsg}
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700">Calendar</h3>
          <Button
            variant="secondary"
            className="!px-2.5 !py-1 !text-xs"
            onClick={() => {
              autoSchedule.mutate(undefined, {
                onSuccess: (data) => {
                  setScheduleMsg(`Scheduled ${data.scheduled} task${data.scheduled === 1 ? '' : 's'}`);
                  setTimeout(() => setScheduleMsg(''), 3000);
                },
              });
            }}
            disabled={autoSchedule.isPending}
          >
            {autoSchedule.isPending ? 'Scheduling...' : 'Auto Schedule'}
          </Button>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {legendCalendars.map((cal) => (
            <div key={cal.id} className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: cal.color || '#ec4899' }}
              />
              <span className="text-xs text-gray-500">{cal.name}</span>
            </div>
          ))}
          {hasTaskItems && (
            <div className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: TASK_COLOR }}
              />
              <span className="text-xs text-gray-500">Tasks</span>
            </div>
          )}
        </div>
      </div>
      <Card className="!p-2 sm:!p-4">
        {isLoading && items.length === 0 ? (
          <div className="flex items-center justify-center h-[500px] text-sm text-gray-400">
            Loading events...
          </div>
        ) : (
          <div style={{ height: 500 }}>
            <Calendar<CalendarEventItem>
              localizer={localizer}
              events={calendarEvents}
              date={currentDate}
              onNavigate={setCurrentDate}
              view={view}
              onView={setView}
              views={['month', 'week', 'day', 'agenda']}
              eventPropGetter={eventPropGetter}
              onSelectEvent={handleSelectEvent}
              components={calendarComponents}
              popup
              step={30}
              timeslots={2}
              min={new Date(2020, 0, 1, 6, 0)}
              max={new Date(2020, 0, 1, 22, 0)}
            />
          </div>
        )}
      </Card>

      <EventDetailModal
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        isConverted={selectedEvent ? convertedEventIds.has(selectedEvent.id) : false}
        onConverted={onConverted}
      />

      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </section>
  );
}
