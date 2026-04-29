import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, AlertTriangle, Coffee } from 'lucide-react';
import { format, differenceInSeconds } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

function LiveDuration({ since }) {
  const [text, setText] = useState('');
  useEffect(() => {
    const tick = () => {
      const s = differenceInSeconds(new Date(), new Date(since));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      setText(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [since]);
  return <span>{text}</span>;
}

export default function LiveStatusList({ employees, clockedInRecords, onManualClose }) {
  const { toast } = useToast();
  const clockedInEmails = new Set(clockedInRecords.map(r => r.employee_email));

  const handleManualClose = async (record) => {
    const now = new Date();
    const inTime = new Date(record.punch_in_time);
    const totalHours = Math.round(((now - inTime) / 3600000) * 100) / 100;
    try {
      await base44.entities.ClockRecord.update(record.id, {
        punch_out_time: now.toISOString(),
        total_hours: totalHours,
        manually_closed: true,
      });
      toast({ title: 'Closed clock record for ' + record.employee_name });
      onManualClose?.();
    } catch (err) {
      console.error('[LiveStatusList] Manual close failed:', err);
      toast({ title: 'Failed to close clock record', description: err.message || 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="bg-muted/40 px-4 py-3 border-b border-border flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Live Employee Status</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {clockedInRecords.length} clocked in
        </Badge>
      </div>
      <div className="divide-y divide-border">
        {employees.filter(u => u.role !== 'super_admin').map(emp => {
          const record = clockedInRecords.find(r => r.employee_email === emp.email);
          const isClockedIn = !!record;
          const isOnLunch = isClockedIn && !!record.lunch_start && !record.lunch_end;
          const isOpen = record?.open_flag;

          return (
            <div key={emp.id} className={`flex items-center gap-4 px-4 py-3 ${isOpen ? 'bg-red-50' : ''}`}>
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                {(emp.full_name || emp.email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{emp.full_name || emp.email}</p>
                {isClockedIn ? (
                  isOnLunch ? (
                    <p className="text-xs text-yellow-600 flex items-center gap-1">
                      <Coffee className="w-3 h-3" />
                      On lunch since {format(new Date(record.lunch_start), 'h:mm a')}
                    </p>
                  ) : (
                    <p className="text-xs text-emerald-600">
                      Punched in at {format(new Date(record.punch_in_time), 'h:mm a')} · <LiveDuration since={record.punch_in_time} /> on clock
                    </p>
                  )
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {emp.lastPunchOut
                      ? `Last out: ${format(new Date(emp.lastPunchOut), 'h:mm a')} · ${emp.hoursToday}h today`
                      : 'Not clocked in today'}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isOpen && (
                  <div className="flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> Open
                  </div>
                )}
                {record?.flagged && (
                  <div className="flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> OOB
                  </div>
                )}
                <Badge
                  variant="outline"
                  className={
                    isOnLunch
                      ? 'border-yellow-300 text-yellow-700 bg-yellow-50'
                      : isClockedIn
                      ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                      : 'text-muted-foreground'
                  }
                >
                  {isOnLunch ? 'On Lunch' : isClockedIn ? 'On Clock' : 'Off Clock'}
                </Badge>
                {isClockedIn && (
                  <Button size="sm" variant="outline" className="text-xs h-10 px-3" onClick={() => handleManualClose(record)}>
                    <LogOut className="w-3 h-3 mr-1" /> Close
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {employees.filter(u => u.role !== 'super_admin').length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No employees found</div>
        ) : clockedInRecords.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">No one is clocked in yet</div>
        )}
      </div>
    </div>
  );
}
