import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { notifyTaskReassigned, notifyTaskStatusChanged } from '@/lib/notificationService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

export default function EditTaskDialog({ open, onOpenChange, task, employees = [], onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        part_description: task.part_description || '',
        assigned_to: task.assigned_to || '',
        assigned_to_name: task.assigned_to_name || '',
        delivery_address: task.delivery_address || '',
        store_name: task.store_name || '',
        requested_by: task.requested_by || '',
        scheduled_time: task.scheduled_time || '',
        notes: task.notes || '',
        priority: task.priority || 'medium',
        status: task.status || 'pending',
      });
    }
  }, [task]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleEmployeeChange = (email) => {
    const emp = employees.find(e => e.email === email);
    setForm(f => ({ ...f, assigned_to: email, assigned_to_name: emp?.full_name || '' }));
  };

  const handleSubmit = async () => {
    if (!form.title?.trim() || !task?.id) return;
    setSaving(true);

    const updates = { ...form };

    if (form.assigned_to !== task.assigned_to) {
      const log = task.reassignment_log || [];
      updates.reassignment_log = [...log, {
        from_email: task.assigned_to,
        from_name: task.assigned_to_name,
        to_email: form.assigned_to,
        to_name: form.assigned_to_name,
        reassigned_at: new Date().toISOString(),
      }];
    }

    await base44.entities.Task.update(task.id, updates);
    if (form.assigned_to !== task.assigned_to) {
      await notifyTaskReassigned(task, task.assigned_to, form.assigned_to);
    }
    if (form.status !== task.status) {
      await notifyTaskStatusChanged(task, form.status);
    }
    setSaving(false);
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={form.title || ''} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Part Description</Label>
            <Input value={form.part_description || ''} onChange={e => set('part_description', e.target.value)} placeholder="e.g. 42in deck belt - Husqvarna YTH24V48" />
          </div>
          <div className="space-y-1.5">
            <Label>Store</Label>
            <Input value={form.store_name || ''} onChange={e => set('store_name', e.target.value)} placeholder="e.g. Lowes, Home Depot" />
          </div>
          <div className="space-y-1.5">
            <Label>Requested By</Label>
            <Input value={form.requested_by || ''} onChange={e => set('requested_by', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Delivery Address</Label>
            <Input value={form.delivery_address || ''} onChange={e => set('delivery_address', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Scheduled Time</Label>
            <Input type="datetime-local" value={form.scheduled_time || ''} onChange={e => set('scheduled_time', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={form.priority || 'medium'} onValueChange={v => set('priority', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status || 'pending'} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="picked_up">Picked Up</SelectItem>
                <SelectItem value="en_route">En Route</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Assign To</Label>
            <Select value={form.assigned_to || ''} onValueChange={handleEmployeeChange}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.filter(e => e.role !== 'super_admin').map(emp => (
                  <SelectItem key={emp.email} value={emp.email}>{emp.full_name || emp.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes (visible to employee)</Label>
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" onClick={handleSubmit} disabled={saving || !form.title?.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}