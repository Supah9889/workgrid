import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
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

  useEffect(() => {
    const unsubscribe = base44.entities.Task.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['tasks-today'] });
    });
    return unsubscribe;
  }, [queryClient]);

  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();
  const todayTasks = allTasks.filter(t => {
    if (!t.created_date) return false;
    return t.created_date >= todayStart && t.created_date <= todayEnd;
  });

  const sorted = [...todayTasks].sort((a, b) => {
    const aU = !a.assigned_to ? 0 : 1;
    const bU = !b.assigned_to ? 0 : 1;
    if (aU !== bU) return aU - bU;
    return new Date(b.created_date) - new Date(a.created_date);
  });

  const filtered = sorted.filter(t =>
    !search ||
    t.title?.toLowerCase().includes(search.toLowerCase()) ||
    t.assigned_to_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.delivery_address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
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

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by title, employee, or address..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

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
