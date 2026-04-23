import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

export default function DailyLog({ records }) {
  if (records.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground rounded-xl border border-border">
        No clock records for this date.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="font-semibold">Employee</TableHead>
            <TableHead className="font-semibold">Clock In</TableHead>
            <TableHead className="font-semibold">Clock Out</TableHead>
            <TableHead className="font-semibold">Hours</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map(r => (
            <TableRow key={r.id} className={r.open_flag || (!r.clock_out && !r.manually_closed) ? 'bg-red-50' : ''}>
              <TableCell>
                <p className="font-medium text-sm">{r.employee_name}</p>
                <p className="text-xs text-muted-foreground">{r.employee_email}</p>
              </TableCell>
              <TableCell className="text-sm">
                {r.clock_in ? format(new Date(r.clock_in), 'h:mm a') : '—'}
              </TableCell>
              <TableCell className="text-sm">
                {r.clock_out ? format(new Date(r.clock_out), 'h:mm a') : (
                  <span className="text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Open
                  </span>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {r.total_hours != null ? `${r.total_hours}h` : '—'}
              </TableCell>
              <TableCell>
                {r.manually_closed ? (
                  <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 text-xs">Manually Closed</Badge>
                ) : r.clock_out ? (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 text-xs">Complete</Badge>
                ) : (
                  <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 text-xs">Open</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}