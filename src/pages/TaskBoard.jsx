import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, List, Map } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import TaskRow from '@/components/tasks/TaskRow';
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog';
import EditTaskDialog from '@/components/tasks/EditTaskDialog';
import DeliveryMap from '@/components/tasks/DeliveryMap';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function TaskBoard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [deleteTask, setDeleteTask] = useState(null);
  const [view, setView] = useState('list');

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'owner';

  const { toast } = useToast();

  const handleDelete = async () => {
    if (!deleteTask) return;
    try {
      await base44.entities.Task.delete(deleteTask.id);
      setDeleteTask(null);
      queryClient.invalidateQueries({ queryKey: ['tasks-today'] });
    } catch (err) {
      console.error('[TaskBoard] Delete failed:', err);
      toast({ title: 'Failed to delete task', description: err.message || 'Please try again.', variant: 'destructive' });
      setDeleteTask(null);
    }
  };

  const today = new Date();

  const { data: allTasks = [], isLoading, isError } = useQuery({
    queryKey: ['tasks-today'],
    queryFn: () => base44.entities.Task.list('-created_date'),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['active-employees'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.status !== 'inactive');
    },
  });

  useEffect(() => {
    const unsubscribe = base44.entities.Task.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['tasks-today'] });
    });
    return unsubscribe;
  }, [queryClient]);

  const todayStr = today.toISOString().split('T')[0];
  const visibleTasks = allTasks.filter(t => {
    if (t.status !== 'delivered') return true;
    return t.updated_date?.startsWith(todayStr) || t.created_date?.startsWith(todayStr);
  });

  const sorted = [...visibleTasks].sort((a, b) => {
    const aU = !a.assigned_employee ? 0 : 1;
    const bU = !b.assigned_employee ? 0 : 1;
    if (aU !== bU) return aU - bU;
    return new Date(b.created_date) - new Date(a.created_date);
  });

  const filtered = sorted.filter(t =>
    !search ||
    t.title?.toLowerCase().includes(search.toLowerCase()) ||
    t.assigned_employee_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.delivery_address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Task Board</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{format(today, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors ${view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <List className="w-4 h-4" /> List
            </button>
            <button
              onClick={() => setView('map')}
              className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors ${view === 'map' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <Map className="w-4 h-4" /> Map
            </button>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Task
          </Button>
        </div>
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

      {view === 'map' && (
        <div className="mb-6">
          <DeliveryMap tasks={allTasks} />
        </div>
      )}

      <div className="space-y-2" style={{ display: view === 'map' ? 'none' : undefined }}>
        {isError ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-destructive font-medium">Failed to load data</p>
            <p className="text-muted-foreground text-sm">Check your connection and refresh the page</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No active tasks</p>
            <p className="text-sm mt-1">Click "Create Task" to get started</p>
          </div>
        ) : (
          filtered.map(task => (
            <TaskRow key={task.id} task={task} onEdit={setEditTask} onDelete={isSuperAdmin ? setDeleteTask : undefined} />
          ))
        )}
      </div>

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        employees={employees}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['tasks-today'] })}
      />

      <AlertDialog open={!!deleteTask} onOpenChange={open => !open && setDeleteTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTask?.title}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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