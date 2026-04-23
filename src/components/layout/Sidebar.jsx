import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions, hasPermission } from '@/lib/permissions.jsx';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Shield,
  MapPin,
  Clock,
  ListTodo,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Hexagon
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin'] },
  { path: '/employees', label: 'Employees', icon: Users, roles: ['super_admin'] },
  { path: '/permissions', label: 'Permissions', icon: Shield, roles: ['super_admin'] },
  { path: '/tasks', label: 'Task Board', icon: ClipboardList, roles: ['super_admin', 'operator'], permission: 'view_all_tasks' },
  { path: '/my-tasks', label: 'My Tasks', icon: ListTodo, roles: ['employee'] },
  { path: '/locations', label: 'Locations', icon: MapPin, roles: ['super_admin', 'operator'], permission: 'view_employee_locations' },
  { path: '/clock-records', label: 'Clock Records', icon: Clock, roles: ['super_admin', 'operator'], permission: 'view_clock_records' },
];

export default function Sidebar() {
  const { user } = useAuth();
  const { permissions } = usePermissions();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const userRole = user?.role || 'employee';

  const visibleItems = NAV_ITEMS.filter(item => {
    if (!item.roles.includes(userRole)) return false;
    if (item.permission && userRole === 'operator') {
      return hasPermission(permissions, userRole, item.permission);
    }
    return true;
  });

  return (
    <aside className={cn(
      "h-screen bg-card border-r border-border flex flex-col transition-all duration-300 sticky top-0",
      collapsed ? "w-[72px]" : "w-[260px]"
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-border gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Hexagon className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight">
            Work<span className="text-primary">Grid</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User + Collapse */}
      <div className="border-t border-border p-3 space-y-2">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
              {(user.full_name || user.email || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{user.full_name || user.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{(userRole || '').replace('_', ' ')}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => base44.auth.logout()}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors flex-1",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Logout</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}