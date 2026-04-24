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
  // Per-user permission overrides: { [email]: { ...permFields } }
  const [userPermissions, setUserPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    // Load role-level permissions
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

    // Load all user-level permission overrides
    try {
      const userPerms = await base44.entities.UserPermission.list();
      const map = {};
      userPerms.forEach(p => { map[p.user_email] = p; });
      setUserPermissions(map);
    } catch { /* UserPermission entity may not exist yet */ }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPermissions();

    const unsubRole = base44.entities.RolePermission.subscribe((event) => {
      if (event.type === 'update' || event.type === 'create') {
        const role = event.data.role;
        if (role === 'operator' || role === 'employee') {
          setPermissionsByRole(prev => ({ ...prev, [role]: event.data }));
        }
      }
    });

    // Subscribe to user-level permission changes
    let unsubUser = () => {};
    try {
      unsubUser = base44.entities.UserPermission.subscribe((event) => {
        if (event.type === 'update' || event.type === 'create') {
          const email = event.data.user_email;
          if (email) setUserPermissions(prev => ({ ...prev, [email]: event.data }));
        }
        if (event.type === 'delete') {
          fetchPermissions(); // re-fetch to clear deleted record
        }
      });
    } catch { /* ignore if entity doesn't exist */ }

    return () => { unsubRole(); unsubUser(); };
  }, [fetchPermissions]);

  // Legacy: expose operator permissions as `permissions` for backward compat
  const permissions = permissionsByRole.operator;

  const updatePermission = async (role, key, value) => {
    const record = permissionsByRole[role];
    if (!record) return;
    await base44.entities.RolePermission.update(record.id, { [key]: value });
  };

  // Get effective permissions for a specific user (user-level override OR role default)
  const getPermissionsForUser = (userEmail, userRole) => {
    if (userPermissions[userEmail]) return userPermissions[userEmail];
    if (userRole === 'operator' || userRole === 'employee') {
      return permissionsByRole[userRole] || DEFAULT_PERMISSIONS[userRole];
    }
    return DEFAULT_PERMISSIONS.employee;
  };

  return (
    <PermissionsContext.Provider value={{
      permissions,
      permissionsByRole,
      userPermissions,
      loading,
      updatePermission,
      getPermissionsForUser,
      refetch: fetchPermissions,
    }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error('usePermissions must be used inside PermissionsProvider');
  return ctx;
}

/**
 * Check if a user has a specific permission.
 * Checks user-level overrides first, then falls back to role-level permissions.
 */
export function hasPermission(permissions, userRole, permissionKey, userEmail, userPermissionsMap) {
  if (userRole === 'super_admin' || userRole === 'owner') return true;

  // Check user-level override first
  if (userEmail && userPermissionsMap && userPermissionsMap[userEmail]) {
    return !!userPermissionsMap[userEmail][permissionKey];
  }

  // Fall back to role-level permission
  if (permissions && (userRole === 'operator' || userRole === 'employee')) {
    return !!permissions[permissionKey];
  }
  return false;
}