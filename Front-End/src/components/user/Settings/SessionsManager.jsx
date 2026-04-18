import { useState, useEffect } from 'react';
import { authAPI } from '../../../api/auth';
import { useAuth } from '../../../hooks/useAuth';
import { useI18n } from '../../../i18n/useI18n';
import { hardRedirectToLogin } from '../../../utils/navigation';

const SESSION_PAGE_SIZE = 100;

export default function SessionsManager({ onClose }) {
  const { t, locale } = useI18n('settings');
  const { logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatDate = (value) => {
    if (!value) return t('unknownValue');
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? t('unknownValue')
      : parsed.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  useEffect(() => {
    let active = true;

    async function loadSessions() {
      try {
        if (active) {
          setLoading(true);
          setError(null);
        }

        let page = 1;
        let hasNext = true;
        const allSessions = [];

        while (hasNext) {
          const response = await authAPI.getSessions({ page, limit: SESSION_PAGE_SIZE });
          const pageSessions = Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
              ? response
              : [];

          allSessions.push(...pageSessions);

          if (!Array.isArray(response?.data)) { hasNext = false; continue; }
          const nextFromMetadata = Boolean(response?.metadata?.has_next);
          hasNext = nextFromMetadata && pageSessions.length > 0;
          page += 1;
        }

        if (!active) return;

        const deduped = Array.from(
          new Map(allSessions.map((s) => [s.id, s])).values()
        );
        setSessions(deduped);
      } catch (err) {
        if (!active) return;
        setError(err.message || t('sessionsLoadFailed'));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSessions();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per modal mount; t changes identity on every render
  }, []);

  const handleRevoke = async (id) => {
    try {
      await authAPI.revokeSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message || t('sessionRevokeFailed'));
    }
  };

  const handleRevokeAll = async () => {
    const confirmed = window.confirm(t('revokeAllConfirm'));
    if (!confirmed) return;

    try {
      await authAPI.logout(true);
      await logout({ skipApiCall: true });
      hardRedirectToLogin();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 404) {
        await logout({ skipApiCall: true });
        hardRedirectToLogin();
        return;
      }
      setError(err.message || t('sessionsRevokeAllFailed'));
    }
  };

  return (
    <div className="st-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="st-modal-panel">
        <button type="button" className="st-modal-close" onClick={onClose}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
        </button>

        <h3 className="st-modal-title">{t('activeSessionsTitle')}</h3>
        <p className="st-modal-desc">{t('activeSessionsDesc')}</p>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#5b5c5a', marginBottom: 24 }}>{t('loading')}</p>
        ) : error ? (
          <p style={{ color: '#b02500', marginBottom: 24, fontSize: 14 }}>{error}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {sessions.length === 0 && (
              <p style={{ color: '#5b5c5a', fontSize: 14 }}>{t('noActiveSessions')}</p>
            )}
            {sessions.map((session) => (
              <div key={session.id} className="st-session-item">
                <div className="st-session-info">
                  <div className="st-session-device">
                    {session.user_agent || t('unknownDevice')}
                  </div>
                  <div className="st-session-meta">
                    {t('sessionIpLabel')}: {session.last_ip || t('unknownValue')} · {t('sessionExpiresLabel')}: {formatDate(session.expires_at)}
                  </div>
                </div>
                <button
                  type="button"
                  className="st-session-revoke"
                  onClick={() => handleRevoke(session.id)}
                  title={t('revokeSession')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button type="button" className="st-modal-btn st-modal-btn--outline" onClick={handleRevokeAll}>
            {t('logoutAllDevices')}
          </button>
          <button type="button" className="st-modal-btn st-modal-btn--primary" onClick={onClose}>
            {t('done')}
          </button>
        </div>
      </div>
    </div>
  );
}
