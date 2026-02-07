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

interface EventListProps {
  calendarId: string;
  onQuickConvert?: (event: CalendarEvent) => void;
  onEditConvert?: (event: CalendarEvent) => void;
}

export function EventList({ calendarId, onQuickConvert, onEditConvert }: EventListProps) {
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
            <div key={ev.id} className="group flex justify-between items-center text-sm py-1.5 px-2 bg-gray-50 rounded">
              <span className="text-gray-800 truncate">{ev.title}</span>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {(onQuickConvert || onEditConvert) && (
                  <span className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onQuickConvert && (
                      <button
                        onClick={() => onQuickConvert(ev)}
                        className="p-0.5 text-primary-500 hover:text-primary-700 cursor-pointer"
                        title="Quick convert to task"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="M11.983 1.907a.75.75 0 00-1.292-.657l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.305 6.093a.75.75 0 001.292.657l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z" />
                        </svg>
                      </button>
                    )}
                    {onEditConvert && (
                      <button
                        onClick={() => onEditConvert(ev)}
                        className="p-0.5 text-primary-500 hover:text-primary-700 cursor-pointer"
                        title="Convert to task with editing"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                        </svg>
                      </button>
                    )}
                  </span>
                )}
                <span className="text-xs text-gray-500">{formatEventTime(ev)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
