import { useState } from 'react';
import { differenceInMinutes, format } from 'date-fns';
import { MapPin } from 'lucide-react';
import EmployeeDrawer from '@/components/dashboard/EmployeeDrawer';

function LiveDuration({ since }) {
  const mins = differenceInMinutes(new Date(), new Date(since));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return <span>{h > 0 ? `${h}h ${m}m` : `${m}m`}</span>;
}

export default function EmployeeStatusPanel({ employees, clockedInRecords, todayTasks }) {
  const [selected, setSelected] = useState(null);

  const clockMap = {};
  clockedInRecords.forEach(r => { clockMap[r.employee_email] = r; });

  const tasksByEmployee = {};
  todayTasks.forEach(t => {
    if (t.assigned_employee) {
      if (!tasksByEmployee[t.assigned_employee]) tasksByEmployee[t.assigned_employee] = [];
      tasksByEmployee[t.assigned_employee].push(t);
    }
  });

  const sorted = [...employees].sort((a, b) => {
    const aIn = !!clockMap[a.email];
    const bIn = !!clockMap[b.email];
    if (aIn !== bIn) return aIn ? -1 : 1;
    return (a.full_name || '').localeCompare(b.full_name || '');
  });

  return (
    <>
      <div className="flex flex-col h-full">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Employee Status</h2>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {sorted.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No employees</div>
          ) : (
            sorted.map(emp => {
              const clockRec = clockMap[emp.email];
              const isClockedIn = !!clockRec;
              const empTasks = tasksByEmployee[emp.email] || [];

              return (
                <button
                  key={emp.id}
                  onClick={() => setSelected(emp)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {(emp.full_name || emp.email || '?')[0].toUpperCase()}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${isClockedIn ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{emp.full_name || emp.email}</p>
                    <p className={`text-xs truncate ${isClockedIn ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                      {isClockedIn
                        ? <><LiveDuration since={clockRec.clock_in} /> on clock</>
                        : 'Off clock'
                      }
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground flex-shrink-0">
                    {empTasks.length} task{empTasks.length !== 1 ? 's' : ''}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {selected && (
        <EmployeeDrawer
          employee={selected}
          clockedInRecords={clockedInRecords}
          todayTasks={tasksByEmployee[selected.email] || []}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}