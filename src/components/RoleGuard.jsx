import { useAuth } from '@/lib/AuthContext';
import { usePermissions, can } from '@/lib/permissions.jsx';
import { Navigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';

function AccessDenied({ reason }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
        <ShieldOff className="w-8 h-8 text-destructive" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
      <p className="text-muted-foreground text-sm max-w-sm">
        {reason || "You don't have permission to view this page. Contact your administrator if you believe this is a mistake."}
      </p>
    </div>
  );
}

/**
 * RoleGuard — gate by role AND optional permission key.
 *
 * Props:
 *   allowedRoles  — array of roles that may enter
 *   permission    — optional permission key; user must also have this permission
 *
 * Behavior:
 *   - super_admin / owner always bypass all checks (full access)
 *   - Role mismatch → redirect to the user's home page
 *   - Permission denied (role is allowed but permission missing) → inline Access Denied screen
 */
export default function RoleGuard({ allowedRoles, permission, children }) {
  const { user, isLoadingAuth } = useAuth();
  const { permissionsByRole, userPermissions } = usePermissions();

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const userRole = user.role || 'employee';

  // Super admins and owners bypass all permission checks
  const isSuperUser = userRole === 'super_admin' || userRole === 'owner';
  if (isSuperUser) return children;

  // Role gate — wrong role entirely → redirect to home
  if (!allowedRoles.includes(userRole)) {
    if (userRole === 'operator') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/my-tasks" replace />;
  }

  // Permission gate — role is allowed but specific permission is missing → Access Denied screen
  if (permission) {
    const allowed = can(user.email, userRole, permission, userPermissions, permissionsByRole);
    if (!allowed) {
      return (
        <AccessDenied
          reason={`Your account does not have the required permission to access this page. Ask a Super Admin to update your permissions.`}
        />
      );
    }
  }

  return children;
}