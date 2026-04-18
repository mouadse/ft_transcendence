import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import Workouts, { ActiveSession } from './Workouts';
import { server } from '../../../test/msw/server';
import { createTestQueryClient } from '../../../test/queryClient';

const baseAssignment = {
  id: 321,
  status: 'assigned',
  program: {
    id: 99,
    name: 'Lean Bulk Block',
    description: '4-week progression',
    weeks: [
      {
        id: 11,
        week_number: 1,
        sessions: [
          {
            id: 501,
            day_number: 1,
            template: { name: 'Push Day' },
            notes: 'Heavy compounds',
          },
        ],
      },
    ],
  },
};

function renderWithProviders(ui, { initialEntries = ['/'] } = {}) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Workouts integration', () => {
  it('renders assigned programs from program-assignments endpoint', async () => {
    server.use(
      http.get('http://localhost:8080/v1/program-assignments', () =>
        HttpResponse.json({ assignments: [baseAssignment] })
      )
    );

    renderWithProviders(<Workouts />);

    await waitFor(() => expect(screen.getByText('Lean Bulk Block')).toBeInTheDocument());
    expect(screen.getByText('My Programs')).toBeInTheDocument();
  });

  it('applies a program session and transitions to active workout logger', async () => {
    let applyCalls = 0;
    server.use(
      http.get('http://localhost:8080/v1/program-assignments', () =>
        HttpResponse.json({ assignments: [baseAssignment] })
      ),
      http.post('http://localhost:8080/v1/program-sessions/:sessionId/apply', ({ params }) => {
        applyCalls += 1;
        return HttpResponse.json({
          workout: {
            id: 777,
            type: 'strength',
            name: 'Push Day',
            workout_exercises: [
              {
                id: 888,
                exercise: {
                  id: 13,
                  name: 'Bench Press',
                  muscle_group: 'Chest',
                },
                workout_sets: [],
              },
            ],
          },
          applied_session_id: Number(params.sessionId),
        });
      }),
      http.patch('http://localhost:8080/v1/program-assignments/:assignmentId/status', () =>
        HttpResponse.json({ ...baseAssignment, status: 'in_progress' })
      )
    );

    renderWithProviders(<Workouts />);
    const user = userEvent.setup();

    const startProgram = await screen.findByRole('button', { name: /start lean bulk block/i });
    await user.click(startProgram);

    await waitFor(() => expect(screen.getByText('Bench Press')).toBeInTheDocument());
    expect(applyCalls).toBe(1);
  });

  it('uses update-set endpoint when toggling an existing backend set', async () => {
    const captured = { patchCalls: 0, postCalls: 0 };
    server.use(
      http.patch('http://localhost:8080/v1/workout-sets/:setId', async ({ params, request }) => {
        captured.patchCalls += 1;
        captured.lastPatchSetId = params.setId;
        captured.lastPatchBody = await request.json();
        return HttpResponse.json({ id: Number(params.setId) });
      }),
      http.post('http://localhost:8080/v1/workout-exercises/:exerciseId/sets', () => {
        captured.postCalls += 1;
        return HttpResponse.json({ id: 999 });
      })
    );

    const queryClient = createTestQueryClient();
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <ActiveSession
          workoutId={50}
          initialExercises={[
            {
              id: 5,
              name: 'Bench Press',
              workoutExerciseId: 700,
              sets: [{ backendSetId: 444, weight: 80, reps: 8, done: false }],
            },
          ]}
          onFinish={() => {}}
          onDiscard={() => {}}
        />
      </QueryClientProvider>
    );

    const user = userEvent.setup();
    const checkButton = container.querySelector('.wk-set-check');
    expect(checkButton).toBeTruthy();
    await user.click(checkButton);

    await waitFor(() => expect(captured.patchCalls).toBe(1));
    expect(captured.postCalls).toBe(0);
    expect(captured.lastPatchSetId).toBe('444');
    expect(captured.lastPatchBody).toMatchObject({ set_number: 1, weight: 80, reps: 8, completed: true });
  });

  it('uses create-set endpoint when toggling a new local set', async () => {
    const captured = { patchCalls: 0, postCalls: 0 };
    server.use(
      http.patch('http://localhost:8080/v1/workout-sets/:setId', () => {
        captured.patchCalls += 1;
        return HttpResponse.json({ id: 1 });
      }),
      http.post('http://localhost:8080/v1/workout-exercises/:exerciseId/sets', async ({ params, request }) => {
        captured.postCalls += 1;
        captured.lastPostExerciseId = params.exerciseId;
        captured.lastPostBody = await request.json();
        return HttpResponse.json({ id: 556 });
      })
    );

    const queryClient = createTestQueryClient();
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <ActiveSession
          workoutId={60}
          initialExercises={[
            {
              id: 6,
              name: 'Incline Press',
              workoutExerciseId: 701,
              sets: [{ weight: 30, reps: 12, done: false }],
            },
          ]}
          onFinish={() => {}}
          onDiscard={() => {}}
        />
      </QueryClientProvider>
    );

    const user = userEvent.setup();
    const checkButton = container.querySelector('.wk-set-check');
    expect(checkButton).toBeTruthy();
    await user.click(checkButton);

    await waitFor(() => expect(captured.postCalls).toBe(1));
    expect(captured.patchCalls).toBe(0);
    expect(captured.lastPostExerciseId).toBe('701');
    expect(captured.lastPostBody).toMatchObject({ set_number: 1, weight: 30, reps: 12, completed: true });
  });

  it('does not refetch deleted workout details after removing a history entry', async () => {
    const user = userEvent.setup();
    const startedAt = new Date().toISOString();
    const completedAt = new Date(Date.now() + 45 * 60 * 1000).toISOString();
    let deleted = false;
    let detailCalls = 0;

    server.use(
      http.get('http://localhost:8080/v1/workouts', () =>
        HttpResponse.json({
          workouts: deleted
            ? []
            : [{ id: 'workout-1', name: 'Morning Session', type: 'strength', started_at: startedAt, completed_at: completedAt }],
        })
      ),
      http.get('http://localhost:8080/v1/workouts/:workoutId', ({ params }) => {
        detailCalls += 1;
        if (deleted) {
          return HttpResponse.json({ message: 'Workout not found' }, { status: 404 });
        }
        return HttpResponse.json({
          id: params.workoutId,
          name: 'Morning Session',
          type: 'strength',
          started_at: startedAt,
          completed_at: completedAt,
          workout_exercises: [
            {
              id: 'exercise-1',
              exercise: { id: 'bench-1', name: 'Bench Press', muscle_group: 'Chest' },
              workout_sets: [{ id: 'set-1', reps: 8, weight: 80 }],
            },
          ],
        });
      }),
      http.delete('http://localhost:8080/v1/workouts/:workoutId', () => {
        deleted = true;
        return HttpResponse.json({ success: true });
      })
    );

    renderWithProviders(<Workouts />, { initialEntries: ['/workouts/history'] });

    await waitFor(() => expect(screen.getByText('Morning Session')).toBeInTheDocument());
    await waitFor(() => expect(detailCalls).toBe(1));

    await user.click(screen.getByRole('button', { name: 'Delete workout' }));
    await screen.findByText('Delete Workout?');
    await user.click(screen.getByRole('button', { name: /Delete$/ }));

    await waitFor(() => expect(screen.getByText('No workout archive yet')).toBeInTheDocument());
    expect(detailCalls).toBe(1);
  });
});
