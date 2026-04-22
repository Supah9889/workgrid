import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Loader2, History } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function EditTaskDialog({ open, onOpenChange, task, employees, onSaved }) {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) setForm({ ...task });
  }, [task]);

  if (!task) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const assignee = employees.find(emp => emp.email === form.assigned_employee);
    const updates = { ...form, assigned_employee_name: assignee?.full_name || form.assigned_employee_name || '' };

    // Handle reassignment
    if (form.assigned_employee !== task.assigned_employee) {
      const log = task.reassignment_log || [];
      log.push({
        from_email: task.assigned_employee || '',
        from_name: task.assigned_employee_name || 'Unassigned',
        to_email: form.assigned_employee || '',
        to_name: assignee?.full_name || 'Unassigned',
        reassigned_at: new Date().toISOString(),
      });
      updates.reassignment_log = log;

      // Notify new assignee
      if (form.assigned_employee && form.assigned_employee !== 'unassigned') {
        await base44.entities.Notification.create({
          recipient_email: form.assigned_employee,
          title: 'Task Assigned to You',
          message: `You have been assigned the task: "${task.title}"`,
          type: 'info',
        });
      }
    }

    if (form.assigned_employee === 'unassigned') {
      updates.assigned_employee = '';
      updates.assigned_employee_name = '';
    }

    await base44.entities.Task.update(task.id, updates);
    toast.success('Task updated');
    onOpenChange(false);
    onSaved?.();
    setLoading(false);
  };

  const log = task.reassignment_log || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Task Title *</Label>
            <Input
              value={form.title || ''}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description || ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority || 'medium'} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status || 'pending'} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Assign To</Label>
            <Select value={form.assigned_employee || 'unassigned'} onValueChange={v => setForm(f => ({ ...f, assigned_employee: v }))}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.email}>{emp.full_name || emp.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {task.notes && (
            <div className="space-y-2">
              <Label>Employee Notes</Label>
              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground border">{task.notes}</div>
            </div>
          )}

          {log.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Reassignment History</Label>
              <div className="rounded-lg border divide-y text-xs">
                {log.map((entry, i) => (
                  <div key={i} className="px-3 py-2 text-muted-foreground">
                    <span className="font-medium text-foreground">{entry.from_name}</span> → <span className="font-medium text-foreground">{entry.to_name}</span>
                    <span className="ml-2">{entry.reassigned_at ? format(new Date(entry.reassigned_at), 'MMM d, h:mm a') : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}