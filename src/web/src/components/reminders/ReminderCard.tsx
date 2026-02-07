import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { REMINDER_TYPE_LABELS, REMINDER_TYPE_COLORS } from '@/lib/constants';
import type { Reminder } from '@/types';

interface ReminderCardProps {
  reminder: Reminder;
  onDismiss?: (id: string) => void;
  dismissing?: boolean;
}

export function ReminderCard({ reminder, onDismiss, dismissing }: ReminderCardProps) {
  const isDismissed = !!(reminder.metadata as Record<string, unknown> | null)?.dismissedAt;

  return (
    <Card className={isDismissed ? 'opacity-50' : ''}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={REMINDER_TYPE_COLORS[reminder.type]}>
              {REMINDER_TYPE_LABELS[reminder.type]}
            </Badge>
            {reminder.sentAt && (
              <span className="text-xs text-green-600">Sent</span>
            )}
            {isDismissed && (
              <span className="text-xs text-gray-400">Dismissed</span>
            )}
          </div>
          <h4 className="text-sm font-medium text-gray-800">{reminder.title}</h4>
          {reminder.message && (
            <p className="text-xs text-gray-500 mt-1 whitespace-pre-line line-clamp-3">
              {reminder.message}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {new Date(reminder.scheduledAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
        {onDismiss && !isDismissed && (
          <Button
            variant="ghost"
            className="text-xs shrink-0"
            onClick={() => onDismiss(reminder.id)}
            disabled={dismissing}
          >
            Dismiss
          </Button>
        )}
      </div>
    </Card>
  );
}
