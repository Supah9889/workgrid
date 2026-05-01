import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { notifyTaskAssigned } from '@/lib/notificationService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const EMPTY_FORM = {
  title: '',
  part_description: '',
  assigned_employee: '',
  assigned_employee_name: '',
  delivery_address: '',
  store_name: '',
  requested_by: '',
  customer_email: '',
  scheduled_time: '',
  notes: '',
  priority: 'medium',
};

function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
        {label} {required && <span className="text-blue-300 normal-case tracking-normal">(Required)</span>}
      </p>
      {children}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-3 border-t border-slate-800 pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      {children}
    </section>
  );
}

export default function CreateTaskDialog({ open, onOpenChange, employees = [], onCreated }) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleEmployeeChange = (email) => {
    const emp = employees.find(e => e.email === email);
    setForm(f => ({ ...f, assigned_employee: email, assigned_employee_name: emp?.full_name || '' }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    try {
      const task = await base44.entities.Task.create({ ...form, status: 'pending' });
      if (form.assigned_employee) await notifyTaskAssigned(task, form.assigned_employee);
      setForm(EMPTY_FORM);
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      toast({ title: 'Something went wrong', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const inputCls = 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-blue-500';
  const canSubmit = !!form.title.trim() && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">New Delivery Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <Section title="Required">
            <Field label="Task Title" required>
              <Input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Example: Paint living room"
                className={`${inputCls} h-11`}
              />
            </Field>

            <Field label="Assign To">
              <Select value={form.assigned_employee} onValueChange={handleEmployeeChange}>
                <SelectTrigger className={`${inputCls} h-11`}>
                  <SelectValue placeholder="Unassigned (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {employees.filter(e => e.role !== 'super_admin').map(emp => (
                    <SelectItem key={emp.email} value={emp.email} className="text-slate-100 focus:bg-slate-700">
                      {emp.full_name || emp.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Due Date">
              <Input
                type="datetime-local"
                value={form.scheduled_time}
                onChange={e => set('scheduled_time', e.target.value)}
                className={`${inputCls} h-11`}
              />
            </Field>

            <Field label="Priority">
              <Select value={form.priority} onValueChange={v => set('priority', v)}>
                <SelectTrigger className={`${inputCls} h-11`}>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="low" className="text-slate-100 focus:bg-slate-700">Low</SelectItem>
                  <SelectItem value="medium" className="text-slate-100 focus:bg-slate-700">Medium</SelectItem>
                  <SelectItem value="high" className="text-slate-100 focus:bg-slate-700">High</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </Section>

          <Section title="Description">
            <Field label="Description / Notes">
              <Textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Example: Paint living room walls, 2 coats, white"
                rows={4}
                className={inputCls}
              />
            </Field>
          </Section>

          <Section title="Optional">
            <button
              type="button"
              onClick={() => setOptionalOpen(v => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-700 px-3 py-3 text-left text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Location, contact, and advanced details
              <ChevronDown className={`w-4 h-4 transition-transform ${optionalOpen ? 'rotate-180' : ''}`} />
            </button>
            {optionalOpen && (
              <div className="space-y-4 pt-1">
                <Field label="Location / Address">
                  <Input
                    value={form.delivery_address}
                    onChange={e => set('delivery_address', e.target.value)}
                    placeholder="Example: 123 Main St, Charleston, SC"
                    className={`${inputCls} h-11`}
                  />
                </Field>

                <Field label="Contact / Customer Email">
                  <Input
                    type="email"
                    value={form.customer_email}
                    onChange={e => set('customer_email', e.target.value)}
                    placeholder="Example: customer@example.com"
                    className={`${inputCls} h-11`}
                  />
                </Field>

                <Field label="Requested By">
                  <Input
                    value={form.requested_by}
                    onChange={e => set('requested_by', e.target.value)}
                    placeholder="Example: Homeowner, customer, or manager"
                    className={`${inputCls} h-11`}
                  />
                </Field>

                <Field label="Store / Pickup">
                  <Input
                    value={form.store_name}
                    onChange={e => set('store_name', e.target.value)}
                    placeholder="Example: Lowes, Home Depot, shop"
                    className={`${inputCls} h-11`}
                  />
                </Field>

                <Field label="Part / Extra Details">
                  <Input
                    value={form.part_description}
                    onChange={e => set('part_description', e.target.value)}
                    placeholder="Example: 42in deck belt - Husqvarna YTH24V48"
                    className={`${inputCls} h-11`}
                  />
                </Field>
              </div>
            )}
          </Section>

          {!canSubmit && (
            <p className="text-sm text-blue-200">Please enter a task title to continue</p>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <div
              onClick={() => onOpenChange(false)}
              className="flex-1 text-center py-3 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer transition-colors text-sm font-medium"
            >
              Cancel
            </div>
            <div
              onClick={handleSubmit}
              className={`flex-1 text-center py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm ${
                !canSubmit
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
              }`}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Task
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}