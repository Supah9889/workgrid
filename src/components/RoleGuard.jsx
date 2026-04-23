import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';

export default function RoleGuard({ allowedRoles, children }) {
  const { user } = useAuth();

  if (!user) return null;

  const userRole = user.role || 'employee';

  if (!allowedRoles.includes(userRole)) {
    // Redirect to appropriate home
    if (userRole === 'super_admin') return <Navigate to="/dashboard" replace />;
    if (userRole === 'operator') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/my-tasks" replace />;
  }

  return children;
}