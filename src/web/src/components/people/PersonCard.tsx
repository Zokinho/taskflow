import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Person } from '@/types';

interface PersonCardProps {
  person: Person;
  onEdit: () => void;
  onContacted: () => void;
  needsFollowUp: boolean;
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function PersonCard({ person, onEdit, onContacted, needsFollowUp }: PersonCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="cursor-pointer flex-1" onClick={onEdit}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-800">{person.name}</span>
            {needsFollowUp && <Badge className="bg-orange-100 text-orange-700">Follow up</Badge>}
          </div>
          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
            {person.email && <p>{person.email}</p>}
            {person.phone && <p>{person.phone}</p>}
            {person.birthday && <p>Birthday: {formatDate(person.birthday)}</p>}
            {person.lastContactAt && <p>Last contact: {formatDate(person.lastContactAt)}</p>}
          </div>
          {person.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {person.tags.map((t) => <Badge key={t}>{t}</Badge>)}
            </div>
          )}
        </div>
        <Button variant="secondary" onClick={onContacted} className="shrink-0 text-xs">
          Contacted
        </Button>
      </div>
    </Card>
  );
}
