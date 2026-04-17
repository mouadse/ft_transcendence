import client from './client';

const NOTIFICATIONS_PAGE_SIZE = 100;

function parsePayload(payloadJson) {
  if (!payloadJson) return null;
  if (typeof payloadJson === 'object') return payloadJson;
  if (typeof payloadJson !== 'string') return null;

  try {
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

function normalizeNotification(notification) {
  if (!notification || typeof notification !== 'object') return notification;

  return {
    ...notification,
    payload: parsePayload(notification.payload_json),
    read_at: notification.read_at || null,
    created_at: notification.created_at || null,
  };
}

export const notificationsAPI = {
  // Get all notifications
  getNotifications: async (params = {}) => {
    const response = await client.get('/v1/notifications', { params });
    return Array.isArray(response.data)
      ? response.data.map(normalizeNotification)
      : [];
  },

  // Get all notifications across paginated results
  getAllNotifications: async (params = {}) => {
    const notifications = [];
    const limit = params.limit ?? NOTIFICATIONS_PAGE_SIZE;
    let offset = params.offset ?? 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await notificationsAPI.getNotifications({
        ...params,
        limit,
        offset,
      });

      notifications.push(...batch);
      hasMore = batch.length === limit;
      offset += limit;
    }

    return notifications;
  },

  // Get unread notification count
  getUnreadCount: async () => {
    const response = await client.get('/v1/notifications/unread-count');
    return {
      unread_count: Number(response.data?.unread_count) || 0,
    };
  },

  // Mark notification as read
  markAsRead: async (notification_id) => {
    const response = await client.patch(`/v1/notifications/${notification_id}/read`);
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await client.patch('/v1/notifications/read-all');
    return response.data;
  },

  // Delete notification
  deleteNotification: async (notification_id) => {
    const response = await client.delete(`/v1/notifications/${notification_id}`);
    return response.data;
  },

  // Get notification preferences
  getPreferences: async () => {
    const response = await client.get('/v1/notifications/preferences');
    return response.data;
  },

  // Update notification preferences
  updatePreferences: async (preferences) => {
    const response = await client.patch('/v1/notifications/preferences', preferences);
    return response.data;
  },
};
