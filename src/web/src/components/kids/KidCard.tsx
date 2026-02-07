import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Kid } from '@/types';

interface KidCardProps {
  kid: Kid;
  onEdit: () => void;
  onToggleEvents: () => void;
  expanded: boolean;
  children?: React.ReactNode;
}

export function KidCard({ kid, onEdit, onToggleEvents, expanded, children }: KidCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="cursor-pointer flex-1" onClick={onEdit}>
          <span className="font-medium text-sm text-gray-800">{kid.name}</span>
          {kid.birthday && (
            <p className="text-xs text-gray-500 mt-0.5">
              Birthday: {new Date(kid.birthday).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
            </p>
          )}
          {kid.keywords.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {kid.keywords.map((k) => <Badge key={k}>{k}</Badge>)}
            </div>
          )}
          {kid.notes && <p className="text-xs text-gray-400 mt-1">{kid.notes}</p>}
        </div>
        <button onClick={onToggleEvents} className="text-sm text-primary-600 hover:underline cursor-pointer">
          {expanded ? 'Hide events' : 'Events'}
        </button>
      </div>
      {expanded && <div className="mt-3 border-t border-gray-100 pt-3">{children}</div>}
    </Card>
  );
}
