import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useCalendarEvents } from '@/hooks/useCalendars';
import type { CalendarEvent } from '@/types';

function formatEventTime(event: CalendarEvent) {
  if (event.allDay) return 'All day';
  const start = new Date(event.startTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const end = new Date(event.endTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${start} – ${end}`;
}

export function EventList({ calendarId }: { calendarId: string }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data: events, isLoading } = useCalendarEvents(calendarId, from || undefined, to || undefined);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Input label="From" type="date" value={from} onChange={setFrom} />
        <Input label="To" type="date" value={to} onChange={setTo} />
      </div>
      {isLoading ? (
        <LoadingSpinner />
      ) : !events?.length ? (
        <p className="text-sm text-gray-400 py-2">No events</p>
      ) : (
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {events.map((ev) => (
            <div key={ev.id} className="flex justify-between items-center text-sm py-1.5 px-2 bg-gray-50 rounded">
              <span className="text-gray-800">{ev.title}</span>
              <span className="text-xs text-gray-500 shrink-0 ml-2">{formatEventTime(ev)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
