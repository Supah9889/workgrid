import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertTriangle, MapPin, ChevronDown, ChevronUp, Filter } from 'lucide-react';

function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function PunchDetail({ label, time, lat, lng, inBounds, geoCenter }) {
  const dist = (lat != null && geoCenter?.geofence_lat)
    ? Math.round(distanceMiles(lat, lng, geoCenter.geofence_lat, geoCenter.geofence_lng) * 100) / 100
    : null;

  return (
    <div className="text-xs space-y-0.5">
      <p className="font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-slate-700">{time ? format(new Date(time), 'h:mm:ss a') : '—'}</p>
      {lat != null ? (
        <p className="text-slate-500 font-mono flex items-center gap-1">
          <MapPin className={`w-3 h-3 ${inBounds === false ? 'text-red-500' : 'text-slate-400'}`} />
          {lat.toFixed(5)}, {lng.toFixed(5)}
          {dist != null && <span className="ml-1">({dist} mi)</span>}
        </p>
      ) : (
        <p className="text-slate-400">No GPS</p>
      )}
      {inBounds === false && (
        <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 text-xs">Out of Bounds</Badge>
      )}
      {inBounds === true && (
        <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 text-xs">In Bounds</Badge>
      )}
    </div>
  );
}

function AuditRow({ record, geoCenter, onEmployeeClick }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border-b border-border last:border-0 ${record.flagged ? 'bg-red-50' : ''}`}
    >
      {/* Summary row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium hover:text-primary hover:underline cursor-pointer inline"
            onClick={e => { e.stopPropagation(); onEmployeeClick?.(); }}
          >
            {record.employee_name || record.employee_email}
          </p>
          <p className="text-xs text-muted-foreground">{record.date}</p>
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5 text-right hidden sm:block">
          <p>In: {record.punch_in_time ? format(new Date(record.punch_in_time), 'h:mm a') : '—'}</p>
          <p>Out: {record.punch_out_time ? format(new Date(record.punch_out_time), 'h:mm a') : <span className="text-amber-500">Open</span>}</p>
        </div>
        <div className="text-xs text-muted-foreground w-12 text-right">
          {record.total_hours != null ? `${record.total_hours}h` : '—'}
        </div>
        <div className="flex items-center gap-1.5">
          {record.flagged && (
            <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 text-xs flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Flagged
            </Badge>
          )}
          {record.manually_closed && (
            <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">Manual</Badge>
          )}
        </div>
        <div className="text-muted-foreground">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded punch details */}
      {expanded && (
        <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-border bg-muted/20">
          <PunchDetail
            label="Punch In"
            time={record.punch_in_time}
            lat={record.punch_in_lat}
            lng={record.punch_in_lng}
            inBounds={record.punch_in_in_bounds}
            geoCenter={geoCenter}
          />
          <div className="text-xs space-y-0.5">
            <p className="font-semibold text-slate-500 uppercase tracking-wide">Lunch</p>
            {record.lunch_start ? (
              <>
                <p className="text-slate-700">Start: {format(new Date(record.lunch_start), 'h:mm a')}</p>
                <p className="text-slate-700">{record.lunch_end ? `End: ${format(new Date(record.lunch_end), 'h:mm a')}` : 'Ongoing'}</p>
                {record.total_lunch_minutes != null && (
                  <p className="text-slate-500">{record.total_lunch_minutes} min</p>
                )}
              </>
            ) : <p className="text-slate-400">No lunch</p>}
          </div>
          <PunchDetail
            label="Punch Out"
            time={record.punch_out_time}
            lat={record.punch_out_lat}
            lng={record.punch_out_lng}
            inBounds={record.punch_out_in_bounds}
            geoCenter={geoCenter}
          />
          <div className="text-xs space-y-0.5">
            <p className="font-semibold text-slate-500 uppercase tracking-wide">Summary</p>
            <p className="text-slate-700">{record.total_hours != null ? `${record.total_hours}h worked` : 'In progress'}</p>
            {record.flagged && (
              <p className="text-red-600 font-semibold">⚠️ Out-of-bounds punch</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditLog() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const { data: allRecords = [], isLoading, isError } = useQuery({
    queryKey: ['audit-log-records'],
    queryFn: () => base44.entities.ClockRecord.list('-created_date', 500),
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['audit-users'],
    queryFn: () => base44.entities.User.list(),
  });

  const emailToId = {};
  users.forEach(u => { emailToId[u.email] = u.id; });

  const geoCenter = settingsList[0] || null;

  const filtered = allRecords.filter(r => {
    if (employeeFilter && !`${r.employee_name} ${r.employee_email}`.toLowerCase().includes(employeeFilter.toLowerCase())) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    if (flaggedOnly && !r.flagged) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Full punch history — {allRecords.length} records · {allRecords.filter(r => r.flagged).length} flagged
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center p-4 rounded-xl border border-border bg-card">
        <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <Input
          placeholder="Filter by employee..."
          value={employeeFilter}
          onChange={e => setEmployeeFilter(e.target.value)}
          className="w-48 h-10 text-sm"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">From</span>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 h-10 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">To</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 h-10 text-sm" />
        </div>
        <div
          onClick={() => setFlaggedOnly(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors ${
            flaggedOnly
              ? 'bg-red-50 border-red-300 text-red-600'
              : 'border-border text-muted-foreground hover:bg-muted'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Flagged only
        </div>
        {(employeeFilter || dateFrom || dateTo || flaggedOnly) && (
          <button
            onClick={() => { setEmployeeFilter(''); setDateFrom(''); setDateTo(''); setFlaggedOnly(false); }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Records */}
      {isError ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-destructive font-medium">Failed to load data</p>
          <p className="text-muted-foreground text-sm">Check your connection and refresh the page</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-medium">No records match your filters</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <div className="flex-1">Employee</div>
            <div className="hidden sm:block w-32">Times</div>
            <div className="w-12 text-right">Hours</div>
            <div className="w-28">Status</div>
            <div className="w-5" />
          </div>
          {filtered.map(r => (
            <AuditRow
              key={r.id}
              record={r}
              geoCenter={geoCenter}
              onEmployeeClick={() => {
                const id = emailToId[r.employee_email];
                if (id) navigate(`/employees/${id}`);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
