import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { uiStore } from '../../stores/uiStore';
import './OnboardingGoalsActivity.css';

const GOALS = [
  {
    id: 'lose',
    label: 'Lose Weight',
    desc: 'Burn fat and improve metabolic health through cardio and caloric deficit.',
    emoji: '⚖️',
  },
  {
    id: 'maintain',
    label: 'Maintain',
    desc: 'Keep your current physique while focusing on endurance and flexibility.',
    emoji: '🎯',
  },
  {
    id: 'gain',
    label: 'Gain Muscle',
    desc: 'Build strength and increase lean muscle mass through hypertrophy training.',
    emoji: '💪',
  },
];

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary (Office job, little movement)' },
  { value: 'light',     label: 'Lightly Active (Walking 3-5k steps)' },
  { value: 'moderate',  label: 'Moderately Active (Active job/daily movement)' },
  { value: 'very',      label: 'Very Active (Heavy manual labor/athlete)' },
];

export default function OnboardingGoalsActivity({ step = 2, totalSteps = 3, onNext, onBack }) {
  const { updateProfile, user } = useAuth();
  const [goal,      setGoal]      = useState('lose');
  const [activity,  setActivity]  = useState('light');
  const [frequency, setFrequency] = useState(4);
  const [loading, setLoading] = useState(false);

  async function handleNext() {
    setLoading(true);
    try {
      await updateProfile(
        user.id,
        {
          goal,
          activity_level: activity
          // Note: workoutFrequency not stored in backend (UI-only)
        },
        { showErrorToast: false }
      );
      // Pass data up so OnboardingFlow can compute TDEE
      onNext?.({ goal, activityLevel: activity });
    } catch {
      uiStore.getState().addToast('Failed to save goals', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="og-root">
      <div className="og-blob-green" />
      <div className="og-blob-purple" />

      {/* ── Header ── */}
      <header className="og-header">
        <button className="og-back-btn" onClick={onBack} aria-label="Go back">
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="#2e2f2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="og-progress-dots">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`og-dot${i < step ? ' og-dot--active' : ''}`}
              style={i === step - 1 ? { width: 40 } : {}}
            />
          ))}
        </div>

        <span className="og-logo">UM6P_FIT</span>
      </header>

      {/* ── Main ── */}
      <main className="og-main">
        {/* Hero */}
        <div className="og-hero">
          <span className="og-step-label">Step 02 / Goals</span>
          <h1 className="og-title">What's your <em>goal?</em></h1>
        </div>

        {/* Goal radio cards */}
        <div className="og-goals">
          {GOALS.map(g => (
            <label key={g.id} className={`og-goal-card${goal === g.id ? ' og-goal-card--selected' : ''}`}>
              <input
                type="radio"
                name="goal"
                value={g.id}
                checked={goal === g.id}
                onChange={() => setGoal(g.id)}
                className="og-radio-hidden"
              />
              <div className="og-goal-icon">{g.emoji}</div>
              <div className="og-goal-text">
                <h3>{g.label}</h3>
                <p>{g.desc}</p>
              </div>
              <div className={`og-goal-radio${goal === g.id ? ' og-goal-radio--on' : ''}`}>
                {goal === g.id && <div className="og-goal-radio-inner" />}
              </div>
            </label>
          ))}
        </div>

        {/* Activity + Frequency card */}
        <div className="og-settings-card">
          {/* Activity Level */}
          <div className="og-field">
            <label className="og-field-label">
              <span className="material-symbols-outlined">bolt</span>
              Daily Activity Level
            </label>
            <div className="og-select-wrap">
              <select
                className="og-select"
                value={activity}
                onChange={e => setActivity(e.target.value)}
              >
                {ACTIVITY_LEVELS.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
              <span className="material-symbols-outlined og-select-arrow">unfold_more</span>
            </div>
          </div>

          {/* Workout Frequency */}
          <div className="og-field">
            <div className="og-freq-row">
              <label className="og-field-label">
                <span className="material-symbols-outlined">calendar_today</span>
                Workout Frequency
              </label>
              <span className="og-freq-value">
                {frequency} <span className="og-freq-unit">days / week</span>
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="7"
              value={frequency}
              onChange={e => setFrequency(Number(e.target.value))}
              className="og-range"
            />
            <div className="og-range-ticks">
              {[1,2,3,4,5,6,7].map(n => <span key={n}>{n}</span>)}
            </div>
          </div>
        </div>

        {/* Spacer for fixed footer */}
        <div style={{ height: 24 }} />
      </main>

      {/* ── Fixed CTA ── */}
      <footer className="og-footer">
        <button className="og-next-btn" onClick={handleNext} disabled={loading}>
          {loading ? <div className="og-spinner" /> : <>Next<span className="material-symbols-outlined">arrow_forward</span></>}
        </button>
      </footer>
    </div>
  );
}
