import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { CalendarCard } from '@/components/calendars/CalendarCard';
import { CalendarForm } from '@/components/calendars/CalendarForm';
import { EventList } from '@/components/calendars/EventList';
import { useCalendars, useCreateCalendar, useUpdateCalendar, useDeleteCalendar, useGoogleAuthUrl, useMicrosoftAuthUrl, useSyncCalendar } from '@/hooks/useCalendars';
import type { Calendar } from '@/types';

export function CalendarsPage() {
  const { data: calendars, isLoading } = useCalendars();
  const createCalendar = useCreateCalendar();
  const updateCalendar = useUpdateCalendar();
  const deleteCalendar = useDeleteCalendar();
  const googleAuth = useGoogleAuthUrl();
  const microsoftAuth = useMicrosoftAuthUrl();
  const syncCalendar = useSyncCalendar();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Calendar | null>(null);
  const [deleting, setDeleting] = useState<Calendar | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('google-connected') === 'true') {
      setBanner('Google Calendar connected successfully! Initial sync is running in the background.');
      setSearchParams({}, { replace: true });
    }
    if (searchParams.get('google-error')) {
      setBanner(`Google connection failed: ${searchParams.get('google-error')}`);
      setSearchParams({}, { replace: true });
    }
    if (searchParams.get('microsoft-connected') === 'true') {
      setBanner('Microsoft Calendar connected successfully! Initial sync is running in the background.');
      setSearchParams({}, { replace: true });
    }
    if (searchParams.get('microsoft-error')) {
      setBanner(`Microsoft connection failed: ${searchParams.get('microsoft-error')}`);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  function handleConnectGoogle() {
    googleAuth.mutate(undefined, {
      onSuccess: (data) => {
        window.location.href = data.url;
      },
    });
  }

  function handleConnectMicrosoft() {
    microsoftAuth.mutate(undefined, {
      onSuccess: (data) => {
        window.location.href = data.url;
      },
    });
  }

  function handleSync(calendarId: string) {
    syncCalendar.mutate(calendarId, {
      onSuccess: (result) => {
        setBanner(`Sync complete: ${result.created} created, ${result.updated} updated, ${result.deleted} deleted`);
      },
      onError: () => {
        setBanner('Sync failed. Please try again.');
      },
    });
  }

  return (
    <div className="space-y-4">
      {banner && (
        <div className="rounded-lg bg-primary-50 border border-primary-200 px-4 py-3 text-sm text-primary-800 flex justify-between items-start">
          <span>{banner}</span>
          <button onClick={() => setBanner(null)} className="ml-4 text-primary-500 hover:text-primary-700 font-bold cursor-pointer">&times;</button>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          onClick={handleConnectGoogle}
          disabled={googleAuth.isPending}
        >
          {googleAuth.isPending ? 'Connecting...' : 'Connect Google'}
        </Button>
        <Button
          variant="secondary"
          onClick={handleConnectMicrosoft}
          disabled={microsoftAuth.isPending}
        >
          {microsoftAuth.isPending ? 'Connecting...' : 'Connect Microsoft'}
        </Button>
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
              onSync={['GOOGLE', 'MICROSOFT', 'EXCHANGE'].includes(cal.provider) ? () => handleSync(cal.id) : undefined}
              syncing={syncCalendar.isPending && syncCalendar.variables === cal.id}
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
