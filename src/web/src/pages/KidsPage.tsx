import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { KidCard } from '@/components/kids/KidCard';
import { KidForm } from '@/components/kids/KidForm';
import { KidEvents } from '@/components/kids/KidEvents';
import { useKids, useCreateKid, useUpdateKid, useDeleteKid } from '@/hooks/useKids';
import type { Kid } from '@/types';

export function KidsPage() {
  const { data: kids, isLoading } = useKids();
  const createKid = useCreateKid();
  const updateKid = useUpdateKid();
  const deleteKid = useDeleteKid();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Kid | null>(null);
  const [deleting, setDeleting] = useState<Kid | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>Add Kid</Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !kids?.length ? (
        <EmptyState title="No kids" description="Add your first kid to track their events." actionLabel="Add Kid" onAction={() => setShowCreate(true)} />
      ) : (
        <div className="space-y-2">
          {kids.map((kid) => (
            <KidCard
              key={kid.id}
              kid={kid}
              onEdit={() => setEditing(kid)}
              expanded={expandedId === kid.id}
              onToggleEvents={() => setExpandedId(expandedId === kid.id ? null : kid.id)}
            >
              <KidEvents kidId={kid.id} />
            </KidCard>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Kid">
        <KidForm
          onSubmit={(data) => createKid.mutate(data, { onSuccess: () => setShowCreate(false) })}
          loading={createKid.isPending}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Kid">
        {editing && (
          <div className="space-y-3">
            <KidForm
              initial={editing}
              onSubmit={(data) => updateKid.mutate({ id: editing.id, ...data }, { onSuccess: () => setEditing(null) })}
              loading={updateKid.isPending}
            />
            <div className="border-t border-gray-100 pt-3">
              <Button variant="danger" className="w-full" onClick={() => { setEditing(null); setDeleting(editing); }}>
                Delete Kid
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteKid.mutate(deleting!.id, { onSuccess: () => setDeleting(null) })}
        title="Delete Kid"
        message={`Are you sure you want to delete "${deleting?.name}"?`}
        loading={deleteKid.isPending}
      />
    </div>
  );
}
