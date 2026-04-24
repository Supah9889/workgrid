import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useChat } from '@/hooks/useChat';
import GeneralChat from './GeneralChat';
import PrivateChat from './PrivateChat';
import { cn } from '@/lib/utils';

export default function ChatPanel() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('general');
  const { totalUnread, markAsRead } = useChat(user);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-primary text-primary-foreground rounded-l-xl w-9 h-14 flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
        title="Chat"
      >
        <div className="relative">
          <MessageCircle className="w-5 h-5" />
          {totalUnread > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </div>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 h-screen z-50 flex flex-col bg-card border-l border-border shadow-2xl transition-transform duration-300",
          "w-full sm:w-80",
          open ? "translate-x-0" : "translate-x-full"
        )}
        style={{ paddingRight: 'var(--sar)' }}
      >
        {/* Header */}
        <div className="bg-sidebar h-11 flex items-center justify-between px-4 flex-shrink-0">
          <span className="text-sm font-bold text-sidebar-foreground">Team Chat</span>
          <button onClick={() => setOpen(false)} className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          {['general', 'private'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
                tab === t
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {tab === 'general' ? (
            <GeneralChat user={user} markAsRead={markAsRead} />
          ) : (
            <PrivateChat user={user} markAsRead={markAsRead} />
          )}
        </div>
      </div>
    </>
  );
}