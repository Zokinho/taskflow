import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PRIORITY_COLORS, STATUS_COLORS, PRIORITY_LABELS, STATUS_LABELS } from '@/lib/constants';
import type { Task } from '@/types';

interface TaskCardProps {
  task: Task;
  onEdit: () => void;
  onToggleDone: () => void;
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function TaskCard({ task, onEdit, onToggleDone }: TaskCardProps) {
  const isDone = task.status === 'DONE';

  return (
    <Card className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={isDone}
        onChange={onToggleDone}
        className="mt-1 h-4 w-4 rounded accent-primary-500 cursor-pointer"
      />
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-medium text-sm ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {task.title}
          </span>
          <Badge className={PRIORITY_COLORS[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge>
          <Badge className={STATUS_COLORS[task.status]}>{STATUS_LABELS[task.status]}</Badge>
        </div>
        {task.dueDate && (
          <p className="text-xs text-gray-500 mt-0.5">Due: {formatDate(task.dueDate)}</p>
        )}
        {task.tags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {task.tags.map((t) => <Badge key={t}>{t}</Badge>)}
          </div>
        )}
      </div>
    </Card>
  );
}
