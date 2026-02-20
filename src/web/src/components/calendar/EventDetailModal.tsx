import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TaskForm } from '@/components/tasks/TaskForm';
import { useConvertEventToTask } from '@/hooks/useCalendars';
import { useCreateTask } from '@/hooks/useTasks';
import type { MergedCalendarEvent } from '@/hooks/useAllCalendarEvents';
import type { Task } from '@/types';

interface EventDetailModalProps {
  event: MergedCalendarEvent | null;
  open: boolean;
  onClose: () => void;
  isConverted: boolean;
  onConverted: (message: string) => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function eventToTaskDefaults(event: MergedCalendarEvent): Partial<Task> {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const durationMins = Math.round((end.getTime() - start.getTime()) / 60000);
  return {
    title: event.title,
    description: [event.description, event.location ? `Location: ${event.location}` : null]
      .filter(Boolean)
      .join('\n') || null,
    dueDate: event.startTime,
    scheduledStart: event.startTime,
    scheduledEnd: event.endTime,
    estimatedMins: durationMins > 0 ? durationMins : null,
    priority: 'MEDIUM',
  };
}

export function EventDetailModal({ event, open, onClose, isConverted, onConverted }: EventDetailModalProps) {
  const [showForm, setShowForm] = useState(false);
  const convertMutation = useConvertEventToTask();
  const createTask = useCreateTask();

  if (!event) return null;

  const isAllDay = event.allDay;
  const sameDay = event.startTime.slice(0, 10) === event.endTime.slice(0, 10);

  function handleQuickConvert() {
    convertMutation.mutate(
      { calendarId: event!.calendarId, eventId: event!.id },
      {
        onSuccess: () => {
          onConverted(`Task created from "${event!.title}"`);
          onClose();
        },
      },
    );
  }

  function handleFormSubmit(data: Partial<Task>) {
    createTask.mutate(
      { ...data, sourceEventId: event!.id },
      {
        onSuccess: () => {
          onConverted(`Task created from "${event!.title}"`);
          setShowForm(false);
          onClose();
        },
      },
    );
  }

  function handleClose() {
    setShowForm(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={event.title}>
      <div className="space-y-4">
        {/* Time */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {isAllDay ? (
            <span>{formatDate(event.startTime)} — All day</span>
          ) : sameDay ? (
            <span>{formatDate(event.startTime)}, {formatTime(event.startTime)} – {formatTime(event.endTime)}</span>
          ) : (
            <span>{formatDate(event.startTime)} {formatTime(event.startTime)} – {formatDate(event.endTime)} {formatTime(event.endTime)}</span>
          )}
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{event.location}</span>
          </div>
        )}

        {/* Calendar source */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span
            className="w-3 h-3 rounded-full inline-block flex-shrink-0"
            style={{ backgroundColor: event.calendarColor }}
          />
          <span>{event.calendarName}</span>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-gray-600 whitespace-pre-wrap border-t border-gray-100 pt-3">
            {event.description}
          </p>
        )}

        {/* Actions */}
        <div className="border-t border-gray-100 pt-3">
          {isConverted ? (
            <Badge className="bg-green-100 text-green-700">Already a task</Badge>
          ) : showForm ? (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Create task with edits</h4>
              <TaskForm
                initial={eventToTaskDefaults(event)}
                onSubmit={handleFormSubmit}
                loading={createTask.isPending}
              />
            </div>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleQuickConvert} disabled={convertMutation.isPending}>
                {convertMutation.isPending ? 'Converting...' : 'Quick Convert to Task'}
              </Button>
              <Button variant="secondary" onClick={() => setShowForm(true)}>
                Convert with Edits
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
