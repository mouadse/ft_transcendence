import { useEffect, useMemo, useRef, useState } from 'react';
import client, { ensureAccessToken } from '../../api/client';
import { readPublicConfig } from '../../config/runtimeConfig';
import { authStore } from '../../stores/authStore';

const BASE_RECONNECT_DELAY_MS = 1200;
const MAX_RECONNECT_DELAY_MS = 15000;

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeRealtimePayload(rawMessage) {
  try {
    const parsed = typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage;
    const root = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;
    if (!root || typeof root !== 'object') return null;

    const nestedPayload = root?.payload && typeof root.payload === 'object' ? root.payload : null;
    const payload = nestedPayload ? { ...root, ...nestedPayload } : root;

    const activeUsers = toNumber(payload.active_users ?? payload.activeUsers);
    const workoutsToday = toNumber(payload.workouts_today ?? payload.workoutsToday);
    const mealsToday = toNumber(payload.meals_today ?? payload.mealsToday);
    const totalUsers = toNumber(payload.total_users ?? payload.totalUsers);
    const newUsers7d = toNumber(payload.new_users_7d ?? payload.newUsers7d);
    const timestamp = payload.timestamp || null;
    const eventType = root.type || payload.type || null;

    if (activeUsers === null && workoutsToday === null && mealsToday === null && totalUsers === null && newUsers7d === null && !timestamp && !eventType) {
      return null;
    }

    return { activeUsers, workoutsToday, mealsToday, totalUsers, newUsers7d, timestamp, eventType };
  } catch {
    return null;
  }
}

function resolveAuthMode() {
  const raw = String(readPublicConfig('VITE_ADMIN_REALTIME_WS_AUTH_MODE', 'query')).trim().toLowerCase();
  if (raw === 'query' || raw === 'none' || raw === 'off') return raw;
  return 'header';
}

export function toWsUrl(baseURL, accessToken, authMode) {
  if (authMode === 'off' || authMode === 'header') return null;

  try {
    const fallbackBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const sourceBaseUrl = String(baseURL || fallbackBaseUrl).trim();
    if (!sourceBaseUrl) return null;

    const resolvedBaseUrl =
      typeof window !== 'undefined' && /^\/(?!\/)/.test(sourceBaseUrl)
        ? new URL(sourceBaseUrl, window.location.origin)
        : new URL(sourceBaseUrl);
    const basePath = resolvedBaseUrl.pathname === '/' ? '' : resolvedBaseUrl.pathname.replace(/\/$/, '');
    const url = new URL(resolvedBaseUrl.toString());

    url.pathname = `${basePath}/v1/admin/dashboard/realtime`;
    url.search = '';
    url.hash = '';
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

    if (authMode === 'query' && accessToken) {
      url.searchParams.set('access_token', accessToken);
    }

    return url.toString();
  } catch {
    return null;
  }
}

function reconnectDelay(attempt) {
  const delay = BASE_RECONNECT_DELAY_MS * Math.pow(2, Math.max(0, attempt - 1));
  return Math.min(MAX_RECONNECT_DELAY_MS, delay);
}

