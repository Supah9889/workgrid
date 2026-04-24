import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

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
  const onboardingComplete = useRef(false);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: { 'X-App-Id': appParams.appId },
        token: appParams.token,
        interceptResponses: true
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
    // Belt-and-suspenders: if sessionStorage flag is set, onboarding just
    // completed — trust local state entirely and skip the DB re-fetch.
    const justOnboarded = sessionStorage.getItem('onboarding_complete');
    if (justOnboarded) {
      sessionStorage.removeItem('onboarding_complete');
      setNeedsOnboarding(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }

    try {
      setIsLoadingAuth(true);
      const authUser = await base44.auth.me();

      // Ref guard: onboarding just completed in this session — skip DB re-fetch
      // to prevent a stale cached response from resetting needsOnboarding.
      if (onboardingComplete.current) {
        setNeedsOnboarding(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }

      // Fetch the app's custom User entity to get role and onboarding status
      let userEntity = null;
      try {
        const results = await base44.entities.User.filter({ email: authUser.email });
        if (results && results.length > 0) {
          userEntity = results[0];
        } else {
          // First login — create entity with safe defaults
          userEntity = await base44.entities.User.create({
            email: authUser.email,
            role: 'employee',
            has_onboarded: false,
          });
        }
      } catch (entityError) {
        // Non-fatal: fall back to a safe in-memory user so the app still loads
        console.error('Failed to fetch/create User entity:', entityError);
        userEntity = { email: authUser.email, role: 'employee', has_onboarded: false };
      }

      // Guarantee role is always a valid string — never undefined
      if (!userEntity?.role) userEntity = { ...userEntity, role: 'employee' };

      const mergedUser = { ...authUser, ...userEntity };
      setUser(mergedUser);
      setIsAuthenticated(true);
      // Only flag onboarding if has_onboarded is explicitly false
      setNeedsOnboarding(mergedUser.has_onboarded === false);
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