import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/lib/permissions.jsx';
import { DEFAULT_PERMISSIONS as ROLE_DEFAULTS, ROLE_ALLOWED_PERMISSIONS } from '@/lib/permissions.jsx';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Shield, Eye, PlusCircle, ArrowRightLeft, MapPin, Clock,
  Bell, FileText, Activity, Lock, User, RotateCcw, CheckCircle2, AlertCircle,
} from 'lucide-react';

// Build the permission matrix — allowedRoles derived from ROLE_ALLOWED_PERMISSIONS
const PERMISSION_MATRIX = [
  { key: 'view_all_tasks',          label: 'View Master Task Board',       icon: Eye,            desc: 'See all tasks across all employees' },
  { key: 'create_tasks',            label: 'Create Tasks',                 icon: PlusCircle,     desc: 'Create new delivery tasks' },
  { key: 'reassign_tasks',          label: 'Reassign Tasks',               icon: ArrowRightLeft, desc: 'Move tasks between employees' },
  { key: 'view_employee_locations', label: 'View All Employee Locations',  icon: MapPin,         desc: 'See live GPS map of all staff' },
  { key: 'view_own_location',       label: 'View Own Location Indicator',  icon: MapPin,         desc: 'See their own location on map' },
  { key: 'view_clock_records',      label: 'View Time & Attendance Panel', icon: Clock,          desc: 'Access full punch record history' },
  { key: 'view_own_clock_records',  label: 'View Own Clock Records',       icon: Clock,          desc: 'See their own punch history' },
  { key: 'access_notifications',    label: 'Access Notification Center',   icon: Bell,           desc: 'Receive in-app notifications' },
  { key: 'add_notes_to_tasks',      label: 'Add Notes to Tasks',           icon: FileText,       desc: 'Attach notes to delivery tasks' },
  { key: 'view_activity_feed',      label: 'View Activity Feed',           icon: Activity,       desc: 'See the live system activity log' },
].map(p => ({
  ...p,
  allowedRoles: Object.entries(ROLE_ALLOWED_PERMISSIONS)
    .filter(([, perms]) => perms.includes(p.key))
    .map(([role]) => role),
}));

