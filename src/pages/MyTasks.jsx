import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { PriorityBadge, StatusBadge } from '@/components/tasks/TaskBadges';
import { ListTodo, ChevronRight, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import ClockButton from '@/components/clock/ClockButton';

const STATUS_NEXT = {
  pending: { label: 'Mark In Progress', next: 'in_progress' },
  in_progress: { label: 'Mark Complete', next: 'complete' },
};

function TaskCard({ task, onUpdated }) {
  const { toast } = useToast();
  const [notes, setNotes] = useState(task.notes || '');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleStatusUpdate = async () => {
    const advance = STATUS_NEXT[task.status];
    if (!advance) return;
    setSaving(true);
    await base44.entities.Task.update(task.id, { status: advance.next });
    toast({ title: `Task marked as ${advance.next.replace('_', ' ')}` });
    onUpdated();
    setSaving(false);
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    await base44.entities.Task.update(task.id, { notes });
    toast({ title: 'Notes saved' });
    onUpdated();
    setSaving(false);
  };

  const advance = STATUS_NEXT[task.status];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 p-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{task.title}</p>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
            )}
          </div>
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpanded(!expanded)}>
            <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </Button>
        </div>

        {expanded && (
          <div className="border-t px-4 pb-4 pt-3 space-y-3">
            {task.description && (
              <p className="text-sm text-muted-foreground">{task.description}</p>
            )}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Add a note for your manager
              </label>
              <Textarea
                placeholder="Type a note here..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveNotes}
                disabled={saving || notes === task.notes}
              >
                {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                Save Note
              </Button>
            </div>

            {advance && (
              <Button size="sm" onClick={handleStatusUpdate} disabled={saving} className="w-full">
                {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                {advance.label}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MyTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['my-tasks', user?.email],
    queryFn: () => base44.entities.Task.filter({ assigned_employee: user.email }),
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (!user?.email) return;
    const unsubscribe = base44.entities.Task.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks', user.email] });
    });
    return unsubscribe;
  }, [user?.email, queryClient]);

  const pending = tasks.filter(t => t.status === 'pending');
  const inProgress = tasks.filter(t => t.status === 'in_progress');
  const complete = tasks.filter(t => t.status === 'complete');

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['my-tasks', user?.email] });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {user && <ClockButton user={user} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
          {!isLoading && ` · ${tasks.length} task${tasks.length !== 1 ? 's' : ''} assigned`}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <ListTodo className="w-7 h-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-1">No tasks assigned yet today</h2>
          <p className="text-sm text-muted-foreground">Your manager will assign tasks here when they're ready.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {inProgress.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-2">
                In Progress ({inProgress.length})
              </h2>
              <div className="space-y-2">
                {inProgress.map(t => <TaskCard key={t.id} task={t} onUpdated={refresh} />)}
              </div>
            </section>
          )}
          {pending.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Pending ({pending.length})
              </h2>
              <div className="space-y-2">
                {pending.map(t => <TaskCard key={t.id} task={t} onUpdated={refresh} />)}
              </div>
            </section>
          )}
          {complete.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-2">
                Complete ({complete.length})
              </h2>
              <div className="space-y-2">
                {complete.map(t => <TaskCard key={t.id} task={t} onUpdated={refresh} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}