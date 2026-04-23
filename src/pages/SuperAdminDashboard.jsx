import { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { startOfDay, endOfDay } from 'date-fns';
import LiveSummaryBar from '@/components/dashboard/LiveSummaryBar';
import TasksPanel from '@/components/dashboard/TasksPanel';
import EmployeeStatusPanel from '@/components/dashboard/EmployeeStatusPanel';
import ActivityFeedPanel from '@/components/dashboard/ActivityFeedPanel';

const PANEL_HEIGHT = 'h-[calc(100vh-220px)]';

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: users = [] } = useQuery({
    queryKey: ['dash-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
  });

  const { data: clockRecordsToday = [] } = useQuery({
    queryKey: ['dash-clock', today],
    queryFn: () => base44.entities.ClockRecord.filter({ date: today }),
    refetchInterval: 30000,
  });

  useEffect(() => {
    const u1 = base44.entities.Task.subscribe(() => queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] }));
    const u2 = base44.entities.ClockRecord.subscribe(() => queryClient.invalidateQueries({ queryKey: ['dash-clock', today] }));
    const u3 = base44.entities.User.subscribe(() => queryClient.invalidateQueries({ queryKey: ['dash-users'] }));
    return () => { u1(); u2(); u3(); };
  }, [queryClient, today]);

  const activeEmployees = users.filter(u => u.status !== 'inactive' && u.role !== 'super_admin');
  const clockedInRecords = clockRecordsToday.filter(r => !r.clock_out && !r.manually_closed);
  const openClockRecords = clockRecordsToday.filter(r => r.open_flag);
  const todayTasks = allTasks.filter(t => t.created_date?.startsWith(today));

  return (
    <div className="p-5 max-w-[1600px] mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold tracking-tight">
          Command Center
        </h1>
        <p className="text-muted-foreground text-xs mt-0.5">Live operations overview — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      <LiveSummaryBar
        employees={activeEmployees.length}
        clockedInCount={clockedInRecords.length}
        tasks={allTasks}
        openClockCount={openClockRecords.length}
      />

      {/* Three-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Tasks */}
        <div className={`rounded-xl border border-border bg-card p-4 flex flex-col ${PANEL_HEIGHT} overflow-hidden`}>
          <TasksPanel tasks={allTasks} employees={activeEmployees} />
        </div>

        {/* Center: Employee Status */}
        <div className={`rounded-xl border border-border bg-card p-4 flex flex-col ${PANEL_HEIGHT} overflow-hidden`}>
          <EmployeeStatusPanel
            employees={activeEmployees}
            clockedInRecords={clockedInRecords}
            todayTasks={todayTasks}
          />
        </div>

        {/* Right: Activity Feed */}
        <div className={`rounded-xl border border-border bg-card p-4 flex flex-col ${PANEL_HEIGHT} overflow-hidden`}>
          <ActivityFeedPanel />
        </div>
      </div>
    </div>
  );
}