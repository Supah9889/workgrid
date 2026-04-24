import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/lib/permissions.jsx';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Eye, PlusCircle, ArrowRightLeft, MapPin, Clock, Bell, FileText, Activity, Lock, User } from 'lucide-react';
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

// Derive which roles can toggle each permission from the single source of truth
const PERMISSION_MATRIX = [
  { key: 'view_all_tasks',           label: 'View Master Task Board',       icon: Eye           },
  { key: 'create_tasks',             label: 'Create Tasks',                 icon: PlusCircle    },
  { key: 'reassign_tasks',           label: 'Reassign Tasks',               icon: ArrowRightLeft },
  { key: 'view_employee_locations',  label: 'View All Employee Locations',  icon: MapPin        },
  { key: 'view_own_location',        label: 'View Own Location Indicator',  icon: MapPin        },
  { key: 'view_clock_records',       label: 'View Time & Attendance Panel', icon: Clock         },
  { key: 'view_own_clock_records',   label: 'View Own Clock Records',       icon: Clock         },
  { key: 'access_notifications',     label: 'Access Notification Center',   icon: Bell          },
  { key: 'add_notes_to_tasks',       label: 'Add Notes to Tasks',           icon: FileText      },
  { key: 'view_activity_feed',       label: 'View Activity Feed',           icon: Activity      },
].map(p => ({
  ...p,
  allowedRoles: Object.entries(ROLE_ALLOWED_PERMISSIONS)
    .filter(([, perms]) => perms.includes(p.key))
    .map(([role]) => role),
}));

import { DEFAULT_PERMISSIONS as ROLE_DEFAULTS, ROLE_ALLOWED_PERMISSIONS } from '@/lib/permissions.jsx';

export default function PermissionsBoard() {
  const { toast } = useToast();
  const { permissionsByRole } = usePermissions();

  const [employees, setEmployees] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [userPerms, setUserPerms] = useState(null); // the UserPermission record for selected user
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [pending, setPending] = useState(null); // { key, value, label }

  // Load operator + employee users
  useEffect(() => {
    base44.entities.User.list().then(users => {
      const filtered = users.filter(u => u.role === 'operator' || u.role === 'employee');
      setEmployees(filtered);
      setLoadingEmployees(false);
    });
  }, []);

  // Load per-user permissions when selection changes
  useEffect(() => {
    if (!selectedEmail) { setUserPerms(null); return; }
    setLoadingPerms(true);
    base44.entities.UserPermission.filter({ user_email: selectedEmail }).then(records => {
      if (records.length > 0) {
        setUserPerms(records[0]);
      } else {
        setUserPerms(null); // will show role defaults
      }
      setLoadingPerms(false);
    });
  }, [selectedEmail]);

  const selectedUser = employees.find(e => e.email === selectedEmail);
  const selectedRole = selectedUser?.role || 'employee';

  // Effective permissions: user-level override or role default
  const effectivePerms = userPerms
    ? userPerms
    : (ROLE_DEFAULTS[selectedRole] || ROLE_DEFAULTS.employee);

  const handleToggle = (key, value, label) => {
    setPending({ key, value, label });
  };

  const confirmChange = async () => {
    if (!pending || !selectedUser) return;
    try {
      const newPerms = { ...effectivePerms, [pending.key]: pending.value };
      if (userPerms?.id) {
        const updated = await base44.entities.UserPermission.update(userPerms.id, { [pending.key]: pending.value });
        setUserPerms(updated);
      } else {
        // Create a new record from role defaults + this change
        const created = await base44.entities.UserPermission.create({
          user_email: selectedUser.email,
          user_role: selectedRole,
          ...ROLE_DEFAULTS[selectedRole],
          [pending.key]: pending.value,
        });
        setUserPerms(created);
      }
      toast({ title: 'Permission updated', description: `${pending.label} ${pending.value ? 'enabled' : 'disabled'} for ${selectedUser.full_name || selectedUser.email}.` });
      setPending(null);
    } catch (err) {
      toast({ title: 'Something went wrong', description: err.message, variant: 'destructive' });
      setPending(null);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Permissions Board</h1>
          <p className="text-muted-foreground text-sm">Select an employee to manage their individual access permissions.</p>
        </div>
      </div>

      {/* Employee selector */}
      <div className="mb-5">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Select Employee</label>
        {loadingEmployees ? (
          <div className="h-10 bg-muted rounded-md animate-pulse" />
        ) : (
          <Select value={selectedEmail} onValueChange={setSelectedEmail}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose an employee or operator..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map(emp => (
                <SelectItem key={emp.email} value={emp.email}>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{emp.full_name || emp.email}</span>
                    <span className="text-xs text-muted-foreground capitalize ml-1">({emp.role})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Permissions panel */}
      {!selectedEmail ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-xl">
          <Shield className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-medium">No employee selected</p>
          <p className="text-sm text-muted-foreground mt-1">Choose an employee above to view and manage their permissions.</p>
        </div>
      ) : loadingPerms ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Selected user info */}
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-accent/40 border border-border">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {(selectedUser?.full_name || selectedUser?.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold">{selectedUser?.full_name || selectedUser?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{selectedRole} · {selectedUser?.email}</p>
            </div>
            {userPerms ? (
              <span className="ml-auto text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">Custom permissions</span>
            ) : (
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Using role defaults</span>
            )}
          </div>

          <Card>
            <CardHeader className="border-b border-border py-3 px-5">
              <div className="grid grid-cols-[1fr_100px] gap-4 items-center">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permission</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Access</span>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border">
              {PERMISSION_MATRIX.map((perm) => {
                const Icon = perm.icon;
                const isLocked = !perm.allowedRoles.includes(selectedRole);
                const currentValue = !!effectivePerms[perm.key];

                return (
                  <div
                    key={perm.key}
                    className="grid grid-cols-[1fr_100px] gap-4 items-center px-5 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{perm.label}</p>
                        {isLocked && (
                          <p className="text-xs text-muted-foreground">Not available for {selectedRole}s</p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-center">
                      {isLocked ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Lock className="w-3 h-3" />
                          <span>Locked</span>
                        </div>
                      ) : (
                        <Switch
                          checked={currentValue}
                          onCheckedChange={(val) => handleToggle(perm.key, val, perm.label)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground mt-3 text-center">
            Owner and Super Admins always have full access regardless of these settings.
          </p>
        </>
      )}

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Permission Change</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to <strong>{pending?.value ? 'enable' : 'disable'}</strong> <em>{pending?.label}</em> for <strong>{selectedUser?.full_name || selectedUser?.email}</strong>.
              This will take effect immediately.
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