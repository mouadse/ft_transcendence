import client from './client';
import { authStore } from '../stores/authStore';

export const authAPI = {
  // Login with email and password
  // Returns either:
  // - {access_token, refresh_token, user, expires_in} if success
  // - {two_factor_required, two_factor_token, user} if 2FA needed
  login: async (email, password, twoFactorToken = null, totpCode = null, recoveryCode = null) => {
    const body = { email, password };
    if (twoFactorToken) body.two_factor_token = twoFactorToken;
    if (totpCode) body.totp_code = totpCode;
    if (recoveryCode) body.recovery_code = recoveryCode;

    const response = await client.post('/v1/auth/login', body, { validateStatus: () => true });
    if (response.status >= 400) {
      const error = new Error('Request failed with status code ' + response.status);
      error.response = response;
      throw error;
    }
    return response.data;
  },

  // Register new user
  // Same response structure as login
  register: async (name, email, password) => {
    const response = await client.post('/v1/auth/register', { name, email, password }, { validateStatus: () => true });
    if (response.status >= 400) {
      const error = new Error('Request failed with status code ' + response.status);
      error.response = response;
      throw error;
    }
    return response.data;
  },

  // Verify 2FA code during login (alternative flow, not used - we use login() with totp_code)
  verify2FA: async (code) => {
    const response = await client.post('/v1/auth/2fa/verify', { code });
    return response.data;
  },

  // Refresh access token
  refresh: async (refresh_token) => {
    const response = await client.post('/v1/auth/refresh', { refresh_token });
    return response.data;
  },

  // Logout (revoke current session)
  logout: async (allSessions = false) => {
    const state = authStore.getState();
    const body = allSessions
      ? { all_sessions: true }
      : { refresh_token: state.refresh_token };
    const response = await client.post('/v1/auth/logout', body);
    return response.data;
  },

  // Get list of active sessions
  getSessions: async (params = {}) => {
    const response = await client.get('/v1/auth/sessions', { params });
    return response.data;
  },

  // Revoke a specific session
  revokeSession: async (session_id) => {
    const response = await client.delete(`/v1/auth/sessions/${session_id}`);
    return response.data;
  },

  // Setup 2FA (returns QR code)
  setup2FA: async () => {
    const response = await client.post('/v1/auth/2fa/setup');
    return response.data;
  },

  // Verify 2FA setup with TOTP code → enables 2FA, returns recovery codes
  confirm2FA: async (code) => {
    const response = await client.post('/v1/auth/2fa/verify', { code });
    return response.data;
  },

  // Disable 2FA (requires current TOTP code)
  disable2FA: async (code) => {
    const response = await client.post('/v1/auth/2fa/disable', { code });
    return response.data;
  },

  // Get recovery codes
  getRecoveryCodes: async () => {
    const response = await client.get('/v1/auth/2fa/recovery-codes');
    return response.data;
  },
};
