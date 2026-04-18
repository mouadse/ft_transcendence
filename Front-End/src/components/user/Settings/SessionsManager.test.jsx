import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { authStore } from '../../../stores/authStore';
import { queryClient } from '../../../lib/queryClient';
import { server } from '../../../test/msw/server';
import * as navigationUtils from '../../../utils/navigation';

import SessionsManager from './SessionsManager';

describe('SessionsManager', () => {
  it('clears local auth state after logging out all devices', async () => {
    const user = userEvent.setup();
    const expiresAt = new Date(Date.now() + 60_000).toISOString();

    authStore.getState().login(
      { id: 'user-1', name: 'Mouad', email: 'mouad@example.com' },
      'access-token',
      'refresh-token'
    );
    queryClient.setQueryData(['dashboard', 'weekly-summary'], { cached: true });

    server.use(
      http.get('http://localhost:8080/v1/auth/sessions', () =>
        HttpResponse.json({
          data: [{
            id: 'session-1',
            user_agent: 'Chrome',
            last_ip: '127.0.0.1',
            expires_at: expiresAt,
          }],
          metadata: { has_next: false },
        })
      ),
      http.post('http://localhost:8080/v1/auth/logout', async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({ all_sessions: true });
        return HttpResponse.json({ success: true });
      })
    );

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const redirectSpy = vi.spyOn(navigationUtils, 'hardRedirectToLogin').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <SessionsManager onClose={vi.fn()} />
      </MemoryRouter>
    );

    await screen.findByText('Chrome');
    await user.click(screen.getByRole('button', { name: 'Log Out of All Devices' }));

    await waitFor(() => {
      expect(authStore.getState().user).toBeNull();
      expect(authStore.getState().refresh_token).toBeNull();
      expect(queryClient.getQueryData(['dashboard', 'weekly-summary'])).toBeUndefined();
      expect(redirectSpy).toHaveBeenCalledTimes(1);
    });
  });
});
