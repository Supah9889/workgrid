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

function homeForRole(role) {
  return role === 'owner' || role === 'super_admin' || role === 'operator'
    ? '/dashboard'
    : '/my-tasks';
}

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

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={homeForRole(userRole)} replace />;
  }

  const isSuperUser = userRole === 'super_admin' || userRole === 'owner';
  if (isSuperUser) return children;

  if (permission) {
    const allowed = can(user.email, userRole, permission, userPermissions, permissionsByRole);
    if (!allowed) {
      return (
        <AccessDenied
          reason="Your account does not have the required permission to access this page. Ask a Super Admin to update your permissions."
        />
      );
    }
  }

  return children;
}
