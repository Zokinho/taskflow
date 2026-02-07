import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { CalendarCard } from '@/components/calendars/CalendarCard';
import { CalendarForm } from '@/components/calendars/CalendarForm';
import { EventList } from '@/components/calendars/EventList';
import { useCalendars, useCreateCalendar, useUpdateCalendar, useDeleteCalendar } from '@/hooks/useCalendars';
import type { Calendar } from '@/types';

export function CalendarsPage() {
  const { data: calendars, isLoading } = useCalendars();
  const createCalendar = useCreateCalendar();
  const updateCalendar = useUpdateCalendar();
  const deleteCalendar = useDeleteCalendar();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Calendar | null>(null);
  const [deleting, setDeleting] = useState<Calendar | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>Add Calendar</Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !calendars?.length ? (
        <EmptyState title="No calendars" description="Connect your first calendar." actionLabel="Add Calendar" onAction={() => setShowCreate(true)} />
      ) : (
        <div className="space-y-2">
          {calendars.map((cal) => (
            <CalendarCard
              key={cal.id}
              calendar={cal}
              onEdit={() => setEditing(cal)}
              expanded={expandedId === cal.id}
              onToggleEvents={() => setExpandedId(expandedId === cal.id ? null : cal.id)}
            >
              <EventList calendarId={cal.id} />
            </CalendarCard>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Calendar">
        <CalendarForm
          onSubmit={(data) => createCalendar.mutate(data, { onSuccess: () => setShowCreate(false) })}
          loading={createCalendar.isPending}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Calendar">
        {editing && (
          <div className="space-y-3">
            <CalendarForm
              initial={editing}
              onSubmit={(data) => updateCalendar.mutate({ id: editing.id, ...data }, { onSuccess: () => setEditing(null) })}
              loading={updateCalendar.isPending}
            />
            <div className="border-t border-gray-100 pt-3">
              <Button variant="danger" className="w-full" onClick={() => { setEditing(null); setDeleting(editing); }}>
                Delete Calendar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteCalendar.mutate(deleting!.id, { onSuccess: () => setDeleting(null) })}
        title="Delete Calendar"
        message={`Are you sure you want to delete "${deleting?.name}"?`}
        loading={deleteCalendar.isPending}
      />
    </div>
  );
}
