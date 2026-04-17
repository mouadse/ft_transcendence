import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountAPI } from '../../../api/account';
import { notificationsAPI } from '../../../api/notifications';
import { useNavigate } from 'react-router-dom';
import { getLocaleForLanguage, useI18n } from '../../../i18n/useI18n';
import './NotificationsCenter.css';

function markNotificationListAsRead(notifications, notificationId = null) {
  if (!Array.isArray(notifications)) return [];

  const readAt = new Date().toISOString();

  return notifications.map((notification) => {
    if (notification.read_at) return notification;
    if (notificationId && notification.id !== notificationId) return notification;

    return {
      ...notification,
      read_at: readAt,
    };
  });
}

function extractExportId(notification) {
  if (notification?.payload?.export_id) return notification.payload.export_id;
  if (typeof notification?.payload_json !== 'string') return null;

  try {
    const parsed = JSON.parse(notification.payload_json);
    return parsed?.export_id || null;
  } catch {
    return null;
  }
}

function triggerBrowserDownload(blob, filename, contentType) {
  const fileBlob = blob instanceof Blob ? blob : new Blob([blob], { type: contentType });
  const objectUrl = window.URL.createObjectURL(fileBlob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename || 'export.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(objectUrl);
}

export default function NotificationsCenter() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const locale = getLocaleForLanguage(language);
  const [downloadingNotificationId, setDownloadingNotificationId] = useState(null);

  const { data: notifications = [], isLoading, isError } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.getAllNotifications(),
  });

  const markAsReadMutation = useMutation({
    mutationFn: notificationsAPI.markAsRead,
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['notifications', 'unread-count'] });

      const previousNotifications = queryClient.getQueryData(['notifications']);
      const previousUnreadCount = queryClient.getQueryData(['notifications', 'unread-count']);
      const nextNotifications = markNotificationListAsRead(previousNotifications, notificationId);
      const unreadCount = nextNotifications.filter((notification) => !notification.read_at).length;

      queryClient.setQueryData(['notifications'], nextNotifications);
      queryClient.setQueryData(['notifications', 'unread-count'], { unread_count: unreadCount });

      return {
        previousNotifications,
        previousUnreadCount,
      };
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications);
      }
      if (context?.previousUnreadCount) {
        queryClient.setQueryData(['notifications', 'unread-count'], context.previousUnreadCount);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: notificationsAPI.markAllAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      await queryClient.cancelQueries({ queryKey: ['notifications', 'unread-count'] });

      const previousNotifications = queryClient.getQueryData(['notifications']);
      const previousUnreadCount = queryClient.getQueryData(['notifications', 'unread-count']);
      const nextNotifications = markNotificationListAsRead(previousNotifications);

      queryClient.setQueryData(['notifications'], nextNotifications);
      queryClient.setQueryData(['notifications', 'unread-count'], { unread_count: 0 });

      return {
        previousNotifications,
        previousUnreadCount,
      };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications);
      }
      if (context?.previousUnreadCount) {
        queryClient.setQueryData(['notifications', 'unread-count'], context.previousUnreadCount);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'low_protein_warning':
      case 'missed_meal_logging':
        return 'nutrition';
      case 'workout_reminder':
      case 'rest_day_warning':
      case 'recovery_warning':
        return 'fitness_center';
      case 'export_ready':
        return 'download';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'low_protein_warning':
      case 'recovery_warning':
        return 'var(--swatch-pomegranate)';
      case 'workout_reminder':
        return 'var(--swatch-slushie)';
      case 'export_ready':
        return 'var(--swatch-matcha)';
      default:
        return 'var(--swatch-ube)';
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read_at) {
      markAsReadMutation.mutate(notification.id);
    }

    switch (notification.type) {
      case 'low_protein_warning':
      case 'missed_meal_logging':
        navigate('/nutrition');
        break;
      case 'workout_reminder':
      case 'rest_day_warning':
      case 'recovery_warning':
        navigate('/workouts');
        break;
      case 'export_ready': {
        const exportId = extractExportId(notification);
        if (!exportId) {
          navigate('/settings');
          break;
        }

        try {
          setDownloadingNotificationId(notification.id);
          const file = await accountAPI.downloadExport(exportId);
          triggerBrowserDownload(file.blob, file.filename, file.contentType);
        } catch (error) {
          if (error?.response?.status === 409) {
            alert(t('notificationsCenter.alert.exportNotReady'));
          } else {
            alert(t('notificationsCenter.alert.exportDownloadFailed'));
          }
          navigate('/settings');
        } finally {
          setDownloadingNotificationId(null);
        }
        break;
      }
      default:
        break;
    }
  };

  const isMutatingReadState =
    markAsReadMutation.isPending || markAllAsReadMutation.isPending;
  const isBusy = isMutatingReadState || Boolean(downloadingNotificationId);

  if (isLoading) {
    return (
      <div className="notif-root notif-loading">
        <p className="notif-label-mono">{t('notificationsCenter.loading')}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="notif-root notif-error">
        <h2 className="notif-title-display">{t('notificationsCenter.error.title')}</h2>
        <button className="notif-btn-pill notif-btn-matcha" onClick={() => queryClient.invalidateQueries({ queryKey: ['notifications'] })}>
          {t('notificationsCenter.error.retry')}
        </button>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div className="notif-root">
      <header className="notif-header">
        <div className="notif-header-left">
          <button className="notif-back-btn" onClick={() => navigate(-1)}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="notif-title-display">{t('notificationsCenter.title')}</h1>
            <p className="notif-header-summary notif-label-mono">
              {unreadCount > 0
                ? t('notificationsCenter.unreadCount', { count: unreadCount })
                : t('notificationsCenter.allRead')}
            </p>
          </div>
        </div>
      </header>

      <main className="notif-main">
        {notifications.length > 0 && (
          <section className="notif-actions-bar">
            <p className="notif-actions-copy">
              {unreadCount > 0
                ? t('notificationsCenter.actions.unreadHighlighted')
                : t('notificationsCenter.actions.everythingUpToDate')}
            </p>
            <button
              className="notif-btn-pill notif-btn-ghost"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={unreadCount === 0 || isMutatingReadState}
            >
              {markAllAsReadMutation.isPending
                ? t('notificationsCenter.actions.marking')
                : t('notificationsCenter.actions.markAllAsRead')}
            </button>
          </section>
        )}

        {notifications.length === 0 ? (
          <div className="notif-empty-state">
            <div className="notif-empty-icon">
              <span className="material-symbols-outlined">done_all</span>
            </div>
            <h2 className="notif-empty-title">{t('notificationsCenter.empty.title')}</h2>
            <p className="notif-empty-desc">{t('notificationsCenter.empty.description')}</p>
            <button className="notif-btn-pill notif-btn-matcha" onClick={() => navigate('/dashboard')}>
              {t('notificationsCenter.empty.goToDashboard')}
            </button>
          </div>
        ) : (
          <div className="notif-list">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`notif-card ${!notif.read_at ? 'notif-card-unread' : ''}`}
                onClick={() => !isBusy && handleNotificationClick(notif)}
              >
                <div className="notif-card-icon" style={{ backgroundColor: getNotificationColor(notif.type) }}>
                  <span className="material-symbols-outlined">{getNotificationIcon(notif.type)}</span>
                </div>
                <div className="notif-card-content">
                  <h3 className="notif-card-title">{notif.title}</h3>
                  <p className="notif-card-msg">
                    {downloadingNotificationId === notif.id ? t('notificationsCenter.preparingDownload') : notif.message}
                  </p>
                  <span className="notif-card-time notif-label-mono">
                    {new Date(notif.created_at).toLocaleString(locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                  </span>
                </div>
                {!notif.read_at && <div className="notif-unread-dot"></div>}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
