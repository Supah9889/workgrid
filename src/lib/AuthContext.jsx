import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import {
  ensureEmployeeProfileForAuthUser,
  normalizeEmail,
  saveOwnEmployeeProfile,
} from '@/lib/employeeProfiles';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    checkAppState();
  }, []);

  const loadEmployeeProfile = async (authUser) => {
    const profile = await ensureEmployeeProfileForAuthUser(authUser);
    if (!profile) {
      console.error('[AuthContext] profile missing', { email: normalizeEmail(authUser?.email) });
      throw new Error('Employee profile is missing.');
    }
    return profile;
  };

  const applyAuthUser = (authUser, profile) => {
    const mergedUser = {
      ...authUser,
      ...profile,
      auth_email: normalizeEmail(authUser?.email),
      email: normalizeEmail(profile?.email || authUser?.email),
      profile_id: profile?.id,
    };
    console.info('[AuthContext] Loaded employee profile.', {
      email: mergedUser.email,
      profile_id: mergedUser.profile_id || null,
      role: mergedUser.role || null,
      status: mergedUser.status || null,
      _profileSource: mergedUser._profileSource || null,
    });
    setUser(mergedUser);
    setIsAuthenticated(true);
    setNeedsOnboarding(mergedUser.has_onboarded !== true || !mergedUser.pin_hash);
    return mergedUser;
  };

  const reloadCurrentUser = async () => {
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
        console.error('[AuthContext] profile lookup failed', entityError);
        profile = {
          email: normalizeEmail(authUser.email),
          role: 'employee',
          status: 'active',
          has_onboarded: false,
        };
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

  const completeOnboarding = (updatedProfileFields = {}) => {
    setNeedsOnboarding(false);
    setUser(prev => prev ? { ...prev, has_onboarded: true, ...updatedProfileFields } : prev);
  };

  const saveOnboardingProfile = async ({ fullName, contactPhone, pinHash }) => {
    const authUser = await base44.auth.me();
    const normalizedEmail = normalizeEmail(authUser.email);

    const saved = await saveOwnEmployeeProfile({
      authEmail: normalizedEmail,
      fullName,
      contactPhone,
      pinHash,
    });

    completeOnboarding(saved);

    const mergedUser = {
      ...authUser,
      ...saved,
      auth_email: normalizedEmail,
      email: normalizeEmail(saved?.email || normalizedEmail),
      profile_id: saved?.id,
    };
    setUser(mergedUser);
    setIsAuthenticated(true);
    setNeedsOnboarding(false);
    setIsLoadingAuth(false);
    setAuthChecked(true);

    return mergedUser;
  };

  const logout = (shouldRedirect = true) => {
    [
      'pin_verified',
      'pin_verified_email',
      'onboarding_complete',
      'workgrid_role',
      'workgrid_route',
      'last_route',
      'redirect_path',
      'user_role',
    ].forEach(key => sessionStorage.removeItem(key));
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
