import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { usersAPI } from '../../../api/users';
import { authStore } from '../../../stores/authStore';
import { uiStore } from '../../../stores/uiStore';
import TwoFactorSetup from '../../auth/TwoFactorSetup';
import SessionsManager from './SessionsManager';
import ExportManager from './ExportManager';
import DeleteAccountManager from './DeleteAccountManager';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfService from './TermsOfService';
import { LANGUAGE_OPTIONS, getLocaleForLanguage, useI18n } from '../../../i18n/useI18n';
import './Settings.css';

/* ── Constants ──────────────────────────────────────────────────── */

const GOAL_OPTIONS = [
  { value: 'lose_fat', labelKey: 'lose' },
  { value: 'maintain', labelKey: 'maintain' },
  { value: 'build_muscle', labelKey: 'gain' },
];

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', labelKey: 'sedentary' },
  { value: 'lightly_active', labelKey: 'lightActivity' },
  { value: 'moderately_active', labelKey: 'moderateActivity' },
  { value: 'active', labelKey: 'activeActivity' },
  { value: 'very_active', labelKey: 'veryActive' },
];

/* ── i18n Hook ───────────────────────────────────────────────────── */

function useT() {
  return useI18n('settings').t;
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function normalizeCollection(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function formatDate(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString(getLocaleForLanguage(uiStore.getState().language), { month: 'short', day: 'numeric' });
}

function formatNumber(value, suffix = '') {
  if (value === null || value === undefined || value === '') return '--';
  return suffix ? `${value}${suffix}` : String(value);
}

function getInitials(name) {
  const safeName = String(name || 'Athlete').trim();
  const parts = safeName.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || '').join('') || 'A';
}

function calculateAge(dateOfBirth, fallbackAge = 0) {
  if (!dateOfBirth) return fallbackAge || 0;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return fallbackAge || 0;
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) age -= 1;
  return Math.max(age, 0);
}

function normalizeGoal(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'lose') return 'lose_fat';
  if (raw === 'gain') return 'build_muscle';
  return raw || 'maintain';
}

function normalizeActivity(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'light') return 'lightly_active';
  if (raw === 'moderate') return 'moderately_active';
  if (raw === 'very') return 'very_active';
  return raw || 'lightly_active';
}

/* ── AvatarArtwork ───────────────────────────────────────────────── */

function AvatarArtwork({ avatar, name, className, fallbackClassName }) {
  const [hasError, setHasError] = useState(false);
  if (avatar && !hasError) {
    return (
      <img
        key={avatar}
        src={avatar}
        alt={`${name || 'User'} avatar`}
        className={className}
        onError={() => setHasError(true)}
      />
    );
  }
  return <span className={fallbackClassName}>{getInitials(name)}</span>;
}

/* ── ProfileSection (profile + body metrics merged) ─────────────── */

