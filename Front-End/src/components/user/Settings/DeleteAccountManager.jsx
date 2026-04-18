import { useState } from 'react';
import { accountAPI } from '../../../api/account';
import { useAuth } from '../../../hooks/useAuth';
import { useI18n } from '../../../i18n/useI18n';

export default function DeleteAccountManager({ onClose }) {
  const { logout } = useAuth();
  const { t } = useI18n('settings');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      setError(t('deleteConfirmError'));
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await accountAPI.deleteAccount();
      logout(true);
    } catch (err) {
      setError(err.message || t('deleteAccountFailed'));
      setLoading(false);
    }
  };

  return (
    <div
      className="st-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="st-modal-panel" style={{ borderColor: '#fc7981' }}>
        <button type="button" className="st-modal-close" onClick={onClose}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
        </button>

        <h3 className="st-modal-title" style={{ color: '#b02500' }}>{t('deleteAccountTitle')}</h3>

        <p className="st-modal-desc" style={{ fontWeight: 700, color: '#2e2f2e' }}>
          {t('deleteAccountWarning')}
        </p>
        <p className="st-modal-desc">
          {t('deleteAccountDesc')}
        </p>

        <div style={{ marginBottom: 24 }}>
          <label className="st-field-label" style={{ marginBottom: 8 }}>
            {t('typeDeleteToConfirm')}
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={t('deleteConfirmPlaceholder')}
            className="st-input"
            style={{ borderRadius: 12, fontFamily: 'Space Mono, monospace' }}
          />
        </div>

        {error && (
          <p style={{ color: '#b02500', marginBottom: 16, fontSize: 14 }}>{error}</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            type="button"
            className="st-modal-btn st-modal-btn--danger"
            onClick={handleDelete}
            disabled={loading || confirmText !== 'DELETE'}
          >
            {loading ? t('processing') : t('deleteAccountAction')}
          </button>
          <button
            type="button"
            className="st-modal-btn st-modal-btn--outline"
            onClick={onClose}
            disabled={loading}
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
