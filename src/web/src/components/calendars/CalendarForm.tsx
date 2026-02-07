import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { Calendar, CalendarProvider } from '@/types';

interface CalendarFormProps {
  initial?: Calendar;
  onSubmit: (data: Partial<Calendar>) => void;
  loading?: boolean;
}

const providerOptions = [
  { value: 'GOOGLE', label: 'Google' },
  { value: 'MICROSOFT', label: 'Microsoft' },
  { value: 'EXCHANGE', label: 'Exchange' },
  { value: 'PROTON_ICS', label: 'Proton (ICS)' },
];

export function CalendarForm({ initial, onSubmit, loading }: CalendarFormProps) {
  const [provider, setProvider] = useState<CalendarProvider>(initial?.provider ?? 'GOOGLE');
  const [name, setName] = useState(initial?.name ?? '');
  const [icsUrl, setIcsUrl] = useState(initial?.icsUrl ?? '');
  const [color, setColor] = useState(initial?.color ?? '#ec4899');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      provider,
      name,
      icsUrl: icsUrl || null,
      color,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Select label="Provider" value={provider} onChange={(v) => setProvider(v as CalendarProvider)} options={providerOptions} />
      <Input label="Name" value={name} onChange={setName} required autoFocus />
      {provider === 'PROTON_ICS' && (
        <Input label="ICS URL" value={icsUrl} onChange={setIcsUrl} placeholder="https://..." />
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-16 rounded border border-gray-300 cursor-pointer" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : initial ? 'Update' : 'Add Calendar'}
        </Button>
      </div>
    </form>
  );
}
