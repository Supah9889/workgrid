import { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, ClipboardList, Clock, AlertTriangle, UserCheck, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

function StatCard({ title, value, icon: Icon, colorClass, highlight }) {
  return (
    <Card className={`relative overflow-hidden ${highlight ? 'border-2 ' + highlight : ''}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: todayTasks = [] } = useQuery({
    queryKey: ['tasks-dashboard'],
    queryFn: async () => {
      const all = await base44.entities.Task.list();
      return all.filter(t => t.created_date?.startsWith(today));
    },
  });

  const { data: clockRecordsToday = [] } = useQuery({
    queryKey: ['clock-dashboard', today],
    queryFn: () => base44.entities.ClockRecord.filter({ date: today }),
    refetchInterval: 30000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: user?.email, read: false }),
    enabled: !!user?.email,
  });

  // Real-time subscriptions
  useEffect(() => {
    const unsubTasks = base44.entities.Task.subscribe(() => queryClient.invalidateQueries({ queryKey: ['tasks-dashboard'] }));
    const unsubClock = base44.entities.ClockRecord.subscribe(() => queryClient.invalidateQueries({ queryKey: ['clock-dashboard', today] }));
    return () => { unsubTasks(); unsubClock(); };
  }, [queryClient, today]);

  const activeEmployees = users.filter(u => u.status !== 'inactive' && u.role !== 'super_admin');
  const clockedIn = clockRecordsToday.filter(r => !r.clock_out && !r.manually_closed);
  const openRecords = clockRecordsToday.filter(r => r.open_flag);
  const unassignedTasks = todayTasks.filter(t => !t.assigned_employee);
  const pendingTasks = todayTasks.filter(t => t.status === 'pending');
  const inProgressTasks = todayTasks.filter(t => t.status === 'in_progress');
  const completeTasks = todayTasks.filter(t => t.status === 'complete');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, <span className="text-primary">{user?.full_name?.split(' ')[0] || 'Admin'}</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Workforce overview — updates in real time</p>
      </div>

      {/* Notifications Banner */}
      {notifications.length > 0 && (
        <div className="mb-5 p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">You have {notifications.length} unread notification{notifications.length > 1 ? 's' : ''}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{notifications[0]?.message}</p>
          </div>
        </div>
      )}

      {/* Open clock record warning */}
      {openRecords.length > 0 && (
        <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-medium text-red-700">
            {openRecords.length} open clock record{openRecords.length > 1 ? 's' : ''} — employees clocked in with no clock out. Review in Time & Attendance.
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard title="Employees" value={activeEmployees.length} icon={Users} colorClass="bg-primary/10 text-primary" />
        <StatCard title="Clocked In" value={clockedIn.length} icon={UserCheck} colorClass="bg-emerald-100 text-emerald-600" />
        <StatCard title="Tasks Today" value={todayTasks.length} icon={ClipboardList} colorClass="bg-foreground/10 text-foreground" />
        <StatCard title="Pending" value={pendingTasks.length} icon={Clock} colorClass="bg-yellow-100 text-yellow-600" />
        <StatCard
          title="Unassigned"
          value={unassignedTasks.length}
          icon={AlertTriangle}
          colorClass="bg-orange-100 text-orange-600"
          highlight={unassignedTasks.length > 0 ? 'border-orange-300' : undefined}
        />
        <StatCard
          title="Open Clocks"
          value={openRecords.length}
          icon={AlertTriangle}
          colorClass="bg-red-100 text-red-600"
          highlight={openRecords.length > 0 ? 'border-red-300' : undefined}
        />
      </div>

      {/* Task status breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Pending', count: pendingTasks.length, color: 'bg-slate-100 text-slate-600', bar: 'bg-slate-400' },
          { label: 'In Progress', count: inProgressTasks.length, color: 'bg-blue-50 text-blue-700', bar: 'bg-blue-500' },
          { label: 'Complete', count: completeTasks.length, color: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500' },
        ].map(({ label, count, color, bar }) => {
          const pct = todayTasks.length > 0 ? Math.round((count / todayTasks.length) * 100) : 0;
          return (
            <Card key={label}>
              <CardContent className="p-5">
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">{pct}% of today's tasks</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}