import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useAuth } from '@/lib/AuthContext';

export default function AppLayout() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-11 border-b border-border bg-card flex items-center justify-end px-5 gap-3 flex-shrink-0">
          <NotificationBell />
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {(user?.full_name || user?.email || '?')[0].toUpperCase()}
            </div>
            <span className="text-xs font-medium hidden sm:block">{user?.full_name || user?.email}</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}