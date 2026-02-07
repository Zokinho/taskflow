import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Person } from '@/types';

interface PersonFormProps {
  initial?: Person;
  onSubmit: (data: Partial<Person>) => void;
  loading?: boolean;
}

export function PersonForm({ initial, onSubmit, loading }: PersonFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [birthday, setBirthday] = useState(initial?.birthday?.slice(0, 10) ?? '');
  const [followUpDays, setFollowUpDays] = useState(initial?.followUpDays?.toString() ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [tagsStr, setTagsStr] = useState(initial?.tags?.join(', ') ?? '');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      email: email || null,
      phone: phone || null,
      birthday: birthday ? new Date(birthday).toISOString() : null,
      followUpDays: followUpDays ? parseInt(followUpDays) : null,
      notes: notes || null,
      tags: tagsStr ? tagsStr.split(',').map((t) => t.trim()).filter(Boolean) : [],
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input label="Name" value={name} onChange={setName} required autoFocus />
      <Input label="Email" type="email" value={email} onChange={setEmail} />
      <Input label="Phone" value={phone} onChange={setPhone} />
      <Input label="Birthday" type="date" value={birthday} onChange={setBirthday} />
      <Input label="Follow-up interval (days)" type="number" value={followUpDays} onChange={setFollowUpDays} />
      <Input label="Notes" value={notes} onChange={setNotes} />
      <Input label="Tags (comma-separated)" value={tagsStr} onChange={setTagsStr} />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : initial ? 'Update' : 'Add Person'}
        </Button>
      </div>
    </form>
  );
}
