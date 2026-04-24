import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { Lock, Shield, AlertTriangle, Clock, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PinModal from '@/components/clock/PinModal';

function exportCSV(rows, filename) {
  const headers = Object.keys(rows[0] || {}).join(',');
  const body = rows.map(r => Object.values(r).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([headers + '\n' + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function SecurityDashboard() {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: clockRecords = [], isError } = useQuery({
    queryKey: ['security-clock', dateFrom, dateTo],
    queryFn: () => base44.entities.ClockRecord.list(),
    enabled: unlocked,
  });

  const { data: activityFeed = [] } = useQuery({
    queryKey: ['security-activity'],
    queryFn: () => base44.entities.ActivityFeed.list('-created_date'),
    enabled: unlocked,
  });

  const flagged = clockRecords.filter(r => r.flagged);
  const filtered = flagged.filter(r => r.date >= dateFrom && r.date <= dateTo);

  const [expectedHash, setExpectedHash] = useState(user?.pin_hash);

  useEffect(() => {
    if (!unlocked && user?.email) {
      base44.entities.User.filter({ email: user.email }).then(users => {
        if (users?.[0]) setExpectedHash(users[0].pin_hash);
      });
    }
  }, [unlocked, user?.email]);

  const handlePinSuccess = () => {
    setUnlocked(true);
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-3 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Security Dashboard</h1>
          <p className="text-slate-400 text-sm">Enter your PIN to continue</p>
        </div>
        <PinModal
          title="Security PIN Required"
          expectedHash={expectedHash}
          onSuccess={handlePinSuccess}
          onCancel={() => window.history.back()}
        />
      </div>
    );
  }

  if (isError) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-destructive font-medium">Failed to load data</p>
      <p className="text-muted-foreground text-sm">Check your connection and refresh the page</p>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-red-400" />
          <h1 className="text-2xl font-bold text-white">Security Dashboard</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportCSV(filtered.map(r => ({
            employee: r.employee_name,
            date: r.date,
            punch_in: r.punch_in_time,
            punch_out: r.punch_out_time,
            flagged: r.flagged,
            in_bounds_in: r.punch_in_in_bounds,
            in_bounds_out: r.punch_out_in_bounds,
          })), 'security-report.csv')}
          className="gap-2"
        >
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <div className="flex gap-3 mb-6 items-center">
        <label className="text-slate-400 text-sm">From</label>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-1.5 text-sm" />
        <label className="text-slate-400 text-sm">To</label>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-1.5 text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-slate-400 text-xs uppercase tracking-wide">Flagged Punches</span>
          </div>
          <p className="text-3xl font-bold text-white">{filtered.length}</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-slate-400 text-xs uppercase tracking-wide">Activity Events</span>
          </div>
          <p className="text-3xl font-bold text-white">{activityFeed.length}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-white mb-3">Flagged Clock Records</h2>
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No flagged records in this date range</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{r.employee_name}</p>
                  <p className="text-slate-400 text-sm">{r.date}</p>
                </div>
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Out of Bounds</Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
                <span>In: {r.punch_in_time ? format(new Date(r.punch_in_time), 'h:mm a') : '--'} {r.punch_in_in_bounds === false ? '⚠️' : '✅'}</span>
                <span>Out: {r.punch_out_time ? format(new Date(r.punch_out_time), 'h:mm a') : '--'} {r.punch_out_in_bounds === false ? '⚠️' : '✅'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-lg font-semibold text-white mt-8 mb-3">Recent Activity</h2>
      <div className="space-y-2">
        {activityFeed.slice(0, 20).map(a => (
          <div key={a.id} className="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <p className="text-slate-300 text-sm">{a.description || a.action}</p>
            <p className="text-slate-500 text-xs">{a.created_date ? format(new Date(a.created_date), 'MMM d h:mm a') : ''}</p>
          </div>
        ))}
      </div>
    </div>
  );
}