import { useState, useEffect, useRef } from 'react';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Loader2, MapPin, Clock, Package, Building2, ChevronDown, ChevronUp, ListTodo, Navigation, WifiOff, RefreshCw } from 'lucide-react';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { PriorityBadge, StatusBadge } from '@/components/tasks/TaskBadges';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import ClockButton from '@/components/clock/ClockButton';

// GPS tracking hook — pushes location to task every 30s while en_route
function useGpsTracking(tasks) {
  const intervalRef = useRef(null);
  const watchedTaskIdsRef = useRef(new Set());

  const pushLocation = (taskId) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      base44.entities.Task.update(taskId, {
        employee_lat: pos.coords.latitude,
        employee_lng: pos.coords.longitude,
        employee_location_updated_at: new Date().toISOString(),
      });
    }, null, { timeout: 8000, maximumAge: 15000 });
  };

  useEffect(() => {
    const enRouteTasks = tasks.filter(t => t.status === 'en_route');

    // Initial push for any newly en_route tasks
    enRouteTasks.forEach(t => {
      if (!watchedTaskIdsRef.current.has(t.id)) {
        watchedTaskIdsRef.current.add(t.id);
        pushLocation(t.id);
      }
    });

    // Clear tasks that are no longer en_route
    watchedTaskIdsRef.current.forEach(id => {
      if (!enRouteTasks.find(t => t.id === id)) {
        watchedTaskIdsRef.current.delete(id);
        // Clear GPS fields when done
        base44.entities.Task.update(id, {
          employee_lat: null,
          employee_lng: null,
          employee_location_updated_at: null,
        });
      }
    });

    // Interval: push every 30s for all en_route tasks
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (enRouteTasks.length > 0) {
      intervalRef.current = setInterval(() => {
        enRouteTasks.forEach(t => pushLocation(t.id));
      }, 30000);
    }

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [tasks.map(t => t.id + t.status).join(',')]);
}

const STATUS_NEXT = {
  pending:   { label: 'Mark as Picked Up', next: 'picked_up' },
  picked_up: { label: 'Mark En Route',     next: 'en_route'  },
  en_route:  { label: 'Mark Delivered',    next: 'delivered'  },
};

const STATUS_SECTION = {
  pending:   { label: 'Pending',    color: 'text-slate-400'  },
  picked_up: { label: 'Picked Up', color: 'text-yellow-400' },
  en_route:  { label: 'En Route',  color: 'text-blue-400'   },
  delivered: { label: 'Delivered', color: 'text-emerald-400' },
};

