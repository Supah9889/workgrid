import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateTaskDialog({ open, onOpenChange, employees, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', assigned_employee: '', assigned_employee_name: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);

    const assignee = employees.find(emp => emp.email === form.assigned_employee);
    const taskData = {
      ...form,
      assigned_employee_name: assignee?.full_name || '',
    };

    const task = await base44.entities.Task.create(taskData);

    // Send notification to assigned employee
    if (form.assigned_employee) {
      await base44.entities.Notification.create({
        recipient_email: form.assigned_employee,
        title: 'New Task Assigned',
        message: `You have been assigned a new task: "${form.title}"`,
        type: 'info',
      });
    }

    toast.success('Task created');
    setForm({ title: '', description: '', priority: 'medium', assigned_employee: '', assigned_employee_name: '' });
    onOpenChange(false);
    onCreated?.(task);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Task Title *</Label>
            <Input
              placeholder="Enter task title"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Describe the task..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={form.assigned_employee} onValueChange={v => setForm(f => ({ ...f, assigned_employee: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.email}>{emp.full_name || emp.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}