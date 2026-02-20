import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ReminderCard } from '@/components/reminders/ReminderCard';
import { DashboardCalendar } from '@/components/calendar/DashboardCalendar';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/lib/constants';
import { useTasks } from '@/hooks/useTasks';
import { usePeople, useMarkContacted } from '@/hooks/usePeople';
import { useKids } from '@/hooks/useKids';
import { useReminders, useDismissReminder } from '@/hooks/useReminders';

function StatsCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-primary-600 mt-1">{value}</p>
    </Card>
  );
}

export function DashboardPage() {
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: people, isLoading: peopleLoading } = usePeople();
  const { data: kids, isLoading: kidsLoading } = useKids();
  const { data: reminders } = useReminders({ limit: '5' });
  const markContacted = useMarkContacted();
  const dismissReminder = useDismissReminder();
  const [banner, setBanner] = useState<string | null>(null);

  const convertedEventIds = useMemo(() => {
    const ids = new Set<string>();
    if (tasks) {
      for (const t of tasks) {
        if (t.sourceEventId) ids.add(t.sourceEventId);
      }
    }
    return ids;
  }, [tasks]);

  if (tasksLoading || peopleLoading || kidsLoading) return <LoadingSpinner />;

  const activeReminders = reminders?.filter(
    (r) => !(r.metadata as Record<string, unknown> | null)?.dismissedAt
  ).slice(0, 5) ?? [];

  const activeTasks = tasks?.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS') ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const dueToday = activeTasks.filter((t) => t.dueDate?.slice(0, 10) === today);

  const now = Date.now();
  const needsFollowUp = people?.filter((p) => {
    if (!p.followUpDays) return false;
    if (!p.lastContactAt) return true;
    const daysSince = (now - new Date(p.lastContactAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= p.followUpDays;
  }) ?? [];

  const upcoming = [...activeTasks]
    .filter((t) => t.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard label="Active Tasks" value={activeTasks.length} />
        <StatsCard label="Due Today" value={dueToday.length} />
        <StatsCard label="Follow-ups Needed" value={needsFollowUp.length} />
        <StatsCard label="Kids" value={kids?.length ?? 0} />
      </div>

      {banner && (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-2">
          <span>{banner}</span>
          <button onClick={() => setBanner(null)} className="text-green-500 hover:text-green-700 cursor-pointer">&times;</button>
        </div>
      )}

      <DashboardCalendar
        convertedEventIds={convertedEventIds}
        onConverted={(msg) => setBanner(msg)}
      />

      {activeReminders.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Recent Reminders</h3>
            <Link to="/reminders" className="text-xs text-primary-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-2">
            {activeReminders.map((r) => (
              <ReminderCard
                key={r.id}
                reminder={r}
                onDismiss={(id) => dismissReminder.mutate(id)}
                dismissing={dismissReminder.isPending}
              />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Upcoming Tasks</h3>
          <div className="space-y-2">
            {upcoming.map((t) => (
              <Card key={t.id} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-800">{t.title}</span>
                  <Badge className={`ml-2 ${PRIORITY_COLORS[t.priority]}`}>{PRIORITY_LABELS[t.priority]}</Badge>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(t.dueDate!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </Card>
            ))}
          </div>
        </section>
      )}

      {needsFollowUp.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Follow-up Needed</h3>
          <div className="space-y-2">
            {needsFollowUp.map((p) => (
              <Card key={p.id} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-800">{p.name}</span>
                  {p.lastContactAt && (
                    <span className="text-xs text-gray-500 ml-2">
                      Last: {new Date(p.lastContactAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <Button variant="secondary" className="text-xs" onClick={() => markContacted.mutate(p.id)}>
                  Mark Contacted
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
