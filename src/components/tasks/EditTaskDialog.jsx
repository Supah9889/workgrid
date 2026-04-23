import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
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
        description: task.description || '',
        priority: task.priority || 'medium',
        status: task.status || 'pending',
        assigned_employee: task.assigned_employee || '',
        assigned_employee_name: task.assigned_employee_name || '',
      });
    }
  }, [task]);

  const handleEmployeeChange = (email) => {
    const emp = employees.find(e => e.email === email);
    setForm(f => ({ ...f, assigned_employee: email, assigned_employee_name: emp?.full_name || '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !task?.id) return;
    setSaving(true);

    const updates = { ...form };

    // Log reassignment if employee changed
    if (form.assigned_employee !== task.assigned_employee) {
      const log = task.reassignment_log || [];
      updates.reassignment_log = [...log, {
        from_email: task.assigned_employee,
        from_name: task.assigned_employee_name,
        to_email: form.assigned_employee,
        to_name: form.assigned_employee_name,
        reassigned_at: new Date().toISOString(),
      }];
    }

    await base44.entities.Task.update(task.id, updates);
    setSaving(false);
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={form.priority || 'medium'} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
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
            <Select value={form.status || 'pending'} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Assign To</Label>
            <Select value={form.assigned_employee || ''} onValueChange={handleEmployeeChange}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.filter(e => e.role !== 'super_admin').map(emp => (
                  <SelectItem key={emp.email} value={emp.email}>{emp.full_name || emp.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.title?.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}