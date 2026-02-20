import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TaskForm } from '@/components/tasks/TaskForm';
import { useUpdateTask } from '@/hooks/useTasks';
import type { Task } from '@/types';

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function TaskDetailModal({ task, open, onClose }: TaskDetailModalProps) {
  const [showForm, setShowForm] = useState(false);
  const updateTask = useUpdateTask();

  if (!task) return null;

  const isDone = task.status === 'DONE' || task.status === 'CANCELLED';

  function handleMarkDone() {
    updateTask.mutate(
      { id: task!.id, status: 'DONE' },
      { onSuccess: () => onClose() },
    );
  }

  function handleDefer() {
    const data: Partial<Task> & { id: string } = { id: task!.id };
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    if (task!.scheduledStart) {
      data.scheduledStart = new Date(new Date(task!.scheduledStart).getTime() + ONE_DAY_MS).toISOString();
    }
    if (task!.scheduledEnd) {
      data.scheduledEnd = new Date(new Date(task!.scheduledEnd).getTime() + ONE_DAY_MS).toISOString();
    }
    if (task!.dueDate) {
      data.dueDate = new Date(new Date(task!.dueDate).getTime() + ONE_DAY_MS).toISOString();
    }

    updateTask.mutate(data, { onSuccess: () => onClose() });
  }

  function handleFormSubmit(formData: Partial<Task>) {
    updateTask.mutate(
      { ...formData, id: task!.id },
      {
        onSuccess: () => {
          setShowForm(false);
          onClose();
        },
      },
    );
  }

  function handleClose() {
    setShowForm(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={task.title}>
      <div className="space-y-4">
        {/* Status + Priority */}
        <div className="flex items-center gap-2">
          <Badge className={priorityColors[task.priority] ?? ''}>
            {task.priority}
          </Badge>
          <Badge className={isDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
            {statusLabels[task.status] ?? task.status}
          </Badge>
        </div>

        {/* Scheduled time */}
        {task.scheduledStart && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {formatDate(task.scheduledStart)}
              {', '}
              {formatTime(task.scheduledStart)}
              {task.scheduledEnd && ` – ${formatTime(task.scheduledEnd)}`}
            </span>
          </div>
        )}

        {/* Due date */}
        {task.dueDate && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Due {formatDate(task.dueDate)}</span>
          </div>
        )}

        {/* Estimated minutes */}
        {task.estimatedMins && (
          <div className="text-sm text-gray-500">
            Estimated: {task.estimatedMins} min
          </div>
        )}

        {/* Description */}
        {task.description && (
          <p className="text-sm text-gray-600 whitespace-pre-wrap border-t border-gray-100 pt-3">
            {task.description}
          </p>
        )}

        {/* Notes */}
        {task.notes && (
          <div className="border-t border-gray-100 pt-3">
            <h4 className="text-xs font-medium text-gray-400 uppercase mb-1">Notes</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.notes}</p>
          </div>
        )}

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {task.tags.map((tag) => (
              <Badge key={tag} className="bg-primary-50 text-primary-600">{tag}</Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-gray-100 pt-3">
          {showForm ? (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Edit task</h4>
              <TaskForm
                initial={task}
                onSubmit={handleFormSubmit}
                loading={updateTask.isPending}
              />
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {!isDone && (
                <Button onClick={handleMarkDone} disabled={updateTask.isPending}>
                  {updateTask.isPending ? 'Saving...' : 'Mark Done'}
                </Button>
              )}
              <Button variant="secondary" onClick={() => setShowForm(true)}>
                Edit Task
              </Button>
              {!isDone && (
                <Button variant="ghost" onClick={handleDefer} disabled={updateTask.isPending}>
                  Defer to Tomorrow
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
