import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';

export default function RoleGuard({ allowedRoles, children }) {
  const { user, isLoadingAuth } = useAuth();

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
    if (userRole === 'owner') return <Navigate to="/dashboard" replace />;
    if (userRole === 'super_admin') return <Navigate to="/dashboard" replace />;
    if (userRole === 'operator') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/my-tasks" replace />;
  }

  return children;
}