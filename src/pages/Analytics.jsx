import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts';
import { format, subDays, parseISO, differenceInMinutes } from 'date-fns';
import { Loader2, CheckCircle2, Clock, Users, TrendingUp } from 'lucide-react';

const COLORS = ['#3b82f6','#f59e0b','#10b981','#6366f1','#f43f5e','#8b5cf6','#06b6d4','#84cc16'];

function StatCard({ icon: Icon, label, value, sub, color = 'text-primary' }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-muted ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Analytics() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['analytics-tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 500),
  });

  // ── 1. Tasks completed per day (last 14 days) ──────────────────────────────
  const completedPerDay = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i);
      return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'MMM d'), count: 0 };
    });
    const map = Object.fromEntries(days.map(d => [d.date, d]));
    tasks.forEach(t => {
      if (t.status !== 'delivered') return;
      const day = (t.updated_date || t.created_date || '').slice(0, 10);
      if (map[day]) map[day].count++;
    });
    return days;
  }, [tasks]);

  // ── 2. Average delivery duration (picked_up → delivered) ──────────────────
  // Approximation: use created_date → updated_date for delivered tasks (days → hours)
  const durationData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i);
      return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'MMM d'), avgMins: null, count: 0, total: 0 };
    });
    const map = Object.fromEntries(days.map(d => [d.date, d]));
    tasks.forEach(t => {
      if (t.status !== 'delivered' || !t.created_date || !t.updated_date) return;
      const day = t.updated_date.slice(0, 10);
      if (!map[day]) return;
      const mins = differenceInMinutes(new Date(t.updated_date), new Date(t.created_date));
      if (mins > 0 && mins < 1440) { // sanity: ignore > 24h outliers for avg
        map[day].total += mins;
        map[day].count++;
      }
    });
    return days.map(d => ({
      ...d,
      avgMins: d.count > 0 ? Math.round(d.total / d.count) : null,
    }));
  }, [tasks]);

  // ── 3. Employee workload distribution ─────────────────────────────────────
  const workloadData = useMemo(() => {
    const emp = {};
    tasks.forEach(t => {
      const name = t.assigned_employee_name || t.assigned_employee || 'Unassigned';
      if (!emp[name]) emp[name] = { name, total: 0, delivered: 0, active: 0 };
      emp[name].total++;
      if (t.status === 'delivered') emp[name].delivered++;
      else emp[name].active++;
    });
    return Object.values(emp)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [tasks]);

  // ── 4. Status distribution pie ────────────────────────────────────────────
  const statusDist = useMemo(() => {
    const counts = { pending: 0, picked_up: 0, en_route: 0, delivered: 0 };
    tasks.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++; });
    return [
      { name: 'Pending',   value: counts.pending,   color: '#6366f1' },
      { name: 'Picked Up', value: counts.picked_up,  color: '#f59e0b' },
      { name: 'En Route',  value: counts.en_route,   color: '#3b82f6' },
      { name: 'Delivered', value: counts.delivered,  color: '#10b981' },
    ].filter(d => d.value > 0);
  }, [tasks]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalDelivered = tasks.filter(t => t.status === 'delivered').length;
  const activeNow = tasks.filter(t => t.status !== 'delivered').length;
  const uniqueEmployees = new Set(tasks.map(t => t.assigned_employee).filter(Boolean)).size;
  const overallAvgMins = useMemo(() => {
    const valid = tasks.filter(t => t.status === 'delivered' && t.created_date && t.updated_date);
    if (!valid.length) return null;
    const total = valid.reduce((s, t) => {
      const m = differenceInMinutes(new Date(t.updated_date), new Date(t.created_date));
      return s + (m > 0 && m < 1440 ? m : 0);
    }, 0);
    return Math.round(total / valid.length);
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Delivery performance & workforce metrics</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CheckCircle2} label="Total Delivered" value={totalDelivered} sub="All time" color="text-emerald-600" />
        <StatCard icon={TrendingUp}   label="Active Tasks"    value={activeNow}       sub="Right now"  color="text-blue-600" />
        <StatCard icon={Users}        label="Active Drivers"  value={uniqueEmployees} sub="Assigned tasks" color="text-indigo-600" />
        <StatCard
          icon={Clock}
          label="Avg Delivery Time"
          value={overallAvgMins != null ? `${overallAvgMins}m` : '—'}
          sub="From created to delivered"
          color="text-amber-600"
        />
      </div>

      {/* Row 1: Completed per day + Status pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold mb-1">Tasks Completed per Day</h2>
          <p className="text-xs text-muted-foreground mb-4">Last 14 days</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={completedPerDay} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: 'hsl(var(--muted))' }}
              />
              <Bar dataKey="count" name="Delivered" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold mb-1">Task Status Distribution</h2>
          <p className="text-xs text-muted-foreground mb-4">All tasks</p>
          {statusDist.length === 0 ? (
            <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusDist} cx="50%" cy="45%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                  {statusDist.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 2: Avg duration line chart */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold mb-1">Average Delivery Duration</h2>
        <p className="text-xs text-muted-foreground mb-4">Minutes from task creation to delivery · last 14 days</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={durationData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit="m" />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              formatter={(v) => v != null ? [`${v} min`, 'Avg Duration'] : ['No data', 'Avg Duration']}
              cursor={{ stroke: 'hsl(var(--border))' }}
            />
            <Line
              type="monotone"
              dataKey="avgMins"
              name="Avg Duration"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3, fill: '#f59e0b' }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Row 3: Employee workload */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold mb-1">Employee Workload Distribution</h2>
        <p className="text-xs text-muted-foreground mb-4">Total tasks assigned · top 8 employees</p>
        {workloadData.length === 0 ? (
          <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">No assigned tasks yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={workloadData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                cursor={{ fill: 'hsl(var(--muted))' }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="delivered" name="Delivered" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="active"    name="Active"    stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}