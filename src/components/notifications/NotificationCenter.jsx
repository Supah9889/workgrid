import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Bell, CheckCheck, Package, Clock, AlertTriangle, MessageSquare, Settings, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const CATEGORY_CONFIG = {
  task:   { icon: Package,       border: 'border-l-blue-500',   iconCls: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  clock:  { icon: Clock,         border: 'border-l-yellow-500', iconCls: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  alert:  { icon: AlertTriangle, border: 'border-l-red-500',    iconCls: 'text-red-400',    bg: 'bg-red-500/10'    },
  chat:   { icon: MessageSquare, border: 'border-l-green-500',  iconCls: 'text-green-400',  bg: 'bg-green-500/10'  },
  system: { icon: Settings,      border: 'border-l-slate-400',  iconCls: 'text-slate-400',  bg: 'bg-slate-500/10'  },
};

function timeAgo(dateStr) {
  try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true }); }
  catch { return ''; }
}

export default function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('all');
  const panelRef = useRef(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ recipient_email: user.email }),
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!user?.email) return;
    const unsub = base44.entities.Notification.subscribe(() =>
      queryClient.invalidateQueries({ queryKey: ['notifications', user.email] })
    );
    return unsub;
  }, [user?.email, queryClient]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unread = notifications.filter(n => !n.read);
  const displayed = tab === 'unread'
    ? unread
    : [...notifications].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const markAllRead = async () => {
    try {
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.email] });
    } catch {
      // non-critical, silently ignore
    }
  };

  const handleClick = async (n) => {
    try {
      if (!n.read) {
        await base44.entities.Notification.update(n.id, { read: true });
        queryClient.invalidateQueries({ queryKey: ['notifications', user?.email] });
      }
    } catch {
      // non-critical, continue with navigation
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-sm">Notifications</span>
            <div className="flex items-center gap-3">
              {unread.length > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex border-b border-border">
            {['all', 'unread'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-xs font-medium transition-colors capitalize ${
                  tab === t
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'all' ? `All (${notifications.length})` : `Unread (${unread.length})`}
              </button>
            ))}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {displayed.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {tab === 'unread' ? 'All caught up!' : 'No notifications yet'}
              </div>
            ) : (
              displayed.map(n => {
                const cfg = CATEGORY_CONFIG[n.category] || CATEGORY_CONFIG.system;
                const Icon = cfg.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex gap-3 px-4 py-3 border-l-2 cursor-pointer transition-colors hover:bg-muted/50 ${
                      n.read ? 'border-l-transparent opacity-60' : cfg.border
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${cfg.iconCls}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-snug">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_date)}</p>
                    </div>
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
