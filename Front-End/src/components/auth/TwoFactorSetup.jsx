import { useState, useEffect, useRef } from 'react';
import { authAPI } from '../../api/auth';
import './TwoFactorSetup.css';

const STEP = { INIT: 'init', QR: 'qr', VERIFY: 'verify', RECOVERY: 'recovery', DISABLE: 'disable' };

/**
 * TwoFactorSetup — modal/panel for managing 2FA
 *
 * Props:
 *   isEnabled  {boolean}  — current 2FA status from user profile
 *   onClose    {fn}       — called when done / dismissed
 *   onSuccess  {fn}       — called after enable or disable with { enabled: bool }
 */
export default function TwoFactorSetup({ isEnabled = false, onClose, onSuccess }) {
  const [step,          setStep]          = useState(isEnabled ? STEP.INIT : STEP.INIT);
  const [setupData,     setSetupData]     = useState(null); // { secret, otp_url }
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [code,          setCode]          = useState('');
  const [disableCode,   setDisableCode]   = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [copied,        setCopied]        = useState(false);
  const codeRef = useRef(null);

  // Auto-focus code input when entering verify step
  useEffect(() => {
    if ((step === STEP.VERIFY || step === STEP.DISABLE) && codeRef.current) {
      codeRef.current.focus();
    }
  }, [step]);

  // ── Initiate setup ────────────────────────────────────────────────
  async function handleBeginSetup() {
    setLoading(true);
    setError('');
    try {
      const data = await authAPI.setup2FA();
      setSetupData(data);
      setStep(STEP.QR);
    } catch (err) {
      const msg = err?.response?.data?.detail ?? err?.response?.data?.error ?? '';
      if (msg.toLowerCase().includes('already')) {
        setError('2FA is already enabled on this account.');
      } else {
        setError('Failed to start 2FA setup. Try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Verify TOTP to activate ───────────────────────────────────────
  async function handleVerify(ev) {
    ev.preventDefault();
    if (code.length !== 6) { setError('Enter the 6-digit code from your app.'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await authAPI.confirm2FA(code);
      setRecoveryCodes(data.recovery_codes ?? []);
      setStep(STEP.RECOVERY);
      onSuccess?.({ enabled: true });
    } catch (err) {
      const msg = err?.response?.data?.detail ?? '';
      setError(msg.toLowerCase().includes('invalid') ? 'Invalid code. Try again.' : 'Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Disable 2FA ───────────────────────────────────────────────────
  async function handleDisable(ev) {
    ev.preventDefault();
    if (disableCode.length !== 6) { setError('Enter the 6-digit code from your app.'); return; }
    setLoading(true);
    setError('');
    try {
      await authAPI.disable2FA(disableCode);
      onSuccess?.({ enabled: false });
      onClose?.();
    } catch (err) {
      const msg = err?.response?.data?.detail ?? '';
      setError(msg.toLowerCase().includes('invalid') ? 'Invalid code. Try again.' : 'Could not disable 2FA. Try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Copy recovery codes ───────────────────────────────────────────
  function handleCopyCodes() {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Code input: digits only, 6 max ───────────────────────────────
  function handleCodeChange(e, setter) {
    setter(e.target.value.replace(/\D/g, '').slice(0, 6));
    setError('');
  }

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="tfs-overlay" onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="tfs-panel" role="dialog" aria-modal="true">

        {/* Close button */}
        <button className="tfs-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 2L14 14M14 2L2 14" stroke="#2e2f2e" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* ── INIT: status overview ────────────────────────────────── */}
        {step === STEP.INIT && (
          <div className="tfs-step tfs-step--init">
            <div className="tfs-shield-icon" aria-hidden="true">
              {isEnabled ? '🔐' : '🛡️'}
            </div>
            <h2 className="tfs-title">
              Two-Factor Authentication
            </h2>
            <p className="tfs-desc">
              {isEnabled
                ? 'Your account is protected with 2FA. An authenticator app code is required on each login.'
                : 'Add an extra layer of security. After setup, you\'ll need your authenticator app to sign in.'}
            </p>

            <div className={`tfs-status-badge ${isEnabled ? 'tfs-status-badge--on' : 'tfs-status-badge--off'}`}>
              <div className="tfs-status-dot" />
              {isEnabled ? '2FA Enabled' : '2FA Disabled'}
            </div>

            {isEnabled ? (
              <button
                className="tfs-btn tfs-btn--danger"
                onClick={() => { setStep(STEP.DISABLE); setError(''); }}
              >
                Disable 2FA
              </button>
            ) : (
              <button
                className="tfs-btn tfs-btn--primary"
                onClick={handleBeginSetup}
                disabled={loading}
              >
                {loading ? <div className="tfs-spinner" /> : 'Enable 2FA →'}
              </button>
            )}

            {error && <p className="tfs-error">{error}</p>}
          </div>
        )}

        {/* ── QR: scan QR code ─────────────────────────────────────── */}
        {step === STEP.QR && setupData && (
          <div className="tfs-step">
            <span className="tfs-step-label">Step 01 / Scan</span>
            <h2 className="tfs-title">Scan QR Code</h2>
            <p className="tfs-desc">
              Open your authenticator app (Google Authenticator, Authy, 1Password) and scan this QR code.
            </p>

            {/* QR Code via Google Charts API (safe, no data sent) */}
            <div className="tfs-qr-wrap">
              <img
                className="tfs-qr"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.otp_url)}`}
                alt="2FA QR Code"
                width="200"
                height="200"
              />
            </div>

            {/* Manual secret fallback */}
            <div className="tfs-secret-card">
              <span className="tfs-secret-label">Can't scan? Enter manually:</span>
              <div className="tfs-secret-row">
                <code className="tfs-secret">{setupData.secret}</code>
                <button
                  type="button"
                  className="tfs-copy-btn"
                  onClick={() => { navigator.clipboard.writeText(setupData.secret); }}
                  aria-label="Copy secret"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="#38671a" strokeWidth="1.5"/>
                    <path d="M2 10V2h8" stroke="#38671a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

            <button
              className="tfs-btn tfs-btn--primary"
              onClick={() => { setStep(STEP.VERIFY); setError(''); }}
            >
              I've scanned it →
            </button>
          </div>
        )}

        {/* ── VERIFY: enter TOTP code ───────────────────────────────── */}
        {step === STEP.VERIFY && (
          <div className="tfs-step">
            <span className="tfs-step-label">Step 02 / Verify</span>
            <h2 className="tfs-title">Enter Code</h2>
            <p className="tfs-desc">
              Enter the 6-digit code from your authenticator app to confirm setup.
            </p>

            <form onSubmit={handleVerify} noValidate>
              <div className="tfs-code-field">
                <input
                  ref={codeRef}
                  type="text"
                  inputMode="numeric"
                  className={`tfs-code-input ${error ? 'tfs-code-input--error' : ''}`}
                  placeholder="000 000"
                  value={code}
                  onChange={e => handleCodeChange(e, setCode)}
                  maxLength="6"
                  autoComplete="one-time-code"
                />
                {error && <p className="tfs-error">{error}</p>}
              </div>

              <button
                type="submit"
                className="tfs-btn tfs-btn--primary"
                disabled={loading || code.length !== 6}
              >
                {loading ? <div className="tfs-spinner" /> : 'Activate 2FA →'}
              </button>
            </form>

            <button type="button" className="tfs-back-link" onClick={() => { setStep(STEP.QR); setError(''); setCode(''); }}>
              ← Back to QR code
            </button>
          </div>
        )}

        {/* ── RECOVERY: show recovery codes ────────────────────────── */}
        {step === STEP.RECOVERY && (
          <div className="tfs-step">
            <div className="tfs-success-icon" aria-hidden="true">✅</div>
            <h2 className="tfs-title">2FA Activated!</h2>
            <p className="tfs-desc">
              Save these recovery codes somewhere safe. Each can be used once if you lose access to your authenticator app.
            </p>

            <div className="tfs-recovery-grid">
              {recoveryCodes.map((c, i) => (
                <div key={i} className="tfs-recovery-code">
                  <span className="tfs-recovery-index">{String(i + 1).padStart(2, '0')}</span>
                  <code>{c}</code>
                </div>
              ))}
            </div>

            <button type="button" className="tfs-btn tfs-btn--outline" onClick={handleCopyCodes}>
              {copied ? '✓ Copied!' : 'Copy All Codes'}
            </button>

            <div className="tfs-warning-card">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="tfs-warn-icon">
                <path d="M8 2L14 13H2L8 2Z" stroke="#d08a11" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M8 6v3M8 11v0.5" stroke="#d08a11" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p>These codes will not be shown again. Store them securely.</p>
            </div>

            <button type="button" className="tfs-btn tfs-btn--primary" onClick={onClose}>
              Done →
            </button>
          </div>
        )}

        {/* ── DISABLE: confirm with TOTP ────────────────────────────── */}
        {step === STEP.DISABLE && (
          <div className="tfs-step">
            <div className="tfs-shield-icon" aria-hidden="true">⚠️</div>
            <h2 className="tfs-title">Disable 2FA</h2>
            <p className="tfs-desc">
              Enter your current authenticator code to confirm. This will remove 2FA protection from your account.
            </p>

            <form onSubmit={handleDisable} noValidate>
              <div className="tfs-code-field">
                <input
                  ref={codeRef}
                  type="text"
                  inputMode="numeric"
                  className={`tfs-code-input ${error ? 'tfs-code-input--error' : ''}`}
                  placeholder="000 000"
                  value={disableCode}
                  onChange={e => handleCodeChange(e, setDisableCode)}
                  maxLength="6"
                  autoComplete="one-time-code"
                />
                {error && <p className="tfs-error">{error}</p>}
              </div>

              <button
                type="submit"
                className="tfs-btn tfs-btn--danger"
                disabled={loading || disableCode.length !== 6}
              >
                {loading ? <div className="tfs-spinner" /> : 'Confirm Disable'}
              </button>
            </form>

            <button type="button" className="tfs-back-link" onClick={() => { setStep(STEP.INIT); setError(''); setDisableCode(''); }}>
              ← Cancel
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
