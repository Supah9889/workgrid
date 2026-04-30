import { base44 } from '@/api/base44Client';

const VALID_ROLES = ['owner', 'super_admin', 'operator', 'employee', 'user'];
const ADMIN_ROLES = ['owner', 'super_admin', 'operator'];
const PIN_RESET_ROLES = ['owner', 'super_admin'];
const ROLE_PRIORITY = {
  owner: 4,
  super_admin: 3,
  operator: 2,
  employee: 1,
  user: 1,
};

export function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function getAuthEmailForWrite(email) {
  return (email || '').trim();
}

export function isAdminProfile(profile) {
  return ADMIN_ROLES.includes(profile?.role);
}

export function canResetEmployeePin(profile) {
  return PIN_RESET_ROLES.includes(profile?.role);
}

function getErrorInfo(error) {
  return {
    message: error?.message || String(error),
    status: error?.status || error?.response?.status || error?.data?.status || null,
  };
}

function getSafeErrorObject(error) {
  if (!error || typeof error !== 'object') return { value: String(error) };

  return {
    name: error.name || null,
    message: error.message || null,
    status: error.status || error.response?.status || error.data?.status || null,
    code: error.code || error.data?.code || null,
    data: error.data || error.response?.data || null,
  };
}

function sanitizeRole(role) {
  if (role === 'user') return 'employee';
  return VALID_ROLES.includes(role) ? role : 'employee';
}

function sortBestProfile(records = []) {
  return [...records].sort((a, b) => {
    const aActive = a.status !== 'inactive' ? 1 : 0;
    const bActive = b.status !== 'inactive' ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;

    const aRolePriority = ROLE_PRIORITY[sanitizeRole(a.role)] || 0;
    const bRolePriority = ROLE_PRIORITY[sanitizeRole(b.role)] || 0;
    if (aRolePriority !== bRolePriority) return bRolePriority - aRolePriority;

    const aReady = a.has_onboarded && a.pin_hash ? 1 : 0;
    const bReady = b.has_onboarded && b.pin_hash ? 1 : 0;
    if (aReady !== bReady) return bReady - aReady;

    return new Date(b.updated_date || b.created_date || 0) - new Date(a.updated_date || a.created_date || 0);
  })[0] || null;
}

function dedupeProfilesByEmail(records = []) {
  const byEmail = records.reduce((map, record) => {
    const email = normalizeEmail(record.email);
    if (!email) return map;
    if (!map[email]) map[email] = [];
    map[email].push(record);
    return map;
  }, {});

  return Object.entries(byEmail).map(([email, emailRecords]) => {
    if (emailRecords.length > 1) {
      const selected = normalizeProfile(sortBestProfile(emailRecords));
      console.warn('[EmployeeProfile] Duplicate profiles in list; using best match.', {
        email,
        count: emailRecords.length,
        selected_profile_id: selected?.id || null,
        selected_role: selected?.role || null,
        records: emailRecords.map(r => ({
          id: r.id,
          role: sanitizeRole(r.role),
          status: r.status || 'active',
          has_pin: !!r.pin_hash,
          has_onboarded: r.has_onboarded === true,
        })),
      });
    }
    return normalizeProfile(sortBestProfile(emailRecords));
  }).filter(Boolean);
}

function normalizeProfile(profile, source = 'EmployeeProfile') {
  if (!profile) return null;
  return {
    ...profile,
    email: normalizeEmail(profile.email),
    role: sanitizeRole(profile.role),
    status: profile.status || 'active',
    _profileSource: source,
  };
}

async function filterEmployeeProfiles(email) {
  const normalizedEmail = normalizeEmail(email);
  try {
    return await base44.entities.EmployeeProfile.filter({ email: normalizedEmail });
  } catch (error) {
    const info = getErrorInfo(error);
    console.error('[EmployeeProfile] profile lookup failed', {
      email: normalizedEmail,
      status: info.status,
      message: info.message,
    });
    throw error;
  }
}

