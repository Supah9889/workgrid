import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const PermissionsContext = createContext(null);

// Role-based safety ceiling: a permission CAN only be enabled for a role if listed here.
// Super admin / owner always get everything regardless.
export const ROLE_ALLOWED_PERMISSIONS = {
  operator: [
    'view_all_tasks', 'create_tasks', 'reassign_tasks',
    'view_employee_locations', 'view_clock_records',
    'access_notifications', 'add_notes_to_tasks', 'view_activity_feed',
  ],
  employee: [
    'view_own_location', 'view_own_clock_records',
    'access_notifications', 'add_notes_to_tasks',
  ],
};

export const DEFAULT_PERMISSIONS = {
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

/**
 * THE single source of truth for permission checking.
 *
 * Priority:
 *  1. super_admin / owner → always true
 *  2. User-specific record (from UserPermission entity) if it exists
 *  3. Role-level record (from RolePermission entity) if it exists
 *  4. Hard-coded DEFAULT_PERMISSIONS for the role
 *
 * A permission is also capped by ROLE_ALLOWED_PERMISSIONS — if the role
 * structurally cannot hold a permission, it returns false regardless of stored value.
 */
export function computeEffectivePermissions(userEmail, userRole, userPermissionsMap, permissionsByRole) {
  if (userRole === 'super_admin' || userRole === 'owner') {
    // Full access — return all keys as true
    const all = {};
    Object.keys(DEFAULT_PERMISSIONS.operator).forEach(k => { all[k] = true; });
    return all;
  }

  // Pick the stored permissions: user-level first, then role-level, then code defaults
  let base;
  if (userEmail && userPermissionsMap?.[userEmail]) {
    base = userPermissionsMap[userEmail];
  } else if (userRole && permissionsByRole?.[userRole]) {
    base = permissionsByRole[userRole];
  } else {
    base = DEFAULT_PERMISSIONS[userRole] || {};
  }

  // Apply role ceiling — strip permissions the role can never hold
  const allowed = ROLE_ALLOWED_PERMISSIONS[userRole] || [];
  const effective = {};
  Object.keys(DEFAULT_PERMISSIONS.operator).forEach(key => {
    effective[key] = allowed.includes(key) ? !!base[key] : false;
  });
  return effective;
}

/**
 * Simple boolean check — convenience wrapper around computeEffectivePermissions.
 */
export function can(userEmail, userRole, permissionKey, userPermissionsMap, permissionsByRole) {
  if (userRole === 'super_admin' || userRole === 'owner') return true;
  const effective = computeEffectivePermissions(userEmail, userRole, userPermissionsMap, permissionsByRole);
  return !!effective[permissionKey];
}

export function PermissionsProvider({ children }) {
  const [permissionsByRole, setPermissionsByRole] = useState({ operator: null, employee: null });
  const [userPermissions, setUserPermissions] = useState({});
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

    let unsubUser = () => {};
    try {
      unsubUser = base44.entities.UserPermission.subscribe((event) => {
        if (event.type === 'update' || event.type === 'create') {
          const email = event.data?.user_email;
          if (email) setUserPermissions(prev => ({ ...prev, [email]: event.data }));
        }
        if (event.type === 'delete') fetchPermissions();
      });
    } catch { /* ignore */ }

    return () => { unsubRole(); unsubUser(); };
  }, [fetchPermissions]);

  return (
    <PermissionsContext.Provider value={{
      permissionsByRole,
      userPermissions,
      loading,
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
 * Hook: returns a `can(permissionKey)` function for the currently logged-in user.
 * Usage: const { can } = useUserPermissions(user);
 */
export function useUserCan(user) {
  const { permissionsByRole, userPermissions } = usePermissions();
  return useCallback(
    (permissionKey) => can(user?.email, user?.role, permissionKey, userPermissions, permissionsByRole),
    [user?.email, user?.role, userPermissions, permissionsByRole]
  );
}