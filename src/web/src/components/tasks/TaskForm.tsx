import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { Task, TaskPriority, TaskStatus } from '@/types';

interface TaskFormProps {
  initial?: Task;
  onSubmit: (data: Partial<Task>) => void;
  loading?: boolean;
}

const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const statusOptions = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function TaskForm({ initial, onSubmit, loading }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? 'MEDIUM');
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? 'TODO');
  const [dueDate, setDueDate] = useState(initial?.dueDate?.slice(0, 16) ?? '');
  const [scheduledStart, setScheduledStart] = useState(initial?.scheduledStart?.slice(0, 16) ?? '');
  const [scheduledEnd, setScheduledEnd] = useState(initial?.scheduledEnd?.slice(0, 16) ?? '');
  const [estimatedMins, setEstimatedMins] = useState(initial?.estimatedMins?.toString() ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [tagsStr, setTagsStr] = useState(initial?.tags?.join(', ') ?? '');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const data: Partial<Task> = {
      title,
      description: description || null,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      scheduledStart: scheduledStart ? new Date(scheduledStart).toISOString() : null,
      scheduledEnd: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
      estimatedMins: estimatedMins ? parseInt(estimatedMins) : null,
      notes: notes || null,
      tags: tagsStr ? tagsStr.split(',').map((t) => t.trim()).filter(Boolean) : [],
    };
    if (initial) data.status = status;
    onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input label="Title" value={title} onChange={setTitle} required autoFocus />
      <Input label="Description" value={description} onChange={setDescription} />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Priority" value={priority} onChange={(v) => setPriority(v as TaskPriority)} options={priorityOptions} />
        {initial && <Select label="Status" value={status} onChange={(v) => setStatus(v as TaskStatus)} options={statusOptions} />}
      </div>
      <Input label="Due date" type="datetime-local" value={dueDate} onChange={setDueDate} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Scheduled start" type="datetime-local" value={scheduledStart} onChange={setScheduledStart} />
        <Input label="Scheduled end" type="datetime-local" value={scheduledEnd} onChange={setScheduledEnd} />
      </div>
      <Input label="Estimated minutes" type="number" value={estimatedMins} onChange={setEstimatedMins} />
      <Input label="Notes" value={notes} onChange={setNotes} />
      <Input label="Tags (comma-separated)" value={tagsStr} onChange={setTagsStr} />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : initial ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