async function getLegacyUserProfile(email) {
  const normalizedEmail = normalizeEmail(email);
  try {
    const legacy = await base44.entities.User.filter({ email: normalizedEmail });
    return normalizeProfile(sortBestProfile(legacy), 'User');
  } catch (error) {
    console.warn('[EmployeeProfile] Legacy User fallback lookup failed.', error);
    return null;
  }
}

export async function getEmployeeProfileByEmail(email, { allowLegacyFallback = true } = {}) {
  const normalizedEmail = normalizeEmail(email);
  const records = await filterEmployeeProfiles(normalizedEmail);
  if (records?.length > 1) {
    const selected = normalizeProfile(sortBestProfile(records));
    console.warn('[EmployeeProfile] Duplicate profiles found; using best match.', {
      email: normalizedEmail,
      count: records.length,
      selected_profile_id: selected?.id || null,
      selected_role: selected?.role || null,
      records: records.map(r => ({
        id: r.id,
        role: sanitizeRole(r.role),
        status: r.status || 'active',
        has_pin: !!r.pin_hash,
        has_onboarded: r.has_onboarded === true,
      })),
    });
  }

  const profile = normalizeProfile(sortBestProfile(records));
  if (profile) return profile;

  if (!allowLegacyFallback) {
    console.error('[EmployeeProfile] profile missing', { email: normalizedEmail });
    return null;
  }

  const legacy = await getLegacyUserProfile(normalizedEmail);
  if (legacy) {
    console.warn('[EmployeeProfile] Using legacy User profile fallback.', {
      email: normalizedEmail,
      role: legacy.role,
    });
  } else {
    console.error('[EmployeeProfile] profile missing', { email: normalizedEmail });
  }
  return legacy;
}

export async function listEmployeeProfiles({ allowLegacyFallback = true } = {}) {
  try {
    const profiles = await base44.entities.EmployeeProfile.list();
    if (profiles.length > 0 || !allowLegacyFallback) {
      return dedupeProfilesByEmail(profiles);
    }
  } catch (error) {
    const info = getErrorInfo(error);
    console.error('[EmployeeProfile] profile lookup failed', {
      status: info.status,
      message: info.message,
    });
    if (!allowLegacyFallback) throw error;
  }

  if (!allowLegacyFallback) return [];

  try {
    const legacy = await base44.entities.User.list();
    console.warn('[EmployeeProfile] Using legacy User list fallback.');
    return legacy.map(u => normalizeProfile(u, 'User')).filter(Boolean);
  } catch (error) {
    console.warn('[EmployeeProfile] Legacy User list fallback failed.', error);
    return [];
  }
}

export async function ensureEmployeeProfileForAuthUser(authUser) {
  const normalizedEmail = normalizeEmail(authUser?.email);
  if (!normalizedEmail) throw new Error('Authenticated user is missing an email.');

  const existing = await getEmployeeProfileByEmail(normalizedEmail, { allowLegacyFallback: false });
  if (existing) return existing;

  const legacy = await getLegacyUserProfile(normalizedEmail);
  const payload = {
    email: normalizedEmail,
    full_name: legacy?.full_name || authUser?.full_name || authUser?.name || '',
    contact_phone: legacy?.contact_phone || '',
    pin_hash: legacy?.pin_hash || '',
    role: sanitizeRole(legacy?.role),
    status: legacy?.status || 'active',
    has_onboarded: legacy?.has_onboarded === true,
  };

  try {
    return normalizeProfile(await base44.entities.EmployeeProfile.create(payload));
  } catch (error) {
    const info = getErrorInfo(error);
    console.error('[EmployeeProfile] profile create failed', {
      email: normalizedEmail,
      status: info.status,
      message: info.message,
    });
    if (legacy) {
      console.warn('[EmployeeProfile] Continuing with legacy User profile after EmployeeProfile.create failure.', {
        email: normalizedEmail,
        role: legacy.role,
      });
      return legacy;
    }
    throw error;
  }
}