export default function PermissionsBoard() {
  const { toast } = useToast();
  const { permissionsByRole } = usePermissions();

  const [employees, setEmployees] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [userPerms, setUserPerms] = useState(null);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [savingKey, setSavingKey] = useState(null); // which key is mid-save
  const [resetting, setResetting] = useState(false);

  // Load operator + employee users
  useEffect(() => {
    base44.entities.EmployeeProfile.list().then(profiles => {
      const filtered = profiles.filter(u => u.role === 'operator' || u.role === 'employee');
      setEmployees(filtered);
      setLoadingEmployees(false);
    });
  }, []);

  // Load per-user permissions when selection changes
  useEffect(() => {
    if (!selectedEmail) { setUserPerms(null); return; }
    setLoadingPerms(true);
    base44.entities.UserPermission.filter({ user_email: selectedEmail }).then(records => {
      setUserPerms(records.length > 0 ? records[0] : null);
      setLoadingPerms(false);
    });
  }, [selectedEmail]);

  const selectedUser = employees.find(e => e.email === selectedEmail);
  const selectedRole = selectedUser?.role || 'employee';
  const roleDefaults = ROLE_DEFAULTS[selectedRole] || ROLE_DEFAULTS.employee;

  // Effective permissions shown in toggles
  const effectivePerms = userPerms ? userPerms : roleDefaults;

  const hasCustomPerms = !!userPerms;

  const handleToggle = async (key, value, label) => {
    if (!selectedUser) return;
    setSavingKey(key);
    try {
      if (userPerms?.id) {
        const updated = await base44.entities.UserPermission.update(userPerms.id, { [key]: value });
        setUserPerms(updated);
      } else {
        const created = await base44.entities.UserPermission.create({
          user_email: selectedUser.email,
          user_role: selectedRole,
          ...roleDefaults,
          [key]: value,
        });
        setUserPerms(created);
      }
      toast({
        title: (
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Permission updated
          </span>
        ),
        description: `"${label}" ${value ? 'enabled' : 'disabled'} for ${selectedUser.full_name || selectedUser.email}.`,
      });
    } catch (err) {
      toast({
        title: (
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            Save failed
          </span>
        ),
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSavingKey(null);
    }
  };

  const handleResetToDefaults = async () => {
    if (!userPerms?.id || !selectedUser) return;
    setResetting(true);
    try {
      await base44.entities.UserPermission.delete(userPerms.id);
      setUserPerms(null);
      toast({
        title: 'Permissions reset',
        description: `${selectedUser.full_name || selectedUser.email} is now using role defaults.`,
      });
    } catch (err) {
      toast({ title: 'Reset failed', description: err.message, variant: 'destructive' });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Permissions Board</h1>
          <p className="text-muted-foreground text-sm">Manage individual access for each employee or operator.</p>
        </div>
      </div>

      {/* Employee selector */}
      <div className="mb-5">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
          Select Employee or Operator
        </label>
        {loadingEmployees ? (
          <div className="h-10 bg-muted rounded-md animate-pulse" />
        ) : (
          <Select value={selectedEmail} onValueChange={setSelectedEmail}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a user to manage permissions..." />
            </SelectTrigger>
            <SelectContent>
              {/* Group by role */}
              {['operator', 'employee'].map(role => {
                const group = employees.filter(e => e.role === role);
                if (!group.length) return null;
                return (
                  <div key={role}>
                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {role}s
                    </div>
                    {group.map(emp => (
                      <SelectItem key={emp.email} value={emp.email}>
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{emp.full_name || emp.email}</span>
                          <span className="text-xs text-muted-foreground ml-1">{emp.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                );
              })}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Permissions panel */}
      {!selectedEmail ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-xl">
          <Shield className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-medium">No user selected</p>
          <p className="text-sm text-muted-foreground mt-1">Choose a user above to view and manage their permissions.</p>
        </div>
      ) : loadingPerms ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Selected user info bar */}
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-accent/40 border border-border">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
              {(selectedUser?.full_name || selectedUser?.email || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{selectedUser?.full_name || selectedUser?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{selectedRole} · {selectedUser?.email}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {hasCustomPerms ? (
                <>
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                    Custom permissions
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetToDefaults}
                    disabled={resetting}
                    className="text-xs text-muted-foreground h-7 gap-1"
                    title="Reset to role defaults"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </Button>
                </>
              ) : (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  Role defaults
                </span>
              )}
            </div>
          </div>

          {/* Permission toggles */}
          <Card>
            <CardHeader className="border-b border-border py-3 px-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permission</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Access</span>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border">
              {PERMISSION_MATRIX.map((perm) => {
                const Icon = perm.icon;
                const isLocked = !perm.allowedRoles.includes(selectedRole);
                const currentValue = isLocked ? false : !!effectivePerms[perm.key];
                const isSaving = savingKey === perm.key;

                return (
                  <div
                    key={perm.key}
                    className={`flex items-center justify-between px-5 py-4 transition-colors ${isLocked ? 'opacity-50' : 'hover:bg-muted/30'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${isLocked ? 'bg-muted' : 'bg-muted'}`}>
                        {isLocked
                          ? <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                          : <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{perm.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {isLocked ? `Not available for ${selectedRole}s` : perm.desc}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      {isSaving && (
                        <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      )}
                      <Switch
                        checked={currentValue}
                        disabled={isLocked || isSaving}
                        onCheckedChange={(val) => handleToggle(perm.key, val, perm.label)}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground mt-3 text-center">
            Owner and Super Admin roles always have full access and are not affected by these settings.
          </p>
        </>
      )}
    </div>
  );
}