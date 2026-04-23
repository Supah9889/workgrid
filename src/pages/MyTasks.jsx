import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Loader2, MapPin, Clock, Package, Building2, ChevronDown, ChevronUp, ListTodo } from 'lucide-react';
import { PriorityBadge, StatusBadge } from '@/components/tasks/TaskBadges';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import ClockButton from '@/components/clock/ClockButton';

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

function DeliveryCard({ task, onUpdated }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const advance = STATUS_NEXT[task.status];

  const handleAdvance = async (e) => {
    e.stopPropagation();
    if (!advance || saving) return;
    setSaving(true);
    await base44.entities.Task.update(task.id, { status: advance.next });
    toast({ title: `Status updated to ${STATUS_SECTION[advance.next]?.label}` });
    onUpdated();
    setSaving(false);
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
                      await base44.entities.Task.update(task.id, { status: nextStep.key });
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

  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: ['my-tasks', user?.email],
    queryFn: () => base44.entities.Task.filter({ assigned_to: user.email }),
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (!user?.email) return;
    const unsub = base44.entities.Task.subscribe(() =>
      queryClient.invalidateQueries({ queryKey: ['my-tasks', user.email] })
    );
    return unsub;
  }, [user?.email, queryClient]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['my-tasks', user?.email] });

  const grouped = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s);
    return acc;
  }, {});

  const active = tasks.filter(t => t.status !== 'delivered');
  const delivered = tasks.filter(t => t.status === 'delivered');

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white tracking-tight">My Deliveries</h1>
        <p className="text-slate-400 text-xs mt-0.5">
          {format(new Date(), 'EEEE, MMMM d')}
          {!isLoading && ` · ${tasks.length} task${tasks.length !== 1 ? 's' : ''} assigned`}
        </p>
      </div>

      {user && <div className="px-4 pt-4"><ClockButton user={user} /></div>}

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
                      <DeliveryCard key={t.id} task={t} onUpdated={refresh} />
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
                    <DeliveryCard key={t.id} task={t} onUpdated={refresh} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}