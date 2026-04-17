import { useState } from 'react';
import { accountAPI } from '../../../api/account';
import { useI18n } from '../../../i18n/useI18n';

export default function ExportManager({ onClose }) {
  const { t } = useI18n('settings');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [exportId, setExportId] = useState(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await accountAPI.createExport();
      setSuccess(true);
      if (data?.id) setExportId(data.id);
    } catch (err) {
      setError(err.message || t('exportRequestFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="st-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="st-modal-panel">
        <button type="button" className="st-modal-close" onClick={onClose}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
        </button>

        <h3 className="st-modal-title">{t('exportTitle')}</h3>

        {!success ? (
          <>
            <p className="st-modal-desc">{t('exportDesc')}</p>

            {error && (
              <p style={{ color: '#b02500', marginBottom: 16, fontSize: 14, lineHeight: 1.5 }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                type="button"
                className="st-modal-btn st-modal-btn--primary"
                onClick={handleExport}
                disabled={loading}
              >
                {loading ? t('requesting') : t('requestDataExport')}
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
          </>
        ) : (
          <>
            <p className="st-modal-desc" style={{ color: '#38671a', fontWeight: 700 }}>
              {t('exportRequestReceived')}
            </p>
            <p className="st-modal-desc">
              {exportId ? `${t('exportIdLabel')}: ${exportId}. ` : ''}
              {t('exportReadyEmail')}
            </p>
            <button type="button" className="st-modal-btn st-modal-btn--primary" onClick={onClose}>
              {t('done')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
