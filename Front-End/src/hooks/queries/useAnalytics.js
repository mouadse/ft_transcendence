import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '../../api/analytics';
import { authStore } from '../../stores/authStore';

export function usePersonalRecords(params = {}) {
  const userId = authStore((state) => state.user?.id);

  return useQuery({
    queryKey: ['analytics', userId, 'records', params],
    queryFn: () => analyticsAPI.getRecords(userId, params),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useWorkoutStats(params = {}) {
  const userId = authStore((state) => state.user?.id);

  return useQuery({
    queryKey: ['analytics', userId, 'workout-stats', params],
    queryFn: () => analyticsAPI.getWorkoutStats(userId, params),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useActivityCalendar(params = {}) {
  const userId = authStore((state) => state.user?.id);

  return useQuery({
    queryKey: ['analytics', userId, 'activity-calendar', params],
    queryFn: () => analyticsAPI.getActivityCalendar(userId, params),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useStreaks(params = {}) {
  const userId = authStore((state) => state.user?.id);

  return useQuery({
    queryKey: ['analytics', userId, 'streaks', params],
    queryFn: () => analyticsAPI.getStreaks(userId, params),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useWeeklySummary(params = {}) {
  const userId = authStore((state) => state.user?.id);

  return useQuery({
    queryKey: ['analytics', userId, 'weekly-summary', params],
    queryFn: () => analyticsAPI.getWeeklySummary(userId, params),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useExerciseHistory(exerciseId, params = {}) {
  return useQuery({
    queryKey: ['analytics', 'exercise-history', exerciseId, params],
    queryFn: () => analyticsAPI.getExerciseHistory(exerciseId, params),
    enabled: !!exerciseId,
    staleTime: 1000 * 60 * 5,
  });
}
