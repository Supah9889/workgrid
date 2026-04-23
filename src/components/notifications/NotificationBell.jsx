import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const TYPE_STYLES = {
  info: 'bg-blue-50 border-blue-200',
  warning: 'bg-yellow-50 border-yellow-200',
  error: 'bg-red-50 border-red-200',
  success: 'bg-emerald-50 border-emerald-200',
};

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user?.email) return;
    const data = await base44.entities.Notification.filter({ recipient_email: user.email });
    // Sort newest first
    setNotifications(data.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 30));
  };

  useEffect(() => {
    fetchNotifications();
    const unsub = base44.entities.Notification.subscribe(() => fetchNotifications());
    return unsub;
  }, [user?.email]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = async (n) => {
    if (!n.read) {
      await base44.entities.Notification.update(n.id, { read: true });
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    setNotifications(prev => prev.map(x => ({ ...x, read: true })));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                onClick={() => markRead(n)}
                className={`w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                  <div className={!n.read ? '' : 'pl-4'}>
                    <p className="text-xs font-semibold">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {n.created_date ? format(new Date(n.created_date), 'MMM d, h:mm a') : ''}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}