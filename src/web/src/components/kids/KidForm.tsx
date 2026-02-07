import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Kid } from '@/types';

interface KidFormProps {
  initial?: Kid;
  onSubmit: (data: Partial<Kid>) => void;
  loading?: boolean;
}

export function KidForm({ initial, onSubmit, loading }: KidFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [birthday, setBirthday] = useState(initial?.birthday?.slice(0, 10) ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [keywordsStr, setKeywordsStr] = useState(initial?.keywords?.join(', ') ?? '');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      birthday: birthday ? new Date(birthday).toISOString() : null,
      notes: notes || null,
      keywords: keywordsStr ? keywordsStr.split(',').map((k) => k.trim()).filter(Boolean) : [],
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input label="Name" value={name} onChange={setName} required autoFocus />
      <Input label="Birthday" type="date" value={birthday} onChange={setBirthday} />
      <Input label="Notes" value={notes} onChange={setNotes} />
      <Input label="Keywords (comma-separated)" value={keywordsStr} onChange={setKeywordsStr} placeholder="soccer, piano, school" />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : initial ? 'Update' : 'Add Kid'}
        </Button>
      </div>
    </form>
  );
}
