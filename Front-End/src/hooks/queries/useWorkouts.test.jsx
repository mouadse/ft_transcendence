import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useDeleteWorkout, useExercises, useWorkoutList } from './useWorkouts';
import { server } from '../../test/msw/server';
import { createQueryWrapper, createTestQueryClient } from '../../test/queryClient';
import { normalizeWorkoutListVM } from '../../utils/apiAdapters';

describe('useWorkouts backend-contract alignment', () => {
  it('normalizes workout list payloads into workouts/items/data', async () => {
    server.use(
      http.get('http://localhost:8080/v1/workouts', () =>
        HttpResponse.json({
          data: [{ id: 101, type: 'strength' }],
          metadata: { total: 1 },
        })
      )
    );

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useWorkoutList({ limit: 50 }), {
      wrapper: createQueryWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.workouts).toHaveLength(1);
    expect(result.current.data.items).toHaveLength(1);
    expect(result.current.data.metadata?.total).toBe(1);
  });

  it('keeps last successful workout list data available when refetch fails', async () => {
    let shouldFail = false;
    server.use(
      http.get('http://localhost:8080/v1/workouts', () => {
        if (shouldFail) {
          return HttpResponse.json({ message: 'Database temporarily unavailable' }, { status: 500 });
        }
        return HttpResponse.json({
          workouts: [{ id: 201, type: 'hypertrophy' }],
        });
      })
    );

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useWorkoutList({ limit: 50 }), {
      wrapper: createQueryWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.workouts).toHaveLength(1);

    shouldFail = true;
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data.workouts).toHaveLength(1);
    expect(result.current.errorMeta.shouldFallback).toBe(true);
  });

  it('maps exercise query param q -> name for backend compatibility', async () => {
    const captured = { name: null, q: null };
    server.use(
      http.get('http://localhost:8080/v1/exercises', ({ request }) => {
        const url = new URL(request.url);
        captured.name = url.searchParams.get('name');
        captured.q = url.searchParams.get('q');
        return HttpResponse.json({ exercises: [] });
      })
    );

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () => useExercises({ q: 'bench press', muscle_group: 'chest' }),
      { wrapper: createQueryWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(captured.name).toBe('bench press');
    expect(captured.q).toBeNull();
  });

  it('passes page and limit params for exercise pagination', async () => {
    const captured = { page: null, limit: null };
    server.use(
      http.get('http://localhost:8080/v1/exercises', ({ request }) => {
        const url = new URL(request.url);
        captured.page = url.searchParams.get('page');
        captured.limit = url.searchParams.get('limit');
        return HttpResponse.json({ exercises: [], metadata: { page: 2, limit: 20, total_count: 0, total_pages: 1, has_next: false } });
      })
    );

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () => useExercises({ page: 2, limit: 20 }),
      { wrapper: createQueryWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(captured.page).toBe('2');
    expect(captured.limit).toBe('20');
  });

  it('keeps workout list aliases in sync during optimistic delete', async () => {
    let resolveDelete;
    const deleteRequest = new Promise((resolve) => {
      resolveDelete = resolve;
    });
    const params = { limit: 50 };
    const queryKey = ['workouts', params];

    server.use(
      http.delete('http://localhost:8080/v1/workouts/:workoutId', async () => {
        await deleteRequest;
        return HttpResponse.json({ success: true });
      })
    );

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      queryKey,
      normalizeWorkoutListVM({
        workouts: [
          { id: 301, type: 'strength' },
          { id: 302, type: 'cardio' },
        ],
        metadata: { total: 2 },
      })
    );

    const listHook = renderHook(() => useWorkoutList(params), {
      wrapper: createQueryWrapper(queryClient),
    });
    const { result } = renderHook(() => useDeleteWorkout(), {
      wrapper: createQueryWrapper(queryClient),
    });

    await waitFor(() => expect(listHook.result.current.data.workouts.map((workout) => workout.id)).toEqual([301, 302]));

    act(() => {
      result.current.mutate({ workout_id: 301 });
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData(queryKey);
      expect(cached.workouts.map((workout) => workout.id)).toEqual([302]);
      expect(cached.items.map((workout) => workout.id)).toEqual([302]);
      expect(cached.data.map((workout) => workout.id)).toEqual([302]);
      expect(cached.items).toStrictEqual(cached.workouts);
      expect(cached.data).toStrictEqual(cached.workouts);
      expect(cached.raw.workouts.map((workout) => workout.id)).toEqual([302]);
      expect(listHook.result.current.data.workouts.map((workout) => workout.id)).toEqual([302]);
      expect(listHook.result.current.data.items.map((workout) => workout.id)).toEqual([302]);
      expect(listHook.result.current.data.data.map((workout) => workout.id)).toEqual([302]);
    });

    act(() => {
      resolveDelete();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