function ProfileSection({ profile, latestWeightEntry, onSave, saving }) {
  const t = useT();
  const age = calculateAge(profile?.date_of_birth, profile?.age);

  async function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    if (!name) { uiStore.getState().addToast(t('nameRequired'), 'error'); return; }
    const patch = { name };
    const heightRaw = String(fd.get('height') || '').trim();
    const weightRaw = String(fd.get('weight') || '').trim();
    if (heightRaw !== '') patch.height = Number(heightRaw);
    if (weightRaw !== '') patch.weight = Number(weightRaw);
    await onSave(patch);
  }

  return (
    <section className="st-profile-card">
      <div className="st-avatar-center-btn">
        <div className="st-profile-avatar">
          <AvatarArtwork
            key={profile?.avatar || 'p-fallback'}
            avatar={profile?.avatar}
            name={profile?.name}
            className="st-profile-avatar-image"
            fallbackClassName="st-profile-avatar-fallback"
          />
        </div>
      </div>

      <form
        key={`${profile?.id || 'prof'}-${profile?.updated_at || ''}-${profile?.name || ''}-${profile?.height || ''}`}
        className="st-profile-form"
        onSubmit={handleSubmit}
      >
        <div className="st-input-group">
          <label className="st-field-label" htmlFor="s-name">{t('fullName')}</label>
          <input
            id="s-name"
            className="st-input"
            type="text"
            name="name"
            defaultValue={profile?.name || ''}
            placeholder={t('fullName')}
          />
        </div>

        <div className="st-input-group">
          <label className="st-field-label">{t('emailAddress')}</label>
          <div className="st-input-static">{profile?.email || t('noEmail')}</div>
        </div>

        <div className="st-metrics-grid">
          <div className="st-metric-card">
            <label className="st-metric-card-label" htmlFor="s-height">{t('heightCm')}</label>
            <input
              id="s-height"
              className="st-metric-card-input"
              type="number"
              name="height"
              min="0"
              step="0.1"
              defaultValue={profile?.height || ''}
              placeholder="175"
            />
          </div>

          <div className="st-metric-card">
            <label className="st-metric-card-label" htmlFor="s-weight">{t('weightKg')}</label>
            <input
              id="s-weight"
              className="st-metric-card-input"
              type="number"
              name="weight"
              min="0"
              step="0.1"
              defaultValue={profile?.weight || ''}
              placeholder="70"
            />
            {latestWeightEntry?.date && (
              <span className="st-metric-note">{formatDate(latestWeightEntry.date)}</span>
            )}
          </div>

          <div className="st-metric-card st-metric-card--readonly">
            <label className="st-metric-card-label">{t('age')}</label>
            <div className="st-metric-card-value">{age || '--'}</div>
          </div>
        </div>

        <button className="st-save-btn st-save-btn--full" type="submit" disabled={saving} style={{ marginTop: 12 }}>
          {saving ? t('saving') : t('saveProfile')}
        </button>
      </form>
    </section>
  );
}

/* ── FitnessGoalsSection ─────────────────────────────────────────── */

function FitnessGoalsSection({
  profile,
  onSave, saving,
  targets, targetsLoading, targetsError,
}) {
  const t = useT();
  const [goal, setGoal] = useState(normalizeGoal(profile?.goal));
  const [activityLevel, setActivityLevel] = useState(normalizeActivity(profile?.activity_level));

  const resolved = {
    calories: targets?.calories ?? profile?.tdee ?? null,
    protein: targets?.protein ?? null,
    carbs: targets?.carbs ?? null,
    fat: targets?.fat ?? null,
  };

  async function handleSubmit(e) {
    e.preventDefault();
    await onSave({ goal, activity_level: activityLevel });
  }

  return (
    <section className="st-goals-card">
      <h2 className="st-goals-title">{t('fitnessGoals')}</h2>

      <form
        key={`fg-${profile?.id || ''}-${profile?.updated_at || ''}-${profile?.goal || ''}`}
        className="st-goals-form"
        onSubmit={handleSubmit}
      >
        {/* Primary Objective */}
        <div className="st-input-group">
          <label className="st-field-label">{t('primaryObjective')}</label>
          <div className="st-obj-row">
            {GOAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`st-obj-btn${goal === opt.value ? ' st-obj-btn--active' : ''}`}
                onClick={() => setGoal(opt.value)}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Activity Level */}
        <div className="st-input-group">
          <label className="st-field-label" htmlFor="s-activity">{t('activityLevel')}</label>
          <select
            id="s-activity"
            className="st-select"
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value)}
          >
            {ACTIVITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
            ))}
          </select>
        </div>

        <button className="st-save-btn st-save-btn--full" type="submit" disabled={saving}>
          {saving ? t('saving') : t('saveGoals')}
        </button>
      </form>

      {/* ── Daily TDEE (embedded) ── */}
      <div className="st-tdee-card">
        <div className="st-tdee-top">
          <div>
            <span className="st-tdee-eyebrow">{t('dailyTdee')}</span>
            <div className="st-tdee-number">
              {targetsLoading ? '…' : formatNumber(resolved.calories)}
              <span className="st-tdee-unit">{t('kcal')}</span>
            </div>
          </div>
        </div>

        <div className="st-macro-row">
          {[
            ['protein', resolved.protein, 'g'],
            ['carbs', resolved.carbs, 'g'],
            ['fat', resolved.fat, 'g'],
          ].map(([key, value, unit]) => (
            <div key={key} className="st-macro-pill">
              <span className="st-macro-pill-label">{t(key)}</span>
              <span className="st-macro-pill-value">
                {targetsLoading ? '…' : formatNumber(value, unit)}
              </span>
            </div>
          ))}
        </div>

        {targetsError && (
          <p className="st-tdee-footnote">{t('tdeeRefreshFailed')}</p>
        )}
      </div>
    </section>
  );
}

