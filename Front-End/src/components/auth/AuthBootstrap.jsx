import { useEffect } from 'react';
import { authAPI } from '../../api/auth';
import { authStore } from '../../stores/authStore';

function isTerminalRefreshError(error) {
  const status = error?.response?.status;
  return status === 400 || status === 401 || status === 403;
}

export default function AuthBootstrap({ children }) {
  const user = authStore((state) => state.user);
  const access_token = authStore((state) => state.access_token);
  const refresh_token = authStore((state) => state.refresh_token);
  const two_factor_required = authStore((state) => state.two_factor_required);
  const auth_bootstrapped = authStore((state) => state.auth_bootstrapped);
  const setTokens = authStore((state) => state.setTokens);
  const setAuthBootstrapped = authStore((state) => state.setAuthBootstrapped);
  const logout = authStore((state) => state.logout);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      if (auth_bootstrapped) return;

      if (!user || two_factor_required || access_token) {
        setAuthBootstrapped(true);
        return;
      }

      if (!refresh_token) {
        logout();
        return;
      }

      try {
        const response = await authAPI.refresh(refresh_token);
        if (cancelled) return;
        setTokens(response.access_token, response.refresh_token || refresh_token);
      } catch (error) {
        if (!cancelled && isTerminalRefreshError(error)) logout();
      } finally {
        if (!cancelled) setAuthBootstrapped(true);
      }
    }

    bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, [
    access_token,
    auth_bootstrapped,
    logout,
    refresh_token,
    setAuthBootstrapped,
    setTokens,
    two_factor_required,
    user,
  ]);

  if (!auth_bootstrapped) return null;

  return children;
}
