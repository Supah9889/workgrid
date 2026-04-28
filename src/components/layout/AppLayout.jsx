import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import ChatPanel from '@/components/chat/ChatPanel';
import { useAuth } from '@/lib/AuthContext';
import { LogOut, Menu } from 'lucide-react';

export default function AppLayout() {
  const { user, logout } = useAuth();
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
        <header
          className="border-b border-border bg-card flex items-center justify-between px-3 sm:px-5 gap-2 flex-shrink-0"
          style={{ paddingTop: 'calc(0.75rem + var(--sat))', minHeight: 'calc(2.75rem + var(--sat))' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-md hover:bg-muted transition-colors" aria-label="Open navigation menu">
              <Menu className="w-5 h-5" />
            </button>
            <div className="md:hidden min-w-0">
              <p className="text-xs font-semibold truncate max-w-[9rem]">{user?.full_name || user?.email}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{(user?.role || 'employee').replace('_', ' ')}</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 sm:gap-3">
            <NotificationCenter />
            <button
              type="button"
              onClick={() => logout()}
              className="md:hidden inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
            <div className="hidden md:block w-px h-5 bg-border" />
            <div className="hidden md:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {(user?.full_name || user?.email || '?')[0].toUpperCase()}
              </div>
              <span className="text-xs font-medium hidden sm:block">{user?.full_name || user?.email}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto main-content-pad page-scroll-container">
          <Outlet />
        </main>
      </div>
      <ChatPanel />
    </div>
  );
}