/* ── Settings (main) ─────────────────────────────────────────────── */

export default function Settings() {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useI18n('settings');

  const [show2FA, setShow2FA] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const [profileSaving, setProfileSaving] = useState(false);
  const [goalsSaving, setGoalsSaving] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['settings', 'profile', user?.id],
    queryFn: () => usersAPI.getProfile(user.id),
    enabled: Boolean(user?.id),
  });

  const nutritionTargetsQuery = useQuery({
    queryKey: ['settings', 'nutrition-targets', user?.id],
    queryFn: () => usersAPI.getNutritionTargets(user.id),
    enabled: Boolean(user?.id),
  });

  const weightEntriesQuery = useQuery({
    queryKey: ['settings', 'weight-entries', user?.id],
    queryFn: () => usersAPI.getWeightEntries(user.id, { page: 1, limit: 1 }),
    enabled: Boolean(user?.id),
  });

  const profile = profileQuery.data ?? user;
  const latestWeightEntry = useMemo(() => {
    const entries = normalizeCollection(weightEntriesQuery.data);
    return entries[0] ?? null;
  }, [weightEntriesQuery.data]);

  async function refreshQueries() {
    await Promise.allSettled([
      profileQuery.refetch(),
      nutritionTargetsQuery.refetch(),
      weightEntriesQuery.refetch(),
    ]);
  }

  async function saveProfilePatch(patch, type = 'profile') {
    if (!user?.id) return;
    const setSaving = type === 'goals' ? setGoalsSaving : setProfileSaving;
    const msg = type === 'goals' ? t('goalsUpdated') : t('profileUpdated');
    const errorMsg = type === 'goals' ? t('goalsUpdateFailed') : t('profileUpdateFailed');
    setSaving(true);
    try {
      await updateProfile(user.id, patch, { showErrorToast: false });
      uiStore.getState().addToast(msg, 'success');
      await refreshQueries();
    } catch (err) {
      console.error('Settings update failed', err);
      uiStore.getState().addToast(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!profile && profileQuery.isLoading) {
    return (
      <div className="st-root">
        <header className="st-header">
          <div className="st-header-left">
            <button className="st-back-btn" type="button" onClick={() => navigate(-1)} aria-label={t('goBack')}>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="st-header-title">{t('settings')}</h1>
          </div>
          <span className="st-logo">UM6P_FIT</span>
        </header>
        <main className="st-main">
          <div className="st-loading-shell">
            <p className="st-loading-copy">{t('loadingSettings')}</p>
          </div>
        </main>
      </div>
    );
  }

  const twoFactorEnabled = profile?.two_factor_enabled ?? false;

  return (
    <div className="st-root">
      {/* ── Header ── */}
      <header className="st-header">
        <div className="st-header-left">
          <button className="st-back-btn" type="button" onClick={() => navigate(-1)} aria-label={t('goBack')}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="st-header-title">{t('settings')}</h1>
        </div>
        <span className="st-logo">UM6P_FIT</span>
      </header>

      <main className="st-main">

        {/* ── Profile + Body Metrics ── */}
        <ProfileSection
          key={`ps-${profile?.id || ''}-${profile?.updated_at || ''}-${profile?.avatar || ''}`}
          profile={profile}
          latestWeightEntry={latestWeightEntry}
          onSave={(patch) => saveProfilePatch(patch, 'profile')}
          saving={profileSaving}
        />

        {/* ── Fitness Goals + Daily TDEE ── */}
        <FitnessGoalsSection
          key={`fg-${profile?.id || ''}-${profile?.updated_at || ''}-${profile?.goal || ''}`}
          profile={profile}
          onSave={(patch) => saveProfilePatch(patch, 'goals')}
          saving={goalsSaving}
          targets={nutritionTargetsQuery.data}
          targetsLoading={nutritionTargetsQuery.isLoading}
          targetsError={nutritionTargetsQuery.isError}
        />

        {/* ── Security ── */}
        <section className="st-security-card" id="security">
          <div className="st-section-head">
            <div>
              <h2 className="st-section-title">{t('security')}</h2>
              <p className="st-section-copy">{t('securityDesc')}</p>
            </div>
          </div>

          <div className="st-security-rows">
            <div className="st-security-row">
              <div className="st-security-left">
                <span className="material-symbols-outlined st-security-icon">
                  {twoFactorEnabled ? 'lock' : 'shield'}
                </span>
                <div className="st-security-info">
                  <span className="st-security-label">{t('twoFactorAuth')}</span>
                  <span className={`st-2fa-status ${twoFactorEnabled ? 'st-2fa-status--on' : 'st-2fa-status--off'}`}>
                    {twoFactorEnabled ? t('enabled') : t('disabled')}
                  </span>
                </div>
              </div>
              <button
                className={`st-security-btn ${twoFactorEnabled ? 'st-security-btn--manage' : 'st-security-btn--enable'}`}
                onClick={() => setShow2FA(true)}
              >
                {twoFactorEnabled ? t('manage') : t('enable')}
              </button>
            </div>

            <div className="st-security-row">
              <div className="st-security-left">
                <span className="material-symbols-outlined st-security-icon">devices</span>
                <div className="st-security-info">
                  <span className="st-security-label">{t('activeSessions')}</span>
                  <span className="st-2fa-status st-2fa-status--neutral">{t('manageDevices')}</span>
                </div>
              </div>
              <button className="st-security-btn st-security-btn--manage" onClick={() => setShowSessions(true)}>
                {t('viewAll')}
              </button>
            </div>
          </div>
        </section>

        {/* ── Preferences ── */}
        <section className="st-prefs-card" id="preferences">
          <div className="st-pref-row">
            <div className="st-pref-left">
              <span className="material-symbols-outlined st-pref-icon">language</span>
              <span className="st-pref-label">{t('language')}</span>
            </div>
            <div className="st-lang-row">
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`st-lang-btn${language === option.value ? ' st-lang-btn--active' : ''}`}
                  onClick={() => setLanguage(option.value)}
                  title={option.shortLabel}
                  aria-pressed={language === option.value}
                >
                  {option.shortLabel}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Legal / Account ── */}
        <section className="st-legal-card" id="legal">
          <button className="st-legal-row" type="button" onClick={() => setShowPrivacy(true)}>
            <span>{t('privacyPolicy')}</span>
            <span className="material-symbols-outlined st-legal-chevron">chevron_right</span>
          </button>
          <button className="st-legal-row" type="button" onClick={() => setShowTerms(true)}>
            <span>{t('termsOfService')}</span>
            <span className="material-symbols-outlined st-legal-chevron">chevron_right</span>
          </button>
          <button className="st-legal-row" type="button" onClick={() => setShowExport(true)}>
            <span>{t('exportData')}</span>
            <span className="material-symbols-outlined st-legal-chevron">file_download</span>
          </button>
          <button className="st-legal-row st-legal-row--danger" type="button" onClick={() => setShowDelete(true)}>
            <span>{t('deleteAccount')}</span>
            <span className="material-symbols-outlined" style={{ color: '#b02500', fontSize: 20 }}>cancel</span>
          </button>
        </section>

        {/* ── Footer ── */}
        <footer className="st-footer">
          <button className="st-logout-btn" type="button" onClick={logout}>
            <span className="material-symbols-outlined">logout</span>
            {t('logout')}
          </button>
          <p className="st-version">{t('versionLabel')}</p>
        </footer>
      </main>

      {/* ── Modals ── */}
      {show2FA && (
        <TwoFactorSetup
          isEnabled={twoFactorEnabled}
          onClose={() => setShow2FA(false)}
          onSuccess={({ enabled }) => {
            authStore.getState().updateProfile({ two_factor_enabled: enabled });
          }}
        />
      )}
      {showSessions && <SessionsManager onClose={() => setShowSessions(false)} />}
      {showExport && <ExportManager onClose={() => setShowExport(false)} />}
      {showDelete && <DeleteAccountManager onClose={() => setShowDelete(false)} />}
      {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      {showTerms && <TermsOfService onClose={() => setShowTerms(false)} />}
    </div>
  );
}
