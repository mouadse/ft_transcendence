import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { uiStore } from '../../stores/uiStore';
import { usersAPI } from '../../api/users';
import './OnboardingYourPlan.css';

const MACRO_COLORS = {
  protein: '#38671a',
  carbs:   '#5d3fd3',
  fats:    '#f95630',
};

function MacroBar({ label, grams, pct, color }) {
  return (
    <div className="yp-macro">
      <div className="yp-macro-header">
        <span className="yp-macro-label">{label}</span>
        <span className="yp-macro-g">{grams}<span className="yp-macro-unit">g</span></span>
      </div>
      <div className="yp-macro-track">
        <div className="yp-macro-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function OnboardingYourPlan({ step = 3, totalSteps = 3, onBack, tdeeData, goalsData }) {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [targets, setTargets] = useState(null);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!tdeeData) {
      // Fallback: fetch from API if tdeeData not passed (e.g. direct navigation)
      setLoading(true);
      usersAPI.getNutritionTargets(user?.id)
        .then(data => setTargets(data))
        .catch(() => uiStore.getState().addToast('Failed to load targets', 'error'))
        .finally(() => setLoading(false));
      return;
    }

    // Use frontend-computed TDEE immediately (instant display)
    setTargets(tdeeData);
  }, [tdeeData, user?.id]);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const nextTdee = Number(tdeeData?.calories ?? targets?.calories ?? user?.tdee);

      // Persist TDEE only when the user confirms the final onboarding step.
      if (user?.id && Number.isFinite(nextTdee) && nextTdee > 0) {
        await updateProfile(user.id, { tdee: nextTdee }, { showErrorToast: false });
      }

      navigate('/dashboard');
    } catch {
      uiStore.getState().addToast('Failed to complete onboarding', 'error');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="yp-root">
      <div className="yp-blob-green" />
      <div className="yp-blob-purple" />

      {/* ── Header ── */}
      <header className="yp-header">
        <button className="yp-back-btn" onClick={onBack} aria-label="Go back">
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="#2e2f2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="yp-progress-dots">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`yp-dot${i < step ? ' yp-dot--active' : ''}`}
              style={i === step - 1 ? { width: 40 } : {}}
            />
          ))}
        </div>

        <span className="yp-logo">UM6P_FIT</span>
      </header>

      {/* ── Main ── */}
      <main className="yp-main">
        {/* Hero */}
        <div className="yp-hero">
          <span className="yp-step-label">Step 03 — Final Plan</span>
          <h1 className="yp-title">Your Daily Target</h1>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div className="yp-spinner" />
            <p style={{ marginTop: '16px', color: '#7d7d7b' }}>Loading your targets...</p>
          </div>
        ) : targets ? (
          <>
            {/* TDEE Bento Card */}
            <div className="yp-tdee-card">
              <div className="yp-tdee-bg-orb" />
              <div className="yp-tdee-header-row">
                <span className="yp-tdee-sub">Estimated Daily Calories</span>
                {tdeeData && <span className="yp-tdee-calc-badge">Calculated</span>}
              </div>
              <div className="yp-tdee-row">
                <span className="yp-tdee-cal">{Math.round(targets.calories || 2300)}</span>
                <span className="yp-tdee-unit">kcal</span>
              </div>
              <div className="yp-tdee-badges">
                <span className="yp-badge yp-badge--green">{goalsData?.goal || targets.goal || user?.goal || 'Custom'} Plan</span>
                <span className="yp-badge yp-badge--neutral">{goalsData?.activityLevel || targets.activity_level || user?.activity_level || 'Active'} Mode</span>
              </div>
            </div>

            {/* Macros */}
            <div className="yp-macros">
              <span className="yp-macros-title">Nutritional Split</span>
              <MacroBar
                label="Protein"
                grams={Math.round(targets.protein || 0)}
                pct={targets.protein ? Math.min(100, (targets.protein / (targets.calories || 2300) * 4) * 100) : 25}
                color={MACRO_COLORS.protein}
              />
              <MacroBar
                label="Carbs"
                grams={Math.round(targets.carbs || 0)}
                pct={targets.carbs ? Math.min(100, (targets.carbs / (targets.calories || 2300) * 4) * 100) : 45}
                color={MACRO_COLORS.carbs}
              />
              <MacroBar
                label="Fats"
                grams={Math.round(targets.fat || 0)}
                pct={targets.fat ? Math.min(100, (targets.fat / (targets.calories || 2300) * 9) * 100) : 30}
                color={MACRO_COLORS.fats}
              />
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#fc7981' }}>
            <p>Unable to load nutrition targets. Please try again.</p>
          </div>
        )}

        {/* Info note */}
        <div className="yp-info">
          <span className="material-symbols-outlined yp-info-icon">info</span>
          <p>These targets are calculated based on your profile. You can adjust them anytime in Settings.</p>
        </div>

        {/* Spacer for fixed footer */}
        <div style={{ height: 24 }} />
      </main>

      {/* ── Fixed CTA ── */}
      <footer className="yp-footer">
        <button className="yp-cta-btn" onClick={handleComplete} disabled={loading || completing}>
          {completing ? (
            <div className="yp-spinner" />
          ) : (
            <>
              Let's Go
              <span className="material-symbols-outlined">rocket_launch</span>
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
