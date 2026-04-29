import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { notifyTaskReassigned, notifyTaskStatusChanged } from '@/lib/notificationService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

function Section({ title, children }) {
  return (
    <section className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required && <span className="text-xs text-primary">(Required)</span>}
      </Label>
      {children}
    </div>
  );
}

export default function EditTaskDialog({ open, onOpenChange, task, employees = [], onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        part_description: task.part_description || '',
        assigned_employee: task.assigned_employee || '',
        assigned_employee_name: task.assigned_employee_name || '',
        delivery_address: task.delivery_address || '',
        store_name: task.store_name || '',
        requested_by: task.requested_by || '',
        customer_email: task.customer_email || '',
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
    setForm(f => ({ ...f, assigned_employee: email, assigned_employee_name: emp?.full_name || '' }));
  };

  const handleSubmit = async () => {
    if (!form.title?.trim() || !form.assigned_employee || !task?.id) return;
    setSaving(true);

    const updates = { ...form };

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

    try {
      await base44.entities.Task.update(task.id, updates);
      // Notifications are non-critical — log failures but don't block save
      try {
        if (form.assigned_employee !== task.assigned_employee) {
          await notifyTaskReassigned(task, task.assigned_employee, form.assigned_employee);
        }
        if (form.status !== task.status) {
          await notifyTaskStatusChanged(task, form.status);
        }
      } catch (notifErr) {
        console.warn('[EditTaskDialog] Notification failed (task saved ok):', notifErr);
      }
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      console.error('[EditTaskDialog] Task update failed:', err);
      const description = err?.message?.toLowerCase().includes('network') || err?.message?.toLowerCase().includes('fetch')
        ? 'Network error — check your connection and try again.'
        : (err.message || 'The task could not be saved. Please try again.');
      toast({ title: 'Failed to save task', description, variant: 'destructive' });
    }
    setSaving(false);
  };
  const canSubmit = !!form.title?.trim() && !!form.assigned_employee && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <Section title="Required">
            <Field label="Task Title" required>
              <Input
                value={form.title || ''}
                onChange={e => set('title', e.target.value)}
                placeholder="Example: Paint living room"
                className="h-11"
              />
            </Field>

            <Field label="Assign To" required>
              <Select value={form.assigned_employee || ''} onValueChange={handleEmployeeChange}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Choose an employee" /></SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.role !== 'super_admin').map(emp => (
                    <SelectItem key={emp.email} value={emp.email}>{emp.full_name || emp.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Due Date">
              <Input
                type="datetime-local"
                value={form.scheduled_time || ''}
                onChange={e => set('scheduled_time', e.target.value)}
                className="h-11"
              />
            </Field>

            <Field label="Priority">
              <Select value={form.priority || 'medium'} onValueChange={v => set('priority', v)}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </Section>

          <Section title="Description">
            <Field label="Description / Notes">
              <Textarea
                value={form.notes || ''}
                onChange={e => set('notes', e.target.value)}
                rows={4}
                placeholder="Example: Paint living room walls, 2 coats, white"
              />
            </Field>
          </Section>

          <Section title="Optional">
            <button
              type="button"
              onClick={() => setOptionalOpen(v => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-3 text-left text-sm font-medium hover:bg-muted"
            >
              Location, contact, and advanced details
              <ChevronDown className={`w-4 h-4 transition-transform ${optionalOpen ? 'rotate-180' : ''}`} />
            </button>
            {optionalOpen && (
              <div className="space-y-4 pt-1">
                <Field label="Location / Address">
                  <Input
                    value={form.delivery_address || ''}
                    onChange={e => set('delivery_address', e.target.value)}
                    placeholder="Example: 123 Main St, Charleston, SC"
                    className="h-11"
                  />
                </Field>

                <Field label="Contact / Customer Email">
                  <Input
                    type="email"
                    value={form.customer_email || ''}
                    onChange={e => set('customer_email', e.target.value)}
                    placeholder="Example: customer@example.com"
                    className="h-11"
                  />
                </Field>

                <Field label="Requested By">
                  <Input
                    value={form.requested_by || ''}
                    onChange={e => set('requested_by', e.target.value)}
                    placeholder="Example: Homeowner, customer, or manager"
                    className="h-11"
                  />
                </Field>

                <Field label="Store / Pickup">
                  <Input
                    value={form.store_name || ''}
                    onChange={e => set('store_name', e.target.value)}
                    placeholder="Example: Lowes, Home Depot, shop"
                    className="h-11"
                  />
                </Field>

                <Field label="Part / Extra Details">
                  <Input
                    value={form.part_description || ''}
                    onChange={e => set('part_description', e.target.value)}
                    placeholder="Example: 42in deck belt - Husqvarna YTH24V48"
                    className="h-11"
                  />
                </Field>

                <Field label="Status">
                  <Select value={form.status || 'pending'} onValueChange={v => set('status', v)}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="picked_up">Picked Up</SelectItem>
                      <SelectItem value="en_route">En Route</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}
          </Section>

          {!canSubmit && (
            <p className="text-sm text-primary">Please enter a task title and assign it</p>
          )}

          <DialogFooter className="flex-col gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11 w-full sm:w-auto">Cancel</Button>
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit} className="h-11 w-full sm:w-auto">
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