export function useAdminRealtime(onEvent) {
  const accessToken = authStore((state) => state.access_token);
  const refreshToken = authStore((state) => state.refresh_token);
  const authBootstrapped = authStore((state) => state.auth_bootstrapped);
  const authMode = useMemo(() => resolveAuthMode(), []);
  const [metrics, setMetrics] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // live | reconnecting | connecting | disconnected | disabled
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const onEventRef = useRef(onEvent);
  const supportsRealtime = authMode !== 'off' && authMode !== 'header';

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  /* eslint-disable react-hooks/set-state-in-effect -- this effect is the websocket lifecycle state machine and intentionally updates connection status during setup/teardown. */
  useEffect(() => {
    if (typeof window === 'undefined' || !supportsRealtime) {
      setConnectionStatus('disabled');
      return undefined;
    }

    if (!authBootstrapped) {
      setConnectionStatus('connecting');
      return undefined;
    }

    if (authMode === 'query' && !accessToken && !refreshToken) {
      setConnectionStatus('disabled');
      return undefined;
    }

    let isCancelled = false;

    const setSafeStatus = (nextStatus) => {
      setConnectionStatus((prev) => (prev === nextStatus ? prev : nextStatus));
    };

    const clearReconnect = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const cleanupSocket = () => {
      const current = socketRef.current;
      if (!current) return;
      current.onopen = null;
      current.onmessage = null;
      current.onerror = null;
      current.onclose = null;
      try {
        current.close();
      } catch {
        // no-op
      }
      socketRef.current = null;
    };

    const scheduleReconnect = () => {
      if (isCancelled) return;
      reconnectAttemptRef.current += 1;
      const delay = reconnectDelay(reconnectAttemptRef.current);
      setSafeStatus('reconnecting');
      clearReconnect();
      reconnectTimerRef.current = window.setTimeout(connect, delay);
    };

    const connect = async () => {
      if (isCancelled) return;

      cleanupSocket();
      setSafeStatus(reconnectAttemptRef.current > 0 ? 'reconnecting' : 'connecting');

      try {
        const nextAccessToken = authMode === 'query'
          ? await ensureAccessToken(accessToken)
          : accessToken;
        if (isCancelled) return;

        const wsUrl = toWsUrl(client.defaults.baseURL, nextAccessToken, authMode);
        if (!wsUrl) {
          setSafeStatus('disabled');
          return;
        }

        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          reconnectAttemptRef.current = 0;
          setSafeStatus('live');
        };

        ws.onmessage = (event) => {
          const nextMetrics = normalizeRealtimePayload(event.data);
          if (!nextMetrics) return;

          setMetrics((prev) => {
            const mergedMetrics = {
              activeUsers: nextMetrics.activeUsers ?? prev?.activeUsers ?? null,
              workoutsToday: nextMetrics.workoutsToday ?? prev?.workoutsToday ?? null,
              mealsToday: nextMetrics.mealsToday ?? prev?.mealsToday ?? null,
              totalUsers: nextMetrics.totalUsers ?? prev?.totalUsers ?? null,
              newUsers7d: nextMetrics.newUsers7d ?? prev?.newUsers7d ?? null,
              timestamp: nextMetrics.timestamp ?? prev?.timestamp ?? null,
            };

            if (
              prev &&
              prev.activeUsers === mergedMetrics.activeUsers &&
              prev.workoutsToday === mergedMetrics.workoutsToday &&
              prev.mealsToday === mergedMetrics.mealsToday &&
              prev.totalUsers === mergedMetrics.totalUsers &&
              prev.newUsers7d === mergedMetrics.newUsers7d &&
              prev.timestamp === mergedMetrics.timestamp
            ) {
              return prev;
            }
            return mergedMetrics;
          });

          // Notify subscriber about push events (user_signup, etc.)
          if (nextMetrics.eventType && onEventRef.current) {
            try {
              onEventRef.current(nextMetrics.eventType, nextMetrics);
            } catch {
              // no-op – subscriber errors must not break the WS loop
            }
          }

          setSafeStatus('live');
        };

        ws.onerror = () => {
          if (isCancelled) return;
          setSafeStatus('reconnecting');
        };

        ws.onclose = () => {
          if (isCancelled) {
            setSafeStatus('disconnected');
            return;
          }
          scheduleReconnect();
        };
      } catch {
        scheduleReconnect();
      }
    };

    void connect();

    return () => {
      isCancelled = true;
      clearReconnect();
      cleanupSocket();
      setSafeStatus('disconnected');
    };
  }, [accessToken, authBootstrapped, authMode, refreshToken, supportsRealtime]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const mode = supportsRealtime ? 'websocket' : 'polling';

  return {
    metrics,
    connectionStatus,
    isLive: connectionStatus === 'live',
    mode,
    authMode,
  };
}
