import { authStore, readSessionAccessToken } from '../stores/authStore';
import { authAPI } from '../api/auth';
import { usersAPI } from '../api/users';
import { uiStore } from '../stores/uiStore';
import { queryClient } from '../lib/queryClient';

// ── Auth initialisation ──────────────────────────────────────
// If we have a refresh_token but no access_token (e.g. after a page
// refresh, because access_token is intentionally *not* persisted to
// localStorage), we try to obtain a fresh access token before the
// app renders.  This prevents the route guards from redirecting to
// /login on every refresh.
let _initPromise = null;

function isTerminalRefreshError(error) {
  const status = error?.response?.status;
  return status === 400 || status === 401 || status === 403;
}

function resolveSkipLogoutApiCall(argument) {
  if (typeof argument === 'boolean') {
    return argument;
  }

  // Preserve `onClick={logout}` semantics by treating DOM/React events as a
  // normal logout instead of interpreting the event object as a truthy flag.
  if (
    argument
    && typeof argument === 'object'
    && (
      typeof argument.preventDefault === 'function'
      || typeof argument.stopPropagation === 'function'
      || 'nativeEvent' in argument
      || 'currentTarget' in argument
      || 'target' in argument
    )
  ) {
    return false;
  }

  return Boolean(argument?.skipApiCall);
}

export function initAuth() {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const store = authStore.getState();
    const { refresh_token, access_token, user } = store;
    const sessionAccessToken = readSessionAccessToken();

    // Already authenticated – nothing to do
    if (access_token && user) {
      store.setAuthBootstrapped(true);
      return true;
    }

    // Same-tab hard refresh: reuse the last in-tab access token so we do not
    // rotate the refresh token on every browser reload.
    if (!access_token && sessionAccessToken && user && refresh_token) {
      store.setTokens(sessionAccessToken, refresh_token);
      store.setAuthBootstrapped(true);
      return true;
    }

    // No refresh token either – truly logged out
    if (!refresh_token) {
      store.setAuthBootstrapped(true);
      return false;
    }

    // We have a refresh token but no access token → try to refresh
    try {
      const response = await authAPI.refresh(refresh_token);
      store.setTokens(response.access_token, response.refresh_token || refresh_token);
      store.setAuthBootstrapped(true);
      return true;
    } catch (error) {
      // Token is invalid/revoked -> clean state. Transient failures should not
      // force a logout.
      if (isTerminalRefreshError(error)) {
        store.logout();
        return false;
      }

      store.setAuthBootstrapped(true);
      return !!(store.user && store.refresh_token);
    }
  })();

  return _initPromise;
}

export function useAuth() {
  const user = authStore((state) => state.user);
  const access_token = authStore((state) => state.access_token);
  const refresh_token = authStore((state) => state.refresh_token);
  const auth_bootstrapped = authStore((state) => state.auth_bootstrapped);
  const setUser = authStore((state) => state.setUser);
  const setTokens = authStore((state) => state.setTokens);
  const isAuthenticated = authStore((state) => state.isAuthenticated());
  const isOnboarded = authStore((state) => state.isOnboarded());
  const isAdmin = authStore((state) => state.isAdmin());

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);

      // Check if 2FA is required
      if (response.two_factor_required) {
        authStore.getState().initiate2FA(response.user, response.two_factor_token);
        return { two_factor_required: true, user: response.user, two_factor_token: response.two_factor_token };
      }

      // Otherwise, full login success
      authStore.getState().login(response.user, response.access_token, response.refresh_token);
      return response;
    } catch (error) {
      const detail = error?.response?.data?.detail ?? error?.response?.data?.error ?? null;
      const fieldErrors = error?.response?.data?.errors ?? null;
      const enriched = new Error(detail || 'Login failed');
      enriched.status = error?.response?.status;
      enriched.detail = detail;
      enriched.fieldErrors = fieldErrors;
      throw enriched;
    }
  };

  const signup = async (name, email, password) => {
    try {
      const response = await authAPI.register(name, email, password);

      // Check if 2FA is required
      if (response.two_factor_required) {
        authStore.getState().initiate2FA(response.user, response.two_factor_token);
        return { two_factor_required: true, user: response.user, two_factor_token: response.two_factor_token };
      }

      authStore.getState().login(response.user, response.access_token, response.refresh_token);
      return response;
    } catch (error) {
      // Extract backend detail message and attach it to the error
      const detail = error?.response?.data?.detail ?? error?.response?.data?.error ?? null;
      const enriched = new Error(detail || 'Signup failed');
      enriched.status = error?.response?.status;
      enriched.detail = detail;
      throw enriched;
    }
  };

  const complete2FA = async (totpCode, recoveryCode) => {
    try {
      const state = authStore.getState();
      const email = state.user?.email;
      const twoFactorToken = state.two_factor_token;

      if (!email || !twoFactorToken) {
        throw new Error('2FA challenge not initiated');
      }

      const response = await authAPI.login(email, '', twoFactorToken, totpCode, recoveryCode);

      authStore.getState().login(response.user, response.access_token, response.refresh_token);
      return response;
    } catch (error) {
      uiStore.getState().addToast('2FA verification failed', 'error');
      throw error;
    }
  };

  const logoutUser = async (options) => {
    const skipApiCall = resolveSkipLogoutApiCall(options);

    try {
      if (!skipApiCall) {
        await authAPI.logout();
      }
    } catch (error) {
      const status = error?.response?.status;
      // Benign cases:
      // - 401: already unauthenticated
      // - 404: current session was already revoked (e.g. from sessions manager)
      if (status !== 401 && status !== 404) {
        console.error('Logout API call failed:', error);
      }
    } finally {
      const cleanupTasks = [queryClient.cancelQueries()];
      if (typeof queryClient.cancelMutations === 'function') {
        cleanupTasks.push(queryClient.cancelMutations());
      }

      await Promise.allSettled(cleanupTasks);
      queryClient.clear();

      authStore.getState().logout();
      localStorage.removeItem('um6p_fit_auth');
      localStorage.removeItem('um6p_fit_workout');
      localStorage.removeItem('um6p_fit_nutrition');
      localStorage.removeItem('um6p_fit_ui');
    }
  };

  const updateProfileData = async (userId, data, options = {}) => {
    const { showErrorToast = true } = options;
    try {
      const response = await usersAPI.updateProfile(userId, data);
      authStore.getState().updateProfile(response);
      return response;
    } catch (error) {
      if (showErrorToast) {
        uiStore.getState().addToast('Profile update failed', 'error');
      }
      throw error;
    }
  };

  return {
    user,
    access_token,
    refresh_token,
    auth_bootstrapped,
    isAuthenticated,
    isOnboarded,
    isAdmin,
    login,
    signup,
    complete2FA,
    logout: logoutUser,
    updateProfile: updateProfileData,
    setUser,
    setTokens,
  };
}
