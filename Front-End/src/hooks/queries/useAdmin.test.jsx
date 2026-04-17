import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import {
  useAdminPrograms,
  useCreateAdminProgramAssignment,
} from './useAdmin';
import { server } from '../../test/msw/server';
import { createQueryWrapper, createTestQueryClient } from '../../test/queryClient';

describe('useAdmin program wiring', () => {
  it('normalizes admin program list payloads', async () => {
    server.use(
      http.get('http://localhost:8080/v1/programs', () =>
        HttpResponse.json({
          programs: [{ id: 1, name: 'Coach PPL' }],
        })
      )
    );

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useAdminPrograms({ limit: 100 }), {
      wrapper: createQueryWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.programs).toHaveLength(1);
    expect(result.current.data.programs[0].name).toBe('Coach PPL');
  });

  it('posts assignment creation to the real backend contract endpoint', async () => {
    const captured = { programId: null, body: null };
    server.use(
      http.post('http://localhost:8080/v1/programs/:programId/assignments', async ({ params, request }) => {
        captured.programId = params.programId;
        captured.body = await request.json();
        return HttpResponse.json({ id: 901, status: 'assigned' });
      })
    );

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useCreateAdminProgramAssignment(), {
      wrapper: createQueryWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        program_id: 44,
        data: { user_id: 7, status: 'assigned' },
      });
    });

    expect(captured.programId).toBe('44');
    expect(captured.body).toEqual({ user_id: 7, status: 'assigned' });
  });
});
