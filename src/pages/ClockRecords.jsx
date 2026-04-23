import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw } from 'lucide-react';
import LiveStatusList from '@/components/clock/LiveStatusList';
import DailyLog from '@/components/clock/DailyLog';

export default function ClockRecords() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: allRecords = [], refetch, isLoading, isError } = useQuery({
    queryKey: ['clock-records', selectedDate],
    queryFn: () => base44.entities.ClockRecord.filter({ date: selectedDate }),
    refetchInterval: 30000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => base44.entities.User.list(),
  });

  useEffect(() => {
    const unsub = base44.entities.ClockRecord.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['clock-records', selectedDate] });
    });
    return unsub;
  }, [selectedDate, queryClient]);

  // Open records = punched in, not yet punched out
  const clockedInRecords = allRecords.filter(r => !r.punch_out_time && !r.manually_closed);
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const enrichedEmployees = employees
    .filter(u => u.role !== 'super_admin' && u.status !== 'inactive')
    .map(emp => {
      const empRecords = allRecords.filter(r => r.employee_email === emp.email);
      const closed = empRecords.filter(r => r.punch_out_time);
      const lastOut = closed.sort((a, b) => new Date(b.punch_out_time) - new Date(a.punch_out_time))[0];
      const hoursToday = closed.reduce((sum, r) => sum + (r.total_hours || 0), 0);
      return {
        ...emp,
        lastPunchOut: lastOut?.punch_out_time,
        hoursToday: Math.round(hoursToday * 100) / 100,
      };
    });

  if (isError) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-destructive font-medium">Failed to load data</p>
      <p className="text-muted-foreground text-sm">Check your connection and refresh the page</p>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Time & Attendance</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Clock records and live employee status</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border-0 p-0 h-auto w-36 text-sm focus-visible:ring-0"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isToday && (
        <LiveStatusList
          employees={enrichedEmployees}
          clockedInRecords={clockedInRecords}
          onManualClose={() => queryClient.invalidateQueries({ queryKey: ['clock-records', selectedDate] })}
        />
      )}

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Daily Log — {format(new Date(selectedDate + 'T12:00:00'), 'MMMM d, yyyy')}
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <DailyLog records={allRecords} />
        )}
      </div>
    </div>
  );
}
