import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PersonCard } from '@/components/people/PersonCard';
import { PersonForm } from '@/components/people/PersonForm';
import { usePeople, useCreatePerson, useUpdatePerson, useDeletePerson, useMarkContacted } from '@/hooks/usePeople';
import type { Person } from '@/types';

export function PeoplePage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (debouncedSearch) p.search = debouncedSearch;
    if (showFollowUp) p.needsFollowUp = 'true';
    return Object.keys(p).length ? p : undefined;
  }, [debouncedSearch, showFollowUp]);

  const { data: people, isLoading } = usePeople(params);
  const createPerson = useCreatePerson();
  const updatePerson = useUpdatePerson();
  const deletePerson = useDeletePerson();
  const markContacted = useMarkContacted();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [deleting, setDeleting] = useState<Person | null>(null);

  function needsFollowUp(p: Person) {
    if (!p.followUpDays) return false;
    if (!p.lastContactAt) return true;
    const daysSince = (Date.now() - new Date(p.lastContactAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= p.followUpDays;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 items-center flex-wrap">
          <Input value={search} onChange={setSearch} placeholder="Search people..." />
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showFollowUp}
              onChange={(e) => setShowFollowUp(e.target.checked)}
              className="accent-primary-500"
            />
            Needs follow-up
          </label>
        </div>
        <Button onClick={() => setShowCreate(true)}>Add Person</Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !people?.length ? (
        <EmptyState title="No people" description="Add your first contact." actionLabel="Add Person" onAction={() => setShowCreate(true)} />
      ) : (
        <div className="space-y-2">
          {people.map((p) => (
            <PersonCard
              key={p.id}
              person={p}
              onEdit={() => setEditing(p)}
              onContacted={() => markContacted.mutate(p.id)}
              needsFollowUp={needsFollowUp(p)}
            />
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Person">
        <PersonForm
          onSubmit={(data) => createPerson.mutate(data, { onSuccess: () => setShowCreate(false) })}
          loading={createPerson.isPending}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Person">
        {editing && (
          <div className="space-y-3">
            <PersonForm
              initial={editing}
              onSubmit={(data) => updatePerson.mutate({ id: editing.id, ...data }, { onSuccess: () => setEditing(null) })}
              loading={updatePerson.isPending}
            />
            <div className="border-t border-gray-100 pt-3">
              <Button variant="danger" className="w-full" onClick={() => { setEditing(null); setDeleting(editing); }}>
                Delete Person
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deletePerson.mutate(deleting!.id, { onSuccess: () => setDeleting(null) })}
        title="Delete Person"
        message={`Are you sure you want to delete "${deleting?.name}"?`}
        loading={deletePerson.isPending}
      />
    </div>
  );
}
