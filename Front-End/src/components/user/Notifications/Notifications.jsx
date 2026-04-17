import { useNavigate } from 'react-router-dom';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsList,
} from '../../../hooks/queries/useNotifications';
import { getLocaleForLanguage, useI18n } from '../../../i18n/useI18n';
import './Notifications.css';

function formatWhen(value, locale) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Notifications() {
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const locale = getLocaleForLanguage(language);
  const { data, isLoading } = useNotificationsList({ limit: 50 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = Array.isArray(data) ? data : data?.data || [];

  return (
    <div className="notifs-root">
      <header className="notifs-header">
        <button className="notifs-back" onClick={() => navigate('/dashboard')} aria-label={t('notificationsPage.backAria')}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="notifs-title">{t('notificationsPage.title')}</h1>
        <button className="notifs-mark-all" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
          {t('notificationsPage.markAllRead')}
        </button>
      </header>

      <main className="notifs-main">
        {isLoading ? (
          <p className="notifs-empty">{t('notificationsPage.loading')}</p>
        ) : notifications.length === 0 ? (
          <p className="notifs-empty">{t('notificationsPage.empty')}</p>
        ) : (
          notifications.map((notification) => {
            const isRead = Boolean(notification.read_at);
            return (
              <article key={notification.id} className={`notifs-item${isRead ? ' notifs-item--read' : ''}`}>
                <div className="notifs-item-main">
                  <h2 className="notifs-item-title">{notification.title}</h2>
                  <p className="notifs-item-message">{notification.message}</p>
                  <p className="notifs-item-time">{formatWhen(notification.created_at, locale)}</p>
                </div>
                {!isRead && (
                  <button
                    className="notifs-item-action"
                    onClick={() => markRead.mutate(notification.id)}
                    disabled={markRead.isPending}
                  >
                    {t('notificationsPage.markRead')}
                  </button>
                )}
              </article>
            );
          })
        )}
      </main>
    </div>
  );
}
