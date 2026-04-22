import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, ClipboardList, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuperAdminDashboard() {
  const { user } = useAuth();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: user?.email, read: false }),
    enabled: !!user?.email,
  });

  const activeUsers = users.filter(u => u.status !== 'inactive');
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const unassignedTasks = tasks.filter(t => !t.assigned_employee);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, <span className="text-primary">{user?.full_name?.split(' ')[0] || 'Admin'}</span>
        </h1>
        <p className="text-muted-foreground mt-1">Here's your workforce overview</p>
      </div>

      {/* Notifications Banner */}
      {notifications.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">You have {notifications.length} unread notification{notifications.length > 1 ? 's' : ''}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{notifications[0]?.message}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Active Employees"
          value={activeUsers.length}
          icon={Users}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          title="Total Tasks"
          value={tasks.length}
          icon={ClipboardList}
          color="bg-foreground/10 text-foreground"
        />
        <StatCard
          title="Pending Tasks"
          value={pendingTasks.length}
          icon={Clock}
          color="bg-accent text-accent-foreground"
        />
        <StatCard
          title="Unassigned"
          value={unassignedTasks.length}
          icon={AlertTriangle}
          color="bg-destructive/10 text-destructive"
        />
      </div>

      <div className="mt-12 text-center text-muted-foreground">
        <p className="text-sm">Full dashboard with charts and analytics coming soon.</p>
      </div>
    </div>
  );
}