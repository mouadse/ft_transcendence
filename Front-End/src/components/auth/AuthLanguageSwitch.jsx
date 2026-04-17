import { LANGUAGE_OPTIONS, useI18n } from '../../i18n/useI18n';
import './AuthLanguageSwitch.css';

export default function AuthLanguageSwitch({ className = '' }) {
  const { t, language, setLanguage } = useI18n();
  const classes = ['auth-lang-switch', className].filter(Boolean).join(' ');

  return (
    <div className={classes} role="group" aria-label={t('common.labels.language')}>
      {LANGUAGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`auth-lang-switch-btn${language === option.value ? ' auth-lang-switch-btn--active' : ''}`}
          onClick={() => setLanguage(option.value)}
          title={t(option.titleKey)}
          aria-label={t(option.titleKey)}
          aria-pressed={language === option.value}
        >
          {option.shortLabel}
        </button>
      ))}
    </div>
  );
}
