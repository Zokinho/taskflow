import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const TIMEZONES: string[] = (Intl as unknown as { supportedValuesOf(key: string): string[] }).supportedValuesOf('timeZone');

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
] as const;

const DEFAULT_WORK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const prefs = (user?.preferences ?? {}) as Record<string, unknown>;

  const [name, setName] = useState(user?.name ?? '');
  const [timezone, setTimezone] = useState(user?.timezone ?? 'UTC');
  const [workStart, setWorkStart] = useState((prefs.workHoursStart as string) ?? '09:00');
  const [workEnd, setWorkEnd] = useState((prefs.workHoursEnd as string) ?? '17:00');
  const [workDays, setWorkDays] = useState<string[]>((prefs.workDays as string[]) ?? DEFAULT_WORK_DAYS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setTimezone(user.timezone);
      const p = (user.preferences ?? {}) as Record<string, unknown>;
      setWorkStart((p.workHoursStart as string) ?? '09:00');
      setWorkEnd((p.workHoursEnd as string) ?? '17:00');
      setWorkDays((p.workDays as string[]) ?? DEFAULT_WORK_DAYS);
    }
  }, [user]);

  function toggleDay(day: string) {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateUser({
        name,
        timezone,
        preferences: {
          workHoursStart: workStart,
          workHoursEnd: workEnd,
          workDays,
        },
      });
      setMessage({ type: 'success', text: 'Settings saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Settings</h2>

      {message && (
        <div className={`rounded-lg px-4 py-2 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="space-y-5">
          {/* Name */}
          <Input label="Name" value={name} onChange={setName} required />

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 bg-white"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Work Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Work Hours</label>
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              />
              <span className="text-sm text-gray-500">to</span>
              <input
                type="time"
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              />
            </div>
          </div>

          {/* Work Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Work Days</label>
            <div className="flex gap-2">
              {DAYS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleDay(key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    workDays.includes(key)
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Card>
      </form>
    </div>
  );
}
