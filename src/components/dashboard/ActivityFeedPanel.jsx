import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDistanceToNow, startOfDay } from 'date-fns';
import { Activity, CheckCircle2, ArrowRightLeft, Clock, MapPin, Shield, Plus, RefreshCw } from 'lucide-react';

const EVENT_CONFIG = {
  task_created: { icon: Plus, color: 'text-blue-500', bg: 'bg-blue-50' },
  task_updated: { icon: RefreshCw, color: 'text-slate-500', bg: 'bg-slate-100' },
  task_reassigned: { icon: ArrowRightLeft, color: 'text-orange-500', bg: 'bg-orange-50' },
  task_completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  employee_clocked_in: { icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  employee_clocked_out: { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-100' },
  location_updated: { icon: MapPin, color: 'text-blue-400', bg: 'bg-blue-50' },
  permission_changed: { icon: Shield, color: 'text-purple-500', bg: 'bg-purple-50' },
};

export default function ActivityFeedPanel() {
  const [events, setEvents] = useState([]);

  const fetchEvents = async () => {
    const todayStart = startOfDay(new Date()).toISOString();
    const all = await base44.entities.ActivityFeed.list('-created_date', 50);
    setEvents(all.filter(e => e.created_date >= todayStart));
  };

  useEffect(() => {
    fetchEvents();
    const unsub = base44.entities.ActivityFeed.subscribe(() => fetchEvents());
    return unsub;
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-3.5 h-3.5 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Activity Feed</h2>
        <span className="ml-auto flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-muted-foreground">Live</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {events.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No activity yet today</div>
        ) : (
          events.map(e => {
            const cfg = EVENT_CONFIG[e.event_type] || { icon: Activity, color: 'text-muted-foreground', bg: 'bg-muted' };
            const Icon = cfg.icon;
            return (
              <div key={e.id} className="flex items-start gap-2.5 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                  <Icon className={`w-3 h-3 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-relaxed">{e.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {e.actor_name && <span className="font-medium">{e.actor_name} · </span>}
                    {e.created_date ? formatDistanceToNow(new Date(e.created_date), { addSuffix: true }) : ''}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}