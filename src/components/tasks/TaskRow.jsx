import { Button } from '@/components/ui/button';
import { PriorityBadge, StatusBadge } from '@/components/tasks/TaskBadges';
import { Pencil, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function TaskRow({ task, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-b last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {task.assigned_to_name
            ? task.assigned_to_name
            : <span className="text-orange-500">Unassigned</span>}
        </p>
      </div>
      <PriorityBadge priority={task.priority} />
      <StatusBadge status={task.status} />
      <span className="text-xs text-muted-foreground hidden sm:block whitespace-nowrap">
        {task.created_date ? formatDistanceToNow(new Date(task.created_date), { addSuffix: true }) : ''}
      </span>
      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => onEdit(task)}>
        <Pencil className="w-3.5 h-3.5" />
      </Button>
      {onDelete && (
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(task)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}