import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

function isAdminRole(role) {
  return role === 'owner' || role === 'super_admin' || role === 'operator';
}

function normalizeEmail(email) {
  return (email || '').toLowerCase().trim();
}

function isEmployeeSetupRecord(record, email) {
  return normalizeEmail(record?.email) === normalizeEmail(email) && (!record.role || record.role === 'employee');
}

function pickBestProfileRecord(records = []) {
  return [...records].sort((a, b) => {
    const aReady = a.has_onboarded && a.pin_hash ? 1 : 0;
    const bReady = b.has_onboarded && b.pin_hash ? 1 : 0;
    if (aReady !== bReady) return bReady - aReady;

    const aActive = a.status !== 'inactive' ? 1 : 0;
    const bActive = b.status !== 'inactive' ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;

    return new Date(b.updated_date || b.created_date || 0) - new Date(a.updated_date || a.created_date || 0);
  })[0] || null;
}

function pickOnboardingTarget(records = [], email) {
  const ownEmployeeRecords = records.filter(r => isEmployeeSetupRecord(r, email));
  const normalizedEmail = normalizeEmail(email);
  return pickBestProfileRecord(ownEmployeeRecords) || pickBestProfileRecord(records.filter(r => normalizeEmail(r.email) === normalizedEmail));
}

function getErrorInfo(error) {
  return {
    message: error?.message || String(error),
    status: error?.status || error?.response?.status || error?.data?.status || null,
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const onboardingComplete = useRef(false);

  useEffect(() => {
    checkAppState();
  }, []);

  const loadEmployeeProfile = async (authUser) => {
    const normalizedEmail = normalizeEmail(authUser.email);

    let results = [];
    try {
      results = await base44.entities.EmployeeProfile.filter({ email: normalizedEmail });
    } catch (err) {
      console.warn('[AuthContext] EmployeeProfile.filter failed:', err);
    }

    if (results?.length > 1) {
      console.warn('[AuthContext] Duplicate EmployeeProfile records for email; using best match.', {
        email: normalizedEmail,
        count: results.length,
      });
    }

    let profile = pickBestProfileRecord(results);

    if (!profile) {
      console.info('[AuthContext] Creating first-time EmployeeProfile.', { email: normalizedEmail });
      const payload = {
        email: normalizedEmail,
        role: 'employee',
        status: 'active',
        has_onboarded: false,
      };
      try {
        profile = await base44.entities.EmployeeProfile.create(payload);
      } catch (error) {
        const info = getErrorInfo(error);
        console.error('[AuthContext] EmployeeProfile.create failed', {
          email: normalizedEmail,
          status: info.status,
          message: info.message,
        });
        // Return a minimal in-memory profile so the app can still load
        profile = { email: normalizedEmail, role: 'employee', has_onboarded: false, status: 'active' };
      }
    }

    if (!profile.role || !['owner', 'super_admin', 'operator', 'employee'].includes(profile.role)) {
      profile = { ...profile, role: 'employee' };
    }

    return profile;
  };

  const applyAuthUser = (authUser, profile) => {
    const mergedUser = { ...authUser, ...profile };
    setUser(mergedUser);
    setIsAuthenticated(true);
    setNeedsOnboarding(mergedUser.has_onboarded !== true || !mergedUser.pin_hash);
    return mergedUser;
  };

  const reloadCurrentUser = async () => {
    console.info('[AuthContext] Reloading current user context.');
    const authUser = await base44.auth.me();
    const profile = await loadEmployeeProfile(authUser);
    const merged = applyAuthUser(authUser, profile);
    setIsLoadingAuth(false);
    setAuthChecked(true);
    return merged;
  };

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: { 'X-App-Id': appParams.appId },
        token: appParams.token,
        interceptResponses: true,
      });

      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);

        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);

        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({ type: 'auth_required', message: 'Authentication required' });
          } else if (reason === 'user_not_registered') {
            setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
          } else {
            setAuthError({ type: reason, message: appError.message });
          }
        } else {
          setAuthError({ type: 'unknown', message: appError.message || 'Failed to load app' });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const authUser = await base44.auth.me();

      let profile = null;
      try {
        profile = await loadEmployeeProfile(authUser);
      } catch (entityError) {
        console.error('[AuthContext] Failed to fetch/create EmployeeProfile:', entityError);
        profile = { email: normalizeEmail(authUser.email), role: 'employee', has_onboarded: false };
      }

      applyAuthUser(authUser, profile);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);

      if (error.status === 401 || error.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
    }
  };

  const completeOnboarding = (updatedUserFields = {}) => {
    onboardingComplete.current = true;
    setNeedsOnboarding(false);
    setUser(prev => prev ? { ...prev, has_onboarded: true, ...updatedUserFields } : prev);
  };

  const saveOnboardingProfile = async ({ fullName, contactPhone, pinHash }) => {
    const authUser = await base44.auth.me();
    const normalizedEmail = normalizeEmail(authUser.email);

    let records = [];
    try {
      records = await base44.entities.EmployeeProfile.filter({ email: normalizedEmail });
    } catch (err) {
      console.warn('[AuthContext] EmployeeProfile.filter failed during onboarding:', err);
    }

    const existing = pickOnboardingTarget(records, normalizedEmail);
    const canUpdateExisting = existing && isEmployeeSetupRecord(existing, normalizedEmail);

    const profilePayload = {
      email: normalizedEmail,
      full_name: fullName,
      contact_phone: contactPhone,
      pin_hash: pinHash,
      has_onboarded: true,
      role: 'employee',
      status: 'active',
    };

    console.info('[AuthContext] Saving onboarding EmployeeProfile.', {
      email: normalizedEmail,
      profileId: existing?.id || null,
      mode: canUpdateExisting ? 'update' : 'create',
    });

    let saved = null;

    if (canUpdateExisting && existing?.id) {
      try {
        saved = await base44.entities.EmployeeProfile.update(existing.id, profilePayload);
      } catch (error) {
        const info = getErrorInfo(error);
        console.error('[AuthContext] EmployeeProfile.update failed.', {
          email: normalizedEmail,
          status: info.status,
          message: info.message,
        });
        // Fall through to create
      }
    }

    if (!saved) {
      try {
        saved = await base44.entities.EmployeeProfile.create(profilePayload);
      } catch (error) {
        const info = getErrorInfo(error);
        console.error('[AuthContext] EmployeeProfile.create failed.', {
          email: normalizedEmail,
          status: info.status,
          message: info.message,
        });
        throw error;
      }
    }

    if (saved?.has_onboarded !== true || !saved?.pin_hash) {
      console.error('[AuthContext] Onboarding save returned incomplete EmployeeProfile.', saved);
      throw new Error('Profile save did not persist setup fields.');
    }

    completeOnboarding({
      ...saved,
      full_name: fullName,
      contact_phone: contactPhone,
      pin_hash: pinHash,
    });

    const reloaded = await reloadCurrentUser();
    if (reloaded?.has_onboarded !== true || !reloaded?.pin_hash) {
      console.error('[AuthContext] Reloaded profile is still incomplete after onboarding save.', reloaded);
      throw new Error('Profile saved but setup could not be confirmed.');
    }
    return reloaded;
  };

  const logout = (shouldRedirect = true) => {
    sessionStorage.removeItem('pin_verified');
    sessionStorage.removeItem('onboarding_complete');
    setUser(null);
    setIsAuthenticated(false);
    setNeedsOnboarding(false);

    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      needsOnboarding,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
      completeOnboarding,
      reloadCurrentUser,
      saveOnboardingProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};