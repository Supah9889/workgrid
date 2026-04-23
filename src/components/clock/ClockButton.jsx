import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, LogIn, LogOut, MapPin, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { format, differenceInSeconds } from 'date-fns';
import { logActivity } from '@/lib/activityLogger';

function ElapsedTimer({ since }) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const tick = () => {
      const secs = differenceInSeconds(new Date(), new Date(since));
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [since]);
  return <span className="font-mono text-sm">{elapsed}</span>;
}

export default function ClockButton({ user, onStatusChange }) {
  const { toast } = useToast();
  const [clockRecord, setClockRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [locationWatchId, setLocationWatchId] = useState(null);

  // Load today's open clock record
  useEffect(() => {
    if (!user?.email) return;
    const today = new Date().toISOString().split('T')[0];
    base44.entities.ClockRecord.filter({ employee_email: user.email, date: today })
      .then(records => {
        const open = records.find(r => !r.clock_out);
        setClockRecord(open || null);
        if (open) startLocationTracking(open.id);
        setLoading(false);
      });
  }, [user?.email]);

  const startLocationTracking = (recordId) => {
    if (!navigator.geolocation) return;
    const pushLocation = () => {
      navigator.geolocation.getCurrentPosition(pos => {
        base44.entities.LocationRecord.filter({ employee_email: user.email })
          .then(existing => {
            const data = {
              employee_email: user.email,
              employee_name: user.full_name || user.email,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              updated_at: new Date().toISOString(),
              clock_record_id: recordId,
            };
            if (existing.length > 0) {
              base44.entities.LocationRecord.update(existing[0].id, data);
            } else {
              base44.entities.LocationRecord.create(data);
            }
          });
      });
    };
    pushLocation();
    const id = setInterval(pushLocation, 60000);
    setLocationWatchId(id);
  };

  const stopLocationTracking = () => {
    if (locationWatchId) clearInterval(locationWatchId);
    setLocationWatchId(null);
    // Remove location record
    base44.entities.LocationRecord.filter({ employee_email: user.email })
      .then(existing => {
        existing.forEach(r => base44.entities.LocationRecord.delete(r.id));
      });
  };

  const handleClockIn = async () => {
    setActionLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const record = await base44.entities.ClockRecord.create({
      employee_email: user.email,
      employee_name: user.full_name || user.email,
      clock_in: new Date().toISOString(),
      date: today,
    });
    setClockRecord(record);
    startLocationTracking(record.id);
    onStatusChange?.('clocked_in');
    await logActivity('employee_clocked_in', `${user.full_name || user.email} clocked in`, user.email, user.full_name, { entity_id: record.id, entity_type: 'ClockRecord' });
    toast({ title: 'Clocked in successfully' });
    setActionLoading(false);
  };

  const handleClockOut = async () => {
    if (!clockRecord) return;
    setActionLoading(true);
    const now = new Date();
    const inTime = new Date(clockRecord.clock_in);
    const totalHours = (now - inTime) / 3600000;
    await base44.entities.ClockRecord.update(clockRecord.id, {
      clock_out: now.toISOString(),
      total_hours: Math.round(totalHours * 100) / 100,
    });
    stopLocationTracking();
    setClockRecord(null);
    onStatusChange?.('clocked_out');
    await logActivity('employee_clocked_out', `${user.full_name || user.email} clocked out (${Math.round(totalHours * 100) / 100}h)`, user.email, user.full_name, { entity_id: clockRecord.id, entity_type: 'ClockRecord' });
    toast({ title: 'Clocked out. Have a great day!' });
    setActionLoading(false);
  };

  if (loading) return null;

  const isClockedIn = !!clockRecord;

  return (
    <div className={`rounded-xl border-2 p-4 mb-6 flex items-center justify-between gap-4 ${isClockedIn ? 'border-emerald-300 bg-emerald-50' : 'border-border bg-card'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isClockedIn ? 'bg-emerald-100' : 'bg-muted'}`}>
          <Clock className={`w-5 h-5 ${isClockedIn ? 'text-emerald-600' : 'text-muted-foreground'}`} />
        </div>
        <div>
          {isClockedIn ? (
            <>
              <p className="text-sm font-semibold text-emerald-700">On the Clock</p>
              <div className="flex items-center gap-2 text-xs text-emerald-600">
                <ElapsedTimer since={clockRecord.clock_in} />
                <span>·</span>
                <span>Since {format(new Date(clockRecord.clock_in), 'h:mm a')}</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">Not Clocked In</p>
              <p className="text-xs text-muted-foreground">Clock in to start your shift</p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isClockedIn && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
            <MapPin className="w-3 h-3 animate-pulse" />
            <span>Location active</span>
          </div>
        )}
        <Button
          onClick={isClockedIn ? handleClockOut : handleClockIn}
          disabled={actionLoading}
          variant={isClockedIn ? 'outline' : 'default'}
          className={isClockedIn ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' : ''}
        >
          {actionLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isClockedIn ? (
            <><LogOut className="w-4 h-4 mr-1" /> Clock Out</>
          ) : (
            <><LogIn className="w-4 h-4 mr-1" /> Clock In</>
          )}
        </Button>
      </div>
    </div>
  );
}