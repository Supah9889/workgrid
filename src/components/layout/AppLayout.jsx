import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import ChatPanel from '@/components/chat/ChatPanel';
import { useAuth } from '@/lib/AuthContext';
import { Menu } from 'lucide-react';

export default function AppLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <>
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <div className={`fixed inset-y-0 left-0 z-50 md:relative md:block transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
      </>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-11 border-b border-border bg-card flex items-center justify-end px-5 gap-3 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-md hover:bg-muted transition-colors mr-2">
            <Menu className="w-5 h-5" />
          </button>
          <NotificationCenter />
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {(user?.full_name || user?.email || '?')[0].toUpperCase()}
            </div>
            <span className="text-xs font-medium hidden sm:block">{user?.full_name || user?.email}</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>
      <ChatPanel />
    </div>
  );
}