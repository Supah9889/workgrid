import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import TaskSummaryBar from '@/components/tasks/TaskSummaryBar';
import TaskRow from '@/components/tasks/TaskRow';
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog';
import EditTaskDialog from '@/components/tasks/EditTaskDialog';

export default function TaskBoard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);

  const today = new Date();

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks-today'],
    queryFn: () => base44.entities.Task.list('-created_date'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['active-employees'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.status !== 'inactive' && u.role !== 'super_admin');
    },
  });

  // Real-time updates
  useEffect(() => {
    const unsubscribe = base44.entities.Task.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['tasks-today'] });
    });
    return unsubscribe;
  }, [queryClient]);

  // Filter to today's tasks
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();
  const todayTasks = allTasks.filter(t => {
    if (!t.created_date) return false;
    return t.created_date >= todayStart && t.created_date <= todayEnd;
  });

  // Sort: unassigned first, then by created date
  const sorted = [...todayTasks].sort((a, b) => {
    const aUnassigned = !a.assigned_employee ? 0 : 1;
    const bUnassigned = !b.assigned_employee ? 0 : 1;
    if (aUnassigned !== bUnassigned) return aUnassigned - bUnassigned;
    return new Date(b.created_date) - new Date(a.created_date);
  });

  const filtered = sorted.filter(t =>
    !search ||
    t.title?.toLowerCase().includes(search.toLowerCase()) ||
    t.assigned_employee_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Task Board</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{format(today, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Task
        </Button>
      </div>

      {/* Summary Bar */}
      <TaskSummaryBar tasks={todayTasks} employees={employees} />

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by title or employee..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Column Headers */}
      <div className="hidden sm:flex items-center gap-3 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        <div className="flex-1">Task</div>
        <div className="w-20 flex-shrink-0">Priority</div>
        <div className="hidden md:block w-32 flex-shrink-0">Employee</div>
        <div className="hidden sm:block w-28 flex-shrink-0">Status</div>
        <div className="hidden lg:block w-24 flex-shrink-0">Created</div>
        <div className="w-16 flex-shrink-0"></div>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No tasks for today yet</p>
            <p className="text-sm mt-1">Click "Create Task" to get started</p>
          </div>
        ) : (
          filtered.map(task => (
            <TaskRow key={task.id} task={task} onEdit={setEditTask} />
          ))
        )}
      </div>

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        employees={employees}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['tasks-today'] })}
      />

      <EditTaskDialog
        open={!!editTask}
        onOpenChange={open => !open && setEditTask(null)}
        task={editTask}
        employees={employees}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['tasks-today'] })}
      />
    </div>
  );
}