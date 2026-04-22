import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';

export default function RoleRouter() {
  const { user } = useAuth();

  if (!user) return null;

  const role = user.role || 'employee';

  if (role === 'super_admin') return <Navigate to="/dashboard" replace />;
  if (role === 'operator') return <Navigate to="/tasks" replace />;
  return <Navigate to="/my-tasks" replace />;
}