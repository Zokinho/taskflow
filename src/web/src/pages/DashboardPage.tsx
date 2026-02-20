import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ReminderCard } from '@/components/reminders/ReminderCard';
import { DashboardCalendar } from '@/components/calendar/DashboardCalendar';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/lib/constants';
import { useTasks, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import type { Task } from '@/types';
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
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
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
              <Card key={t.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-800">{t.title}</span>
                  <Badge className={`ml-2 ${PRIORITY_COLORS[t.priority]}`}>{PRIORITY_LABELS[t.priority]}</Badge>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(t.dueDate!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    title="Mark done"
                    className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors cursor-pointer"
                    onClick={() => updateTask.mutate({ id: t.id, status: 'DONE' })}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    title="Defer to tomorrow"
                    className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                    onClick={() => {
                      const ONE_DAY = 24 * 60 * 60 * 1000;
                      const data: Partial<Task> & { id: string } = { id: t.id };
                      if (t.scheduledStart) data.scheduledStart = new Date(new Date(t.scheduledStart).getTime() + ONE_DAY).toISOString();
                      if (t.scheduledEnd) data.scheduledEnd = new Date(new Date(t.scheduledEnd).getTime() + ONE_DAY).toISOString();
                      if (t.dueDate) data.dueDate = new Date(new Date(t.dueDate).getTime() + ONE_DAY).toISOString();
                      updateTask.mutate(data);
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                  <button
                    title="Delete"
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    onClick={() => deleteTask.mutate(t.id)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
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
