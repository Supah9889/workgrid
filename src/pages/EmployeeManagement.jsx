import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import EmployeeTable from '@/components/employees/EmployeeTable';
import AddEmployeeDialog from '@/components/employees/AddEmployeeDialog';

export default function EmployeeManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }) => {
      await base44.entities.User.update(userId, { role: newRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Role updated successfully');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (targetUser) => {
      // Deactivate the user
      await base44.entities.User.update(targetUser.id, { status: 'inactive' });

      // Flag their tasks as unassigned
      const tasks = await base44.entities.Task.filter({ assigned_employee: targetUser.email });
      for (const task of tasks) {
        if (task.status !== 'complete') {
          await base44.entities.Task.update(task.id, {
            assigned_employee: '',
            assigned_employee_name: '',
          });
        }
      }

      // Notify super admins
      const admins = users.filter(u => u.role === 'super_admin' && u.email !== user?.email);
      for (const admin of admins) {
        await base44.entities.Notification.create({
          recipient_email: admin.email,
          title: 'Employee Deactivated',
          message: `${targetUser.full_name || targetUser.email} was deactivated. Their ${tasks.filter(t => t.status !== 'complete').length} active task(s) have been unassigned.`,
          type: 'warning',
        });
      }

      // Also notify the current admin
      await base44.entities.Notification.create({
        recipient_email: user?.email,
        title: 'Employee Deactivated',
        message: `${targetUser.full_name || targetUser.email} was deactivated. Their active tasks have been unassigned.`,
        type: 'warning',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Employee deactivated and tasks unassigned');
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (targetUser) => {
      await base44.entities.User.update(targetUser.id, { status: 'active' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Employee reactivated');
    },
  });

  const filteredUsers = users.filter(u => {
    const term = search.toLowerCase();
    return (
      (u.full_name || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.role || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
            <p className="text-muted-foreground">Manage your workforce</p>
          </div>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Employee
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <EmployeeTable
          users={filteredUsers}
          onChangeRole={(u, newRole) => changeRoleMutation.mutate({ userId: u.id, newRole })}
          onDeactivate={(u) => deactivateMutation.mutate(u)}
          onActivate={(u) => activateMutation.mutate(u)}
        />
      )}

      <AddEmployeeDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
      />
    </div>
  );
}