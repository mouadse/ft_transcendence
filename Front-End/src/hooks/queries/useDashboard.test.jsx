import { renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useDashboardWeeklySummary, useUnreadCount } from './useDashboard';
import { authStore } from '../../stores/authStore';
import { server } from '../../test/msw/server';
import { createQueryWrapper, createTestQueryClient } from '../../test/queryClient';

describe('useDashboard auth gating', () => {
  it('does not fetch protected dashboard queries after logout', async () => {
    let weeklySummaryHits = 0;
    let unreadCountHits = 0;

    server.use(
      http.get('http://localhost:8080/v1/weekly-summary', () => {
        weeklySummaryHits += 1;
        return HttpResponse.json({});
      }),
      http.get('http://localhost:8080/v1/notifications/unread-count', () => {
        unreadCountHits += 1;
        return HttpResponse.json({ unread_count: 0 });
      })
    );

    authStore.getState().logout();

    const queryClient = createTestQueryClient();
    const wrapper = createQueryWrapper(queryClient);

    renderHook(() => useDashboardWeeklySummary(), { wrapper });
    renderHook(() => useUnreadCount(), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(weeklySummaryHits).toBe(0);
    expect(unreadCountHits).toBe(0);
  });
});
