import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsAPI } from '../../api/notifications';

export function useNotificationsList(params = {}) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationsAPI.getNotifications(params),
    staleTime: 1000 * 30,
  });
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsAPI.getUnreadCount(),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notification_id) => notificationsAPI.markAsRead(notification_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsAPI.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
