import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay } from 'date-fns';
import { ArrowLeft, MapPin, Clock, ClipboardList, Activity, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, PriorityBadge } from '@/components/tasks/TaskBadges';
import { useToast } from '@/components/ui/use-toast';

const STATUS_STYLES = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-red-100 text-red-700 border-red-200',
};

export default function EmployeeProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const employeeId = params.get('id');

  const [editMode, setEditMode] = useState(false);
  const [editRole, setEditRole] = useState('');

  const { data: employee, refetch: refetchEmp } = useQuery({
    queryKey: ['emp-profile', employeeId],
    queryFn: () => base44.entities.User.list().then(users => users.find(u => u.id === employeeId)),
    enabled: !!employeeId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['emp-tasks', employeeId],
    queryFn: () => base44.entities.Task.filter({ assigned_employee: employee?.email }),
    enabled: !!employee?.email,
  });

  const { data: clockRecords = [] } = useQuery({
    queryKey: ['emp-clock', employeeId],
    queryFn: async () => {
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const all = await base44.entities.ClockRecord.filter({ employee_email: employee?.email });
      return all.filter(r => r.date >= thirtyDaysAgo).sort((a, b) => b.date.localeCompare(a.date));
    },
    enabled: !!employee?.email,
  });

  const { data: activityEvents = [] } = useQuery({
    queryKey: ['emp-activity', employeeId],
    queryFn: () => base44.entities.ActivityFeed.filter({ actor_email: employee?.email }),
    enabled: !!employee?.email,
  });

  const [location, setLocation] = useState(null);
  useEffect(() => {
    if (!employee?.email) return;
    base44.entities.LocationRecord.filter({ employee_email: employee.email }).then(locs => setLocation(locs[0] || null));
  }, [employee?.email]);

  const today = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.created_date?.startsWith(today));

  const handleSaveRole = async () => {
    await base44.entities.User.update(employeeId, { role: editRole });
    toast({ title: 'Role updated' });
    refetchEmp();
    setEditMode(false);
  };

  const handleToggleStatus = async () => {
    const newStatus = employee.status === 'inactive' ? 'active' : 'inactive';
    await base44.entities.User.update(employeeId, { status: newStatus });
    toast({ title: `Employee ${newStatus === 'active' ? 'reactivated' : 'deactivated'}` });
    refetchEmp();
  };

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Group clock records by day
  const clockByDay = {};
  clockRecords.forEach(r => {
    if (!clockByDay[r.date]) clockByDay[r.date] = [];
    clockByDay[r.date].push(r);
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Back */}
      <button onClick={() => navigate('/employees')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Employees
      </button>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                {(employee.full_name || employee.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-lg font-bold">{employee.full_name || '—'}</h1>
                <p className="text-sm text-muted-foreground">{employee.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="outline" className={STATUS_STYLES[employee.status || 'active']}>
                    {employee.status || 'active'}
                  </Badge>
                  {editMode ? (
                    <div className="flex items-center gap-2">
                      <Select value={editRole} onValueChange={setEditRole}>
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="operator">Operator</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <button onClick={handleSaveRole} className="p-1 rounded hover:bg-emerald-100 text-emerald-600"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditMode(false)} className="p-1 rounded hover:bg-red-100 text-red-500"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <Badge variant="secondary" className="capitalize text-xs">{employee.role?.replace('_', ' ')}</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!editMode && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setEditRole(employee.role || 'employee'); setEditMode(true); }}>
                  <Edit2 className="w-3.5 h-3.5" /> Edit Role
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className={employee.status === 'inactive' ? 'text-emerald-600 border-emerald-300' : 'text-red-500 border-red-300'}
                onClick={handleToggleStatus}
              >
                {employee.status === 'inactive' ? 'Reactivate' : 'Deactivate'}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border text-center">
            <div>
              <p className="text-lg font-bold">{tasks.length}</p>
              <p className="text-xs text-muted-foreground">Total Tasks</p>
            </div>
            <div>
              <p className="text-lg font-bold">{todayTasks.length}</p>
              <p className="text-xs text-muted-foreground">Tasks Today</p>
            </div>
            <div>
              <p className="text-lg font-bold">
                {employee.created_date ? format(new Date(employee.created_date), 'MMM d, yyyy') : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Date Added</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Today's Tasks */}
        <Card>
          <CardHeader className="py-3 px-5 border-b border-border">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Today's Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border max-h-64 overflow-y-auto">
            {todayTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No tasks today</p>
            ) : todayTasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex-1 text-sm">{t.title}</span>
                <PriorityBadge priority={t.priority} />
                <StatusBadge status={t.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Last Location */}
        <Card>
          <CardHeader className="py-3 px-5 border-b border-border">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Last Known Location
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {!location ? (
              <p className="text-sm text-muted-foreground text-center py-4">No location data available</p>
            ) : (
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">Lat: <span className="text-foreground font-medium">{location.latitude?.toFixed(6)}</span></p>
                <p className="text-muted-foreground">Lng: <span className="text-foreground font-medium">{location.longitude?.toFixed(6)}</span></p>
                {location.updated_at && (
                  <p className="text-muted-foreground">Last update: <span className="text-foreground font-medium">{format(new Date(location.updated_at), 'MMM d, h:mm a')}</span></p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clock History — 30 days */}
        <Card className="lg:col-span-2">
          <CardHeader className="py-3 px-5 border-b border-border">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" /> Clock History (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto divide-y divide-border">
              {Object.keys(clockByDay).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No clock records in the last 30 days</p>
              ) : Object.entries(clockByDay).map(([date, records]) => {
                const totalHours = records.reduce((s, r) => s + (r.total_hours || 0), 0);
                return (
                  <div key={date} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {format(new Date(date + 'T12:00:00'), 'EEEE, MMM d')}
                      </span>
                      <span className="text-xs font-bold">{Math.round(totalHours * 100) / 100}h total</span>
                    </div>
                    {records.map(r => (
                      <div key={r.id} className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>In: {r.clock_in ? format(new Date(r.clock_in), 'h:mm a') : '—'}</span>
                        <span>Out: {r.clock_out ? format(new Date(r.clock_out), 'h:mm a') : <span className="text-red-500">Open</span>}</span>
                        <span>{r.total_hours != null ? `${r.total_hours}h` : '—'}</span>
                        {r.manually_closed && <Badge variant="outline" className="text-[10px] py-0 h-4 text-orange-500 border-orange-300">Manual</Badge>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card className="lg:col-span-2">
          <CardHeader className="py-3 px-5 border-b border-border">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" /> Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-56 overflow-y-auto divide-y divide-border">
              {activityEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No activity recorded</p>
              ) : activityEvents.slice(0, 50).map(e => (
                <div key={e.id} className="flex items-start gap-3 px-5 py-2.5">
                  <span className="text-xs text-muted-foreground flex-shrink-0 pt-0.5">
                    {e.created_date ? format(new Date(e.created_date), 'MMM d h:mm a') : ''}
                  </span>
                  <span className="text-xs">{e.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}