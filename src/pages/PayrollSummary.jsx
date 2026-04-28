import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, subWeeks } from 'date-fns';
import { DollarSign, Download, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { listEmployeeProfiles } from '@/lib/employeeProfiles';

function exportCSV(rows, filename) {
  const headers = Object.keys(rows[0] || {}).join(',');
  const body = rows.map(r => Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([headers + '\n' + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function calcHours(records, email, from, to) {
  return records
    .filter(r => r.employee_email === email && r.date >= from && r.date <= to && r.total_hours)
    .reduce((sum, r) => sum + (r.total_hours || 0), 0);
}

function calcFlagged(records, email, from, to) {
  return records.filter(r => r.employee_email === email && r.date >= from && r.date <= to && r.flagged).length;
}

export default function PayrollSummary() {
  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = startOfWeek(subWeeks(today, weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(subWeeks(today, weekOffset), { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const weekFrom = format(weekStart, 'yyyy-MM-dd');
  const weekTo = format(weekEnd, 'yyyy-MM-dd');
  const monthFrom = format(monthStart, 'yyyy-MM-dd');
  const monthTo = format(monthEnd, 'yyyy-MM-dd');

  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ['payroll-users'],
    queryFn: async () => {
      const all = await listEmployeeProfiles();
      return all.filter(u => u.status !== 'inactive' && u.role === 'employee');
    },
  });

  const { data: records = [] } = useQuery({
    queryKey: ['payroll-records'],
    queryFn: () => base44.entities.ClockRecord.list(),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (isError) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-destructive font-medium">Failed to load data</p>
      <p className="text-muted-foreground text-sm">Check your connection and refresh the page</p>
    </div>
  );

  const handleExport = () => {
    const rows = users.map(u => ({
      name: u.full_name || u.email,
      role: u.role,
      week_hours: calcHours(records, u.email, weekFrom, weekTo).toFixed(2),
      month_hours: calcHours(records, u.email, monthFrom, monthTo).toFixed(2),
      flagged_punches: calcFlagged(records, u.email, weekFrom, weekTo),
      ...Object.fromEntries(weekDays.map(d => [format(d, 'EEE MM/dd'),
        calcHours(records, u.email, format(d, 'yyyy-MM-dd'), format(d, 'yyyy-MM-dd')).toFixed(2)
      ]))
    }));
    exportCSV(rows, `payroll-${weekFrom}.csv`);
  };

  const totalWeekHours = users.reduce((sum, u) => sum + calcHours(records, u.email, weekFrom, weekTo), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payroll Summary</h1>
            <p className="text-muted-foreground text-sm">
              Week of {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}>← Prev</Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>This Week</Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0}>Next →</Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 ml-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Total Team Hours This Week</p>
        <p className="text-4xl font-bold text-foreground">{totalWeekHours.toFixed(1)}h</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left py-3 px-4 text-muted-foreground font-medium">Employee</th>
              {weekDays.map(d => (
                <th key={d} className="text-center py-3 px-2 text-muted-foreground font-medium min-w-[60px]">
                  {format(d, 'EEE')}<br />
                  <span className="text-xs text-muted-foreground/60">{format(d, 'M/d')}</span>
                </th>
              ))}
              <th className="text-center py-3 px-3 text-muted-foreground font-medium">Week</th>
              <th className="text-center py-3 px-3 text-muted-foreground font-medium">Month</th>
              <th className="text-center py-3 px-3 text-muted-foreground font-medium">Flags</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={weekDays.length + 4} className="text-center py-12 text-muted-foreground">
                  No employees found
                </td>
              </tr>
            ) : (
              users.map(u => {
                const weekHours = calcHours(records, u.email, weekFrom, weekTo);
                const monthHours = calcHours(records, u.email, monthFrom, monthTo);
                const flagCount = calcFlagged(records, u.email, weekFrom, weekTo);
                return (
                  <tr key={u.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-foreground font-medium">{u.full_name || u.email}</p>
                      <p className="text-muted-foreground text-xs capitalize">{u.role}</p>
                    </td>
                    {weekDays.map(d => {
                      const dayStr = format(d, 'yyyy-MM-dd');
                      const hours = calcHours(records, u.email, dayStr, dayStr);
                      return (
                        <td key={d} className="text-center py-3 px-2">
                          <span className={hours > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                            {hours > 0 ? hours.toFixed(1) : '—'}
                          </span>
                        </td>
                      );
                    })}
                    <td className="text-center py-3 px-3">
                      <span className={`font-semibold ${weekHours > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {weekHours.toFixed(1)}h
                      </span>
                    </td>
                    <td className="text-center py-3 px-3">
                      <span className="text-foreground">{monthHours.toFixed(1)}h</span>
                    </td>
                    <td className="text-center py-3 px-3">
                      {flagCount > 0 ? (
                        <Badge className="bg-red-500/20 text-red-600 border-red-300 gap-1">
                          <AlertTriangle className="w-3 h-3" />{flagCount}
                        </Badge>
                      ) : (
                        <span className="text-emerald-600 text-xs">✓</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border">
              <td className="py-3 px-4 text-muted-foreground font-medium">Totals</td>
              {weekDays.map(d => {
                const dayStr = format(d, 'yyyy-MM-dd');
                const total = users.reduce((sum, u) => sum + calcHours(records, u.email, dayStr, dayStr), 0);
                return (
                  <td key={d} className="text-center py-3 px-2 text-foreground font-medium">
                    {total > 0 ? total.toFixed(1) : '—'}
                  </td>
                );
              })}
              <td className="text-center py-3 px-3 text-emerald-600 font-bold">{totalWeekHours.toFixed(1)}h</td>
              <td className="text-center py-3 px-3 text-foreground font-medium">
                {users.reduce((sum, u) => sum + calcHours(records, u.email, monthFrom, monthTo), 0).toFixed(1)}h
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
