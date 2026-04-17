import axios from 'axios';
import { readPublicUrl } from '../config/runtimeConfig';
import { authStore } from '../stores/authStore';

const API_BASE_URL = readPublicUrl('VITE_API_BASE_URL', 'http://localhost:8080');

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track if a refresh is in progress to prevent multiple simultaneous refresh requests
let refreshPromise = null;
const ACCESS_TOKEN_REFRESH_BUFFER_MS = 30 * 1000;

function isTerminalRefreshError(error) {
  const status = error?.response?.status;
  return status === 400 || status === 401 || status === 403;
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

function getAccessTokenExpiryMs(token) {
  const payload = decodeJwtPayload(token);
  const expSeconds = Number(payload?.exp);
  if (!Number.isFinite(expSeconds)) return null;
  return expSeconds * 1000;
}

function shouldRefreshAccessToken(token) {
  const expiryMs = getAccessTokenExpiryMs(token);
  if (!expiryMs) return false;
  return expiryMs - Date.now() <= ACCESS_TOKEN_REFRESH_BUFFER_MS;
}

async function performTokenRefresh() {
  const state = authStore.getState();
  const refresh_token = state.refresh_token;

  if (!refresh_token) {
    authStore.getState().logout();
    throw new Error('No refresh token available');
  }

  try {
    const response = await axios.post(
      `${API_BASE_URL}/v1/auth/refresh`,
      { refresh_token },
      { timeout: 10000 }
    );

    const { access_token, refresh_token: new_refresh_token } = response.data;
    const nextRefreshToken = new_refresh_token || refresh_token;
    authStore.getState().setTokens(access_token, nextRefreshToken);
    return access_token;
  } catch (refreshError) {
    if (isTerminalRefreshError(refreshError)) {
      authStore.getState().logout();
    }
    throw refreshError;
  }
}

async function getFreshAccessTokenIfNeeded(currentToken, shouldSkipAuthHeader) {
  if (shouldSkipAuthHeader) return currentToken;

  const state = authStore.getState();
  if (!currentToken && !state.refresh_token) return currentToken;
  if (currentToken && !shouldRefreshAccessToken(currentToken)) return currentToken;

  if (!refreshPromise) {
    refreshPromise = performTokenRefresh();
  }

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function ensureAccessToken(currentToken = authStore.getState().access_token) {
  return getFreshAccessTokenIfNeeded(currentToken, false);
}

// Request interceptor: attach JWT token
client.interceptors.request.use(
  async (config) => {
    const state = authStore.getState();
    const token = state.access_token;
    const url = config.url || '';
    const shouldSkipAuthHeader = /\/auth\/(refresh|login|register)/.test(url);
    const freshToken = await getFreshAccessTokenIfNeeded(token, shouldSkipAuthHeader);

    if (freshToken && !shouldSkipAuthHeader) {
      config.headers.Authorization = `Bearer ${freshToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 and refresh token
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Skip token refresh for auth endpoints (login, signup, register) — let them handle 401 naturally
    const url = originalRequest.url || '';
    const isAuthEndpoint = /\/auth\/(login|signup|register|refresh|2fa)/.test(url);

    // If 401 and we haven't retried yet (and not an auth endpoint)
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        // If refresh is already in progress, wait for it
        if (!refreshPromise) {
          refreshPromise = performTokenRefresh();
        }

        const newToken = await refreshPromise;
        refreshPromise = null;

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return client(originalRequest);
      } catch (err) {
        refreshPromise = null;
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
