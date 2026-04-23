import { useEffect, useState } from 'react';
import { X, MapPin, Clock, ClipboardList } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format, differenceInMinutes } from 'date-fns';
import { StatusBadge, PriorityBadge } from '@/components/tasks/TaskBadges';
import { Badge } from '@/components/ui/badge';

export default function EmployeeDrawer({ employee, clockedInRecords, todayTasks, onClose }) {
  const [clockHistory, setClockHistory] = useState([]);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    base44.entities.ClockRecord.filter({ employee_email: employee.email, date: today })
      .then(setClockHistory);
    base44.entities.LocationRecord.filter({ employee_email: employee.email })
      .then(locs => setLocation(locs[0] || null));
  }, [employee.email]);

  const clockRec = clockedInRecords.find(r => r.employee_email === employee.email);
  const isClockedIn = !!clockRec;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[420px] bg-card border-l border-border h-full overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {(employee.full_name || employee.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm">{employee.full_name || employee.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{employee.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={isClockedIn ? 'text-emerald-600 border-emerald-300 bg-emerald-50' : 'text-muted-foreground'}>
              {isClockedIn ? 'On Clock' : 'Off Clock'}
            </Badge>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Clock Status */}
          {clockRec && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">Currently Clocked In</span>
              </div>
              <p className="text-xs text-emerald-600">
                Since {format(new Date(clockRec.clock_in), 'h:mm a')} ·{' '}
                {(() => {
                  const m = differenceInMinutes(new Date(), new Date(clockRec.clock_in));
                  const h = Math.floor(m / 60);
                  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
                })()} on clock
              </p>
            </div>
          )}

          {/* Today's Tasks */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today's Tasks ({todayTasks.length})</h3>
            </div>
            {todayTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tasks assigned today</p>
            ) : (
              <div className="space-y-1.5">
                {todayTasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background">
                    <span className="flex-1 text-xs font-medium truncate">{t.title}</span>
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clock History Today */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today's Clock History</h3>
            </div>
            {clockHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground">No clock records today</p>
            ) : (
              <div className="space-y-1.5">
                {clockHistory.map(r => (
                  <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border text-xs">
                    <span>In: {format(new Date(r.clock_in), 'h:mm a')}</span>
                    <span>{r.clock_out ? `Out: ${format(new Date(r.clock_out), 'h:mm a')}` : <span className="text-red-500">Open</span>}</span>
                    <span className="text-muted-foreground">{r.total_hours != null ? `${r.total_hours}h` : '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Last Location */}
          {location && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last Known Location</h3>
              </div>
              <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground space-y-1">
                <p>Lat: {location.latitude?.toFixed(5)}, Lng: {location.longitude?.toFixed(5)}</p>
                {location.updated_at && (
                  <p>Updated: {format(new Date(location.updated_at), 'h:mm a')}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}