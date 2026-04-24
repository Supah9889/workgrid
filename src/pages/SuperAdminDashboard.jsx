import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, MapPin, Clock, Package, Building2, ChevronDown, ChevronUp, User } from 'lucide-react';
import { PriorityBadge, StatusBadge } from '@/components/tasks/TaskBadges';
import CreateTaskDialog from '@/components/tasks/CreateTaskDialog';
import { format } from 'date-fns';

function TaskCard({ task, employees }) {
  const [expanded, setExpanded] = useState(false);
  const isUnassigned = !task.assigned_employee;
  const empName = task.assigned_employee_name || (employees.find(e => e.email === task.assigned_employee)?.full_name) || 'Unassigned';

  return (
    <div
      onClick={() => setExpanded(v => !v)}
      className={`rounded-xl border cursor-pointer transition-all select-none ${
        isUnassigned
          ? 'border-orange-500/50 bg-orange-500/10 hover:bg-orange-500/15'
          : 'border-slate-700 bg-slate-800/60 hover:bg-slate-800'
      }`}
    >
      {/* Condensed header */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {isUnassigned && (
              <span className="text-xs font-semibold text-orange-400 bg-orange-500/20 px-2 py-0.5 rounded-full">
                UNASSIGNED
              </span>
            )}
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
          </div>
          <p className="font-semibold text-white leading-snug">{task.title}</p>
          {(() => {
            const steps = [
              { key: 'pending', label: 'Assigned' },
              { key: 'picked_up', label: 'Picked Up' },
              { key: 'en_route', label: 'En Route' },
              { key: 'delivered', label: 'Delivered' },
            ];
            const currentIndex = steps.findIndex(s => s.key === task.status);
            return (
              <div className="flex items-center gap-1 mt-2 mb-1">
                {steps.map((step, i) => (
                  <div key={step.key} className="flex items-center gap-1 flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`h-1.5 w-full rounded-full transition-colors ${
                        i < currentIndex ? 'bg-green-500' :
                        i === currentIndex ? 'bg-blue-500' :
                        'bg-slate-700'
                      }`} />
                      <span className={`text-[9px] mt-0.5 ${
                        i === currentIndex ? 'text-blue-400' :
                        i < currentIndex ? 'text-green-400' :
                        'text-slate-600'
                      }`}>{step.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1 truncate">
              <User className="w-3 h-3 flex-shrink-0" />
              {isUnassigned ? <span className="text-orange-400">Unassigned</span> : empName}
            </span>
            {task.delivery_address && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{task.delivery_address}</span>
              </span>
            )}
            {task.scheduled_time && (
              <span className="flex items-center gap-1 truncate">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  {(() => {
                    try { return format(new Date(task.scheduled_time), 'MMM d, h:mm a'); }
                    catch { return task.scheduled_time; }
                  })()}
                </span>
              </span>
            )}
            {task.requested_by && (
              <span className="flex items-center gap-1 truncate">
                <Building2 className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{task.requested_by}</span>
              </span>
            )}
          </div>
        </div>
        <div className="text-slate-500 mt-1 flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div
          onClick={e => e.stopPropagation()}
          className="border-t border-slate-700 px-4 pb-4 pt-3 space-y-3"
        >
          {task.part_description && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-0.5">Part</p>
              <p className="text-sm text-slate-200 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                {task.part_description}
              </p>
            </div>
          )}
          {task.store_name && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-0.5">Store</p>
              <p className="text-sm text-slate-200">{task.store_name}</p>
            </div>
          )}
          {task.delivery_address && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-0.5">Delivery Address</p>
              <p className="text-sm text-slate-200">{task.delivery_address}</p>
            </div>
          )}
          {task.requested_by && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-0.5">Requested By</p>
              <p className="text-sm text-slate-200">{task.requested_by}</p>
            </div>
          )}
          {task.notes && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-0.5">Notes</p>
              <p className="text-sm text-slate-300 bg-slate-900/60 rounded-lg p-2.5">{task.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SuperAdminDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: clockRecords = [] } = useQuery({
    queryKey: ['dash-clock-today'],
    queryFn: () => base44.entities.ClockRecord.list(),
  });

  const { data: allTasks = [], isLoading, isError } = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 200),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['dash-employees'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.role !== 'super_admin' && u.status !== 'inactive');
    },
  });

  useEffect(() => {
    const unsub = base44.entities.Task.subscribe(() =>
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] })
    );
    return unsub;
  }, [queryClient]);

  const unassigned = allTasks.filter(t => !t.assigned_employee);
  const assigned = allTasks.filter(t => !!t.assigned_employee);

  const todayStr = new Date().toISOString().split('T')[0];
  const clockedInToday = clockRecords.filter(r => r.date === todayStr && r.punch_in_time && !r.punch_out_time).length;
  const activeDeliveries = allTasks.filter(t => t.status === 'picked_up' || t.status === 'en_route').length;
  const deliveredToday = allTasks.filter(t => t.status === 'delivered' && (t.updated_date?.startsWith(todayStr) || t.created_date?.startsWith(todayStr))).length;
  const oobAlerts = clockRecords.filter(r => r.date === todayStr && r.flagged).length;
  const unassignedTasks = allTasks.filter(t => !t.assigned_employee).length;

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white tracking-tight">WorkGrid</h1>
        <p className="text-slate-400 text-xs mt-0.5">
          {format(new Date(), 'EEEE, MMMM d')}
          {!isLoading && ` · ${allTasks.length} task${allTasks.length !== 1 ? 's' : ''}`}
          {unassigned.length > 0 && (
            <span className="text-orange-400"> · {unassigned.length} unassigned</span>
          )}
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6 px-4 pt-4">
        {[
          { label: 'Clocked In', value: clockedInToday, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', path: '/clock-records' },
          { label: 'Active Deliveries', value: activeDeliveries, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', path: '/tasks' },
          { label: 'Delivered Today', value: deliveredToday, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', path: '/tasks' },
          { label: 'OOB Alerts', value: oobAlerts, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', path: '/audit-log' },
          { label: 'Unassigned', value: unassignedTasks, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', path: '/tasks' },
        ].map(stat => (
          <div
            key={stat.label}
            onClick={() => navigate(stat.path)}
            className={`${stat.bg} border rounded-xl p-4 cursor-pointer hover:opacity-80 transition-opacity`}
          >
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-slate-400 text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Task list */}
      <div className="px-4 py-4 pb-24 space-y-3">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <p className="text-red-400 font-medium">Failed to load tasks</p>
            <p className="text-slate-500 text-sm">Check your connection and refresh the page</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : allTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-slate-400 font-medium text-lg">No tasks yet</p>
            <p className="text-slate-600 text-sm mt-1">Tap + to create the first delivery</p>
          </div>
        ) : (
          <>
            {unassigned.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-orange-400 uppercase tracking-wide mb-2">
                  Unassigned ({unassigned.length})
                </p>
                <div className="space-y-2">
                  {unassigned.map(t => (
                    <TaskCard key={t.id} task={t} employees={employees} />
                  ))}
                </div>
              </div>
            )}

            {assigned.length > 0 && (
              <div className={unassigned.length > 0 ? 'mt-4' : ''}>
                {unassigned.length > 0 && (
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                    Assigned ({assigned.length})
                  </p>
                )}
                <div className="space-y-2">
                  {assigned.map(t => (
                    <TaskCard key={t.id} task={t} employees={employees} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating + button */}
      <div
        onClick={() => setCreateOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-lg shadow-blue-500/30 z-50"
      >
        <Plus className="w-6 h-6 text-white" />
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