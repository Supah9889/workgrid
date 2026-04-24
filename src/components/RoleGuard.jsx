import { useAuth } from '@/lib/AuthContext';
import { usePermissions, can } from '@/lib/permissions.jsx';
import { Navigate } from 'react-router-dom';

/**
 * RoleGuard — gate by role AND optional permission key.
 *
 * Props:
 *   allowedRoles  — array of roles that may enter (role-level gate, for admins/operators/employees)
 *   permission    — optional permission key; if provided, the user must also have this permission
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

  // Role gate
  if (!allowedRoles.includes(userRole)) {
    if (userRole === 'super_admin' || userRole === 'owner') return <Navigate to="/dashboard" replace />;
    if (userRole === 'operator') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/my-tasks" replace />;
  }

  // Permission gate (only applies when a permission key is specified)
  if (permission) {
    const allowed = can(user.email, userRole, permission, userPermissions, permissionsByRole);
    if (!allowed) {
      if (userRole === 'operator') return <Navigate to="/dashboard" replace />;
      return <Navigate to="/my-tasks" replace />;
    }
  }

  return children;
}