import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapPin, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, startOfDay, endOfDay } from 'date-fns';
import EmployeeMap from '@/components/locations/EmployeeMap';

export default function Locations() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: locationRecords = [], refetch: refetchLoc, isLoading, isError } = useQuery({
    queryKey: ['location-records'],
    queryFn: () => base44.entities.LocationRecord.list(),
    refetchInterval: 60000,
  });

  const { data: clockedInRecords = [] } = useQuery({
    queryKey: ['clocked-in-today'],
    queryFn: () => base44.entities.ClockRecord.filter({ date: today }),
    refetchInterval: 30000,
    select: data => data.filter(r => !r.punch_out_time),
  });

  const { data: todayTasks = [] } = useQuery({
    queryKey: ['tasks-locations'],
    queryFn: () => base44.entities.Task.list(),
    select: data => {
      const todayStr = new Date().toISOString().split('T')[0];
      return data.filter(t => t.created_date?.startsWith(todayStr));
    },
  });

  // Real-time
  useEffect(() => {
    const unsub = base44.entities.LocationRecord.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['location-records'] });
    });
    return unsub;
  }, [queryClient]);

  // Group tasks by employee
  const tasksByEmployee = {};
  todayTasks.forEach(t => {
    if (t.assigned_employee) {
      if (!tasksByEmployee[t.assigned_employee]) tasksByEmployee[t.assigned_employee] = [];
      tasksByEmployee[t.assigned_employee].push(t);
    }
  });

  // Only show employees who are currently clocked in
  const clockedInEmails = new Set(clockedInRecords.map(r => r.employee_email));
  const activeLocations = locationRecords.filter(l => clockedInEmails.has(l.employee_email));

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Locations</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Real-time employee positions — updates every 60s</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {activeLocations.length} active
          </Badge>
          <Button variant="outline" size="icon" onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['location-records'] });
            queryClient.invalidateQueries({ queryKey: ['clocked-in-today'] });
          }}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {activeLocations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border border-border bg-card">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <MapPin className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Active Employees</h2>
          <p className="text-muted-foreground max-w-md">
            Employees will appear on the map when they clock in and share their location.
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-border shadow-sm">
          <EmployeeMap
            locationRecords={activeLocations}
            clockedInRecords={clockedInRecords}
            tasksByEmployee={tasksByEmployee}
          />
        </div>
      )}

      {/* Active employee list */}
      {activeLocations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeLocations.map(loc => {
            const lastUpdated = loc.updated_at ? formatDistanceToNow(new Date(loc.updated_at), { addSuffix: true }) : 'Unknown';
            const tasks = tasksByEmployee[loc.employee_email] || [];
            return (
              <div key={loc.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {(loc.employee_name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{loc.employee_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-500 animate-pulse" />
                      Updated {lastUpdated}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{tasks.length} task{tasks.length !== 1 ? 's' : ''} today</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}