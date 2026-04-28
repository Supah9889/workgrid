import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

function isAdminRole(role) {
  return role === 'owner' || role === 'super_admin' || role === 'operator';
}

function pickBestUserRecord(records = []) {
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

  const loadUserEntity = async (authUser) => {
    const results = await base44.entities.User.filter({ email: authUser.email });
    if (results?.length > 1) {
      console.warn('[AuthContext] Duplicate User records found for email; using best match.', {
        email: authUser.email,
        count: results.length,
        ids: results.map(r => r.id),
      });
    }

    let userEntity = pickBestUserRecord(results);
    if (!userEntity) {
      console.info('[AuthContext] Creating first-time employee User record.', { email: authUser.email });
      userEntity = await base44.entities.User.create({
        email: authUser.email,
        role: 'employee',
        status: 'active',
        has_onboarded: false,
      });
    }

    if (!userEntity.role || !['owner', 'super_admin', 'operator', 'employee'].includes(userEntity.role)) {
      userEntity = { ...userEntity, role: 'employee' };
    }

    return userEntity;
  };

  const applyAuthUser = (authUser, userEntity) => {
    const mergedUser = { ...authUser, ...userEntity };
    setUser(mergedUser);
    setIsAuthenticated(true);
    setNeedsOnboarding(mergedUser.has_onboarded !== true || !mergedUser.pin_hash);
    return mergedUser;
  };

  const reloadCurrentUser = async () => {
    console.info('[AuthContext] Reloading current user context.');
    const authUser = await base44.auth.me();
    const userEntity = await loadUserEntity(authUser);
    const merged = applyAuthUser(authUser, userEntity);
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

      let userEntity = null;
      try {
        userEntity = await loadUserEntity(authUser);
      } catch (entityError) {
        console.error('Failed to fetch/create User entity:', entityError);
        userEntity = { email: authUser.email, role: 'employee', has_onboarded: false };
      }

      applyAuthUser(authUser, userEntity);
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
    const records = await base44.entities.User.filter({ email: authUser.email });

    if (records?.length > 1) {
      console.warn('[AuthContext] Duplicate User records during onboarding save.', {
        email: authUser.email,
        count: records.length,
        ids: records.map(r => r.id),
      });
    }

    const existing = pickBestUserRecord(records);
    const existingRole = existing?.role;
    const safeRole = isAdminRole(existingRole) ? existingRole : 'employee';
    const payload = {
      email: authUser.email,
      full_name: fullName,
      contact_phone: contactPhone,
      pin_hash: pinHash,
      has_onboarded: true,
      status: existing?.status || 'active',
      role: safeRole,
    };

    console.info('[AuthContext] Saving onboarding profile.', {
      email: authUser.email,
      userId: existing?.id || null,
      role: safeRole,
      hasExistingRecord: !!existing,
    });

    const saved = existing?.id
      ? await base44.entities.User.update(existing.id, payload)
      : await base44.entities.User.create(payload);

    completeOnboarding({
      ...saved,
      full_name: fullName,
      contact_phone: contactPhone,
      pin_hash: pinHash,
    });

    return reloadCurrentUser();
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
