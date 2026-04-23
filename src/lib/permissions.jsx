import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const PermissionsContext = createContext(null);

const DEFAULT_PERMISSIONS = {
  operator: {
    view_all_tasks: true,
    create_tasks: true,
    reassign_tasks: false,
    view_employee_locations: false,
    view_clock_records: false,
    view_own_location: false,
    view_own_clock_records: false,
    access_notifications: true,
    add_notes_to_tasks: true,
    view_activity_feed: false,
  },
  employee: {
    view_all_tasks: false,
    create_tasks: false,
    reassign_tasks: false,
    view_employee_locations: false,
    view_clock_records: false,
    view_own_location: true,
    view_own_clock_records: true,
    access_notifications: true,
    add_notes_to_tasks: true,
    view_activity_feed: false,
  },
};

export function PermissionsProvider({ children }) {
  const [permissionsByRole, setPermissionsByRole] = useState({ operator: null, employee: null });
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    const records = await base44.entities.RolePermission.list();
    const result = { operator: null, employee: null };

    for (const role of ['operator', 'employee']) {
      const found = records.find(r => r.role === role);
      if (found) {
        result[role] = found;
      } else {
        const created = await base44.entities.RolePermission.create({ role, ...DEFAULT_PERMISSIONS[role] });
        result[role] = created;
      }
    }
    setPermissionsByRole(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPermissions();
    const unsubscribe = base44.entities.RolePermission.subscribe((event) => {
      if (event.type === 'update' || event.type === 'create') {
        const role = event.data.role;
        if (role === 'operator' || role === 'employee') {
          setPermissionsByRole(prev => ({ ...prev, [role]: event.data }));
        }
      }
    });
    return unsubscribe;
  }, [fetchPermissions]);

  // Legacy: expose operator permissions as `permissions` for backward compat
  const permissions = permissionsByRole.operator;

  const updatePermission = async (role, key, value) => {
    const record = permissionsByRole[role];
    if (!record) return;
    await base44.entities.RolePermission.update(record.id, { [key]: value });
  };

  return (
    <PermissionsContext.Provider value={{ permissions, permissionsByRole, loading, updatePermission, refetch: fetchPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error('usePermissions must be used inside PermissionsProvider');
  return ctx;
}

export function hasPermission(permissions, userRole, permissionKey) {
  if (userRole === 'super_admin') return true;
  if (permissions && (userRole === 'operator' || userRole === 'employee')) {
    return !!permissions[permissionKey];
  }
  return false;
}