export async function saveOwnEmployeeProfile({ authEmail, fullName, contactPhone, pinHash }) {
  const normalizedEmail = normalizeEmail(authEmail);
  const authEmailForWrite = getAuthEmailForWrite(authEmail);
  if (!normalizedEmail) throw new Error('Authenticated user is missing an email.');
  if (!pinHash) throw new Error('PIN hash is required.');

  const records = await filterEmployeeProfiles(normalizedEmail);
  const existing = normalizeProfile(sortBestProfile(records));
  const operation = existing?.id ? 'update' : 'create';
  const safeFullName = (fullName || '').trim() || normalizedEmail;
  const safeContactPhone = (contactPhone || '').trim() || '0000000000';
  const fullPayload = {
    email: authEmailForWrite,
    contact_email: authEmailForWrite,
    full_name: safeFullName,
    contact_phone: safeContactPhone,
    pin_hash: pinHash,
    has_onboarded: true,
    role: 'employee',
    status: 'active',
  };
  const updatePayload = {
    email: authEmailForWrite,
    contact_email: authEmailForWrite,
    full_name: safeFullName,
    contact_phone: safeContactPhone,
    pin_hash: pinHash,
    has_onboarded: true,
    status: existing?.status || 'active',
  };
  if (!isAdminProfile(existing)) {
    updatePayload.role = 'employee';
  }

  try {
    if (existing?.id) {
      return normalizeProfile(await base44.entities.EmployeeProfile.update(existing.id, updatePayload));
    }
    return normalizeProfile(await base44.entities.EmployeeProfile.create(fullPayload));
  } catch (error) {
    const info = getErrorInfo(error);
    error.operation = operation;
    if (operation === 'create') {
      const retryRecords = await filterEmployeeProfiles(normalizedEmail);
      const retryExisting = normalizeProfile(sortBestProfile(retryRecords));
      if (retryExisting?.id) {
        console.warn('[EmployeeProfile] create failed but profile now exists; retrying as update.', {
          authEmail,
          normalizedEmail,
          targetProfileId: retryExisting.id,
        });
        const retryUpdatePayload = {
          email: authEmailForWrite,
          contact_email: authEmailForWrite,
          full_name: safeFullName,
          contact_phone: safeContactPhone,
          pin_hash: pinHash,
          has_onboarded: true,
          status: retryExisting.status || 'active',
        };
        if (!isAdminProfile(retryExisting)) {
          retryUpdatePayload.role = 'employee';
        }
        return normalizeProfile(await base44.entities.EmployeeProfile.update(retryExisting.id, retryUpdatePayload));
      }
    }
    console.error('[EmployeeProfile] onboarding profile save failed', {
      operation,
      authEmail,
      email: normalizedEmail,
      normalizedEmail,
      payloadKeys: Object.keys(existing?.id ? updatePayload : fullPayload),
      targetProfileId: existing?.id || null,
      status: info.status,
      message: info.message,
      error: getSafeErrorObject(error),
    });
    throw error;
  }
}

export async function resetEmployeePin({ adminProfile, employeeProfile }) {
  if (!canResetEmployeePin(adminProfile)) {
    throw new Error('Only owners and super admins can reset employee PINs.');
  }
  if (!employeeProfile?.id || !employeeProfile?.email) {
    throw new Error('Employee profile is required.');
  }

  const adminEmail = normalizeEmail(adminProfile.email);
  const employeeEmail = normalizeEmail(employeeProfile.email);
  const timestamp = new Date().toISOString();

  const updated = await base44.entities.EmployeeProfile.update(employeeProfile.id, {
    pin_hash: '',
    has_onboarded: false,
  });

  try {
    await base44.entities.ActivityFeed.create({
      event_type: 'pin_reset',
      description: `${adminProfile.full_name || adminEmail} reset PIN setup for ${employeeProfile.full_name || employeeEmail}`,
      actor_email: adminEmail,
      actor_name: adminProfile.full_name || adminEmail,
      entity_id: employeeProfile.id,
      entity_type: 'EmployeeProfile',
      metadata: {
        action: 'pin_reset',
        admin_email: adminEmail,
        employee_email: employeeEmail,
        timestamp,
      },
    });
  } catch (error) {
    console.warn('[EmployeeProfile] PIN reset audit log failed.', error);
  }

  return normalizeProfile(updated);
}
