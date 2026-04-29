import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { AlertTriangle, MapPin } from 'lucide-react';
import { isOpenClockRecord } from '@/lib/clockRecords';

function LocationCell({ lat, lng, inBounds }) {
  if (lat == null) return <span className="text-muted-foreground text-xs">No GPS</span>;
  return (
    <div className="flex items-center gap-1">
      <MapPin className={`w-3 h-3 flex-shrink-0 ${inBounds === false ? 'text-red-500' : 'text-muted-foreground'}`} />
      <span className="text-xs font-mono">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
      {inBounds === false && (
        <span className="text-xs text-red-500 font-semibold ml-0.5">OOB</span>
      )}
    </div>
  );
}

export default function DailyLog({ records }) {
  if (records.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground rounded-xl border border-border">
        No activity yet - start by clocking in or creating a task.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="font-semibold">Employee</TableHead>
            <TableHead className="font-semibold">Punch In</TableHead>
            <TableHead className="font-semibold">Lunch</TableHead>
            <TableHead className="font-semibold">Punch Out</TableHead>
            <TableHead className="font-semibold">Hours</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map(r => {
            const isOpen = isOpenClockRecord(r);
            return (
              <TableRow key={r.id} className={r.flagged ? 'bg-red-50' : isOpen ? 'bg-amber-50' : ''}>
                <TableCell>
                  <p className="font-medium text-sm">{r.employee_name}</p>
                  <p className="text-xs text-muted-foreground">{r.employee_email}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm">{r.punch_in_time ? format(new Date(r.punch_in_time), 'h:mm a') : '—'}</p>
                  <LocationCell lat={r.punch_in_lat} lng={r.punch_in_lng} inBounds={r.punch_in_in_bounds} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.lunch_start ? (
                    <span>{format(new Date(r.lunch_start), 'h:mm')} – {r.lunch_end ? format(new Date(r.lunch_end), 'h:mm a') : 'ongoing'}</span>
                  ) : '—'}
                  {r.total_lunch_minutes ? <span className="block text-xs">{r.total_lunch_minutes} min</span> : null}
                </TableCell>
                <TableCell>
                  {r.punch_out_time ? (
                    <>
                      <p className="text-sm">{format(new Date(r.punch_out_time), 'h:mm a')}</p>
                      <LocationCell lat={r.punch_out_lat} lng={r.punch_out_lng} inBounds={r.punch_out_in_bounds} />
                    </>
                  ) : (
                    <span className="text-amber-600 flex items-center gap-1 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5" /> Open
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {r.total_hours != null ? `${r.total_hours}h` : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {r.flagged && (
                      <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Flagged
                      </Badge>
                    )}
                    {r.manually_closed ? (
                      <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 text-xs">Manually Closed</Badge>
                    ) : r.punch_out_time ? (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 text-xs">Complete</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">Open</Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
