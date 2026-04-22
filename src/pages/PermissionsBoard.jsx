import { usePermissions } from '@/lib/permissions.jsx';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield, Eye, PlusCircle, ArrowRightLeft, MapPin, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const PERMISSION_CONFIG = [
  {
    key: 'view_all_tasks',
    label: 'View All Tasks',
    description: 'Operators can see tasks assigned to any employee',
    icon: Eye,
  },
  {
    key: 'create_tasks',
    label: 'Create Tasks',
    description: 'Operators can create and assign new tasks',
    icon: PlusCircle,
  },
  {
    key: 'reassign_tasks',
    label: 'Reassign Tasks',
    description: 'Operators can reassign tasks between employees',
    icon: ArrowRightLeft,
  },
  {
    key: 'view_employee_locations',
    label: 'View Employee Locations',
    description: 'Operators can see real-time employee locations',
    icon: MapPin,
  },
  {
    key: 'view_clock_records',
    label: 'View Clock Records',
    description: 'Operators can view clock in/out history',
    icon: Clock,
  },
];

export default function PermissionsBoard() {
  const { permissions, loading, updatePermission } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Permissions Board</h1>
            <p className="text-muted-foreground">Control what Operators can access across the app</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Operator Role Permissions</CardTitle>
              <CardDescription>Changes apply instantly to all operators</CardDescription>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
              Live
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {PERMISSION_CONFIG.map((perm) => {
            const Icon = perm.icon;
            const isEnabled = permissions?.[perm.key] ?? false;
            return (
              <div
                key={perm.key}
                className="flex items-center justify-between px-6 py-5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="w-[18px] h-[18px] text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{perm.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{perm.description}</p>
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(val) => updatePermission(perm.key, val)}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Super Admins always have full access. Employee permissions are fixed to personal task view only.
      </p>
    </div>
  );
}