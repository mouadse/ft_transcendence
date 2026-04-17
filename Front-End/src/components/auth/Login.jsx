import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n/useI18n';
import AuthLanguageSwitch from './AuthLanguageSwitch';
import './Login.css';

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()); }

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);

  const isReady = email.trim() && password.length >= 8;

  function validate() {
    const e = {};
    if (!email.trim()) e.email = t('auth.login.errors.emailRequired');
    else if (!isValidEmail(email)) e.email = t('auth.login.errors.emailInvalid');
    if (!password) e.password = t('auth.login.errors.passwordRequired');
    else if (password.length < 8) e.password = t('auth.login.errors.passwordShort');
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      const response = await login(email, password);
      // Check if 2FA is required
      if (response.two_factor_required) {
        navigate('/2fa-challenge');
        return;
      }
      // Otherwise auth state update drives routing in App.jsx automatically
    } catch (err) {
      const fieldErrors = err?.fieldErrors ?? {};
      if (fieldErrors.email || fieldErrors.password) {
        setErrors({
          ...(fieldErrors.email ? { email: fieldErrors.email } : {}),
          ...(fieldErrors.password ? { password: fieldErrors.password } : {}),
        });
        return;
      }

      const detail = err?.detail ?? err?.message ?? '';
      if (err?.status === 401 || detail.toLowerCase().includes('invalid') || detail.toLowerCase().includes('credentials')) {
        setErrors({ email: t('auth.login.errors.invalidCredentials') });
      } else if (err?.status === 403) {
        setErrors({ email: t('auth.login.errors.accountDisabled') });
      } else if (detail) {
        setErrors({ email: detail });
      } else {
        setErrors({ email: t('auth.login.errors.loginFailed') });
      }
    } finally {
      setLoading(false);
    }
  }

  function clearError(field) { setErrors(p => ({ ...p, [field]: undefined })); }

  return (
    <div className="login-root">
      <div className="login-blob-green" />
      <div className="login-blob-purple" />

      <div className="login-container">
        <div className="login-wordmark">UM6P_FIT</div>
        <AuthLanguageSwitch className="login-language-switch" />

        {/* Desktop hero — only visible on md+ */}
        <div className="login-desktop-hero">
          <div className="login-desktop-sticker" aria-hidden="true">
            <span className="login-desktop-sticker-icon">⚡</span>
            <span>{t('auth.login.sticker')}</span>
          </div>
          <h2 className="login-desktop-hero-title">
            {t('auth.login.heroLine1')}<br/>{t('auth.login.heroLine2')}<br/>{t('auth.login.heroLine3')}
          </h2>
          <p className="login-desktop-hero-subtitle">
            {t('auth.login.heroSubtitle')}
          </p>
          <div className="login-desktop-features">
            {[
              { icon: '🏋️', text: t('auth.login.featurePrograms') },
              { icon: '🥗', text: t('auth.login.featureNutrition') },
              { icon: '🤖', text: t('auth.login.featureCoach') },
            ].map((f, i) => (
              <div className="login-desktop-feature" key={i}>
                <span className="login-desktop-feature-emoji">{f.icon}</span>
                <span className="login-desktop-feature-text">{f.text}</span>
              </div>
            ))}
          </div>
          {/* Desktop signup CTA — visible only on md+ */}
          <div className="login-desktop-signup">
            <span className="login-desktop-signup-label">{t('auth.login.desktopPrompt')}</span>
            <button
              type="button"
              className="login-desktop-signup-btn"
              onClick={() => navigate('/signup')}
            >
              {t('auth.login.desktopAction')} →
            </button>
          </div>
        </div>

        <div className="login-card">
          {/* Heading */}
          <div className="login-heading">
            <h1 className="login-title">{t('auth.login.welcomeTop')}<br/>{t('auth.login.welcomeBottom')}</h1>
            <p className="login-subtitle">{t('auth.login.portal')}</p>
          </div>

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="login-field">
              <label className="login-field-label" htmlFor="login-email">{t('auth.login.emailLabel')}</label>
              <input
                id="login-email"
                type="email"
                className={`login-input${errors.email ? ' login-input--error' : ''}`}
                placeholder={t('auth.login.emailPlaceholder')}
                value={email}
                onChange={e => { setEmail(e.target.value); clearError('email'); }}
                autoComplete="email"
                autoFocus
              />
              {errors.email && <p className="login-error-msg">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="login-field">
              <label className="login-field-label" htmlFor="login-pw">{t('auth.login.passwordLabel')}</label>
              <input
                id="login-pw"
                type={showPw ? 'text' : 'password'}
                className={`login-input${errors.password ? ' login-input--error' : ''}`}
                placeholder={t('auth.login.passwordPlaceholder')}
                value={password}
                onChange={e => { setPassword(e.target.value); clearError('password'); }}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-input-icon"
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? t('common.actions.hidePassword') : t('common.actions.showPassword')}
              >
                {showPw ? (
                  <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
                    <path d="M1 9C1 9 4.5 2 11 2C17.5 2 21 9 21 9C21 9 17.5 16 11 16C4.5 16 1 9 1 9Z" stroke="#adadab" strokeWidth="1.5"/>
                    <circle cx="11" cy="9" r="3" stroke="#adadab" strokeWidth="1.5"/>
                    <line x1="2" y1="1" x2="20" y2="17" stroke="#adadab" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
                    <path d="M1 8C1 8 4.5 1 11 1C17.5 1 21 8 21 8C21 8 17.5 15 11 15C4.5 15 1 8 1 8Z" stroke="#adadab" strokeWidth="1.5"/>
                    <circle cx="11" cy="8" r="3" stroke="#adadab" strokeWidth="1.5"/>
                  </svg>
                )}
              </button>
              {errors.password && <p className="login-error-msg">{errors.password}</p>}
            </div>

            {/* Sign In */}
            <button type="submit" className="login-btn" disabled={!isReady || loading}>
              {loading ? <div className="login-spinner" /> : t('common.actions.signIn')}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="login-footer-link">
          <span>{t('auth.login.footerPrompt')}</span>
          <button type="button" onClick={() => navigate('/signup')}>{t('auth.login.footerAction')}</button>
        </div>
        <div className="login-legal-links">
          <Link to="/privacy">{t('settings.privacyPolicy')}</Link>
          <span aria-hidden="true">•</span>
          <Link to="/terms">{t('settings.termsOfService')}</Link>
        </div>
      </div>
    </div>
  );
}
