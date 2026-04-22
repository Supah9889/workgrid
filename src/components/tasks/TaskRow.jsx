import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PriorityBadge, StatusBadge } from './TaskBadges';
import { Pencil, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function TaskRow({ task, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const isUnassigned = !task.assigned_employee;

  return (
    <div className={`rounded-xl border transition-all ${isUnassigned ? 'border-orange-300 bg-orange-50' : 'border-border bg-card'}`}>
      <div className="flex items-center gap-3 p-4">
        {isUnassigned && <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />}

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{task.title}</p>
          {task.description && (
            <p className={`text-xs text-muted-foreground mt-0.5 ${expanded ? '' : 'truncate'}`}>
              {task.description}
            </p>
          )}
        </div>

        {/* Priority */}
        <div className="hidden sm:block w-20 flex-shrink-0">
          <PriorityBadge priority={task.priority} />
        </div>

        {/* Assigned */}
        <div className="hidden md:block w-32 flex-shrink-0 text-sm text-muted-foreground truncate">
          {isUnassigned ? <span className="text-orange-500 font-medium">Unassigned</span> : task.assigned_employee_name || task.assigned_employee}
        </div>

        {/* Status */}
        <div className="hidden sm:block w-28 flex-shrink-0">
          <StatusBadge status={task.status} />
        </div>

        {/* Time */}
        <div className="hidden lg:block w-24 flex-shrink-0 text-xs text-muted-foreground">
          {task.created_date ? format(new Date(task.created_date), 'h:mm a') : '—'}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {task.description && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(task)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-border/50 mt-0">
          <p className="text-sm text-muted-foreground mt-3">{task.description}</p>
          {task.notes && (
            <div className="mt-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
              <span className="font-semibold">Employee note: </span>{task.notes}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3 sm:hidden">
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
          </div>
        </div>
      )}
    </div>
  );
}