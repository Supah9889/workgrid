import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PriorityBadge, StatusBadge } from '@/components/tasks/TaskBadges';
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog';
import { useQueryClient } from '@tanstack/react-query';

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export default function TasksPanel({ tasks, employees }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const todayTasks = tasks
    .filter(t => t.created_date?.startsWith(today))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Today's Tasks</h2>
        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setCreateOpen(true)}>
          <Plus className="w-3 h-3" /> Create
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {todayTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-muted-foreground">
            <p>No tasks yet today</p>
          </div>
        ) : (
          todayTasks.map(task => (
            <div
              key={task.id}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {task.assigned_employee_name || <span className="text-orange-500">Unassigned</span>}
                </p>
              </div>
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} />
              <button
                onClick={() => navigate('/tasks')}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
              >
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          ))
        )}
      </div>

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        employees={employees}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] })}
      />
    </div>
  );
}