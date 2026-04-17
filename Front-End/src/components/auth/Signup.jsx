import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n/useI18n';
import AuthLanguageSwitch from './AuthLanguageSwitch';
import './Signup.css';

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()); }
function hasCapitalLetter(value) { return /[A-Z]/.test(value); }
function hasSpecialCharacter(value) { return /[^A-Za-z0-9]/.test(value); }

function getStrength(pw, t) {
  if (!pw) return { score: 0, label: '', cls: 'empty' };
  let score = 0;
  if (pw.length >= 8)          score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12)         score++;
  if (score <= 1) return { score, label: t('auth.signup.strength.weak'), cls: 'weak' };
  if (score === 2) return { score, label: t('auth.signup.strength.fair'), cls: 'fair' };
  if (score === 3) return { score, label: t('auth.signup.strength.good'), cls: 'strong' };
  return { score, label: t('auth.signup.strength.strong'), cls: 'strong' };
}

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [pw,      setPw]      = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw,  setShowPw]  = useState(false);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getStrength(pw, t), [pw, t]);

  const reqs = [
    { label: t('auth.signup.requirements.characters'), met: pw.length >= 8 },
    { label: t('auth.signup.requirements.capital'), met: hasCapitalLetter(pw) },
    { label: t('auth.signup.requirements.special'), met: hasSpecialCharacter(pw) },
  ];

  function clearError(field) { setErrors(p => ({ ...p, [field]: undefined })); }

  function validate() {
    const e = {};
    const normalizedName = name.trim();
    const normalizedEmail = email.trim();

    if (!normalizedName) e.name = t('auth.signup.errors.nameRequired');
    if (!normalizedEmail) e.email = t('auth.signup.errors.emailRequired');
    else if (!isValidEmail(normalizedEmail)) e.email = t('auth.signup.errors.emailInvalid');

    if (!pw) e.pw = t('auth.signup.errors.passwordRequired');
    else if (pw.length < 8) e.pw = t('auth.signup.errors.passwordShort');
    else if (!hasCapitalLetter(pw)) e.pw = t('auth.signup.errors.passwordCapital');
    else if (!hasSpecialCharacter(pw)) e.pw = t('auth.signup.errors.passwordSpecial');

    if (confirm !== pw) e.confirm = t('auth.signup.errors.passwordMismatch');
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      const response = await signup(name.trim(), email.trim(), pw);
      // Check if 2FA is required
      if (response.two_factor_required) {
        navigate('/2fa-challenge');
        return;
      }
      // Otherwise auth state update drives routing in App.jsx — goes to onboarding
    } catch (err) {
      const detail = err?.detail ?? err?.message ?? '';
      if (detail.toLowerCase().includes('duplicate') || detail.toLowerCase().includes('unique') || detail.toLowerCase().includes('already')) {
        setErrors({ email: t('auth.signup.errors.accountExists') });
      } else if (err?.status === 400) {
        setErrors({ email: detail || t('auth.signup.errors.invalidData') });
      } else {
        setErrors({ email: t('auth.signup.errors.signupFailed') });
      }
    } finally {
      setLoading(false);
    }
  }

  // Segment colors: active uses strength class
  const segColor = (i) => {
    if (i >= strength.score) return '#d4d5d2';
    if (strength.cls === 'weak')   return '#e05c3a';
    if (strength.cls === 'fair')   return '#f7751f';
    return '#38671a';
  };

  return (
    <div className="su-root">
      <div className="su-blob-green" />
      <div className="su-blob-purple" />

      {/* Header */}
      <header className="su-header">
        <button className="su-back-btn" onClick={() => navigate('/login')} aria-label={t('common.actions.goBack')}>
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="#2e2f2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className="su-logo">UM6P_FIT</span>
        <AuthLanguageSwitch className="su-language-switch" />
      </header>

      {/* Main */}
      <main className="su-main">
        <div className="su-heading-group">
          <h1 className="su-title">{t('auth.signup.title')}</h1>
          <p className="su-subtitle">{t('auth.signup.subtitle')}</p>
        </div>

        <form className="su-form" onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div className="su-field">
            <label className="su-label" htmlFor="su-name">{t('auth.signup.nameLabel')}</label>
            <input
              id="su-name"
              type="text"
              className={`su-input${errors.name ? ' su-input--error' : ''}`}
              placeholder={t('auth.signup.namePlaceholder')}
              value={name}
              onChange={e => { setName(e.target.value); clearError('name'); }}
              autoFocus
            />
            {errors.name && <p className="su-error">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="su-field">
            <label className="su-label" htmlFor="su-email">{t('auth.signup.emailLabel')}</label>
            <input
              id="su-email"
              type="email"
              className={`su-input${errors.email ? ' su-input--error' : ''}`}
              placeholder={t('auth.signup.emailPlaceholder')}
              value={email}
              onChange={e => { setEmail(e.target.value); clearError('email'); }}
              autoComplete="email"
            />
            {errors.email && <p className="su-error">{errors.email}</p>}
          </div>

          {/* Password + Strength */}
          <div className="su-pw-group">
            <div className="su-field">
              <label className="su-label" htmlFor="su-pw">{t('auth.signup.passwordLabel')}</label>
              <input
                id="su-pw"
                type={showPw ? 'text' : 'password'}
                className={`su-input${errors.pw ? ' su-input--error' : ''}`}
                placeholder={t('auth.signup.passwordPlaceholder')}
                value={pw}
                onChange={e => { setPw(e.target.value); clearError('pw'); }}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="su-input-icon"
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
              {errors.pw && <p className="su-error">{errors.pw}</p>}
            </div>

            {/* Strength card — show only when user has typed */}
            {pw.length > 0 && (
              <div className="su-strength-card">
                <div className="su-strength-bar">
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="su-strength-seg"
                      style={{ background: segColor(i) }}
                    />
                  ))}
                  <span className={`su-strength-label ${strength.cls}`}>
                    {strength.label}
                  </span>
                </div>
                <div className="su-req-list">
                  {reqs.map(r => (
                    <div className="su-req-item" key={r.label}>
                      <div className={`su-req-dot${r.met ? ' met' : ''}`} />
                      <span className={`su-req-text${r.met ? ' met' : ' unmet'}`}>{r.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="su-field">
            <label className="su-label" htmlFor="su-confirm">{t('auth.signup.confirmLabel')}</label>
            <input
              id="su-confirm"
              type={showPw ? 'text' : 'password'}
              className={`su-input${errors.confirm ? ' su-input--error' : ''}`}
              placeholder={t('auth.signup.passwordPlaceholder')}
              value={confirm}
              onChange={e => { setConfirm(e.target.value); clearError('confirm'); }}
              autoComplete="new-password"
            />
            {errors.confirm && <p className="su-error">{errors.confirm}</p>}
          </div>

          {/* Submit */}
          <button type="submit" className="su-btn" disabled={loading}>
            {loading ? (
              <div className="su-spinner" />
            ) : (
              <>
                <span className="su-btn-label">{t('common.actions.createAccount')}</span>
                <span className="su-btn-arrow">
                  <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
                    <path d="M1 7H15M9 1L15 7L9 13" stroke="#d6ffb7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </>
            )}
          </button>
        </form>
        {/* Login link */}
        <div className="su-footer-link">
          <span>{t('auth.signup.footerPrompt')}</span>
          <button type="button" onClick={() => navigate('/login')}>{t('auth.signup.footerAction')}</button>
        </div>
        <div className="su-legal-links">
          <Link to="/privacy">{t('settings.privacyPolicy')}</Link>
          <span aria-hidden="true">•</span>
          <Link to="/terms">{t('settings.termsOfService')}</Link>
        </div>
      </main>
    </div>
  );
}
