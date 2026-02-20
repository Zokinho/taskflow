import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskForm } from '@/components/tasks/TaskForm';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useAutoSchedule, useClearSchedule } from '@/hooks/useAutoSchedule';
import type { Task } from '@/types';

export function TasksPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (statusFilter) p.status = statusFilter;
    if (priorityFilter) p.priority = priorityFilter;
    if (tagFilter) p.tag = tagFilter;
    return Object.keys(p).length ? p : undefined;
  }, [statusFilter, priorityFilter, tagFilter]);

  const { data: tasks, isLoading } = useTasks(params);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const autoSchedule = useAutoSchedule();
  const clearSchedule = useClearSchedule();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [scheduleMsg, setScheduleMsg] = useState('');

  function handleToggleDone(task: Task) {
    updateTask.mutate({
      id: task.id,
      status: task.status === 'DONE' ? 'TODO' : 'DONE',
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All statuses"
            options={[
              { value: 'TODO', label: 'To Do' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'DONE', label: 'Done' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
          <Select
            value={priorityFilter}
            onChange={setPriorityFilter}
            placeholder="All priorities"
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
              { value: 'URGENT', label: 'Urgent' },
            ]}
          />
          <Input value={tagFilter} onChange={setTagFilter} placeholder="Filter by tag" />
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              clearSchedule.mutate(undefined, {
                onSuccess: (data) => {
                  setScheduleMsg(`Cleared ${data.cleared} task${data.cleared === 1 ? '' : 's'}`);
                  setTimeout(() => setScheduleMsg(''), 3000);
                },
              });
            }}
            disabled={clearSchedule.isPending}
          >
            {clearSchedule.isPending ? 'Clearing...' : 'Clear Schedule'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              autoSchedule.mutate(undefined, {
                onSuccess: (data) => {
                  setScheduleMsg(`Scheduled ${data.scheduled} task${data.scheduled === 1 ? '' : 's'}`);
                  setTimeout(() => setScheduleMsg(''), 3000);
                },
              });
            }}
            disabled={autoSchedule.isPending}
          >
            {autoSchedule.isPending ? 'Scheduling...' : 'Auto Schedule'}
          </Button>
          <Button onClick={() => setShowCreate(true)}>New Task</Button>
        </div>
      </div>

      {scheduleMsg && (
        <div className="bg-primary-50 text-primary-700 px-4 py-2 rounded-lg text-sm font-medium">
          {scheduleMsg}
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : !tasks?.length ? (
        <EmptyState title="No tasks" description="Create your first task to get started." actionLabel="New Task" onAction={() => setShowCreate(true)} />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={() => setEditing(task)} onToggleDone={() => handleToggleDone(task)} />
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Task">
        <TaskForm
          onSubmit={(data) => createTask.mutate(data, { onSuccess: () => setShowCreate(false) })}
          loading={createTask.isPending}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Task">
        {editing && (
          <div className="space-y-3">
            <TaskForm
              initial={editing}
              onSubmit={(data) => updateTask.mutate({ id: editing.id, ...data }, { onSuccess: () => setEditing(null) })}
              loading={updateTask.isPending}
            />
            <div className="border-t border-gray-100 pt-3">
              <Button variant="danger" className="w-full" onClick={() => { setEditing(null); setDeleting(editing); }}>
                Delete Task
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteTask.mutate(deleting!.id, { onSuccess: () => setDeleting(null) })}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleting?.title}"?`}
        loading={deleteTask.isPending}
      />
    </div>
  );
}
