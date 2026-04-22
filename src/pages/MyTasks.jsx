import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ListTodo, Circle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const priorityStyles = {
  low: 'bg-secondary text-secondary-foreground',
  medium: 'bg-accent text-accent-foreground',
  high: 'bg-destructive/10 text-destructive',
};

const statusLabels = {
  pending: 'Pending',
  in_progress: 'In Progress',
  complete: 'Complete',
};

export default function MyTasks() {
  const { user } = useAuth();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['my-tasks', user?.email],
    queryFn: () => base44.entities.Task.filter({ assigned_employee: user?.email }),
    enabled: !!user?.email,
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground mt-1">Your assigned work items</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <ListTodo className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No tasks yet</h2>
          <p className="text-muted-foreground">You don't have any tasks assigned to you.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{task.title}</h3>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="secondary" className={priorityStyles[task.priority]}>
                        {task.priority}
                      </Badge>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Circle className="w-2 h-2 fill-current" />
                        {statusLabels[task.status]}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}