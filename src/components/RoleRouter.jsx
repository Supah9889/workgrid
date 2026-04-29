import { useAuth } from '@/lib/AuthContext';
import { Navigate } from 'react-router-dom';

export default function RoleRouter() {
  const { user } = useAuth();

  if (!user) return null;

  const role = user.role || 'employee';
  const destination = (role === 'owner' || role === 'super_admin' || role === 'operator')
    ? '/dashboard'
    : '/my-tasks';

  console.info('[RoleRouter] Routing user by role.', {
    email: user.email,
    role,
    destination,
  });

  return <Navigate to={destination} replace />;
}
