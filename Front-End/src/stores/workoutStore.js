import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const workoutStore = create(
  persist(
    (set) => ({
      // Active workout session
      activeWorkout: null,
      restTimerActive: false,
      restSeconds: 0,

      // Offline queue for pending sets (if offline when logging)
      pendingSets: [],

      // Actions
      startWorkout: (workoutData) => {
        set({
          activeWorkout: {
            ...workoutData,
            exercises: Array.isArray(workoutData?.exercises) ? workoutData.exercises : [],
            startedAt: workoutData?.startedAt || new Date().toISOString(),
            notes: workoutData?.notes || '',
          },
        });
      },

      addExercise: (exerciseData) => {
        set((state) => {
          if (!state.activeWorkout) return state;
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: [
                ...state.activeWorkout.exercises,
                { ...exerciseData, sets: Array.isArray(exerciseData?.sets) ? exerciseData.sets : [] },
              ],
            },
          };
        });
      },

      addSet: (exerciseIndex, setData) => {
        set((state) => {
          if (!state.activeWorkout) return state;
          const updatedExercises = [...state.activeWorkout.exercises];
          if (updatedExercises[exerciseIndex]) {
            updatedExercises[exerciseIndex] = {
              ...updatedExercises[exerciseIndex],
              sets: [
                ...updatedExercises[exerciseIndex].sets,
                { ...setData, timestamp: new Date().toISOString() },
              ],
            };
          }
          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: updatedExercises,
            },
          };
        });
      },

      updateWorkoutNotes: (notes) => {
        set((state) => {
          if (!state.activeWorkout) return state;
          return {
            activeWorkout: {
              ...state.activeWorkout,
              notes,
            },
          };
        });
      },

      endWorkout: () => {
        set({ activeWorkout: null, restTimerActive: false, restSeconds: 0 });
      },

      startRestTimer: (seconds = 60) => {
        set({ restTimerActive: true, restSeconds: seconds });
      },

      stopRestTimer: () => {
        set({ restTimerActive: false, restSeconds: 0 });
      },

      decrementRestTimer: () => {
        set((state) => ({
          restSeconds: Math.max(0, state.restSeconds - 1),
          restTimerActive: state.restSeconds > 1,
        }));
      },

      // Offline queue methods
      queueSet: (setData) => {
        set((state) => ({
          pendingSets: [
            ...state.pendingSets,
            { ...setData, queuedAt: new Date().toISOString() },
          ],
        }));
      },

      flushPendingSets: () => {
        set({ pendingSets: [] });
      },

      removePendingSet: (index) => {
        set((state) => ({
          pendingSets: state.pendingSets.filter((_, i) => i !== index),
        }));
      },
    }),
    {
      name: 'um6p_fit_workout',
    }
  )
);
