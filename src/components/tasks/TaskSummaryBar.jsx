import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function TaskSummaryBar({ tasks, employees }) {
  const counts = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    complete: tasks.filter(t => t.status === 'complete').length,
    unassigned: tasks.filter(t => !t.assigned_employee).length,
  }), [tasks]);

  const perEmployee = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      if (!t.assigned_employee) return;
      if (!map[t.assigned_employee]) {
        map[t.assigned_employee] = { name: t.assigned_employee_name || t.assigned_employee, pending: 0, in_progress: 0, complete: 0 };
      }
      map[t.assigned_employee][t.status] = (map[t.assigned_employee][t.status] || 0) + 1;
    });
    return Object.values(map);
  }, [tasks]);

  return (
    <div className="space-y-3 mb-6">
      {/* Top summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Today', value: counts.total, color: 'text-foreground' },
          { label: 'Pending', value: counts.pending, color: 'text-slate-500' },
          { label: 'In Progress', value: counts.in_progress, color: 'text-blue-600' },
          { label: 'Complete', value: counts.complete, color: 'text-emerald-600' },
          { label: 'Unassigned', value: counts.unassigned, color: 'text-orange-500' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-employee mini summary */}
      {perEmployee.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {perEmployee.map(emp => (
            <div key={emp.name} className="flex items-center gap-2 bg-muted/50 border rounded-lg px-3 py-2 text-xs">
              <span className="font-medium text-sm">{emp.name}</span>
              <span className="text-slate-400">{emp.pending}P</span>
              <span className="text-blue-500">{emp.in_progress}IP</span>
              <span className="text-emerald-500">{emp.complete}C</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}