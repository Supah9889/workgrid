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
  Hexagon,
  FileText,
  Radio,
  BookUser,
  Lock,
  DollarSign,
  BarChart2,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const SUPER_ADMIN_NAV = [
  { path: '/dashboard',             label: 'Dashboard',        icon: LayoutDashboard },
  { path: '/tasks',                 label: 'Task Board',       icon: ClipboardList },
  { path: '/clock-records',         label: 'Time & Attendance', icon: Clock },
  { path: '/audit-log',             label: 'Audit Log',        icon: FileText },
  { path: '/locations',             label: 'Location Board',   icon: MapPin },
  { path: '/employees',             label: 'Employees',        icon: Users },
  { path: '/employees/repository',  label: 'Directory',        icon: BookUser },
  { path: '/contact-directory',     label: 'Contacts',         icon: BookUser },
  { path: '/geofence-settings',     label: 'Geofence',         icon: Radio },
  { path: '/permissions',           label: 'Permissions',      icon: Shield },
  { path: '/payroll',              label: 'Payroll',          icon: DollarSign },
  { path: '/security-dashboard',   label: 'Security',         icon: Lock },
  { path: '/analytics',            label: 'Analytics',        icon: BarChart2 },
];

const OPERATOR_NAV = [
  { path: '/dashboard',             label: 'Dashboard',        icon: LayoutDashboard },
  { path: '/tasks',                 label: 'Task Board',       icon: ClipboardList, permission: 'view_all_tasks' },
  { path: '/clock-records',         label: 'Time & Attendance', icon: Clock, permission: 'view_clock_records' },
  { path: '/audit-log',             label: 'Audit Log',        icon: FileText, permission: 'view_clock_records' },
  { path: '/locations',             label: 'Location Board',   icon: MapPin, permission: 'view_employee_locations' },
  { path: '/employees/repository',  label: 'Directory',        icon: BookUser },
  { path: '/contact-directory',     label: 'Contacts',         icon: BookUser },
];

const EMPLOYEE_NAV = [
  { path: '/my-tasks',          label: 'My Tasks',         icon: ListTodo },
  { path: '/contact-directory', label: 'My Contact Info',  icon: BookUser },
];

export default function Sidebar({ onClose }) {
  const { user } = useAuth();
  const { permissions, userPermissions, permissionsByRole } = usePermissions();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const userRole = user?.role || 'employee';

  let navItems = [];
  if (userRole === 'owner') navItems = SUPER_ADMIN_NAV;
  else if (userRole === 'super_admin') navItems = SUPER_ADMIN_NAV;
  else if (userRole === 'operator') {
    navItems = OPERATOR_NAV.filter(item => {
      if (!item.permission) return true;
      return hasPermission(permissions, userRole, item.permission, user?.email, userPermissions, permissionsByRole);
    });
  } else {
    navItems = EMPLOYEE_NAV;
  }

  const isActive = (path) =>
    location.pathname === path || (path === '/dashboard' && location.pathname === '/');

  return (
    <aside className={cn(
      "h-screen flex flex-col transition-all duration-200 sticky top-0 z-30",
      "bg-sidebar border-r border-sidebar-border",
      collapsed ? "w-[56px]" : "w-[220px]"
    )}>
      {/* Logo */}
      <div className="h-11 flex items-center px-4 border-b border-sidebar-border gap-2.5 flex-shrink-0">
        <div className="w-6 h-6 rounded-md bg-sidebar-primary flex items-center justify-center flex-shrink-0">
          <Hexagon className="w-3.5 h-3.5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-sm font-bold tracking-tight text-sidebar-foreground">
            Work<span className="text-sidebar-primary">Grid</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => onClose?.()}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card border-t border-border flex items-center justify-around px-2 py-1">
        {[
          { path: '/dashboard', icon: LayoutDashboard, label: 'Home', roles: ['owner','super_admin','operator'] },
          { path: '/tasks', icon: ClipboardList, label: 'Tasks', roles: ['owner','super_admin','operator'] },
          { path: '/my-tasks', icon: ListTodo, label: 'My Tasks', roles: ['employee'] },
          { path: '/clock-records', icon: Clock, label: 'Clock', roles: ['owner','super_admin','operator'] },
          { path: '/my-tasks', icon: Clock, label: 'Clock', roles: ['employee'] },
        ]
          .filter(item => item.roles.includes(userRole))
          .slice(0, 4)
          .map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link key={item.label} to={item.path} onClick={() => onClose?.()}
                className={`flex flex-col items-center gap-0.5 px-3 py-3 min-h-[48px] rounded-lg transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                <Icon className="w-5 h-5" />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-2 space-y-1 flex-shrink-0">
        {!collapsed && user && (
          <div className="px-2.5 py-1.5">
            <p className="text-xs font-medium truncate text-sidebar-foreground">{user.full_name || user.email}</p>
            <p className="text-[10px] text-sidebar-foreground/60 capitalize">{(userRole || '').replace('_', ' ')}</p>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={() => base44.auth.logout()}
            className={cn(
              "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-red-400 transition-colors flex-1",
              collapsed && "justify-center"
            )}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-3.5 h-3.5" />
            {!collapsed && <span>Logout</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent transition-colors"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </aside>
  );
}