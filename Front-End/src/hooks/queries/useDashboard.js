import { useQuery } from '@tanstack/react-query';
import { usersAPI } from '../../api/users';
import { notificationsAPI } from '../../api/notifications';
import { authStore } from '../../stores/authStore';

export function useDashboardSummary() {
  const userId = authStore((state) => state.user?.id);

  return useQuery({
    queryKey: ['dashboard', 'summary', userId],
    queryFn: () => usersAPI.getSummary(userId),
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useDashboardStreaks() {
  const userId = authStore((state) => state.user?.id);

  return useQuery({
    queryKey: ['dashboard', 'streaks', userId],
    queryFn: () => usersAPI.getStreaks(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useDashboardRecommendations() {
  const userId = authStore((state) => state.user?.id);

  return useQuery({
    queryKey: ['dashboard', 'recommendations', userId],
    queryFn: () => usersAPI.getRecommendations(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsAPI.getUnreadCount(),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every 1 minute
  });
}

export function useDashboardWeeklySummary() {
  return useQuery({
    queryKey: ['dashboard', 'weekly-summary'],
    queryFn: () => usersAPI.getWeeklySummary(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useDashboardCoachSummary() {
  const userId = authStore((state) => state.user?.id);

  return useQuery({
    queryKey: ['dashboard', 'coach-summary', userId],
    queryFn: () => usersAPI.getCoachSummary(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useNotifications(params = {}) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationsAPI.getNotifications(params),
    staleTime: 1000 * 30, // 30 seconds
  });
}
