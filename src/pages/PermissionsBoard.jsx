import { useState } from 'react';
import { usePermissions } from '@/lib/permissions.jsx';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Eye, PlusCircle, ArrowRightLeft, MapPin, Clock, Bell, FileText, Activity, Lock } from 'lucide-react';
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

// toggle = configurable, locked_off = always false
const PERMISSION_MATRIX = [
  {
    key: 'view_all_tasks',
    label: 'View Master Task Board',
    icon: Eye,
    operator: 'toggle',
    employee: 'toggle',
  },
  {
    key: 'create_tasks',
    label: 'Create Tasks',
    icon: PlusCircle,
    operator: 'toggle',
    employee: 'locked_off',
  },
  {
    key: 'reassign_tasks',
    label: 'Reassign Tasks',
    icon: ArrowRightLeft,
    operator: 'toggle',
    employee: 'locked_off',
  },
  {
    key: 'view_employee_locations',
    label: 'View All Employee Locations',
    icon: MapPin,
    operator: 'toggle',
    employee: 'locked_off',
  },
  {
    key: 'view_own_location',
    label: 'View Own Location Indicator',
    icon: MapPin,
    operator: 'locked_off',
    employee: 'toggle',
  },
  {
    key: 'view_clock_records',
    label: 'View Time & Attendance Panel',
    icon: Clock,
    operator: 'toggle',
    employee: 'locked_off',
  },
  {
    key: 'view_own_clock_records',
    label: 'View Own Clock Records',
    icon: Clock,
    operator: 'locked_off',
    employee: 'toggle',
  },
  {
    key: 'access_notifications',
    label: 'Access Notification Center',
    icon: Bell,
    operator: 'toggle',
    employee: 'toggle',
  },
  {
    key: 'add_notes_to_tasks',
    label: 'Add Notes to Tasks',
    icon: FileText,
    operator: 'toggle',
    employee: 'toggle',
  },
  {
    key: 'view_activity_feed',
    label: 'View Activity Feed',
    icon: Activity,
    operator: 'toggle',
    employee: 'locked_off',
  },
];

function PermissionCell({ type, value, onChange }) {
  if (type === 'locked_off') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="w-3 h-3" />
        <span>Locked off</span>
      </div>
    );
  }
  return (
    <Switch checked={!!value} onCheckedChange={onChange} />
  );
}

export default function PermissionsBoard() {
  const { permissionsByRole, loading, updatePermission } = usePermissions();
  const [pending, setPending] = useState(null); // { role, key, value, label }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const handleToggle = (role, key, value, label) => {
    setPending({ role, key, value, label });
  };

  const confirmChange = async () => {
    if (!pending) return;
    await updatePermission(pending.role, pending.key, pending.value);
    setPending(null);
  };

  const operatorPerms = permissionsByRole?.operator;
  const employeePerms = permissionsByRole?.employee;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Permissions Board</h1>
          <p className="text-muted-foreground text-sm">Control role-based access. Changes prompt confirmation before saving.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b border-border py-3 px-5">
          <div className="grid grid-cols-[1fr_140px_140px] gap-4 items-center">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permission</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Operator</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Employee</span>
          </div>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {PERMISSION_MATRIX.map((perm) => {
            const Icon = perm.icon;
            return (
              <div
                key={perm.key}
                className="grid grid-cols-[1fr_140px_140px] gap-4 items-center px-5 py-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium">{perm.label}</span>
                </div>
                <div className="flex justify-center">
                  <PermissionCell
                    type={perm.operator}
                    value={operatorPerms?.[perm.key]}
                    onChange={(val) => handleToggle('operator', perm.key, val, perm.label)}
                  />
                </div>
                <div className="flex justify-center">
                  <PermissionCell
                    type={perm.employee}
                    value={employeePerms?.[perm.key]}
                    onChange={(val) => handleToggle('employee', perm.key, val, perm.label)}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        Super Admins always have full access regardless of these settings.
      </p>

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Permission Change</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to <strong>{pending?.value ? 'enable' : 'disable'}</strong> <em>{pending?.label}</em> for <strong className="capitalize">{pending?.role}</strong> role.
              This will take effect immediately for all users in that role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChange}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}