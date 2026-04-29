import { base44 } from '@/api/base44Client';

const VALID_ROLES = ['owner', 'super_admin', 'operator', 'employee'];
const ADMIN_ROLES = ['owner', 'super_admin', 'operator'];
const ROLE_PRIORITY = {
  owner: 4,
  super_admin: 3,
  operator: 2,
  employee: 1,
};

export function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

export function isAdminProfile(profile) {
  return ADMIN_ROLES.includes(profile?.role);
}

function getErrorInfo(error) {
  return {
    message: error?.message || String(error),
    status: error?.status || error?.response?.status || error?.data?.status || null,
  };
}

function sanitizeRole(role) {
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
      return profiles.map(p => normalizeProfile(p)).filter(Boolean);
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
  if (!normalizedEmail) throw new Error('Authenticated user is missing an email.');
  if (!pinHash) throw new Error('PIN hash is required.');

  const records = await filterEmployeeProfiles(normalizedEmail);
  const existing = normalizeProfile(sortBestProfile(records));
  const payload = {
    email: normalizedEmail,
    full_name: fullName,
    contact_phone: contactPhone,
    pin_hash: pinHash,
    has_onboarded: true,
    role: isAdminProfile(existing) ? existing.role : 'employee',
    status: existing?.status || 'active',
  };

  try {
    if (existing?.id) {
      return normalizeProfile(await base44.entities.EmployeeProfile.update(existing.id, payload));
    }
    return normalizeProfile(await base44.entities.EmployeeProfile.create(payload));
  } catch (error) {
    const info = getErrorInfo(error);
    console.error('[EmployeeProfile] onboarding profile save failed', {
      email: normalizedEmail,
      targetProfileId: existing?.id || null,
      status: info.status,
      message: info.message,
    });
    throw error;
  }
}
