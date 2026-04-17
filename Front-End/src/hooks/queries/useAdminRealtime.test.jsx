import { normalizeRealtimePayload, toWsUrl } from './useAdminRealtime';

describe('normalizeRealtimePayload', () => {
  it('parses nested push events emitted by the backend hub', () => {
    expect(
      normalizeRealtimePayload({
        type: 'user_signup',
        payload: {
          total_users: 42,
          new_users_7d: 9,
        },
      })
    ).toEqual({
      activeUsers: null,
      workoutsToday: null,
      mealsToday: null,
      totalUsers: 42,
      newUsers7d: 9,
      timestamp: null,
      eventType: 'user_signup',
    });
  });

  it('keeps parsing flat metrics snapshots', () => {
    expect(
      normalizeRealtimePayload({
        type: 'metrics_update',
        active_users: 7,
        workouts_today: 5,
        meals_today: 3,
        total_users: 50,
        new_users_7d: 8,
        timestamp: '2026-04-17T12:00:00Z',
      })
    ).toEqual({
      activeUsers: 7,
      workoutsToday: 5,
      mealsToday: 3,
      totalUsers: 50,
      newUsers7d: 8,
      timestamp: '2026-04-17T12:00:00Z',
      eventType: 'metrics_update',
    });
  });
});

describe('toWsUrl', () => {
  it('falls back to the current origin when the API base URL is empty', () => {
    const expected = new URL('/v1/admin/dashboard/realtime', window.location.origin);
    expected.protocol = expected.protocol === 'https:' ? 'wss:' : 'ws:';
    expected.searchParams.set('access_token', 'token-123');

    expect(toWsUrl('', 'token-123', 'query')).toBe(expected.toString());
  });

  it('keeps a configured relative base path for proxied websocket routes', () => {
    const expected = new URL('/backend/v1/admin/dashboard/realtime', window.location.origin);
    expected.protocol = expected.protocol === 'https:' ? 'wss:' : 'ws:';

    expect(toWsUrl('/backend', null, 'query')).toBe(expected.toString());
  });
});