function DeliveryCard({ task, onUpdated, updateTaskStatus }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const advance = STATUS_NEXT[task.status];

  const handleAdvance = async (e) => {
    e.stopPropagation();
    if (!advance || saving) return;
    setSaving(true);
    try {
      await updateTaskStatus(task.id, { status: advance.next });
      toast({ title: `Status updated to ${STATUS_SECTION[advance.next]?.label}` });
      onUpdated();
    } catch (err) {
      console.error('[MyTasks] Status advance failed:', err);
      toast({ title: 'Failed to update status', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={() => setExpanded(v => !v)}
      className="rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 cursor-pointer transition-all select-none"
    >
      {/* Condensed header */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
            {task.status === 'en_route' && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
                <Navigation className="w-2.5 h-2.5" /> GPS Live
              </span>
            )}
          </div>
          <p className="font-semibold text-white leading-snug">{task.title}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
            {task.delivery_address && (
              <span className="flex items-center gap-1 truncate col-span-2">
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
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-0.5">Pick Up From</p>
              <p className="text-sm text-slate-200">{task.store_name}</p>
            </div>
          )}
          {task.delivery_address && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-0.5">Deliver To</p>
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
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-0.5">Notes from Admin</p>
              <p className="text-sm text-slate-300 bg-slate-900/60 rounded-lg p-2.5">{task.notes}</p>
            </div>
          )}

          {(() => {
            const steps = [
              { key: 'pending', label: 'Assigned' },
              { key: 'picked_up', label: 'Picked Up' },
              { key: 'en_route', label: 'En Route' },
              { key: 'delivered', label: 'Delivered' },
            ];
            const currentIndex = steps.findIndex(s => s.key === task.status);
            const nextStep = steps[currentIndex + 1];
            return (
              <div className="mt-2 mb-2">
                <div className="flex items-center gap-1 mb-2">
                  {steps.map((step, i) => (
                    <div key={step.key} className="flex flex-col items-center flex-1">
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
                  ))}
                </div>
                {nextStep && (
                  <button
                    onClick={async () => {
                      await updateTaskStatus(task.id, { status: nextStep.key });
                      onUpdated();
                    }}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                  >
                    Mark as {nextStep.label}
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

const STATUS_ORDER = ['pending', 'picked_up', 'en_route', 'delivered'];

export default function MyTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['my-tasks', user?.email] });

  const { updateTaskStatus, pendingCount, isSyncing, isOnline } = useOfflineQueue(refresh);

  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: ['my-tasks', user?.email],
    queryFn: () => base44.entities.Task.filter({ assigned_employee: user.email }),
    enabled: !!user?.email,
  });

  // Start GPS tracking whenever a task goes en_route
  useGpsTracking(tasks);

  useEffect(() => {
    if (!user?.email) return;
    const unsub = base44.entities.Task.subscribe(() =>
      queryClient.invalidateQueries({ queryKey: ['my-tasks', user.email] })
    );
    return unsub;
  }, [user?.email, queryClient]);

  const grouped = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s);
    return acc;
  }, {});

  const active = tasks.filter(t => t.status !== 'delivered');
  const delivered = tasks.filter(t => t.status === 'delivered');

  return (
    <PullToRefresh onRefresh={refresh}>
    <div className="min-h-screen bg-[#0f172a] animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white tracking-tight">My Deliveries</h1>
        <p className="text-slate-400 text-xs mt-0.5">
          {format(new Date(), 'EEEE, MMMM d')}
          {!isLoading && ` · ${tasks.length} task${tasks.length !== 1 ? 's' : ''} assigned`}
        </p>
      </div>

      {user && <div className="px-4 pt-4"><ClockButton user={user} /></div>}

      {/* Offline / syncing banner */}
      {!isOnline && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-3 py-2.5 text-yellow-400 text-xs font-medium">
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          <span>You're offline. Status changes are saved locally and will sync when you reconnect.</span>
          {pendingCount > 0 && <span className="ml-auto bg-yellow-500/20 px-1.5 py-0.5 rounded-full">{pendingCount} pending</span>}
        </div>
      )}
      {isOnline && isSyncing && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2.5 text-blue-400 text-xs font-medium">
          <RefreshCw className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          Syncing {pendingCount} offline update{pendingCount !== 1 ? 's' : ''}…
        </div>
      )}
      {isOnline && !isSyncing && pendingCount === 0 && false && null /* hidden when all clear */}

      <div className="px-4 py-4 pb-28 space-y-3">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <p className="text-red-400 font-medium">Failed to load tasks</p>
            <p className="text-slate-500 text-sm">Check your connection and refresh the page</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
              <ListTodo className="w-7 h-7 text-slate-500" />
            </div>
            <p className="text-slate-300 font-semibold text-lg">No deliveries yet</p>
            <p className="text-slate-500 text-sm mt-1">Your manager will assign tasks here.</p>
          </div>
        ) : (
          <>
            {STATUS_ORDER.filter(s => s !== 'delivered').map(status => (
              grouped[status].length > 0 && (
                <div key={status}>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${STATUS_SECTION[status].color}`}>
                    {STATUS_SECTION[status].label} ({grouped[status].length})
                  </p>
                  <div className="space-y-2">
                    {grouped[status].map(t => (
                      <DeliveryCard key={t.id} task={t} onUpdated={refresh} updateTaskStatus={updateTaskStatus} />
                    ))}
                  </div>
                </div>
              )
            ))}

            {delivered.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2">
                  Delivered ({delivered.length})
                </p>
                <div className="space-y-2">
                  {delivered.map(t => (
                    <DeliveryCard key={t.id} task={t} onUpdated={refresh} updateTaskStatus={updateTaskStatus} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}