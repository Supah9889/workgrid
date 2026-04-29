import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { differenceInSeconds } from 'date-fns';
import { logActivity } from '@/lib/activityLogger';
import { notifyClockIn, notifyClockOut, notifyOutOfBoundsPunch } from '@/lib/notificationService';
import { isOpenClockRecord } from '@/lib/clockRecords';
import { getEmployeeProfileByEmail, listEmployeeProfiles, normalizeEmail } from '@/lib/employeeProfiles';
import PinModal from '@/components/clock/PinModal';
import { Loader2, Coffee, LogIn, LogOut } from 'lucide-react';

function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function capturePosition() {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    const timer = setTimeout(() => resolve(null), 5000);
    navigator.geolocation.getCurrentPosition(
      pos => { clearTimeout(timer); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => { clearTimeout(timer); resolve(null); },
      { timeout: 5000, maximumAge: 60000 }
    );
  });
}

function ElapsedTimer({ since }) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const tick = () => {
      const s = differenceInSeconds(new Date(), new Date(since));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [since]);
  return <span className="font-mono text-xs">{elapsed}</span>;
}

export default function ClockButton({ user }) {
  const { toast } = useToast();
  const [clockRecord, setClockRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [expectedHash, setExpectedHash] = useState(null);
  const [appSettings, setAppSettings] = useState(null);
  const [profile, setProfile] = useState(null);
  const locationIntervalRef = useRef(null);

  useEffect(() => {
    if (!user?.email) return;
    loadProfileAndCurrentRecord();
    loadAppSettings();
    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, [user?.email]);

  const loadProfileAndCurrentRecord = async () => {
    try {
      const fresh = await getEmployeeProfileByEmail(user.email);
      setProfile(fresh || user);
    } catch {
      setProfile(user);
    }
    await loadCurrentRecord();
  };

  const requireClockReadyProfile = async (action) => {
    const normalizedEmail = normalizeEmail(user?.email);
    let fresh = await getEmployeeProfileByEmail(normalizedEmail, { allowLegacyFallback: false });
    if (!fresh && user?._profileSource === 'User') {
      console.warn('[ClockButton] Using legacy User profile fallback for clock action.', {
        email: normalizedEmail,
        action,
      });
      fresh = user;
    }

    if (!fresh) {
      console.error('[ClockButton] profile missing', { email: normalizedEmail, action });
      throw new Error('Your employee profile is missing. Finish setup or contact an administrator.');
    }
    if (fresh.has_onboarded !== true) {
      console.error('[ClockButton] profile lookup failed', {
        email: normalizedEmail,
        action,
        reason: 'not_onboarded',
      });
      throw new Error('Finish setup before using the time clock.');
    }
    if (!fresh.pin_hash) {
      console.error('[ClockButton] PIN missing', { email: normalizedEmail, action });
      throw new Error('Set your 4-digit PIN before using the time clock.');
    }
    if (fresh.status === 'inactive') {
      throw new Error('Your employee profile is inactive. Contact an administrator.');
    }
    return fresh;
  };

  const openPinModal = async (action) => {
    try {
      const fresh = await requireClockReadyProfile(action);
      setProfile(fresh);
      setExpectedHash(fresh.pin_hash);
      setPendingAction(action);
    } catch (err) {
      toast({
        title: 'Could not verify setup',
        description: err.message || 'Something went wrong - please try again.',
        variant: 'destructive',
      });
    }
  };

  const loadCurrentRecord = async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const records = await base44.entities.ClockRecord.filter({ employee_email: normalizeEmail(user.email), date: today });
      const open = records.find(isOpenClockRecord);
      setClockRecord(open || null);
      if (open) startLocationTracking(open.id);
    } catch (error) {
      console.error('[ClockButton] ClockRecord lookup failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOwnedOpenRecord = async () => {
    const today = new Date().toISOString().split('T')[0];
    const records = await base44.entities.ClockRecord.filter({ employee_email: normalizeEmail(user.email), date: today });
    const open = records.find(isOpenClockRecord);
    if (!open) {
      throw new Error('No active clock record found. Refresh and try again.');
    }
    setClockRecord(open);
    return open;
  };

  const loadAppSettings = async () => {
    try {
      const settings = await base44.entities.AppSettings.list();
      if (settings.length > 0) setAppSettings(settings[0]);
    } catch {
      /* AppSettings may not be available in every environment. */
    }
  };

  const startLocationTracking = (recordId) => {
    if (!navigator.geolocation) return;
    if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);

    const push = () => {
      navigator.geolocation.getCurrentPosition(pos => {
        base44.entities.LocationRecord.filter({ employee_email: normalizeEmail(user.email) }).then(async existing => {
          const data = {
            employee_email: normalizeEmail(user.email),
            employee_name: profile?.full_name || user.full_name || user.email,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            updated_at: new Date().toISOString(),
            clock_record_id: recordId,
          };
          if (existing.length > 0) await base44.entities.LocationRecord.update(existing[0].id, data);
          else await base44.entities.LocationRecord.create(data);
        }).catch(err => {
          console.warn('[ClockButton] Live location update failed:', err);
        });
      });
    };
    push();
    locationIntervalRef.current = setInterval(push, 60000);
  };

  const stopLocationTracking = () => {
    if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    locationIntervalRef.current = null;
    base44.entities.LocationRecord.filter({ employee_email: normalizeEmail(user.email) })
      .then(recs => Promise.all(recs.map(r => base44.entities.LocationRecord.delete(r.id))))
      .catch(err => console.warn('[ClockButton] Live location cleanup failed:', err));
  };

  const checkGeofence = (lat, lng) => {
    if (!appSettings?.geofence_enabled || !appSettings.geofence_lat || !appSettings.geofence_lng || lat == null) {
      return { in_bounds: true, distance: null };
    }
    const dist = distanceMiles(lat, lng, appSettings.geofence_lat, appSettings.geofence_lng);
    const radius = appSettings.geofence_radius || 0.5;
    return { in_bounds: dist <= radius, distance: Math.round(dist * 100) / 100 };
  };

  const notifyAdmins = async (punchType, distance) => {
    try {
      const allProfiles = await listEmployeeProfiles();
      const targets = allProfiles.filter(u => u.role === 'super_admin' || u.role === 'operator' || u.role === 'owner');
      for (const admin of targets) {
        await base44.entities.Notification.create({
          recipient_email: admin.email,
          title: 'Out-of-bounds punch detected',
          message: `${profile?.full_name || user.full_name || user.email} punched ${punchType} from ${distance} miles from geofence center.`,
          type: 'warning',
        });
      }
    } catch {
      /* Non-critical. */
    }
  };

  const executePunchIn = async () => {
    const fresh = await requireClockReadyProfile('punch_in');
    setProfile(fresh);
    const today = new Date().toISOString().split('T')[0];
    const existing = await base44.entities.ClockRecord.filter({ employee_email: fresh.email, date: today });
    const open = existing.find(isOpenClockRecord);
    if (open) {
      setClockRecord(open);
      startLocationTracking(open.id);
      toast({ title: 'Already punched in', description: 'Your open clock record is active.' });
      return;
    }

    let pos = null;
    try { pos = await capturePosition(); } catch(e) { console.warn('GPS failed', e); }
    const geo = checkGeofence(pos?.lat, pos?.lng);
    try {
      const record = await base44.entities.ClockRecord.create({
        employee_email: fresh.email,
        employee_name: fresh.full_name || fresh.email,
        date: today,
        punch_in_time: new Date().toISOString(),
        punch_in_lat: pos?.lat ?? null,
        punch_in_lng: pos?.lng ?? null,
        punch_in_in_bounds: geo.in_bounds,
        flagged: !geo.in_bounds,
      });
      setClockRecord(record);
      startLocationTracking(record.id);
      await notifyClockIn(fresh);
      if (!geo.in_bounds) {
        await notifyOutOfBoundsPunch(fresh, 'in', geo.distance);
        await notifyAdmins('in', geo.distance);
      }
      await logActivity(
        'employee_clocked_in',
        `${fresh.full_name || fresh.email} punched in${!geo.in_bounds ? ' outside geofence' : ''}`,
        fresh.email, fresh.full_name, { entity_id: record.id, entity_type: 'ClockRecord' }
      );
      toast({ title: 'Clocked in successfully', description: geo.in_bounds ? undefined : 'You are outside the geofence area.' });
    } catch(e) {
      console.error('ClockRecord.create failed:', e);
      throw e;
    }
  };

  const executeLunchStart = async () => {
    const activeRecord = await getOwnedOpenRecord();
    if (activeRecord.lunch_start && !activeRecord.lunch_end) {
      throw new Error('Lunch is already started.');
    }
    if (activeRecord.lunch_start && activeRecord.lunch_end) {
      throw new Error('Lunch has already been recorded for this shift.');
    }
    const pos = await capturePosition();
    const now = new Date().toISOString();
    try {
      const updated = await base44.entities.ClockRecord.update(activeRecord.id, {
        lunch_start: now,
        lunch_start_lat: pos?.lat ?? null,
        lunch_start_lng: pos?.lng ?? null,
      });
      setClockRecord(r => ({ ...r, ...updated }));
      toast({ title: 'Lunch started' });
    } catch (error) {
      console.error('ClockRecord.update failed:', error);
      throw error;
    }
  };

  const executeLunchEnd = async () => {
    const activeRecord = await getOwnedOpenRecord();
    if (!activeRecord.lunch_start) {
      throw new Error('Start lunch before ending lunch.');
    }
    if (activeRecord.lunch_end) {
      throw new Error('Lunch has already ended.');
    }
    const now = new Date();
    const pos = await capturePosition();
    const lunchMins = Math.max(0, Math.round((now - new Date(activeRecord.lunch_start)) / 60000));
    try {
      const updated = await base44.entities.ClockRecord.update(activeRecord.id, {
        lunch_end: now.toISOString(),
        lunch_end_lat: pos?.lat ?? null,
        lunch_end_lng: pos?.lng ?? null,
        total_lunch_minutes: lunchMins,
      });
      setClockRecord(r => ({ ...r, ...updated }));
      toast({ title: 'Lunch ended', description: `${lunchMins} min recorded` });
    } catch (error) {
      console.error('ClockRecord.update failed:', error);
      throw error;
    }
  };

  const executePunchOut = async () => {
    const activeRecord = await getOwnedOpenRecord();
    if (activeRecord.lunch_start && !activeRecord.lunch_end) {
      throw new Error('End lunch before punching out.');
    }
    const now = new Date();
    const pos = await capturePosition();
    const geo = checkGeofence(pos?.lat, pos?.lng);

    const inTime = new Date(activeRecord.punch_in_time);
    if (!activeRecord.punch_in_time || isNaN(inTime)) throw new Error('Clock-in time is missing or corrupted.');

    const totalSecs = (now - inTime) / 1000;
    const lunchSecs = (activeRecord.total_lunch_minutes || 0) * 60;
    const totalHours = Math.max(0, Math.round(((totalSecs - lunchSecs) / 3600) * 100) / 100);
    const wasFlagged = activeRecord.flagged || !geo.in_bounds;

    try {
      await base44.entities.ClockRecord.update(activeRecord.id, {
        punch_out_time: now.toISOString(),
        punch_out_lat: pos?.lat ?? null,
        punch_out_lng: pos?.lng ?? null,
        punch_out_in_bounds: geo.in_bounds,
        total_hours: totalHours,
        flagged: wasFlagged,
      });
    } catch (error) {
      console.error('ClockRecord.update failed:', error);
      throw error;
    }

    stopLocationTracking();
    setClockRecord(null);

    const fresh = profile || user;
    await notifyClockOut(fresh, totalHours);
    if (!geo.in_bounds) {
      await notifyOutOfBoundsPunch(fresh, 'out', geo.distance);
      await notifyAdmins('out', geo.distance);
    }

    await logActivity(
      'employee_clocked_out',
      `${fresh.full_name || fresh.email} punched out (${totalHours}h)${!geo.in_bounds ? ' outside geofence' : ''}`,
      fresh.email, fresh.full_name
    );
    toast({ title: 'Clocked out successfully', description: `${totalHours}h worked` });
  };

  const handlePinSuccess = async () => {
    const action = pendingAction;
    setPendingAction(null);
    setActionLoading(true);
    try {
      if (action === 'punch_in')    await executePunchIn();
      if (action === 'lunch_start') await executeLunchStart();
      if (action === 'lunch_end')   await executeLunchEnd();
      if (action === 'punch_out')   await executePunchOut();
    } catch (e) {
      console.error(`[ClockButton] ${action} failed:`, e);
      const ACTION_LABELS = {
        punch_in: 'Punch in',
        punch_out: 'Punch out',
        lunch_start: 'Start lunch',
        lunch_end: 'End lunch',
      };
      const label = ACTION_LABELS[action] || 'Action';
      let description = 'An unexpected error occurred. Please try again.';
      const message = e?.message?.toLowerCase() || '';
      if (e?.status === 401 || e?.status === 403 || message.includes('unauthorized') || message.includes('forbidden')) {
        console.error('[ClockButton] RLS/permission blocked', { action, message: e?.message });
        description = action === 'punch_in'
          ? "You don't have permission to do that."
          : "You don't have permission to do that.";
      } else if (message.includes('network') || message.includes('fetch')) {
        description = 'Something went wrong - please try again.';
      } else if (message.includes('permission') || message.includes('denied')) {
        console.error('[ClockButton] RLS/permission blocked', { action, message: e?.message });
        description = action === 'punch_in'
          ? "You don't have permission to do that."
          : "You don't have permission to do that.";
      } else if (message.includes('validation') || message.includes('required')) {
        description = 'Something went wrong - please try again.';
      } else if (e?.message) {
        description = e.message;
      }
      toast({ title: `${label} failed`, description, variant: 'destructive' });
    }
    setActionLoading(false);
  };

  if (loading) return null;

  const isClockedIn = !!clockRecord;
  const isOnLunch = isClockedIn && !!clockRecord.lunch_start && !clockRecord.lunch_end;
  const hasHadLunch = isClockedIn && !!clockRecord.lunch_start && !!clockRecord.lunch_end;

  const STATUS_STYLES = {
    out:   { border: 'border-slate-700',          bg: 'bg-slate-800/60',      dot: 'bg-slate-500',   label: 'text-slate-400',  text: 'You are currently clocked out' },
    in:    { border: 'border-emerald-500/40',     bg: 'bg-emerald-500/10',    dot: 'bg-emerald-400', label: 'text-emerald-400', text: 'You are clocked in' },
    lunch: { border: 'border-yellow-500/40',      bg: 'bg-yellow-500/10',     dot: 'bg-yellow-400',  label: 'text-yellow-400',  text: 'You are on lunch' },
  };
  const st = isOnLunch ? STATUS_STYLES.lunch : isClockedIn ? STATUS_STYLES.in : STATUS_STYLES.out;

  const btnCls = 'px-4 py-3 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50';

  return (
    <>
      {pendingAction && (
        <PinModal
          title={
            pendingAction === 'punch_in' ? 'Punch In' :
            pendingAction === 'lunch_start' ? 'Start Lunch' :
            pendingAction === 'lunch_end' ? 'End Lunch' : 'Punch Out'
          }
          expectedHash={expectedHash}
          onSuccess={handlePinSuccess}
          onCancel={() => setPendingAction(null)}
        />
      )}

      <div className={`rounded-xl border-2 ${st.border} ${st.bg} p-4 mb-5 transition-all`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${st.bg}`}>
                <div className={`w-3 h-3 rounded-full ${st.dot}${isClockedIn ? ' animate-pulse' : ''}`} />
              </div>
            </div>
            <div>
              <p className={`text-sm font-semibold ${st.label}`}>{st.text}</p>
              {isClockedIn && !isOnLunch && (
                <ElapsedTimer since={clockRecord.punch_in_time} />
              )}
              {isOnLunch && clockRecord.lunch_start && (
                <span className="text-xs text-yellow-400/80">
                  Lunch <ElapsedTimer since={clockRecord.lunch_start} />
                </span>
              )}
              {!isClockedIn && (
                <p className="text-xs text-slate-500">Tap to clock in</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {actionLoading ? (
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            ) : !isClockedIn ? (
              <button
                onClick={() => openPinModal('punch_in')}
                className={`${btnCls} bg-emerald-600 hover:bg-emerald-500 text-white`}
              >
                <LogIn className="w-3.5 h-3.5" /> Punch In
              </button>
            ) : (
              <>
                {!hasHadLunch && (
                  <button
                    onClick={() => openPinModal(isOnLunch ? 'lunch_end' : 'lunch_start')}
                    className={`${btnCls} ${
                      isOnLunch
                        ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    {isOnLunch ? 'End Lunch' : 'Start Lunch'}
                  </button>
                )}
                <button
                  onClick={() => openPinModal('punch_out')}
                  className={`${btnCls} bg-red-600/80 hover:bg-red-600 text-white`}
                >
                  <LogOut className="w-3.5 h-3.5" /> Punch Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
