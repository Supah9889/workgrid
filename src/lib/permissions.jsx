import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const PermissionsContext = createContext(null);

const DEFAULT_OPERATOR_PERMISSIONS = {
  view_all_tasks: true,
  create_tasks: true,
  reassign_tasks: false,
  view_employee_locations: false,
  view_clock_records: false,
};

export function PermissionsProvider({ children }) {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    const records = await base44.entities.RolePermission.list();
    const operatorPerms = records.find(r => r.role === 'operator');
    if (operatorPerms) {
      setPermissions(operatorPerms);
    } else {
      const created = await base44.entities.RolePermission.create({
        role: 'operator',
        ...DEFAULT_OPERATOR_PERMISSIONS,
      });
      setPermissions(created);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPermissions();

    const unsubscribe = base44.entities.RolePermission.subscribe((event) => {
      if (event.type === 'update' || event.type === 'create') {
        if (event.data.role === 'operator') {
          setPermissions(event.data);
        }
      }
    });

    return unsubscribe;
  }, [fetchPermissions]);

  const updatePermission = async (key, value) => {
    if (!permissions) return;
    await base44.entities.RolePermission.update(permissions.id, { [key]: value });
  };

  return (
    <PermissionsContext.Provider value={{ permissions, loading, updatePermission, refetch: fetchPermissions }}>
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
  if (userRole === 'operator' && permissions) return !!permissions[permissionKey];
  return false;
}