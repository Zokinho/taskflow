import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PROVIDER_LABELS, PROVIDER_COLORS } from '@/lib/constants';
import type { Calendar } from '@/types';

interface CalendarCardProps {
  calendar: Calendar;
  onEdit: () => void;
  onToggleEvents: () => void;
  expanded: boolean;
  onSync?: () => void;
  syncing?: boolean;
  children?: React.ReactNode;
}

export function CalendarCard({ calendar, onEdit, onToggleEvents, expanded, onSync, syncing, children }: CalendarCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="cursor-pointer flex-1" onClick={onEdit}>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: calendar.color || '#ec4899' }}
            />
            <span className="font-medium text-sm text-gray-800">{calendar.name}</span>
            <Badge className={PROVIDER_COLORS[calendar.provider]}>{PROVIDER_LABELS[calendar.provider]}</Badge>
            {!calendar.isActive && <Badge className="bg-gray-100 text-gray-500">Inactive</Badge>}
          </div>
          {calendar.lastSyncAt && (
            <p className="text-xs text-gray-500 mt-1">
              Last sync: {new Date(calendar.lastSyncAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onSync && (
            <button
              onClick={onSync}
              disabled={syncing}
              className="text-sm text-primary-600 hover:underline cursor-pointer disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
          )}
          <button onClick={onToggleEvents} className="text-sm text-primary-600 hover:underline cursor-pointer">
            {expanded ? 'Hide events' : 'Events'}
          </button>
        </div>
      </div>
      {expanded && <div className="mt-3 border-t border-gray-100 pt-3">{children}</div>}
    </Card>
  );
}
