import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Plus, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import EmployeeTable from '@/components/employees/EmployeeTable';
import AddEmployeeDialog from '@/components/employees/AddEmployeeDialog';
import { listEmployeeProfiles } from '@/lib/employeeProfiles';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function EmployeeManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [pendingDeactivate, setPendingDeactivate] = useState(null);

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: () => listEmployeeProfiles(),
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }) => {
      await base44.entities.EmployeeProfile.update(userId, { role: newRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Role updated successfully' });
    },
    onError: (err) => {
      console.error('[EmployeeManagement] Role change failed:', err);
      toast({ title: 'Failed to update role', description: err.message || 'Please try again.', variant: 'destructive' });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (targetUser) => {
      await base44.entities.EmployeeProfile.update(targetUser.id, { status: 'inactive' });

      const tasks = await base44.entities.Task.filter({ assigned_employee: targetUser.email });
      for (const task of tasks) {
        if (task.status !== 'delivered') {
          await base44.entities.Task.update(task.id, {
            assigned_employee: '',
            assigned_employee_name: '',
          });
        }
      }

      const admins = users.filter(u => u.role === 'super_admin' && u.email !== user?.email);
      for (const admin of admins) {
        await base44.entities.Notification.create({
          recipient_email: admin.email,
          title: 'Employee Deactivated',
          message: `${targetUser.full_name || targetUser.email} was deactivated. Their ${tasks.filter(t => t.status !== 'delivered').length} active task(s) have been unassigned.`,
          type: 'warning',
        });
      }

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
      toast({ title: 'Employee deactivated and tasks unassigned' });
    },
    onError: (err) => {
      console.error('[EmployeeManagement] Deactivate failed:', err);
      toast({ title: 'Failed to deactivate employee', description: err.message || 'Some tasks may not have been unassigned. Please check manually.', variant: 'destructive' });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (targetUser) => {
      await base44.entities.EmployeeProfile.update(targetUser.id, { status: 'active' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Employee reactivated' });
    },
    onError: (err) => {
      console.error('[EmployeeManagement] Reactivate failed:', err);
      toast({ title: 'Failed to reactivate employee', description: err.message || 'Please try again.', variant: 'destructive' });
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

  if (isError) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-destructive font-medium">Failed to load data</p>
      <p className="text-muted-foreground text-sm">Check your connection and refresh the page</p>
    </div>
  );

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
          onDeactivate={(u) => setPendingDeactivate(u)}
          onActivate={(u) => activateMutation.mutate(u)}
        />
      )}

      <AddEmployeeDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
      />

      <AlertDialog open={!!pendingDeactivate} onOpenChange={(open) => !open && setPendingDeactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Deactivate {pendingDeactivate?.full_name || pendingDeactivate?.email}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Their active tasks will be unassigned. This action can be reversed by reactivating them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { deactivateMutation.mutate(pendingDeactivate); setPendingDeactivate(null); }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
