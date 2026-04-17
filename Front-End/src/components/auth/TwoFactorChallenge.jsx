import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authStore } from '../../stores/authStore';
import './TwoFactorChallenge.css';

export default function TwoFactorChallenge() {
  const navigate = useNavigate();
  const { complete2FA } = useAuth();
  const user = authStore((state) => state.user);
  const two_factor_token = authStore((state) => state.two_factor_token);

  const [totpCode, setTotpCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // If no 2FA challenge in progress, redirect to login
  useEffect(() => {
    if (!two_factor_token || !user) {
      navigate('/login');
    }
  }, [two_factor_token, user, navigate]);

  const handleTotpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setTotpCode(value);
    setErrors((p) => ({ ...p, totp: undefined }));
  };

  const handleRecoveryChange = (e) => {
    setRecoveryCode(e.target.value.trim());
    setErrors((p) => ({ ...p, recovery: undefined }));
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setLoading(true);

    try {
      if (useRecovery) {
        if (!recoveryCode) {
          setErrors({ recovery: 'Recovery code is required.' });
          setLoading(false);
          return;
        }
        await complete2FA(null, recoveryCode);
      } else {
        if (totpCode.length !== 6) {
          setErrors({ totp: 'Enter a 6-digit code.' });
          setLoading(false);
          return;
        }
        await complete2FA(totpCode, null);
      }
      // Auth state update drives routing to dashboard automatically
    } catch {
      if (useRecovery) {
        setErrors({ recovery: 'Invalid recovery code.' });
      } else {
        setErrors({ totp: 'Invalid code. Try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="tfa-root">
      <div className="tfa-blob-green" />
      <div className="tfa-blob-purple" />

      <div className="tfa-container">
        <div className="tfa-wordmark">UM6P_FIT</div>

        <div className="tfa-card">
          <div className="tfa-heading">
            <h1 className="tfa-title">Two-Factor Authentication</h1>
            <p className="tfa-subtitle">
              Enter the code from your authenticator app
            </p>
          </div>

          <form className="tfa-form" onSubmit={handleSubmit} noValidate>
            {!useRecovery ? (
              <>
                {/* TOTP Code Input */}
                <div className="tfa-field">
                  <label className="tfa-label" htmlFor="tfa-code">
                    Authenticator Code
                  </label>
                  <input
                    id="tfa-code"
                    type="text"
                    inputMode="numeric"
                    className={`tfa-input${errors.totp ? ' tfa-input--error' : ''}`}
                    placeholder="000000"
                    value={totpCode}
                    onChange={handleTotpChange}
                    maxLength="6"
                    autoFocus
                  />
                  {errors.totp && <p className="tfa-error">{errors.totp}</p>}
                  <p className="tfa-hint">Check your authenticator app for a 6-digit code</p>
                </div>

                {/* Submit */}
                <button type="submit" className="tfa-btn" disabled={loading || totpCode.length !== 6}>
                  {loading ? <div className="tfa-spinner" /> : 'Verify'}
                </button>

                {/* Use Recovery Code Link */}
                <button
                  type="button"
                  className="tfa-recovery-link"
                  onClick={() => {
                    setUseRecovery(true);
                    setTotpCode('');
                    setErrors({});
                  }}
                >
                  Use recovery code instead
                </button>
              </>
            ) : (
              <>
                {/* Recovery Code Input */}
                <div className="tfa-field">
                  <label className="tfa-label" htmlFor="tfa-recovery">
                    Recovery Code
                  </label>
                  <input
                    id="tfa-recovery"
                    type="text"
                    className={`tfa-input${errors.recovery ? ' tfa-input--error' : ''}`}
                    placeholder="xxxxxxxx-xxxx-xxxx"
                    value={recoveryCode}
                    onChange={handleRecoveryChange}
                    autoFocus
                  />
                  {errors.recovery && <p className="tfa-error">{errors.recovery}</p>}
                  <p className="tfa-hint">Enter one of your recovery codes</p>
                </div>

                {/* Submit */}
                <button type="submit" className="tfa-btn" disabled={loading || !recoveryCode}>
                  {loading ? <div className="tfa-spinner" /> : 'Verify'}
                </button>

                {/* Back to TOTP */}
                <button
                  type="button"
                  className="tfa-recovery-link"
                  onClick={() => {
                    setUseRecovery(false);
                    setRecoveryCode('');
                    setErrors({});
                  }}
                >
                  Enter authenticator code
                </button>
              </>
            )}
          </form>

          {/* Help */}
          <div className="tfa-help">
            <p>
              Don't have access to your authenticator app?{' '}
              <button type="button" className="tfa-help-link">
                Contact support
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="tfa-footer">
          <button type="button" onClick={() => navigate('/login')}>
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
}
