import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const TYPE_BORDER = {
  task: 'border-l-blue-500',
  clock: 'border-l-yellow-500',
  alert: 'border-l-red-500',
  chat: 'border-l-green-500',
  system: 'border-l-slate-500',
};

const TYPE_ICON = {
  task: '📋',
  clock: '🕐',
  alert: '⚠️',
  chat: '💬',
  system: '🔔',
};

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!user?.email) return;
    setLoading(true);
    const data = await base44.entities.Notification.filter(
      { recipient_email: user.email },
      '-created_at',
      50
    );
    setNotifications(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
    const unsub = base44.entities.Notification.subscribe(() => fetchNotifications());
    return unsub;
  }, [user?.email]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const displayed = tab === 'unread' ? notifications.filter(n => !n.read) : notifications;

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    fetchNotifications();
  };

  const handleClick = async (n) => {
    if (!n.read) await base44.entities.Notification.update(n.id, { read: true });
    setOpen(false);
    if (n.type === 'task') navigate('/tasks');
    else if (n.type === 'clock' || n.type === 'alert') navigate('/audit-log');
    else if (n.type === 'chat') navigate('/');
    else navigate('/dashboard');
    fetchNotifications();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-1.5 rounded-md hover:bg-muted transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="flex border-b border-border">
              {['all', 'unread'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                    tab === t
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t} {t === 'unread' && unreadCount > 0 && `(${unreadCount})`}
                </button>
              ))}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : displayed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Bell className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs">No notifications yet</p>
                </div>
              ) : (
                displayed.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex gap-3 px-4 py-3 border-l-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                      TYPE_BORDER[n.type] || TYPE_BORDER.system
                    } ${!n.read ? 'bg-muted/30' : ''}`}
                  >
                    <span className="text-lg leading-none mt-0.5">
                      {TYPE_ICON[n.type] || '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}