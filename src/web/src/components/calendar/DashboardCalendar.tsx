import { useState, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { Card } from '@/components/ui/Card';
import { useCalendarItems, type MergedCalendarEvent, type CalendarItem } from '@/hooks/useAllCalendarEvents';
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

interface DashboardCalendarProps {
  convertedEventIds: Set<string>;
  onConverted: (message: string) => void;
}

export function DashboardCalendar({ convertedEventIds, onConverted }: DashboardCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>('week');
  const [selectedEvent, setSelectedEvent] = useState<MergedCalendarEvent | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { items, isLoading, calendars } = useCalendarItems(currentDate);

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
        // task — pinned in all-day row at top of each day
        const task = item.data;
        const ref = task.scheduledStart ?? task.dueDate!;
        const start = toLocalDate(ref);
        const end = start; // same day
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
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Calendar</h3>
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
