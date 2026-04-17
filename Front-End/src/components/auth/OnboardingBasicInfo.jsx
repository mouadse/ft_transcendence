import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { uiStore } from '../../stores/uiStore';
import './OnboardingBasicInfo.css';

export default function OnboardingBasicInfo({ onNext, onBack, step = 1, totalSteps = 3 }) {
  const { updateProfile, user } = useAuth();

  const [gender, setGender] = useState('male');
  const [age,    setAge]    = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const e = {};
    const a = parseInt(age);
    const h = parseInt(height);
    const w = parseFloat(weight);
    if (!age)              e.age    = 'Required';
    else if (a < 10 || a > 100) e.age = '10–100';
    if (!height)           e.height = 'Required';
    else if (h < 100 || h > 250) e.height = '100–250 cm';
    if (!weight)           e.weight = 'Required';
    else if (w < 30 || w > 300)  e.weight = '30–300 kg';
    return e;
  }

  async function handleNext() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    try {
      await updateProfile(
        user.id,
        {
          age: parseInt(age),
          height: parseInt(height),
          weight: parseFloat(weight),
        },
        { showErrorToast: false }
      );
      // Pass data up so OnboardingFlow can compute TDEE
      onNext?.({
        age:    parseInt(age),
        height: parseInt(height),
        weight: parseFloat(weight),
        gender,
      });
    } catch {
      uiStore.getState().addToast('Failed to save profile', 'error');
    } finally {
      setLoading(false);
    }
  }

  function clearErr(field) { setErrors(p => ({ ...p, [field]: undefined })); }

  return (
    <div className="ob1-root">
      {/* Background ambient blobs */}
      <div className="ob1-blob-green" />
      <div className="ob1-blob-purple" />

      {/* ── Fixed Header ───────────────────────────────────────────── */}
      <header className="ob1-header">
        <div className="ob1-header-left">
          <button className="ob1-back-btn" onClick={onBack} aria-label="Go back">
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="#2e2f2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="ob1-logo">UM6P_FIT</span>
        </div>

        {/* Step progress dots */}
        <div className="ob1-progress-dots">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`ob1-dot${i < step ? ' ob1-dot--active' : ''}`}
              style={i === step - 1 ? { width: 40 } : {}}
            />
          ))}
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────────── */}
      <main className="ob1-main">

        {/* Heading + sticker */}
        <div className="ob1-heading-wrap">
          <h1 className="ob1-heading">
            Tell us about<br />yourself
          </h1>
          <div className="ob1-sticker" aria-hidden="true">
            Level 01: Basics
          </div>
        </div>

        {/* ── Bento Form Grid ─────────────────────────────────────── */}
        <div className="ob1-grid">

          {/* Gender — full width */}
          <div className="ob1-field ob1-field--full">
            <span className="ob1-field-label">Identity</span>
            <div className="ob1-gender-toggle">
              <button
                type="button"
                className={`ob1-gender-btn${gender === 'male' ? ' ob1-gender-btn--active' : ''}`}
                onClick={() => setGender('male')}
              >
                Male
              </button>
              <button
                type="button"
                className={`ob1-gender-btn${gender === 'female' ? ' ob1-gender-btn--active' : ''}`}
                onClick={() => setGender('female')}
              >
                Female
              </button>
            </div>
          </div>

          {/* Age */}
          <div className="ob1-field">
            <span className="ob1-field-label">Years on Earth</span>
            <div className={`ob1-input-wrap${errors.age ? ' ob1-input-wrap--error' : ''}`}>
              <input
                type="number"
                className="ob1-input"
                min="10"
                max="100"
                value={age}
                onChange={e => { setAge(e.target.value); clearErr('age'); }}
              />
              <span className="ob1-unit">Age</span>
            </div>
            {errors.age && <p className="ob1-error">{errors.age}</p>}
          </div>

          {/* Height */}
          <div className="ob1-field">
            <span className="ob1-field-label">Vertical Reach</span>
            <div className={`ob1-input-wrap${errors.height ? ' ob1-input-wrap--error' : ''}`}>
              <input
                type="number"
                className="ob1-input"
                min="100"
                max="250"
                value={height}
                onChange={e => { setHeight(e.target.value); clearErr('height'); }}
              />
              <span className="ob1-unit">cm</span>
            </div>
            {errors.height && <p className="ob1-error">{errors.height}</p>}
          </div>

          {/* Weight — full width */}
          <div className="ob1-field ob1-field--full">
            <span className="ob1-field-label">Current Mass</span>
            <div className={`ob1-input-wrap${errors.weight ? ' ob1-input-wrap--error' : ''}`}>
              <input
                type="number"
                className="ob1-input"
                min="30"
                max="300"
                step="0.1"
                value={weight}
                onChange={e => { setWeight(e.target.value); clearErr('weight'); }}
              />
              <span className="ob1-unit">kg</span>
            </div>
            {errors.weight && <p className="ob1-error">{errors.weight}</p>}
          </div>
        </div>

        {/* Info card */}
        <div className="ob1-info-card">
          <svg className="ob1-info-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#38671a" strokeWidth="1.5"/>
            <path d="M12 8v1M12 11v5" stroke="#38671a" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p className="ob1-info-text">
            We use these metrics to craft your unique kinetic blueprint. Your data is encrypted and used only to calculate your metabolic baseline.
          </p>
        </div>

      </main>

      {/* ── Fixed Bottom Action Bar ──────────────────────────────────── */}
      <footer className="ob1-footer">
        <button className="ob1-next-btn" type="button" onClick={handleNext} disabled={loading}>
          {loading ? (
            <div className="ob1-spinner" />
          ) : (
            <>
              <span>Next</span>
              <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                <path d="M1 8H19M12 1L19 8L12 15" stroke="#faf9f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
