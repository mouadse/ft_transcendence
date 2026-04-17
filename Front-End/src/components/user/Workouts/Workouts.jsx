import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { workoutStore } from '../../../stores/workoutStore';
import { uiStore } from '../../../stores/uiStore';
import { authStore } from '../../../stores/authStore';
import { workoutsAPI } from '../../../api/workouts';
import ExerciseImagePreview from '../../shared/ExerciseImagePreview';
import {
  useWorkoutList,
  useWorkout,
  useTemplateList,
  useTemplate,
  useCreateTemplate,
  useApplyTemplate,
  useProgramAssignments,
  useUpdateProgramAssignmentStatus,
  useApplyProgramSession,
  useExercises,
  useCreateWorkout,
  useAddSet,
  useUpdateSet,
  useDeleteSet,
  useAddExercise,
  useUpdateWorkoutExercise,
  useDeleteWorkoutExercise,
  useFinishWorkout,
  useAddCardio,
  useDeleteWorkout,
  useSemanticSearch,
  useExerciseMeta,
  useExerciseHistory,
} from '../../../hooks/queries/useWorkouts';
import {
  useActivityCalendar,
} from '../../../hooks/queries/useAnalytics';
import { mapApiError } from '../../../utils/apiErrors';
import { resolveExerciseImageUrl } from '../../../utils/exerciseImages';
import { useI18n } from '../../../i18n/useI18n';
import './Workouts.css';

// ── Helpers ────────────────────────────────────────────────────────────

function fmtSeconds(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function calcVolume(exercises) {
  if (!exercises) return 0;
  return exercises.reduce((total, ex) => {
    const sets = ex.workout_sets || ex.sets || [];
    return total + sets.reduce((s, set) => s + (Number(set.weight ?? set.weight_kg) || 0) * (Number(set.reps) || 0), 0);
  }, 0);
}

function getAccentForType(type) {
  const map = { strength: '#38671a', hypertrophy: '#5d3fd3', cardio: '#3bd3fd', endurance: '#fbbd41', custom: '#b02500' };
  return map[type?.toLowerCase()] || '#38671a';
}

function extractWorkoutExercises(workout) {
  return workout?.workout_exercises || workout?.exercises || [];
}

function extractExerciseSets(exercise) {
  return exercise?.workout_sets || exercise?.sets || [];
}

function setWeightValue(set) {
  return Number(set?.weight ?? set?.weight_kg) || 0;
}

function splitExerciseField(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getExercisePrimaryMuscle(exercise) {
  return (
    exercise?.muscle_group
    || exercise?.primary_muscle
    || splitExerciseField(exercise?.primary_muscles)[0]
    || splitExerciseField(exercise?.exercise?.primary_muscles)[0]
    || ''
  );
}

function getExerciseSecondaryMuscles(exercise) {
  return (
    exercise?.secondary_muscles
      ? splitExerciseField(exercise.secondary_muscles)
      : splitExerciseField(exercise?.exercise?.secondary_muscles)
  );
}

function getExerciseInstructions(exercise) {
  if (Array.isArray(exercise?.instructions)) {
    return exercise.instructions.filter(Boolean).join(' ');
  }
  if (typeof exercise?.instructions === 'string' && exercise.instructions.trim()) {
    return exercise.instructions.trim();
  }
  if (typeof exercise?.description === 'string' && exercise.description.trim()) {
    return exercise.description.trim();
  }
  return '';
}

function getExerciseDifficulty(exercise) {
  return exercise?.difficulty || exercise?.level || '';
}

function normalizeExerciseParam(value) {
  return String(value || '').trim().toLowerCase();
}

function formatExerciseOption(value) {
  return String(value || '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeUniqueOptions(options = [], fallbacks = []) {
  const normalized = [...options, ...fallbacks]
    .map((item) => normalizeExerciseParam(item))
    .filter(Boolean);
  return [...new Set(normalized)];
}

function extractTemplateExercises(template) {
  return template?.workout_template_exercises || template?.exercises || [];
}

function normalizeCollection(payload, key = '') {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (key && Array.isArray(payload?.[key])) return payload[key];
  return [];
}

function ModalPortal({ children }) {
  if (typeof document === 'undefined') return children;
  return createPortal(children, document.body);
}

function extractProgramWeeks(program) {
  const weeks = program?.weeks || [];
  return [...weeks].sort((a, b) => (a.week_number || 0) - (b.week_number || 0));
}

function flattenProgramSessions(program) {
  const weeks = extractProgramWeeks(program);
  return weeks.flatMap((week) => {
    const sessions = [...(week.sessions || [])].sort((a, b) => (a.day_number || 0) - (b.day_number || 0));
    return sessions.map((session) => ({
      ...session,
      week_number: week.week_number,
      week_name: week.name,
    }));
  });
}

const STATUS_LABEL_FALLBACKS = {
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function getStatusLabel(status, t = null) {
  const translate = typeof t === 'function' ? t : null;
  const map = translate ? {
    assigned: translate('workouts.status.assigned'),
    in_progress: translate('workouts.status.inProgress'),
    completed: translate('workouts.status.completed'),
    cancelled: translate('workouts.status.cancelled'),
  } : STATUS_LABEL_FALLBACKS;
  return map[status] || map.assigned;
}

function getStatusColor(status) {
  const map = {
    assigned: '#38671a',
    in_progress: '#5d3fd3',
    completed: '#2f7d32',
    cancelled: '#b02500',
  };
  return map[status] || '#38671a';
}

function getNextProgramSession(assignment) {
  if (!assignment || assignment.status === 'completed' || assignment.status === 'cancelled') {
    return null;
  }
  const sessions = flattenProgramSessions(assignment?.program);
  return sessions[0] || null;
}

const PROGRAM_PROGRESS_STORAGE_KEY = 'um6p_fit_program_progress_v1';

function readProgramProgress() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PROGRAM_PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeProgramProgress(progress) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROGRAM_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore localStorage write failures.
  }
}

function getCompletedSessionIds(progressByAssignment, assignmentId) {
  if (!assignmentId) return [];
  const entries = progressByAssignment?.[assignmentId];
  return Array.isArray(entries) ? entries : [];
}

function getNextProgramSessionByProgress(assignment, completedSessionIds = []) {
  if (!assignment || assignment.status === 'completed' || assignment.status === 'cancelled') {
    return null;
  }
  const sessions = flattenProgramSessions(assignment?.program);
  if (sessions.length === 0) return null;
  const completedSet = new Set(completedSessionIds);
  return sessions.find((session) => session?.id && !completedSet.has(session.id)) || null;
}

function mapAppliedWorkoutToSessionExercises(workout) {
  const workoutExercises = extractWorkoutExercises(workout);
  return workoutExercises.map((exercise, index) => {
    const backendSets = extractExerciseSets(exercise);
    const plannedCount = Math.max(backendSets.length, Number(exercise?.sets) || 0, 1);
    const prefilledSets = backendSets.length > 0
      ? backendSets.map((set, setIndex) => ({
        backendSetId: set.id,
        setNumber: set.set_number || setIndex + 1,
        weight: String(setWeightValue(set) || ''),
        reps: String(set.reps ?? ''),
        done: false,
      }))
      : Array.from({ length: plannedCount }, (_, setIndex) => ({
        setNumber: setIndex + 1,
        weight: String(Number(exercise?.weight) || ''),
        reps: String(Number(exercise?.reps) || ''),
        done: false,
      }));

    return {
      id: exercise.exercise?.id || exercise.exercise_id || `program-ex-${index + 1}`,
      name: exercise.exercise?.name || `Exercise ${index + 1}`,
      muscle_group: getExercisePrimaryMuscle(exercise.exercise),
      primary_muscle: getExercisePrimaryMuscle(exercise.exercise),
      primary_muscles: exercise.exercise?.primary_muscles || '',
      equipment: exercise.exercise?.equipment,
      type: workout?.type,
      note: exercise.notes || '',
      rest_time: Number(exercise?.rest_time) || 60,
      workoutExerciseId: exercise.id,
      sets: prefilledSets,
    };
  });
}

function buildTemplatePayload(userId, form) {
  return {
    owner_id: userId,
    name: form.name.trim(),
    type: (form.type || 'custom').trim().toLowerCase(),
    notes: form.notes?.trim() || '',
    exercises: form.exercises.map((exercise, index) => {
      const totalSets = Math.max(1, Number(exercise.sets) || 1);
      const reps = Math.max(0, Number(exercise.reps) || 0);
      const weight = Math.max(0, Number(exercise.weight) || 0);
      const restTime = Math.max(0, Number(exercise.rest_time) || 0);

      return {
        exercise_id: exercise.id,
        order: index + 1,
        sets: totalSets,
        reps,
        weight,
        rest_time: restTime,
        notes: exercise.notes?.trim() || '',
        set_entries: Array.from({ length: totalSets }, (_, setIndex) => ({
          set_number: setIndex + 1,
          reps,
          weight,
          rest_seconds: restTime,
        })),
      };
    }),
  };
}

// ── useTimer ──────────────────────────────────────────────────────────

function useTimer(running = true) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(ref.current);
  }, [running]);

  return { elapsed, display: fmtSeconds(elapsed), reset: () => setElapsed(0) };
}

// ── Context Nav ───────────────────────────────────────────────────────

const CTX_NAV = [
  { id: 'close', icon: 'close', labelKey: 'workouts.nav.close' },
  { id: 'programs', icon: 'grid_view', labelKey: 'workouts.nav.programs' },
  { id: 'library', icon: 'book', labelKey: 'workouts.nav.library' },
  { id: 'history', icon: 'history', labelKey: 'workouts.nav.history' },
];

const WORKOUT_TAB_PATHS = {
  programs: '/workouts',
  library: '/workouts/library',
  history: '/workouts/history',
};

function resolveWorkoutTabFromPath(pathname = '') {
  if (pathname.startsWith('/workouts/library')) return 'library';
  if (pathname.startsWith('/workouts/history')) return 'history';
  return 'programs';
}

function WorkoutContextNav({ active, onChange, onClose, visible }) {
  const { t } = useI18n();
  return (
    <nav className={`wk-ctx-nav${visible ? ' wk-ctx-nav--visible' : ''}`}>
      {CTX_NAV.map(item => {
        const isClose = item.id === 'close';
        const isActive = !isClose && item.id === active;
        const label = t(item.labelKey);
        return (
          <button
            key={item.id}
            className={`wk-ctx-btn${isActive ? ' wk-ctx-btn--active' : ''}${isClose ? ' wk-ctx-btn--close' : ''}`}
            onClick={() => isClose ? onClose() : onChange(item.id)}
            aria-label={label}
          >
            <span className="material-symbols-outlined wk-ctx-icon">{item.icon}</span>
            <span className="wk-ctx-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ── Exercise Search Modal ──────────────────────────────────────────────

function ExerciseSearchModal({ onClose, onSelect }) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const timerRef = useRef(null);
  const { data: metaData } = useExerciseMeta();
  const meta = metaData?.meta || metaData;
  const pageSize = 20;

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timerRef.current);
  }, [search]);

  const params = { page, limit: pageSize };
  if (debouncedSearch) params.q = debouncedSearch;
  if (cat) params.muscle = normalizeExerciseParam(cat);

  const { data: exercisesData, isLoading } = useExercises(params, { keepPreviousData: true });
  const exercises = exercisesData?.exercises || exercisesData || [];
  const metadata = exercisesData?.metadata || {};
  const totalPages = Math.max(1, Number(metadata.total_pages) || 1);
  const totalCount = Number(metadata.total_count) || exercises.length;
  const canPrevPage = page > 1;
  const canNextPage = Boolean(metadata.has_next) || page < totalPages;
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = totalCount === 0 ? 0 : Math.min((page - 1) * pageSize + exercises.length, totalCount);

  const muscleOptions = normalizeUniqueOptions(
    meta?.muscles || [],
    ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'cardio']
  );
  const chips = [{ label: t('workouts.search.all'), value: '' }, ...muscleOptions.slice(0, 8).map((value) => ({ label: formatExerciseOption(value), value }))];

  return (
    <div className="wk-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="wk-modal">
        <div className="wk-modal-header">
          <h3 className="wk-modal-title">{t('workouts.search.addExercise')}</h3>
          <button className="wk-modal-close" onClick={onClose}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div className="wk-modal-body">
          <div className="wk-search-wrap" style={{ marginBottom: 12 }}>
            <span className="material-symbols-outlined wk-search-icon">search</span>
            <input
              className="wk-search"
              placeholder={t('workouts.search.searchPlaceholder')}
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              autoFocus
            />
          </div>
          <div className="wk-cat-chips" style={{ marginBottom: 12 }}>
            {chips.map(chip => (
              <button
                key={chip.label}
                className={`wk-cat-chip${(chip.value ? normalizeExerciseParam(cat) === chip.value : !cat) ? ' wk-cat-chip--active' : ''}`}
                onClick={() => {
                  setCat(chip.value);
                  setPage(1);
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="wk-modal-list">
            {isLoading ? (
              <div className="wk-loading-rows">
                {[1, 2, 3, 4].map(i => <div key={i} className="wk-skeleton-row" />)}
              </div>
            ) : exercises.length === 0 ? (
              <div className="wk-empty-state">
                <span className="material-symbols-outlined">fitness_center</span>
                <p>{t('workouts.search.noExercisesFound')}</p>
              </div>
            ) : (
              exercises.map((ex) => (
                <button key={ex.id} className="wk-modal-ex-row" onClick={() => onSelect(ex)}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', border: '2px solid #e8e2d6', background: '#f1f1ef', position: 'relative', flexShrink: 0 }}>
                    <ExerciseImagePreview
                      key={`picker-${ex.id}`}
                      exercise={{
                        imageUrl: resolveExerciseImageUrl(ex.image_url || ex.imageUrl || ''),
                        altImageUrl: ex.alt_image_url || ex.altImageUrl || '',
                        muscle: (getExercisePrimaryMuscle(ex) || 'chest').toUpperCase(),
                        name: ex.name,
                      }}
                      alt={ex.name}
                      style={{ position: 'absolute', inset: 0 }}
                      imgStyle={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      animate={false}
                      fallback={
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: getAccentForType(ex.type) + '22' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18, color: getAccentForType(ex.type) }}>fitness_center</span>
                        </div>
                      }
                    />
                  </div>
                  <div className="wk-modal-ex-info">
                    <span className="wk-lib-name">{ex.name}</span>
                    <span className="wk-lib-muscle">{getExercisePrimaryMuscle(ex) || t('workouts.search.fullBody')} · {ex.equipment || t('workouts.search.bodyweight')}</span>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#38671a' }}>add_circle</span>
                </button>
              ))
            )}
          </div>
          {!isLoading && (
            <div className="wk-lib-pagination">
              <span className="wk-lib-pagination-label">
                {t('workouts.search.showing', { from: showingFrom, to: showingTo, total: totalCount })}
              </span>
              <div className="wk-lib-pagination-actions">
                <button
                  className="wk-lib-pagination-btn"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={!canPrevPage}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
                </button>
                <span className="wk-lib-pagination-page">{page}/{totalPages}</span>
                <button
                  className="wk-lib-pagination-btn"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!canNextPage}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomProgramBuilderModal({ onClose, onSave, isSaving = false }) {
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'custom',
    notes: '',
    exercises: [],
  });

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleAddExercise(exercise) {
    setForm((prev) => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        {
          id: exercise.id,
          name: exercise.name,
          muscle_group: exercise.muscle_group || exercise.primary_muscle || '',
          equipment: exercise.equipment || '',
          sets: 3,
          reps: 10,
          weight: '',
          rest_time: 90,
          notes: '',
        },
      ],
    }));
    setShowExercisePicker(false);
  }

  function updateExercise(index, key, value) {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((exercise, exerciseIndex) => (
        exerciseIndex === index ? { ...exercise, [key]: value } : exercise
      )),
    }));
  }

  function removeExercise(index) {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((_, exerciseIndex) => exerciseIndex !== index),
    }));
  }

  function handleSave() {
    if (!form.name.trim() || form.exercises.length === 0 || isSaving) return;
    onSave(form);
  }

  return (
    <>
      <div className="wk-modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
        <div className="wk-modal">
          <div className="wk-modal-header">
            <h3 className="wk-modal-title">Create Your Session</h3>
            <button className="wk-modal-close" onClick={onClose}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>

          <div className="wk-modal-body">
            <div className="wk-form-field">
              <label className="wk-form-label">Program Name</label>
              <input
                className="wk-form-input"
                placeholder="Push Pull Legs"
                value={form.name}
                onChange={(event) => setField('name', event.target.value)}
                autoFocus
              />
            </div>

            <div className="wk-form-field">
              <label className="wk-form-label">Training Style</label>
              <div className="wk-cat-chips">
                {['custom', 'strength', 'hypertrophy', 'cardio', 'endurance'].map((type) => (
                  <button
                    key={type}
                    className={`wk-cat-chip${form.type === type ? ' wk-cat-chip--active' : ''}`}
                    onClick={() => setField('type', type)}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="wk-form-field">
              <label className="wk-form-label">Notes</label>
              <textarea
                className="wk-builder-textarea"
                placeholder="What is this plan for?"
                value={form.notes}
                onChange={(event) => setField('notes', event.target.value)}
              />
            </div>

            <div className="wk-builder-section">
              <div className="wk-builder-section-top">
                <div>
                  <span className="wk-eyebrow">Exercise Plan</span>
                  <h4 className="wk-builder-section-title">{form.exercises.length} exercise{form.exercises.length !== 1 ? 's' : ''}</h4>
                </div>
                <button className="wk-btn-ghost" onClick={() => setShowExercisePicker(true)}>
                  Add Exercise
                </button>
              </div>

              {form.exercises.length === 0 ? (
                <div className="wk-empty-section" style={{ paddingBlock: 20 }}>
                  <span className="material-symbols-outlined wk-empty-icon" style={{ fontSize: 34, color: '#dad4c8' }}>playlist_add</span>
                  <p className="wk-empty-text">Add a few exercises to turn this into your own reusable program.</p>
                </div>
              ) : (
                <div className="wk-builder-list">
                  {form.exercises.map((exercise, index) => (
                    <div key={`${exercise.id}-${index}`} className="wk-builder-card">
                      <div className="wk-builder-card-top">
                        <div>
                          <span className="wk-eyebrow">{exercise.muscle_group || 'Exercise'}</span>
                          <h4 className="wk-ex-name" style={{ marginTop: 4 }}>{exercise.name}</h4>
                        </div>
                        <button
                          className="wk-discard-btn-sm"
                          onClick={() => removeExercise(index)}
                          title="Remove exercise"
                          style={{ color: '#b02500' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                        </button>
                      </div>

                      <div className="wk-form-row">
                        <div className="wk-form-field">
                          <label className="wk-form-label">Sets</label>
                          <input
                            className="wk-form-input"
                            type="number"
                            min="1"
                            value={exercise.sets}
                            onChange={(event) => updateExercise(index, 'sets', event.target.value)}
                          />
                        </div>
                        <div className="wk-form-field">
                          <label className="wk-form-label">Reps</label>
                          <input
                            className="wk-form-input"
                            type="number"
                            min="0"
                            value={exercise.reps}
                            onChange={(event) => updateExercise(index, 'reps', event.target.value)}
                          />
                        </div>
                      </div>

                      <div className="wk-form-row">
                        <div className="wk-form-field">
                          <label className="wk-form-label">Weight</label>
                          <input
                            className="wk-form-input"
                            type="number"
                            min="0"
                            step="0.5"
                            value={exercise.weight}
                            onChange={(event) => updateExercise(index, 'weight', event.target.value)}
                          />
                        </div>
                        <div className="wk-form-field">
                          <label className="wk-form-label">Rest Seconds</label>
                          <input
                            className="wk-form-input"
                            type="number"
                            min="0"
                            step="5"
                            value={exercise.rest_time}
                            onChange={(event) => updateExercise(index, 'rest_time', event.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="wk-builder-actions">
              <button className="wk-btn-ghost" onClick={onClose}>Cancel</button>
              <button className="wk-create-btn" onClick={handleSave} disabled={isSaving || !form.name.trim() || form.exercises.length === 0}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  {isSaving ? 'hourglass_top' : 'save'}
                </span>
                {isSaving ? 'Saving...' : 'Save My Program'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showExercisePicker && (
        <ExerciseSearchModal
          onClose={() => setShowExercisePicker(false)}
          onSelect={handleAddExercise}
        />
      )}
    </>
  );
}

// ── Programs View ─────────────────────────────────────────────────────

function ProgramsView({
  onProgramPreview,
  onProgramStart,
  onTemplatePreview,
  onTemplateCreate,
  onQuickStart,
  progressByAssignment = {},
  isStartingTemplate = false,
  isStartingProgram = false,
}) {
  const { t, locale } = useI18n();
  const {
    data: templatesData,
    isLoading: templatesLoading,
  } = useTemplateList({ limit: 50 });
  const {
    data: assignmentsData,
    isLoading,
    isError,
    errorMeta,
  } = useProgramAssignments({ limit: 50 });
  const templates = normalizeCollection(templatesData, 'templates');
  const liveAssignments = normalizeCollection(assignmentsData);
  const assignments = liveAssignments;
  const totalPrograms = templates.length + assignments.length;

  return (
    <div className="wk-view">
      <div className="wk-section-header">
        <div>
          <span className="wk-eyebrow">{t('workouts.programs.eyebrow')}</span>
          <h2 className="wk-heading">{t('workouts.programs.title')}</h2>
        </div>
        {!isLoading && !templatesLoading && (
          <div className="wk-header-badge">{t('workouts.programs.total', { count: totalPrograms })}</div>
        )}
      </div>

      <div className="wk-programs-split">
        <div className="wk-programs-panel">
          <div className="wk-programs-panel-top">
            <div>
              <span className="wk-eyebrow">{t('workouts.programs.builtByYou')}</span>
              <h3 className="wk-programs-panel-title">{t('workouts.programs.customSessions')}</h3>
            </div>
            <button className="wk-btn-ghost" onClick={onTemplateCreate}>{t('workouts.programs.create')}</button>
          </div>

          {templatesLoading ? (
            <div className="wk-cards-list">
              <div className="wk-card wk-skeleton-card" />
            </div>
          ) : templates.length === 0 ? (
            <div className="wk-empty-section wk-empty-section--compact">
              <span className="material-symbols-outlined wk-empty-icon" style={{ fontSize: 34, color: '#dad4c8' }}>library_add</span>
              <p className="wk-empty-text">{t('workouts.programs.emptyCustom')}</p>
            </div>
          ) : (
            <div className="wk-cards-list">
              {templates.map((template, index) => {
                const accent = getAccentForType(template.type);
                return (
                  <div key={template.id} className={`wk-card wk-card--${index % 2 === 0 ? 'a' : 'b'}`}>
                    <div className="wk-card-accent" style={{ background: accent }} />
                    <div className="wk-card-body" onClick={() => onTemplatePreview(template)} style={{ cursor: 'pointer' }}>
                      <div className="wk-card-top">
                        <h3 className="wk-card-name">{template.name || t('workouts.programs.defaultCustomProgram')}</h3>
                        <span className="wk-card-tag" style={{ background: '#e8e2d6', color: '#423f36' }}>
                          {String(template.type || 'custom').toUpperCase()}
                        </span>
                      </div>
                      <div className="wk-card-meta">
                        <div className="wk-card-meta-item">
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person</span>
                          <span>{t('workouts.programs.madeByYou')}</span>
                        </div>
                        {template.created_at && (
                          <div className="wk-card-meta-item">
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span>
                            <span>{new Date(template.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}</span>
                          </div>
                        )}
                      </div>
                      {template.notes && (
                        <p className="wk-card-last" style={{ color: '#767775', fontSize: 13 }}>
                          {template.notes}
                        </p>
                      )}
                    </div>
                    <button
                      className="wk-card-play"
                      style={{ background: accent, borderColor: accent, opacity: isStartingTemplate ? 0.65 : 1 }}
                      onClick={() => onTemplatePreview(template)}
                      disabled={isStartingTemplate}
                      aria-label={t('workouts.programs.openProgram', { name: template.name || t('workouts.programs.defaultCustomProgram') })}
                    >
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {isStartingTemplate ? 'hourglass_top' : 'play_arrow'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="wk-programs-panel">
          <div className="wk-programs-panel-top">
            <div>
              <span className="wk-eyebrow">{t('workouts.programs.fromCoach')}</span>
              <h3 className="wk-programs-panel-title">{t('workouts.programs.coachPrograms')}</h3>
            </div>
            {!isLoading && (
              <div className="wk-programs-count">{t('workouts.programs.assigned', { count: assignments.length })}</div>
            )}
          </div>

          {isError && errorMeta?.shouldFallback && (
            <div className="wk-semantic-active" style={{ marginBottom: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#b02500' }}>warning</span>
              <span>{t('workouts.programs.syncIssue')}</span>
            </div>
          )}

          {isLoading ? (
            <div className="wk-cards-list">
              {[1, 2].map((item) => <div key={item} className="wk-card wk-skeleton-card" />)}
            </div>
          ) : assignments.length === 0 ? (
            <div className="wk-empty-section wk-empty-section--compact">
              <span className="material-symbols-outlined wk-empty-icon" style={{ fontSize: 34, color: '#dad4c8' }}>fitness_center</span>
              <p className="wk-empty-text">{t('workouts.programs.emptyCoach')}</p>
            </div>
          ) : (
            <div className="wk-cards-list">
              {assignments.map((assignment, i) => {
                const program = assignment.program;
                const sessions = flattenProgramSessions(program);
                const accent = getStatusColor(assignment.status);
                const completedSessionIds = getCompletedSessionIds(progressByAssignment, assignment.id);
                const nextSession = getNextProgramSessionByProgress(assignment, completedSessionIds) || getNextProgramSession(assignment);
                const completedCount = sessions.filter((session) => session?.id && completedSessionIds.includes(session.id)).length;
                const isStartDisabled = !nextSession || isStartingProgram;
                return (
                  <div key={assignment.id} className={`wk-card wk-card--${i % 2 === 0 ? 'a' : 'b'}`}>
                    <div className="wk-card-accent" style={{ background: accent }} />
                    <div className="wk-card-body" onClick={() => onProgramPreview(assignment)} style={{ cursor: 'pointer' }}>
                      <div className="wk-card-top">
                        <h3 className="wk-card-name">{program?.name || t('workouts.programs.defaultWorkoutProgram')}</h3>
                        {assignment.status && (
                          <span className="wk-card-tag" style={{
                            background: i % 2 === 0 ? '#c3fb9c' : '#b4a5ff',
                            color: i % 2 === 0 ? '#214f01' : '#180058',
                            transform: `rotate(${i % 2 === 0 ? 3 : -2}deg)`,
                          }}>
                            {getStatusLabel(assignment.status, t).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="wk-card-meta">
                        <div className="wk-card-meta-item">
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>calendar_month</span>
                          <span>
                            {extractProgramWeeks(program).length === 1
                              ? t('workouts.programs.weeks', { count: extractProgramWeeks(program).length })
                              : t('workouts.programs.weeksPlural', { count: extractProgramWeeks(program).length })}
                          </span>
                        </div>
                        <div className="wk-card-meta-item">
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>format_list_bulleted</span>
                          <span>
                            {sessions.length === 1
                              ? t('workouts.programs.sessions', { count: sessions.length })
                              : t('workouts.programs.sessionsPlural', { count: sessions.length })}
                          </span>
                        </div>
                      </div>
                      {program?.description && (
                        <p className="wk-card-last" style={{ color: '#767775', fontSize: 13 }}>
                          {program.description}
                        </p>
                      )}
                      {nextSession && (
                        <p className="wk-card-last" style={{ marginTop: 6, fontSize: 12, color: accent }}>
                          {t('workouts.programs.nextSession', { week: nextSession.week_number, day: nextSession.day_number })}
                        </p>
                      )}
                      {sessions.length > 0 && (
                        <p className="wk-card-last" style={{ marginTop: 6, fontSize: 12 }}>
                          {t('workouts.programs.sessionsTracked', { completed: completedCount, total: sessions.length })}
                        </p>
                      )}
                    </div>
                    <button
                      className="wk-card-play"
                      style={{ background: accent, borderColor: accent, opacity: isStartDisabled ? 0.55 : 1 }}
                      onClick={() => onProgramStart(assignment, nextSession)}
                      disabled={isStartDisabled}
                      aria-label={`Start ${program?.name || 'program'}`}
                    >
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {isStartingProgram ? 'hourglass_top' : isStartDisabled ? 'lock' : 'play_arrow'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick start blank workout */}
      <div className="wk-create-banner">
        <h4 className="wk-create-title">Ready for a new craft?</h4>
        <p className="wk-create-desc">Build your own program or start a blank workout right away</p>
        <div className="wk-create-actions">
          <button className="wk-btn-ghost wk-btn-ghost--wide" onClick={onTemplateCreate}>
            Create My Program
          </button>
          <button className="wk-create-btn" onClick={onQuickStart}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            Quick Start
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Program Preview ────────────────────────────────────────────────────

function ProgramPreview({
  assignment,
  onBack,
  onStartSession,
  onStatusChange,
  progressByAssignment = {},
  isStartingProgram = false,
  startingSessionId = null,
  isStatusUpdating = false,
}) {
  const { t } = useI18n();
  const program = assignment?.program;
  const sessions = flattenProgramSessions(program);
  const accent = getStatusColor(assignment?.status);
  const completedSessionIds = getCompletedSessionIds(progressByAssignment, assignment?.id);
  const completedSet = new Set(completedSessionIds);
  const nextSession = getNextProgramSessionByProgress(assignment, completedSessionIds) || getNextProgramSession(assignment);
  const canCancel = assignment?.status === 'assigned' || assignment?.status === 'in_progress';
  const canReactivate = assignment?.status === 'cancelled' || assignment?.status === 'completed';
  const canMarkCompleted = assignment?.status !== 'completed' && assignment?.status !== 'cancelled';

  return (
    <div className="wk-view">
      <div className="wk-preview-header">
        <button className="wk-back-btn" onClick={onBack}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          <span>Programs</span>
        </button>
      </div>

      <div className="wk-detail-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div className="wk-preview-color-dot" style={{ background: accent }} />
          {assignment?.status && (
            <span className="wk-card-tag" style={{ background: '#c3fb9c', color: '#214f01' }}>
              {getStatusLabel(assignment.status, t).toUpperCase()}
            </span>
          )}
        </div>
        <h2 className="wk-preview-title">{program?.name || 'Workout Program'}</h2>
        {program?.description && (
          <p style={{ fontSize: 14, color: '#767775', marginTop: 8 }}>{program.description}</p>
        )}
        <div className="wk-detail-pills">
          <span className="wk-detail-pill wk-detail-pill--green">{extractProgramWeeks(program).length} WEEKS</span>
          <span className="wk-detail-pill">{sessions.length} SESSIONS</span>
        </div>
      </div>

      {sessions.length > 0 && (
        <div className="wk-ex-list">
          {sessions.map((session, i) => (
            <div key={session.id || i} className="wk-ex-card">
              <div className="wk-ex-card-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="wk-ex-emoji-dot" style={{ background: accent }} />
                  <div className="wk-ex-card-left">
                    <span className="wk-ex-muscle">
                      Week {session.week_number}
                      {session.week_name ? ` · ${session.week_name}` : ''}
                    </span>
                    <h4 className="wk-ex-name">{session.template?.name || `Session Day ${session.day_number}`}</h4>
                    {completedSet.has(session.id) && (
                      <span className="wk-eyebrow" style={{ color: '#38671a', marginTop: 4 }}>COMPLETED (TRACKED)</span>
                    )}
                  </div>
                </div>
                <button
                  className="wk-start-btn"
                  style={{ minWidth: 110, paddingInline: 12, background: accent, opacity: isStartingProgram ? 0.7 : 1 }}
                  onClick={() => onStartSession(session)}
                  disabled={isStartingProgram}
                >
                  <span>{isStartingProgram && startingSessionId === session.id ? 'Starting...' : completedSet.has(session.id) ? 'Repeat' : 'Start'}</span>
                </button>
              </div>
              {session.notes && (
                <p style={{ marginTop: 8, fontSize: 12, color: '#767775' }}>{session.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="wk-detail-cta">
        <button
          className="wk-start-btn"
          style={{ background: accent, opacity: nextSession && !isStartingProgram ? 1 : 0.55 }}
          onClick={() => nextSession && onStartSession(nextSession)}
          disabled={!nextSession || isStartingProgram}
        >
          <span>
            {isStartingProgram
              ? 'Starting...'
              : nextSession
                ? `Start Week ${nextSession.week_number} Day ${nextSession.day_number}`
                : 'No Upcoming Session'}
          </span>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        {canMarkCompleted && (
          <button
            className="wk-discard-cancel"
            style={{ flex: 1 }}
            onClick={() => onStatusChange('completed')}
            disabled={isStatusUpdating}
          >
            {isStatusUpdating ? 'Updating...' : 'Mark Complete'}
          </button>
        )}
        {canCancel && (
          <button
            className="wk-discard-confirm"
            style={{ flex: 1 }}
            onClick={() => onStatusChange('cancelled')}
            disabled={isStatusUpdating}
          >
            {isStatusUpdating ? 'Updating...' : 'Cancel Program'}
          </button>
        )}
        {canReactivate && (
          <button
            className="wk-create-btn"
            style={{ flex: 1 }}
            onClick={() => onStatusChange('assigned')}
            disabled={isStatusUpdating}
          >
            {isStatusUpdating ? 'Updating...' : 'Reactivate'}
          </button>
        )}
      </div>
    </div>
  );
}

function TemplatePreview({ template, onBack, onStart, isStarting = false }) {
  const { data: templateData, isLoading } = useTemplate(template?.id);
  const resolvedTemplate = templateData?.item || templateData?.data || template;
  const exercises = extractTemplateExercises(resolvedTemplate);
  const accent = getAccentForType(resolvedTemplate?.type);

  return (
    <div className="wk-view">
      <div className="wk-preview-header">
        <button className="wk-back-btn" onClick={onBack}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          <span>Programs</span>
        </button>
      </div>

      <div className="wk-detail-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div className="wk-preview-color-dot" style={{ background: accent }} />
          <span className="wk-card-tag" style={{ background: '#e8e2d6', color: '#423f36' }}>
            {String(resolvedTemplate?.type || 'custom').toUpperCase()}
          </span>
        </div>
        <h2 className="wk-preview-title">{resolvedTemplate?.name || 'Custom Program'}</h2>
        {resolvedTemplate?.notes && (
          <p style={{ fontSize: 14, color: '#767775', marginTop: 8 }}>{resolvedTemplate.notes}</p>
        )}
        <div className="wk-detail-pills">
          <span className="wk-detail-pill wk-detail-pill--green">BUILT BY YOU</span>
          <span className="wk-detail-pill">{exercises.length} EXERCISES</span>
        </div>
      </div>

      {isLoading ? (
        <div className="wk-cards-list">
          {[1, 2].map((item) => <div key={item} className="wk-card wk-skeleton-card" />)}
        </div>
      ) : exercises.length === 0 ? (
        <div className="wk-empty-section">
          <span className="material-symbols-outlined wk-empty-icon" style={{ fontSize: 42, color: '#dad4c8' }}>playlist_add_check</span>
          <p className="wk-empty-text">This program does not have exercises yet.</p>
        </div>
      ) : (
        <div className="wk-ex-list">
          {exercises.map((exercise, index) => (
            <div key={exercise.id || `${exercise.exercise_id}-${index}`} className="wk-ex-card">
              <div className="wk-ex-card-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="wk-ex-emoji-dot" style={{ background: accent }} />
                  <div className="wk-ex-card-left">
                    <span className="wk-ex-muscle">{exercise.exercise?.muscle_group || exercise.exercise?.primary_muscle || exercise.notes || 'Program exercise'}</span>
                    <h4 className="wk-ex-name">{exercise.exercise?.name || `Exercise ${index + 1}`}</h4>
                  </div>
                </div>
                <span className="wk-detail-pill wk-detail-pill--neutral">
                  {Math.max(1, Number(exercise.sets) || 0)} x {Math.max(0, Number(exercise.reps) || 0)}
                </span>
              </div>
              <p style={{ marginTop: 8, fontSize: 12, color: '#767775' }}>
                {Number(exercise.weight) > 0 ? `${exercise.weight} kg` : 'Bodyweight'}
                {' · '}
                {Math.max(0, Number(exercise.rest_time) || 0)}s rest
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="wk-detail-cta">
        <button
          className="wk-start-btn"
          style={{ background: accent, opacity: isStarting ? 0.7 : 1 }}
          onClick={() => onStart(resolvedTemplate)}
          disabled={isStarting}
        >
          <span>{isStarting ? 'Starting...' : 'Start This Program'}</span>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
        </button>
      </div>
    </div>
  );
}

// ── Exercise Detail Modal ─────────────────────────────────────────────

function ExerciseDetailModal({ exercise, onClose, onAddToWorkout, sessionActive }) {
  const { data: historyData, isLoading: histLoading } = useExerciseHistory(exercise?.id);
  const history = normalizeCollection(historyData, 'history');

  if (!exercise) return null;
  const accent = getAccentForType(exercise.type);

  const difficultyColor = {
    beginner: '#38671a',
    intermediate: '#fbbd41',
    advanced: '#b02500',
  }[getExerciseDifficulty(exercise)?.toLowerCase()] || '#5d3fd3';

  const difficulty = getExerciseDifficulty(exercise);

  return (
    <ModalPortal>
      <div className="wk-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="wk-modal wk-modal--detail">

          {/* ── Hero: image + gradient + overlaid title ─────────── */}
          <div className="wk-detail-hero">
            <ExerciseImagePreview
              key={`${exercise.id || exercise.name}-detail-${exercise.image_url || ''}-${exercise.alt_image_url || ''}`}
              exercise={exercise}
              className="wk-detail-hero-frame"
              imgClassName="wk-detail-hero-img"
              alt={exercise.name}
              animate
              fallback={<ExerciseImageFallback exercise={exercise} className="wk-detail-hero-img" />}
            />
            <div className="wk-detail-hero-gradient" />
            <button className="wk-detail-hero-close" onClick={onClose} aria-label="Close">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
            <div className="wk-detail-hero-info">
              {(exercise.muscle_group || exercise.primary_muscle) && (
                <span className="wk-detail-hero-muscle">{exercise.muscle_group || exercise.primary_muscle}</span>
              )}
              <h3 className="wk-detail-hero-title">{exercise.name}</h3>
            </div>
          </div>

          {/* ── Scrollable body ──────────────────────────────────── */}
          <div className="wk-modal-body">

            {/* Meta pills */}
            <div className="wk-detail-pills">
              {exercise.equipment && (
                <span className="wk-detail-pill wk-detail-pill--neutral">
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>fitness_center</span>
                  {exercise.equipment}
                </span>
              )}
              {difficulty && (
                <span className="wk-detail-pill" style={{ background: difficultyColor + '20', color: difficultyColor, border: `1.5px solid ${difficultyColor}50` }}>
                  {difficulty}
                </span>
              )}
              {(exercise.type || exercise.category) && (
                <span className="wk-detail-pill" style={{ background: accent + '18', color: accent, border: `1.5px solid ${accent}40` }}>
                  {exercise.type || exercise.category}
                </span>
              )}
            </div>

            {/* Secondary muscles */}
            {getExerciseSecondaryMuscles(exercise).length > 0 && (
              <div>
                <span className="wk-eyebrow" style={{ display: 'block', marginBottom: 8 }}>SECONDARY MUSCLES</span>
                <div className="wk-detail-pills">
                  {getExerciseSecondaryMuscles(exercise).map(m => (
                    <span key={m} className="wk-detail-pill wk-detail-pill--neutral">{m}</span>
                  ))}
                </div>
              </div>
            )}

            {/* How to perform */}
            {getExerciseInstructions(exercise) && (
              <div className="wk-ex-detail-desc">
                <span className="wk-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: accent }}>info</span>
                  HOW TO PERFORM
                </span>
                <p className="wk-ex-detail-desc-text">{getExerciseInstructions(exercise)}</p>
              </div>
            )}

            {/* Progression history */}
            <div className="wk-ex-detail-history">
              <span className="wk-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: accent }}>show_chart</span>
                PROGRESSION HISTORY
              </span>
              {histLoading ? (
                <div className="wk-loading-rows">
                  {[1, 2].map(i => <div key={i} className="wk-skeleton-row" />)}
                </div>
              ) : history.length === 0 ? (
                <div className="wk-ex-history-empty">
                  <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#dad4c8' }}>show_chart</span>
                  <p style={{ fontSize: 13, color: '#9f9b93', marginTop: 6, textAlign: 'center', lineHeight: 1.5 }}>No history yet.<br />Log this exercise to track progress.</p>
                </div>
              ) : (
                <div className="wk-ex-history-list">
                  {history.slice(0, 5).map((entry, i) => {
                    const peak = (entry.sets || []).reduce((m, s) => Math.max(m, setWeightValue(s)), 0);
                    const vol = (entry.sets || []).reduce((a, s) => a + setWeightValue(s) * (Number(s.reps) || 0), 0);
                    return (
                      <div key={i} className="wk-ex-history-row">
                        <span className="wk-ex-history-date">{new Date(entry.date || entry.started_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                        <span className="wk-ex-history-sets">{(entry.sets || []).length} sets</span>
                        {peak > 0 && <span className="wk-ex-history-peak" style={{ color: accent }}>{peak}kg peak</span>}
                        {vol > 0 && <span className="wk-ex-history-vol">{vol.toLocaleString()}kg vol</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Footer CTA ───────────────────────────────────────── */}
          <div className="wk-modal-footer">
            <button
              className="wk-start-btn"
              style={{ background: accent, width: '100%' }}
              onClick={() => { onAddToWorkout(exercise); onClose(); }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
              {sessionActive ? 'Add to Active Workout' : 'Start Workout With This Exercise'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

// ── Exercise image helper ─────────────────────────────────────────────

const MUSCLE_IMAGE_MAP = {
  chest: resolveExerciseImageUrl('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=160&fit=crop&auto=format&q=80'),
  back: resolveExerciseImageUrl('https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=160&fit=crop&auto=format&q=80'),
  legs: resolveExerciseImageUrl('https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=200&h=160&fit=crop&auto=format&q=80'),
  shoulders: resolveExerciseImageUrl('https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=200&h=160&fit=crop&auto=format&q=80'),
  arms: resolveExerciseImageUrl('https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=200&h=160&fit=crop&auto=format&q=80'),
  core: resolveExerciseImageUrl('https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&h=160&fit=crop&auto=format&q=80'),
  cardio: resolveExerciseImageUrl('https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=200&h=160&fit=crop&auto=format&q=80'),
  default: resolveExerciseImageUrl('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&h=160&fit=crop&auto=format&q=80'),
};

function ExerciseImageFallback({ exercise, className = '', fallbackLabel = '' }) {
  const primaryMuscle = getExercisePrimaryMuscle(exercise);
  const label = fallbackLabel || exercise?.name || 'Exercise';
  const muscle = normalizeExerciseParam(primaryMuscle);
  const fallbackImage = MUSCLE_IMAGE_MAP[muscle] || MUSCLE_IMAGE_MAP.default;

  return (
    <div className={`wk-ex-img-fallback ${className}`.trim()}>
      <img src={fallbackImage} alt={label} className="wk-ex-img-fallback-photo" />
      <div className="wk-ex-img-fallback-overlay">
        <span className="material-symbols-outlined">fitness_center</span>
        <span>{primaryMuscle || label.slice(0, 1)}</span>
      </div>
    </div>
  );
}

const MUSCLE_CHIP_COLOR = {
  chest: { bg: '#c3fb9c', color: '#214f01' },
  back: { bg: '#c3fb9c', color: '#214f01' },
  legs: { bg: '#b4a5ff', color: '#180058' },
  shoulders: { bg: '#f8cc65', color: '#9d6a09' },
  arms: { bg: '#3bd3fd', color: '#0089ad' },
  core: { bg: '#f8cc65', color: '#9d6a09' },
  cardio: { bg: '#fce4d9', color: '#520c00' },
};

// ── Library Filter Sheet ──────────────────────────────────────────────

function LibraryFilterSheet({ filters, onChange, onClose, meta }) {
  const [local, setLocal] = useState({ ...filters });

  const levels = normalizeUniqueOptions(meta?.levels || [], ['beginner', 'intermediate', 'advanced']);
  const equipment = normalizeUniqueOptions(meta?.equipment || [], ['barbell', 'dumbbell', 'body weight', 'machine', 'cable', 'bands', 'kettlebell']);
  const muscles = normalizeUniqueOptions(meta?.muscles || [], ['chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'glutes', 'calves']);
  const categories = normalizeUniqueOptions(meta?.categories || [], ['strength', 'cardio', 'stretching', 'plyometrics', 'powerlifting']);

  function toggle(key, val) {
    setLocal(prev => ({ ...prev, [key]: prev[key] === val ? '' : val }));
  }

  function applyAndClose() {
    onChange(local);
    onClose();
  }

  function clearAll() {
    const cleared = { level: '', equipment: '', muscle: '', category: '' };
    setLocal(cleared);
    onChange(cleared);
    onClose();
  }

  const activeCount = Object.values(local).filter(Boolean).length;

  return (
    <ModalPortal>
      <div className="wk-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="wk-filter-sheet">
          <div className="wk-filter-sheet-handle" />
          <div className="wk-modal-header" style={{ paddingBottom: 12 }}>
            <h3 className="wk-modal-title">Filter Exercises</h3>
            <button className="wk-modal-close" onClick={onClose}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>

          <div className="wk-filter-body">
            {[
              { label: 'DIFFICULTY', key: 'level', options: levels },
              { label: 'EQUIPMENT', key: 'equipment', options: equipment },
              { label: 'MUSCLE GROUP', key: 'muscle', options: muscles },
              { label: 'CATEGORY', key: 'category', options: categories },
            ].map(({ label, key, options }) => (
              <div key={key} className="wk-filter-section">
                <span className="wk-eyebrow" style={{ display: 'block', marginBottom: 8 }}>{label}</span>
                <div className="wk-cat-chips">
                  {options.map(opt => (
                    <button
                      key={opt}
                      className={`wk-cat-chip${local[key] === opt ? ' wk-cat-chip--active' : ''}`}
                      onClick={() => toggle(key, opt)}
                    >
                      {formatExerciseOption(opt)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="wk-filter-footer">
            <button className="wk-discard-cancel" onClick={clearAll} style={{ flex: 1 }}>Clear All</button>
            <button
              className="wk-start-btn"
              style={{ flex: 2, background: '#38671a' }}
              onClick={applyAndClose}
            >
              Apply {activeCount > 0 ? `(${activeCount})` : ''}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

// ── Library View ──────────────────────────────────────────────────────

function LibraryView({ sessionActive, onAddToWorkout }) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({ level: '', equipment: '', muscle: '', category: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [semanticMode, setSemanticMode] = useState(false);
  const [page, setPage] = useState(1);
  const timerRef = useRef(null);
  const pageSize = 20;

  const semanticSearch = useSemanticSearch();
  const { data: metaData } = useExerciseMeta();
  const meta = metaData?.meta || metaData;

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timerRef.current);
  }, [search]);

  const params = { page, limit: pageSize };
  if (debouncedSearch && !semanticMode) params.q = debouncedSearch;
  if (filters.muscle) params.muscle = normalizeExerciseParam(filters.muscle);
  if (filters.level) params.level = normalizeExerciseParam(filters.level);
  if (filters.equipment) params.equipment = filters.equipment;
  if (filters.category) params.category = normalizeExerciseParam(filters.category);

  const {
    data: exercisesData,
    isLoading: normalLoading,
    isError: normalError,
    errorMeta: normalErrorMeta,
  } = useExercises(params, { keepPreviousData: true });
  const normalExercises = exercisesData?.exercises || exercisesData?.data || exercisesData || [];
  const metadata = exercisesData?.metadata || {};
  const normalTotalPages = Math.max(1, Number(metadata.total_pages) || 1);
  const normalTotalCount = Number(metadata.total_count) || normalExercises.length;

  // Semantic search results override normal
  const semanticResults = semanticSearch.data?.results || semanticSearch.data?.exercises || semanticSearch.data || [];
  const semanticTotalPages = Math.max(1, Math.ceil(semanticResults.length / pageSize));
  const semanticStart = (page - 1) * pageSize;
  const semanticPagedResults = semanticResults.slice(semanticStart, semanticStart + pageSize);
  const exercises = semanticMode && semanticSearch.data ? semanticPagedResults : normalExercises;
  const isLoading = semanticMode ? semanticSearch.isPending : normalLoading;
  const totalPages = semanticMode ? semanticTotalPages : normalTotalPages;
  const totalCount = semanticMode ? semanticResults.length : normalTotalCount;
  const canPrevPage = page > 1;
  const canNextPage = semanticMode
    ? page < semanticTotalPages
    : (Boolean(metadata.has_next) || page < normalTotalPages);
  const showingFrom = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = totalCount === 0 ? 0 : Math.min((page - 1) * pageSize + exercises.length, totalCount);

  function handleSemanticSearch() {
    if (!debouncedSearch.trim()) return;
    setPage(1);
    setSemanticMode(true);
    semanticSearch.mutate({
      query: debouncedSearch,
      top_k: 20,
      ...(filters.level ? { level: normalizeExerciseParam(filters.level) } : {}),
      ...(filters.equipment ? { equipment: filters.equipment } : {}),
      ...(filters.category ? { category: normalizeExerciseParam(filters.category) } : {}),
      ...(filters.muscle ? { muscle: normalizeExerciseParam(filters.muscle) } : {}),
    });
  }

  function handleSearchChange(val) {
    setSearch(val);
    setPage(1);
    if (!val) setSemanticMode(false);
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="wk-view">
      <div className="wk-section-header">
        <div>
          <span className="wk-eyebrow">{t('workouts.library.eyebrow')}</span>
          <h2 className="wk-heading">{t('workouts.library.title')}</h2>
        </div>
        <button
          className={`wk-filter-btn${activeFilterCount > 0 ? ' wk-filter-btn--active' : ''}`}
          onClick={() => setShowFilters(true)}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>tune</span>
          {activeFilterCount > 0 ? t('workouts.library.filtersCount', { count: activeFilterCount }) : t('workouts.library.filters')}
        </button>
      </div>

      {/* Search bar with semantic toggle */}
      <div className="wk-search-wrap" style={{ marginBottom: 8 }}>
        <span className="material-symbols-outlined wk-search-icon">search</span>
        <input
          className="wk-search"
          type="text"
          placeholder={semanticMode ? t('workouts.library.searchAiPlaceholder') : t('workouts.library.searchPlaceholder')}
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSemanticSearch()}
        />
        {search && (
          <button className="wk-search-clear" onClick={() => { handleSearchChange(''); }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        )}
      </div>

      {/* Semantic search hint */}
      {search && !semanticMode && (
        <button
          className="wk-semantic-hint"
          onClick={handleSemanticSearch}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>auto_awesome</span>
          {t('workouts.library.tryAiSearch', { query: search })}
        </button>
      )}
      {semanticMode && (
        <div className="wk-semantic-active">
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#5d3fd3' }}>auto_awesome</span>
          <span>{t('workouts.library.aiResults', { query: search })}</span>
          <button onClick={() => { setSemanticMode(false); setPage(1); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#9f9b93' }}>
            {t('workouts.library.clear')}
          </button>
        </div>
      )}

      {!semanticMode && normalError && normalErrorMeta?.shouldFallback && (
        <div className="wk-semantic-active" style={{ marginBottom: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#b02500' }}>warning</span>
          <span>{t('workouts.library.serviceIssue')}</span>
        </div>
      )}

      {isLoading ? (
        <div className="wk-cards-list">
          {[1, 2, 3, 4].map(i => <div key={i} className="wk-skeleton-row-large" />)}
        </div>
      ) : exercises.length === 0 ? (
        <div className="wk-empty-section">
          <span className="material-symbols-outlined wk-empty-icon" style={{ fontSize: 48, color: '#dad4c8' }}>search_off</span>
          <p className="wk-empty-text">{t('workouts.library.noMatch')}</p>
        </div>
      ) : (
        <div className="wk-lib-cards">
          {exercises.map(ex => {
            const muscle = normalizeExerciseParam(getExercisePrimaryMuscle(ex));
            const chipStyle = MUSCLE_CHIP_COLOR[muscle] || { bg: '#f1f1ef', color: '#5b5c5a' };
            return (
              <div key={ex.id} className="wk-lib-card" onClick={() => setSelectedExercise(ex)}>
                <div className="wk-lib-card-img-wrap">
                  <ExerciseImagePreview
                    key={`${ex.id || ex.name}-card-${ex.image_url || ''}-${ex.alt_image_url || ''}`}
                    exercise={ex}
                    className="wk-lib-card-media"
                    imgClassName="wk-lib-card-img"
                    alt={ex.name}
                    animate={false}
                    fallback={<ExerciseImageFallback exercise={ex} className="wk-lib-card-img" />}
                  />
                </div>
                <div className="wk-lib-card-body">
                  <span className="wk-lib-card-name">{ex.name}</span>
                  <div className="wk-lib-card-chips">
                    {getExercisePrimaryMuscle(ex) && (
                      <span
                        className="wk-lib-card-chip"
                        style={{ background: chipStyle.bg, color: chipStyle.color }}
                      >
                        {getExercisePrimaryMuscle(ex)}
                      </span>
                    )}
                    {ex.equipment && (
                      <span className="wk-lib-card-chip wk-lib-card-chip--equip">
                        {ex.equipment}
                      </span>
                    )}
                    {getExerciseDifficulty(ex) && (
                      <span className="wk-lib-card-chip wk-lib-card-chip--diff">
                        {getExerciseDifficulty(ex)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="wk-lib-add-btn"
                  onClick={e => { e.stopPropagation(); onAddToWorkout(ex); }}
                  aria-label={`Add ${ex.name} to workout`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && exercises.length > 0 && (
        <div className="wk-lib-pagination">
          <span className="wk-lib-pagination-label">
            Showing {showingFrom}-{showingTo} of {totalCount}
          </span>
          <div className="wk-lib-pagination-actions">
            <button
              className="wk-lib-pagination-btn"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={!canPrevPage}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_left</span>
            </button>
            <span className="wk-lib-pagination-page">{page}/{totalPages}</span>
            <button
              className="wk-lib-pagination-btn"
              onClick={() => setPage((current) => current + 1)}
              disabled={!canNextPage}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
            </button>
          </div>
        </div>
      )}

      {showFilters && (
        <LibraryFilterSheet
          filters={filters}
          onChange={(nextFilters) => {
            setFilters(nextFilters);
            setPage(1);
          }}
          onClose={() => setShowFilters(false)}
          meta={meta}
        />
      )}

      {selectedExercise && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
          onAddToWorkout={onAddToWorkout}
          sessionActive={sessionActive}
        />
      )}
    </div>
  );
}

// ── History View ──────────────────────────────────────────────────────

function getWorkoutTimestamp(workout) {
  return workout?.date || workout?.started_at || workout?.created_at || null;
}

function getWorkoutDate(workout) {
  const timestamp = getWorkoutTimestamp(workout);
  return timestamp ? new Date(timestamp) : null;
}

function getDateKey(date) {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getWorkoutDisplayName(workout) {
  const name = workout?.name?.trim();
  return name || 'Workout Session';
}

function getWorkoutTypeLabel(workout) {
  return workout?.workout_type || workout?.type || 'Session';
}

function getWorkoutSetCount(exercises) {
  return exercises.reduce((total, exercise) => total + extractExerciseSets(exercise).length, 0);
}

function HistoryView({ onStartWorkout }) {
  const { t, locale } = useI18n();
  const today = new Date();
  const [expandedEx, setExpandedEx] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => getDateKey(today));
  const [calendarCursor, setCalendarCursor] = useState(() => {
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const deleteWorkoutMutation = useDeleteWorkout();
  const params = { limit: 100 };

  const {
    data: workoutsData,
    isLoading,
    isError,
    errorMeta,
  } = useWorkoutList(params);
  const { data: calendarData } = useActivityCalendar();

  const liveWorkouts = workoutsData?.workouts || workoutsData?.data || workoutsData || [];
  const workouts = [...liveWorkouts].sort((a, b) => {
    const aTime = getWorkoutDate(a)?.getTime() || 0;
    const bTime = getWorkoutDate(b)?.getTime() || 0;
    return bTime - aTime;
  });
  const calendarDots = calendarData?.dates || {};

  const dayWorkouts = workouts.filter((workout) => {
    const workoutDate = getWorkoutDate(workout);
    if (!workoutDate) return false;
    return getDateKey(workoutDate) === selectedCalendarDate;
  });

  const latestWorkoutSummary = dayWorkouts[0] || null;
  const activeWorkoutId = latestWorkoutSummary?.id || null;
  const {
    data: selectedWorkoutDetailData,
    isLoading: selectedWorkoutDetailLoading,
    isError: selectedWorkoutDetailError,
    errorMeta: selectedWorkoutDetailErrorMeta,
  } = useWorkout(activeWorkoutId);
  const selectedWorkoutDetail = latestWorkoutSummary
    ? (selectedWorkoutDetailData?.workout || selectedWorkoutDetailData?.data || latestWorkoutSummary)
    : null;
  const selectedExercises = extractWorkoutExercises(selectedWorkoutDetail);
  const selectedVolume = calcVolume(selectedExercises);
  const selectedSetCount = getWorkoutSetCount(selectedExercises);
  const numberFormatter = new Intl.NumberFormat(locale);

  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const canMoveToNextMonth = (
    year < today.getFullYear()
    || (year === today.getFullYear() && month < today.getMonth())
  );
  const monthName = calendarCursor.toLocaleString(locale, { month: 'long' });
  const weekDays = Array.from({ length: 7 }, (_, index) => (
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, 1 + index))
  ));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  function fmtNumber(value) {
    return numberFormatter.format(value);
  }

  function fmtWeight(value) {
    return `${fmtNumber(value)} ${t('common.units.kg')}`;
  }

  function fmtSetCount(count) {
    return t(count === 1 ? 'workouts.history.setCount' : 'workouts.history.setCountPlural', { count: fmtNumber(count) });
  }

  function fmtReps(count) {
    return t(count === 1 ? 'workouts.history.repCount' : 'workouts.history.repCountPlural', { count: fmtNumber(count) });
  }

  function fmtPeakWeight(value) {
    return t('workouts.history.peakWeight', { value: fmtWeight(value) });
  }

  function fmtDuration(start, end, explicitDuration) {
    if (explicitDuration) return `${explicitDuration}m`;
    if (!start || !end) return '—';
    const minutes = Math.round((new Date(end) - new Date(start)) / 60000);
    return minutes > 0 ? `${minutes}m` : '—';
  }

  function shiftCalendar(monthOffset) {
    setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() + monthOffset, 1));
  }

  function fmtDayLabel(dayKey) {
    if (!dayKey) return '';
    const date = new Date(`${dayKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div className="wk-view wk-view--wide wk-history-view">
      <section className="wk-history-hero">
        <div className="wk-history-hero-copy">
          <span className="wk-eyebrow">{t('workouts.history.eyebrow')}</span>
          <h2 className="wk-heading wk-history-title">{t('workouts.history.title')}</h2>
          <p className="wk-history-subtitle">
            {t('workouts.history.subtitle')}
          </p>
        </div>
        <div className="wk-history-hero-actions">
          <button className="wk-start-btn" onClick={onStartWorkout}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>play_circle</span>
            {t('workouts.history.logWorkout')}
          </button>
        </div>
      </section>

      {isError && errorMeta?.shouldFallback && (
        <div className="wk-semantic-active" style={{ marginBottom: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#b02500' }}>warning</span>
          <span>{t('workouts.history.syncIssue')}</span>
        </div>
      )}

      <div className="wk-history-layout">
        <section className="wk-cal-card wk-history-calendar">
          <div className="wk-cal-header">
            <div>
              <span className="wk-eyebrow">{year}</span>
              <h3 className="wk-cal-title">{monthName}</h3>
            </div>
            <div className="wk-cal-nav">
              <button className="wk-cal-nav-btn" onClick={() => shiftCalendar(-1)} aria-label={t('workouts.history.previousMonth')}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>west</span>
              </button>
              <button
                className="wk-cal-nav-btn"
                onClick={() => shiftCalendar(1)}
                aria-label={t('workouts.history.nextMonth')}
                disabled={!canMoveToNextMonth}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>east</span>
              </button>
            </div>
          </div>
          <div className="wk-cal-grid">
            {weekDays.map((day) => (
              <div key={day} className="wk-cal-day-hdr">{day}</div>
            ))}
            {Array.from({ length: offset }).map((_, index) => (
              <div key={`pad-${index}`} className="wk-cal-day wk-cal-day--prev" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const matchingWorkouts = workouts.filter((workout) => {
                const workoutDate = getWorkoutDate(workout);
                return workoutDate ? getDateKey(workoutDate) === dateStr : false;
              });
              const hasActivity = calendarDots[dateStr] || matchingWorkouts.length > 0;
              const cellDate = new Date(year, month, day);
              const isToday = (
                day === today.getDate()
                && month === today.getMonth()
                && year === today.getFullYear()
              );
              const isSelected = selectedCalendarDate === dateStr;
              const isFuture = cellDate > new Date(today.getFullYear(), today.getMonth(), today.getDate());

              return (
                <button
                  key={day}
                  type="button"
                  className={`wk-cal-day${isToday ? ' wk-cal-day--active' : ''}${hasActivity ? ' wk-cal-day--has-dot' : ''}${isSelected ? ' wk-cal-day--selected' : ''}${isFuture ? ' wk-cal-day--muted' : ''}`}
                  onClick={() => {
                    if (isFuture) return;
                    setExpandedEx(null);
                    setSelectedCalendarDate(dateStr);
                  }}
                  disabled={isFuture}
                >
                  {day}
                  {hasActivity && !isToday && (
                    <span className="wk-cal-dot" style={{ background: '#38671a' }} />
                  )}
                </button>
              );
            })}
          </div>
          <div className="wk-cal-legend">
            <div className="wk-cal-legend-item">
              <span className="wk-cal-legend-dot" style={{ background: '#38671a' }} />
              {t('workouts.history.loggedSession')}
            </div>
            <div className="wk-cal-legend-item">
              <span className="wk-cal-legend-dot" style={{ background: '#c3fb9c' }} />
              {t('workouts.history.selectedDay')}
            </div>
          </div>
        </section>

        <section className="wk-workout-exercise-list-card wk-history-feature">
          {isLoading ? (
            <div style={{ padding: '16px 0' }}>
              {[1, 2, 3].map((item) => <div key={item} className="wk-skeleton-row-large" style={{ marginBottom: 8 }} />)}
            </div>
          ) : selectedWorkoutDetail ? (
            <>
              <div className="wk-workout-exercise-list-head">
                <div>
                  <span className="wk-eyebrow">{fmtDayLabel(selectedCalendarDate)}</span>
                  <h3 className="wk-workout-exercise-list-title">{getWorkoutDisplayName(selectedWorkoutDetail)}</h3>
                </div>
                <div className="wk-workout-exercise-list-head-actions">
                  <span
                    className="wk-hist-type-badge"
                    style={{
                      background: `${getAccentForType(getWorkoutTypeLabel(selectedWorkoutDetail))}22`,
                      color: getAccentForType(getWorkoutTypeLabel(selectedWorkoutDetail)),
                    }}
                  >
                    {getWorkoutTypeLabel(selectedWorkoutDetail).toLowerCase()}
                  </span>
                  <button
                    className="wk-hist-delete-btn"
                    onClick={() => setDeleteTarget(selectedWorkoutDetail)}
                    aria-label={t('workouts.history.deleteWorkoutAria')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                  </button>
                </div>
              </div>

              <div className="wk-workout-exercise-list-stats">
                <div className="wk-workout-exercise-list-stat">
                  <span>{t('workouts.history.duration')}</span>
                  <strong>{fmtDuration(selectedWorkoutDetail.started_at, selectedWorkoutDetail.completed_at, selectedWorkoutDetail.duration)}</strong>
                </div>
                <div className="wk-workout-exercise-list-stat">
                  <span>{t('workouts.history.volume')}</span>
                  <strong>{selectedVolume > 0 ? fmtWeight(selectedVolume) : '—'}</strong>
                </div>
                <div className="wk-workout-exercise-list-stat">
                  <span>{t('workouts.history.sets')}</span>
                  <strong>{selectedSetCount || '—'}</strong>
                </div>
                <div className="wk-workout-exercise-list-stat">
                  <span>{t('workouts.history.exercises')}</span>
                  <strong>{selectedExercises.length || '—'}</strong>
                </div>
              </div>

              <div className="wk-workout-exercise-list-body">
                <p className="wk-eyebrow">{t('workouts.history.sessionNotes')}</p>
                {selectedWorkoutDetail?.notes ? (
                  <div className="wk-workout-session-note">
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#767775' }}>sticky_note_2</span>
                    <p>{selectedWorkoutDetail.notes}</p>
                  </div>
                ) : (
                  <p className="wk-hist-focus-empty">{t('workouts.history.noSessionNotes')}</p>
                )}

                <p className="wk-eyebrow" style={{ marginTop: 12 }}>{t('workouts.history.exercisesPerformed')}</p>
                {selectedWorkoutDetailLoading && (
                  <div style={{ padding: '8px 0' }}>
                    <div className="wk-skeleton-row" />
                  </div>
                )}
                {selectedWorkoutDetailError && selectedWorkoutDetailErrorMeta?.shouldFallback && (
                  <div className="wk-semantic-active" style={{ marginBottom: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#b02500' }}>warning</span>
                    <span>{t('workouts.history.detailUnavailable')}</span>
                  </div>
                )}
                {selectedExercises.length === 0 ? (
                  <p className="wk-hist-focus-empty">{t('workouts.history.noExercisesLogged')}</p>
                ) : (
                  <div className="wk-workout-exercise-list">
                    {selectedExercises.map((exercise, index) => {
                      const exerciseKey = `${activeWorkoutId}-${exercise.id || exercise.exercise_id || index}`;
                      const isOpen = expandedEx === exerciseKey;
                      const sets = extractExerciseSets(exercise);
                      const peakWeight = sets.reduce((max, set) => Math.max(max, setWeightValue(set)), 0);
                      return (
                        <div key={exerciseKey} className={`wk-exercise-row${isOpen ? ' wk-exercise-row--open' : ''}`}>
                          <button
                            type="button"
                            className="wk-exercise-row-toggle"
                            onClick={() => setExpandedEx(isOpen ? null : exerciseKey)}
                          >
                            <div>
                              <p className="wk-exercise-row-title">{exercise.exercise?.name || exercise.name}</p>
                              <p className="wk-exercise-row-meta">
                                {fmtSetCount(sets.length)}{peakWeight > 0 ? ` · ${fmtPeakWeight(peakWeight)}` : ''}
                              </p>
                            </div>
                            <span
                              className="material-symbols-outlined wk-exercise-row-expand"
                              style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                            >
                              expand_more
                            </span>
                          </button>
                          {isOpen && (
                            <div className="wk-exercise-row-detail">
                              <div className="wk-sets-header" style={{ marginBottom: 8 }}>
                                <span>{t('workouts.history.set')}</span>
                                <span>{t('workouts.history.weight')}</span>
                                <span>{t('workouts.history.reps')}</span>
                                <span></span>
                              </div>
                              {sets.length === 0 ? (
                                <p className="wk-hist-focus-empty" style={{ marginTop: 4 }}>{t('workouts.history.noExercisesLoggedShort')}</p>
                              ) : (
                                sets.map((set, setIndex) => (
                                  <div key={`${exerciseKey}-${setIndex}`} className="wk-hist-set-row">
                                    <span className="wk-set-num" style={{ color: '#38671a' }}>{setIndex + 1}</span>
                                    <span className="wk-hist-set-val">{setWeightValue(set) > 0 ? fmtWeight(setWeightValue(set)) : t('workouts.history.bodyweight')}</span>
                                    <span className="wk-hist-set-val">{fmtReps(Number(set.reps) || 0)}</span>
                                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#38671a', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                  </div>
                                ))
                              )}
                              {(exercise.notes || exercise.note) && (
                                <div className="wk-hist-ex-note">
                                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#767775' }}>notes</span>
                                  <p>{exercise.notes || exercise.note}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="wk-hist-empty-state">
              <span className="material-symbols-outlined wk-hist-empty-icon">event_busy</span>
              <h3 className="wk-hist-empty-title">{t('workouts.history.noArchiveYet')}</h3>
              <p className="wk-hist-empty-body">{fmtDayLabel(selectedCalendarDate)}</p>
              <button className="wk-start-btn" style={{ marginTop: 8 }} onClick={onStartWorkout}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                {t('workouts.history.logWorkout')}
              </button>
            </div>
          )}
        </section>
      </div>

      {deleteTarget && (
        <div className="wk-discard-overlay" onClick={(event) => event.target === event.currentTarget && setDeleteTarget(null)}>
          <div className="wk-discard-modal">
            <div className="wk-discard-icon">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 28, color: '#b02500' }}>delete_forever</span>
            </div>
            <h3 className="wk-discard-title">{t('workouts.history.deleteWorkoutTitle')}</h3>
            <p className="wk-discard-body">{t('workouts.history.deleteWorkoutBody', { name: getWorkoutDisplayName(deleteTarget) })}</p>
            <div className="wk-discard-actions">
              <button className="wk-discard-cancel" onClick={() => setDeleteTarget(null)}>{t('workouts.history.cancel')}</button>
              <button
                className="wk-discard-confirm"
                onClick={() => {
                  deleteWorkoutMutation.mutate({ workout_id: deleteTarget.id });
                  setExpandedEx(null);
                  setDeleteTarget(null);
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete_forever</span>
                {t('workouts.history.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Rest Timer ────────────────────────────────────────────────────────

function RestTimer({ defaultSeconds = 60, onSkip }) {
  const [restTime, setRestTime] = useState(defaultSeconds);
  const intervalRef = useRef(null);
  const onSkipRef = useRef(onSkip);

  useEffect(() => {
    onSkipRef.current = onSkip;
  }, [onSkip]);

  useEffect(() => {
    setRestTime(defaultSeconds);
  }, [defaultSeconds]);

  useEffect(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRestTime(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          onSkipRef.current?.();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [defaultSeconds]);

  const safeDefaultSeconds = Math.max(1, defaultSeconds);
  const pct = ((safeDefaultSeconds - restTime) / safeDefaultSeconds) * 100;

  return (
    <div className="wk-rest-overlay">
      <div className="wk-rest-card">
        <p className="wk-eyebrow" style={{ marginBottom: 12, textAlign: 'center' }}>REST TIME</p>
        <div className="wk-rest-ring">
          <svg viewBox="0 0 80 80" className="wk-rest-svg">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#eee9df" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34"
              fill="none"
              stroke="#38671a"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
              transform="rotate(-90 40 40)"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <span className="wk-rest-time">{fmtSeconds(restTime)}</span>
        </div>
        <div className="wk-rest-btns">
          <button className="wk-rest-adj" onClick={() => setRestTime(t => Math.max(0, t - 15))}>-15s</button>
          <button className="wk-start-btn wk-rest-skip" onClick={onSkip}>Skip</button>
          <button className="wk-rest-adj" onClick={() => setRestTime(t => t + 15)}>+15s</button>
        </div>
      </div>
    </div>
  );
}

// ── Cardio Block ──────────────────────────────────────────────────────

function CardioBlock({ workoutId, onClose }) {
  const [type, setType] = useState('running');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [calories, setCalories] = useState('');
  const [saving, setSaving] = useState(false);

  const addCardioMutation = useAddCardio();

  const CARDIO_TYPES = [
    { id: 'running', label: 'Run', icon: 'directions_run' },
    { id: 'cycling', label: 'Bike', icon: 'directions_bike' },
    { id: 'rowing', label: 'Row', icon: 'rowing' },
    { id: 'elliptical', label: 'Elliptical', icon: 'accessibility_new' },
    { id: 'swimming', label: 'Swim', icon: 'pool' },
    { id: 'other', label: 'Other', icon: 'sports' },
  ];

  function handleSave() {
    if (!duration && !distance) return;
    setSaving(true);
    addCardioMutation.mutate({
      workout_id: workoutId,
      data: {
        modality: type,
        duration_minutes: Number(duration) || null,
        distance: Number(distance) || null,
        calories_burned: Number(calories) || null,
      },
    }, {
      onSettled: () => { setSaving(false); onClose(); },
    });
  }

  return (
    <div className="wk-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="wk-modal">
        <div className="wk-modal-header">
          <h3 className="wk-modal-title">Log Cardio</h3>
          <button className="wk-modal-close" onClick={onClose}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div className="wk-modal-body">
          {/* Type selector */}
          <div className="wk-cardio-types">
            {CARDIO_TYPES.map(ct => (
              <button
                key={ct.id}
                className={`wk-cardio-type-btn${type === ct.id ? ' wk-cardio-type-btn--active' : ''}`}
                onClick={() => setType(ct.id)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{ct.icon}</span>
                <span>{ct.label}</span>
              </button>
            ))}
          </div>

          <div className="wk-cardio-fields">
            <div className="wk-cardio-field">
              <label className="wk-eyebrow">DURATION (MIN)</label>
              <input
                className="wk-set-input"
                type="number"
                inputMode="decimal"
                placeholder="e.g. 30"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                style={{ width: '100%', textAlign: 'left', fontSize: 18 }}
              />
            </div>
            <div className="wk-cardio-field">
              <label className="wk-eyebrow">DISTANCE (KM)</label>
              <input
                className="wk-set-input"
                type="number"
                inputMode="decimal"
                placeholder="e.g. 5.0"
                value={distance}
                onChange={e => setDistance(e.target.value)}
                style={{ width: '100%', textAlign: 'left', fontSize: 18 }}
              />
            </div>
            <div className="wk-cardio-field">
              <label className="wk-eyebrow">CALORIES (OPTIONAL)</label>
              <input
                className="wk-set-input"
                type="number"
                inputMode="numeric"
                placeholder="e.g. 320"
                value={calories}
                onChange={e => setCalories(e.target.value)}
                style={{ width: '100%', textAlign: 'left', fontSize: 18 }}
              />
            </div>
          </div>
        </div>
        <div className="wk-modal-footer">
          <button
            className="wk-start-btn"
            style={{ width: '100%', background: '#3bd3fd', color: '#000' }}
            onClick={handleSave}
            disabled={saving || (!duration && !distance)}
          >
            {saving ? 'Saving...' : 'Log Cardio'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Active Session ────────────────────────────────────────────────────

const SESSION_TYPES = ['Strength', 'Hypertrophy', 'Cardio', 'Endurance', 'Custom'];

export function ActiveSession({ workoutId, initialExercises = [], programName = '', onFinish, onDiscard }) {
  const { display: timerDisplay, elapsed } = useTimer(true);
  const [exIndex, setExIndex] = useState(0);
  const [localSets, setLocalSets] = useState(() =>
    initialExercises.map(ex => ({
      ...ex,
      note: ex.note || ex.notes || '',
      rest_time: Number(ex.rest_time) || 60,
      sets: (ex.sets && ex.sets.length > 0)
        ? ex.sets.map((set, idx) => ({
          backendSetId: set.backendSetId || set.id || null,
          setNumber: set.setNumber || set.set_number || idx + 1,
          weight: String(set.weight ?? ''),
          reps: String(set.reps ?? ''),
          done: Boolean(set.done),
        }))
        : [{ weight: '', reps: '', done: false }],
    }))
  );
  const [showRest, setShowRest] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [showCardio, setShowCardio] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  const [sessionName, setSessionName] = useState(programName || 'Workout');
  const [sessionType, setSessionType] = useState('Strength');
  const [sessionNotes, setSessionNotes] = useState('');
  const [setToDelete, setSetToDelete] = useState(null); // { exIdx, setIdx }

  const addSetMutation = useAddSet();
  const updateSetMutation = useUpdateSet(workoutId);
  const addExerciseMutation = useAddExercise();
  const updateWorkoutExerciseMutation = useUpdateWorkoutExercise(workoutId);
  const deleteSetMutation = useDeleteSet(workoutId);
  const deleteExMutation = useDeleteWorkoutExercise(workoutId);

  const storeAddExercise = workoutStore(s => s.addExercise);
  const storeAddSet = workoutStore(s => s.addSet);
  const queuePendingSet = workoutStore(s => s.queueSet);
  const addToast = uiStore(s => s.addToast);

  const currentEx = localSets[exIndex];
  const totalExercises = localSets.length;

  function updateSet(exIdx, setIdx, field, value) {
    setLocalSets(prev => prev.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      return { ...ex, sets: ex.sets.map((s, si) => si === setIdx ? { ...s, [field]: value } : s) };
    }));
  }

  function toggleDone(exIdx, setIdx) {
    const s = localSets[exIdx]?.sets?.[setIdx];
    if (!s) return;
    const nextDone = !s.done;
    const workoutExerciseId = localSets[exIdx]?.workoutExerciseId;

    if (workoutId && workoutExerciseId) {
      if (s.backendSetId) {
        updateSetMutation.mutate({
          set_id: s.backendSetId,
          data: {
            set_number: setIdx + 1,
            weight: Number(s.weight) || 0,
            reps: Number(s.reps) || 0,
            completed: nextDone,
          },
        });
      } else if (nextDone) {
        addSetMutation.mutate({
          workout_id: workoutId,
          exercise_id: workoutExerciseId,
          data: {
            set_number: setIdx + 1,
            weight: Number(s.weight) || 0,
            reps: Number(s.reps) || 0,
            rpe: 0,
            completed: true,
          },
        }, {
          onSuccess: (createdSet) => {
            const createdSetId = createdSet?.id || createdSet?.set?.id || createdSet?.workout_set?.id;
            if (!createdSetId) return;
            setLocalSets(prev => prev.map((ex, ei) => {
              if (ei !== exIdx) return ex;
              return {
                ...ex,
                sets: ex.sets.map((setEntry, si) => (
                  si === setIdx ? { ...setEntry, backendSetId: createdSetId } : setEntry
                )),
              };
            }));
          },
          onError: (error) => {
            const mapped = mapApiError(error);
            if (mapped.isNetwork || mapped.isTimeout || mapped.isServer) {
              queuePendingSet({
                workout_id: workoutId,
                exercise_id: workoutExerciseId,
                data: {
                  set_number: setIdx + 1,
                  weight: Number(s.weight) || 0,
                  reps: Number(s.reps) || 0,
                  rpe: 0,
                  completed: true,
                },
              });
            }
          },
        });
      }
    }

    if (nextDone) {
      setShowRest(true);
    }

    if (nextDone && !s.backendSetId) {
      storeAddSet(exIdx, { weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, set_number: setIdx + 1 });
    }

    setLocalSets(prev => prev.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      return { ...ex, sets: ex.sets.map((s2, si) => si === setIdx ? { ...s2, done: !s2.done } : s2) };
    }));
  }

  function addSet(exIdx) {
    setLocalSets(prev => prev.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      return { ...ex, sets: [...ex.sets, { weight: '', reps: '', done: false }] };
    }));
  }

  // Repeat last set — copy weight/reps from previous done set
  function repeatLastSet(exIdx) {
    setLocalSets(prev => prev.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      const doneSets = ex.sets.filter(s => s.done);
      const last = doneSets[doneSets.length - 1];
      if (!last) return { ...ex, sets: [...ex.sets, { weight: '', reps: '', done: false }] };
      return { ...ex, sets: [...ex.sets, { weight: last.weight, reps: last.reps, done: false }] };
    }));
  }

  function confirmDeleteSet(exIdx, setIdx) {
    const s = localSets[exIdx].sets[setIdx];
    if (s.backendSetId) {
      deleteSetMutation.mutate({ set_id: s.backendSetId });
    }
    setLocalSets(prev => prev.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      return { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) };
    }));
    setSetToDelete(null);
  }

  function deleteExercise(exIdx) {
    const ex = localSets[exIdx];
    if (ex.workoutExerciseId) {
      deleteExMutation.mutate({ exercise_id: ex.workoutExerciseId });
    }
    setLocalSets(prev => prev.filter((_, i) => i !== exIdx));
    setExIndex(i => Math.max(0, Math.min(i, localSets.length - 2)));
  }

  function handleAddExercise(ex) {
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newEntry = {
      ...ex,
      localId,
      note: '',
      rest_time: Number(ex.rest_time) || 60,
      workoutExerciseId: null,
      sets: [{ weight: '', reps: '', done: false }],
    };
    if (workoutId) {
      addExerciseMutation.mutate(
        { workout_id: workoutId, exercise_id: ex.id, notes: '' },
        {
          onSuccess: (data) => {
            const createdWorkoutExerciseId = data?.id || data?.workout_exercise?.id;
            if (!createdWorkoutExerciseId) return;
            setLocalSets(prev => prev.map((e) => e.localId === localId ? { ...e, workoutExerciseId: createdWorkoutExerciseId } : e));
          }
        }
      );
    }
    storeAddExercise(newEntry);
    setLocalSets(prev => [...prev, newEntry]);
    setExIndex(localSets.length);
    setShowAddExercise(false);
  }

  function updateNote(exIdx, value) {
    setLocalSets(prev => prev.map((ex, ei) => ei === exIdx ? { ...ex, note: value } : ex));
  }

  async function persistExerciseNotes(exercises) {
    const updates = exercises
      .filter((exercise) => exercise?.workoutExerciseId && typeof exercise.note === 'string')
      .map((exercise) => updateWorkoutExerciseMutation.mutateAsync({
        exercise_id: exercise.workoutExerciseId,
        data: {
          notes: exercise.note.trim(),
        },
      }));

    if (updates.length === 0) return true;

    try {
      await Promise.all(updates);
      return true;
    } catch {
      addToast('Some exercise remarks could not be saved yet.', 'error');
      return false;
    }
  }

  // Last done set for repeat button
  const lastDoneSet = currentEx?.sets.filter(s => s.done).slice(-1)[0];

  return (
    <div className="wk-session-root">
      <header className="wk-session-header">
        <div className="wk-session-meta">
          <span className="wk-eyebrow">Exercise {exIndex + 1}/{totalExercises}</span>
          <div className="wk-session-timer">
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#38671a' }}>timer</span>
            <span className="wk-session-timer-val">{timerDisplay}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="wk-discard-btn-sm"
            onClick={() => setShowCardio(true)}
            title="Log cardio"
            style={{ color: '#3bd3fd' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>directions_run</span>
          </button>
          <button
            className="wk-discard-btn-sm"
            onClick={() => setShowMeta(s => !s)}
            title="Edit workout details"
            style={{ color: showMeta ? '#38671a' : undefined }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_note</span>
          </button>
          <button className="wk-discard-btn-sm" onClick={() => setShowDiscard(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
          <button
            className="wk-finish-btn"
            onClick={async () => {
              await persistExerciseNotes(localSets);
              onFinish(localSets, elapsed, { name: sessionName, type: sessionType, notes: sessionNotes });
            }}
          >
            Finish
          </button>
        </div>
      </header>

      {/* Workout metadata edit panel */}
      {showMeta && (
        <div className="wk-meta-panel">
          <div className="wk-meta-field">
            <label className="wk-eyebrow">WORKOUT NAME</label>
            <input
              className="wk-meta-input"
              type="text"
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
              placeholder="e.g. Push Day"
            />
          </div>
          <div className="wk-meta-field">
            <label className="wk-eyebrow" style={{ display: 'block', marginBottom: 6 }}>TYPE</label>
            <div className="wk-cat-chips">
              {SESSION_TYPES.map(t => (
                <button
                  key={t}
                  className={`wk-cat-chip${sessionType === t ? ' wk-cat-chip--active' : ''}`}
                  onClick={() => setSessionType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="wk-meta-field">
            <label className="wk-eyebrow">SESSION NOTES</label>
            <textarea
              className="wk-notes-input"
              placeholder="Any notes for this session..."
              value={sessionNotes}
              onChange={e => setSessionNotes(e.target.value)}
              style={{ minHeight: 60 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="wk-discard-cancel" style={{ flex: 1 }} onClick={() => setShowMeta(false)}>Done</button>
          </div>
        </div>
      )}

      <div className="wk-session-scroll">
        {localSets.length === 0 ? (
          <div className="wk-empty-section" style={{ marginTop: 40 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#dad4c8' }}>fitness_center</span>
            <p className="wk-empty-text">No exercises yet. Add your first one!</p>
            <button className="wk-create-btn" style={{ marginTop: 16 }} onClick={() => setShowAddExercise(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              Add Exercise
            </button>
          </div>
        ) : (
          <>
            <section className="wk-session-hero">
              <div className="wk-session-hero-top">
                <div style={{ flex: 1 }}>
                  <h1 className="wk-session-ex-name">{currentEx?.name}</h1>
                  <span className="wk-session-muscle-tag">{currentEx?.muscle_group || currentEx?.primary_muscle || currentEx?.muscle}</span>
                  <span className="wk-session-rest-tag">{Math.max(0, Number(currentEx?.rest_time) || 0)}s rest</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div className="wk-spark-mini">
                    {[30, 50, 45, 70, 85].map((h, i) => (
                      <div key={i} className="wk-spark-mini-bar" style={{ height: `${h}%`, opacity: 0.2 + i * 0.18 }} />
                    ))}
                  </div>
                  <button
                    className="wk-discard-btn-sm"
                    onClick={() => deleteExercise(exIndex)}
                    title="Remove exercise"
                    style={{ color: '#b02500', opacity: 0.7 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                  </button>
                </div>
              </div>
            </section>

            <section className="wk-sets-section">
              <div className="wk-sets-header">
                <span>Set #</span>
                <span>Weight (kg)</span>
                <span>Reps</span>
                <span>Done</span>
                <span></span>
              </div>
              {currentEx?.sets.map((s, si) => (
                <div key={si} className={`wk-set-row${s.done ? ' wk-set-row--done' : si === currentEx.sets.findIndex(s2 => !s2.done) ? ' wk-set-row--active' : ' wk-set-row--future'}`}>
                  <span className="wk-set-num">{si + 1}</span>
                  <input
                    className="wk-set-input"
                    type="number"
                    inputMode="decimal"
                    placeholder="kg"
                    value={s.weight}
                    onChange={e => updateSet(exIndex, si, 'weight', e.target.value)}
                    disabled={s.done}
                  />
                  <input
                    className="wk-set-input"
                    type="number"
                    inputMode="numeric"
                    placeholder="reps"
                    value={s.reps}
                    onChange={e => updateSet(exIndex, si, 'reps', e.target.value)}
                    disabled={s.done}
                  />
                  <button
                    className={`wk-set-check${s.done ? ' wk-set-check--done' : ''}`}
                    onClick={() => toggleDone(exIndex, si)}
                  >
                    {s.done
                      ? <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 18, color: '#d6ffb7' }}>check</span>
                      : <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#767775' }}>radio_button_unchecked</span>
                    }
                  </button>
                  <button
                    className="wk-set-delete"
                    onClick={() => setSetToDelete({ exIdx: exIndex, setIdx: si })}
                    aria-label="Delete set"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                  </button>
                </div>
              ))}
              <div className="wk-set-actions">
                <button className="wk-add-set-btn" onClick={() => addSet(exIndex)}>+ Add Set</button>
                {lastDoneSet && (
                  <button className="wk-repeat-set-btn" onClick={() => repeatLastSet(exIndex)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>repeat</span>
                    Repeat Last
                  </button>
                )}
              </div>
            </section>

            <section className="wk-session-notes">
              <label className="wk-eyebrow" style={{ display: 'block', marginBottom: 8 }}>Remarks</label>
              <textarea
                className="wk-notes-input"
                placeholder="How did this feel?"
                value={currentEx?.note || ''}
                onChange={e => updateNote(exIndex, e.target.value)}
              />
            </section>

            <div className="wk-ex-nav">
              <button className="wk-ex-nav-btn" onClick={() => setExIndex(i => Math.max(0, i - 1))} disabled={exIndex === 0}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
                Previous
              </button>
              {exIndex < totalExercises - 1 ? (
                <button className="wk-ex-nav-btn wk-ex-nav-btn--next" onClick={() => setExIndex(i => i + 1)}>
                  Next
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                </button>
              ) : (
                <button
                  className="wk-finish-btn wk-ex-nav-btn--next"
                  onClick={async () => {
                    await persistExerciseNotes(localSets);
                    onFinish(localSets, elapsed, { name: sessionName, type: sessionType, notes: sessionNotes });
                  }}
                >
                  Finish
                  <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </button>
              )}
            </div>

            <div className="wk-ex-dots">
              {localSets.map((_, i) => (
                <button
                  key={i}
                  className={`wk-ex-dot${i === exIndex ? ' wk-ex-dot--active' : localSets[i].sets.every(s => s.done) ? ' wk-ex-dot--done' : ''}`}
                  onClick={() => setExIndex(i)}
                />
              ))}
            </div>
          </>
        )}

        <button className="wk-add-ex-floating" onClick={() => setShowAddExercise(true)}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Add Exercise
        </button>
      </div>

      {showRest && <RestTimer defaultSeconds={Math.max(15, Number(currentEx?.rest_time) || 60)} onSkip={() => setShowRest(false)} />}
      {showAddExercise && <ExerciseSearchModal onClose={() => setShowAddExercise(false)} onSelect={handleAddExercise} />}
      {showCardio && workoutId && <CardioBlock workoutId={workoutId} onClose={() => setShowCardio(false)} />}

      {/* Delete set confirmation */}
      {setToDelete && (
        <div className="wk-discard-overlay" onClick={e => e.target === e.currentTarget && setSetToDelete(null)}>
          <div className="wk-discard-modal">
            <div className="wk-discard-icon">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 28, color: '#b02500' }}>remove_circle</span>
            </div>
            <h3 className="wk-discard-title">Delete Set?</h3>
            <p className="wk-discard-body">Set {setToDelete.setIdx + 1} will be removed.</p>
            <div className="wk-discard-actions">
              <button className="wk-discard-cancel" onClick={() => setSetToDelete(null)}>Cancel</button>
              <button className="wk-discard-confirm" onClick={() => confirmDeleteSet(setToDelete.exIdx, setToDelete.setIdx)}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showDiscard && (
        <div className="wk-discard-overlay" onClick={e => e.target === e.currentTarget && setShowDiscard(false)}>
          <div className="wk-discard-modal">
            <div className="wk-discard-icon">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 28, color: '#b02500' }}>delete_forever</span>
            </div>
            <h3 className="wk-discard-title">Discard Session?</h3>
            <p className="wk-discard-body">All logged sets will be permanently lost.</p>
            <div className="wk-discard-actions">
              <button className="wk-discard-cancel" onClick={() => setShowDiscard(false)}>Keep Going</button>
              <button className="wk-discard-confirm" onClick={onDiscard}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete_forever</span>
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Workout Summary ───────────────────────────────────────────────────

function WorkoutSummary({ workoutId, sessionData, durationSeconds, programName, sessionMeta = {}, onSave, onDiscard }) {
  const [notes, setNotes] = useState(sessionMeta.notes || '');
  const [workoutName, setWorkoutName] = useState(sessionMeta.name || programName || 'Workout');
  const [workoutType, setWorkoutType] = useState(sessionMeta.type || 'Strength');
  const [saving, setSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const finishWorkoutMutation = useFinishWorkout();
  const addToast = uiStore(s => s.addToast);

  const totalSets = sessionData?.reduce((a, ex) => a + ex.sets.filter(s => s.done).length, 0) || 0;
  const totalExsDone = sessionData?.filter(ex => ex.sets.some(s => s.done)).length || 0;
  const totalVol = sessionData?.reduce((a, ex) =>
    a + ex.sets.filter(s => s.done && s.weight).reduce((b, s) => b + Number(s.weight) * Number(s.reps || 1), 0), 0
  ) || 0;

  function handleSave() {
    setSaving(true);
    if (workoutId) {
      finishWorkoutMutation.mutate(
        {
          workout_id: workoutId,
          data: {
            notes,
            name: workoutName,
            type: workoutType.toLowerCase(),
            duration: Math.max(0, Math.round(durationSeconds / 60)),
          },
        },
        {
          onSuccess: () => {
            setSaving(false);
            onSave();
          },
          onError: () => {
            setSaving(false);
            addToast('Workout save failed. Please try again.', 'error');
          },
        }
      );
    } else {
      setSaving(false);
      onSave();
    }
  }

  return (
    <div className="wk-summary-root">
      <div className="wk-summary-hero">
        <div className="wk-summary-check">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 40, color: '#38671a' }}>check_circle</span>
        </div>
        <h2 className="wk-summary-title">Great Session!</h2>
        {programName && (
          <div className="wk-summary-badge">{programName}</div>
        )}
      </div>

      {/* Workout name + type editing */}
      <div className="wk-meta-panel">
        <div className="wk-meta-field">
          <label className="wk-eyebrow">WORKOUT NAME</label>
          <input
            className="wk-meta-input"
            type="text"
            value={workoutName}
            onChange={e => setWorkoutName(e.target.value)}
            placeholder="e.g. Push Day"
          />
        </div>
        <div className="wk-meta-field">
          <label className="wk-eyebrow" style={{ display: 'block', marginBottom: 6 }}>TYPE</label>
          <div className="wk-cat-chips">
            {SESSION_TYPES.map(t => (
              <button
                key={t}
                className={`wk-cat-chip${workoutType === t ? ' wk-cat-chip--active' : ''}`}
                onClick={() => setWorkoutType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="wk-summary-bento">
        <div className="wk-summary-stat wk-summary-stat--full">
          <p className="wk-ex-stat-label">Total Volume</p>
          <p className="wk-summary-big">
            {totalVol.toLocaleString()}
            <span className="wk-summary-unit"> kg</span>
          </p>
        </div>
        <div className="wk-summary-stat">
          <p className="wk-ex-stat-label">Duration</p>
          <p className="wk-summary-med">{fmtSeconds(durationSeconds)}</p>
        </div>
        <div className="wk-summary-stat wk-summary-stat--green">
          <p className="wk-ex-stat-label" style={{ color: '#3d6c1f' }}>Exercises</p>
          <p className="wk-summary-med" style={{ color: '#214f01' }}>{totalExsDone}</p>
        </div>
        <div className="wk-summary-stat wk-summary-stat--full" style={{ background: '#e8e2d6' }}>
          <p className="wk-ex-stat-label">Sets Done</p>
          <p className="wk-summary-med">{totalSets} sets</p>
        </div>
      </div>

      {sessionData && (
        <div className="wk-summary-breakdown">
          <h4 className="wk-eyebrow" style={{ marginBottom: 12 }}>EXERCISES PERFORMED</h4>
          {sessionData.filter(ex => ex.sets.some(s => s.done)).map((ex, i) => {
            const done = ex.sets.filter(s => s.done);
            const peak = done.reduce((max, s) => Math.max(max, Number(s.weight) || 0), 0);
            return (
              <div key={i} className="wk-summary-ex-row">
                <div className="wk-summary-ex-info">
                  <p className="wk-summary-ex-name">{ex.name}</p>
                  <p className="wk-summary-ex-meta">{done.length} sets{peak > 0 ? ` · ${peak}kg peak` : ''}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="wk-notes">
        <label className="wk-eyebrow" style={{ display: 'block', marginBottom: 8 }}>SESSION NOTES</label>
        <textarea
          className="wk-notes-input"
          placeholder="How did you feel today?"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      <div className="wk-summary-actions">
        <button className="wk-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Workout'}
          {!saving && <span className="material-symbols-outlined">send</span>}
        </button>
        <button className="wk-discard-btn" onClick={() => setShowDiscardConfirm(true)}>Discard Session</button>
      </div>

      {showDiscardConfirm && (
        <div className="wk-discard-overlay" onClick={e => e.target === e.currentTarget && setShowDiscardConfirm(false)}>
          <div className="wk-discard-modal">
            <div className="wk-discard-icon">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 28, color: '#b02500' }}>delete_forever</span>
            </div>
            <h3 className="wk-discard-title">Discard Session?</h3>
            <p className="wk-discard-body">This workout will not be saved.</p>
            <div className="wk-discard-actions">
              <button className="wk-discard-cancel" onClick={() => setShowDiscardConfirm(false)}>Cancel</button>
              <button className="wk-discard-confirm" onClick={onDiscard}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete_forever</span>
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Workouts ─────────────────────────────────────────────────────

export default function Workouts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const onClose = () => navigate('/dashboard');
  const requestedTab = location.state?.tab;
  const routeTab = resolveWorkoutTabFromPath(location.pathname);
  const initialTab =
    routeTab === 'library'
    || routeTab === 'history'
    || routeTab === 'programs'
      ? routeTab
      : requestedTab === 'library'
      || requestedTab === 'history'
      || requestedTab === 'programs'
        ? requestedTab
        : 'programs';

  const [navVisible, setNavVisible] = useState(false);
  const [wkTab, setWkTab] = useState(initialTab);
  const [previewProgramAssignment, setPreviewProgramAssignment] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [activeWorkoutId, setActiveWorkoutId] = useState(null);
  const [activeInitialExercises, setActiveInitialExercises] = useState([]);
  const [activeProgramName, setActiveProgramName] = useState('');
  const [activeProgramAssignmentId, setActiveProgramAssignmentId] = useState(null);
  const [activeProgramSessionId, setActiveProgramSessionId] = useState(null);
  const [startingSessionId, setStartingSessionId] = useState(null);
  const [updatingAssignmentId, setUpdatingAssignmentId] = useState(null);
  const [programProgress, setProgramProgress] = useState(() => readProgramProgress());
  const [sessionData, setSessionData] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [sessionPhase, setSessionPhase] = useState('browse'); // 'browse' | 'active' | 'summary'
  const currentUserId = authStore((state) => state.user?.id);

  const createWorkoutMutation = useCreateWorkout();
  const createTemplateMutation = useCreateTemplate();
  const applyTemplateMutation = useApplyTemplate();
  const updateProgramAssignmentStatusMutation = useUpdateProgramAssignmentStatus();
  const applyProgramSessionMutation = useApplyProgramSession();
  const startWorkout = workoutStore(s => s.startWorkout);
  const endWorkout = workoutStore(s => s.endWorkout);
  const pendingSets = workoutStore(s => s.pendingSets);
  const removePendingSet = workoutStore(s => s.removePendingSet);
  const storeActiveWorkout = workoutStore(s => s.activeWorkout);
  const addToast = uiStore(s => s.addToast);
  const [isReplayingPendingSets, setIsReplayingPendingSets] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setNavVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (
      requestedTab !== 'library'
      && requestedTab !== 'history'
      && requestedTab !== 'programs'
    ) {
      return;
    }

    setPreviewProgramAssignment(null);
    setPreviewTemplate(null);
    setShowTemplateBuilder(false);
    setWkTab(requestedTab);
    const targetPath = WORKOUT_TAB_PATHS[requestedTab] || WORKOUT_TAB_PATHS.programs;
    if (location.pathname !== targetPath) {
      navigate(targetPath, { replace: true, state: null });
      return;
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate, requestedTab]);

  useEffect(() => {
    if (routeTab !== wkTab) {
      setPreviewProgramAssignment(null);
      setPreviewTemplate(null);
      setShowTemplateBuilder(false);
      setWkTab(routeTab);
    }
  }, [routeTab, wkTab]);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    if (!navigator.onLine || pendingSets.length === 0 || isReplayingPendingSets) return;

    let cancelled = false;

    async function replayPendingSets() {
      setIsReplayingPendingSets(true);
      let replayed = 0;
      while (!cancelled) {
        const queued = workoutStore.getState().pendingSets[0];
        if (!queued) break;
        try {
          await workoutsAPI.addSet(queued.workout_id, queued.exercise_id, queued.data);
          workoutStore.getState().removePendingSet(0);
          replayed += 1;
        } catch (error) {
          const mapped = mapApiError(error);
          // Conflict/validation means this queued item cannot be replayed; drop it and continue.
          if (mapped.status === 400 || mapped.status === 404 || mapped.status === 409) {
            workoutStore.getState().removePendingSet(0);
            continue;
          }
          break;
        }
      }
      if (!cancelled && replayed > 0) {
        addToast(`${replayed} queued set${replayed > 1 ? 's' : ''} synced.`, 'success');
      }
      if (!cancelled) {
        setIsReplayingPendingSets(false);
      }
    }

    replayPendingSets();

    return () => {
      cancelled = true;
    };
  }, [pendingSets, isReplayingPendingSets, addToast, removePendingSet]);

  // If store has active workout on mount, resume it
  useEffect(() => {
    if (storeActiveWorkout) {
      setActiveWorkoutId(storeActiveWorkout.id || null);
      setActiveInitialExercises(storeActiveWorkout.exercises || []);
      setActiveProgramName(storeActiveWorkout.name || '');
      setActiveProgramAssignmentId(storeActiveWorkout.programAssignmentId || null);
      setActiveProgramSessionId(storeActiveWorkout.programSessionId || null);
      setSessionPhase('active');
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleQuickStart(seedWorkout = null) {
    const workoutName = seedWorkout?.name || 'Workout';
    const initialExercises = seedWorkout?.exercises || [];

    // Create workout in backend
    let workoutId = null;
    try {
      const data = await createWorkoutMutation.mutateAsync({ name: workoutName });
      workoutId = data?.id || data?.workout?.id;
    } catch {
      // Offline — continue locally
    }

    startWorkout({ id: workoutId, name: workoutName, exercises: initialExercises });
    setActiveWorkoutId(workoutId);
    setActiveInitialExercises(initialExercises);
    setActiveProgramName(workoutName);
    setActiveProgramAssignmentId(null);
    setActiveProgramSessionId(null);
    setSessionPhase('active');
  }

  function markProgramSessionCompleted(assignmentId, sessionId) {
    if (!assignmentId || !sessionId) return;
    setProgramProgress((prev) => {
      const existing = getCompletedSessionIds(prev, assignmentId);
      if (existing.includes(sessionId)) return prev;
      const next = { ...prev, [assignmentId]: [...existing, sessionId] };
      writeProgramProgress(next);
      return next;
    });
  }

  function markAssignmentFullyCompletedLocally(assignment) {
    if (!assignment?.id) return;
    const sessionIds = flattenProgramSessions(assignment.program)
      .map((session) => session?.id)
      .filter(Boolean);
    setProgramProgress((prev) => {
      const unique = [...new Set(sessionIds)];
      const next = { ...prev, [assignment.id]: unique };
      writeProgramProgress(next);
      return next;
    });
  }

  async function handleTemplateCreate(form) {
    if (!currentUserId) {
      addToast('You need to be signed in to create a program.', 'error');
      return;
    }

    try {
      const created = await createTemplateMutation.mutateAsync(buildTemplatePayload(currentUserId, form));
      setShowTemplateBuilder(false);
      setPreviewTemplate(created);
      addToast('Your custom program is ready.', 'success');
    } catch {
      addToast('Could not save your program. Please try again.', 'error');
    }
  }

  async function handleTemplateStart(template) {
    if (!template?.id || !currentUserId) {
      addToast('This custom program is not available yet.', 'error');
      return;
    }
    if (applyTemplateMutation.isPending) {
      addToast('A custom program is already starting. Please wait.', 'info');
      return;
    }

    try {
      const workout = await applyTemplateMutation.mutateAsync({
        template_id: template.id,
        data: {
          user_id: currentUserId,
        },
      });
      const workoutId = workout?.id || workout?.workout?.id || null;
      const initialExercises = mapAppliedWorkoutToSessionExercises(workout);
      const workoutName = workout?.name || template?.name || 'Custom Program';

      startWorkout({
        id: workoutId,
        name: workoutName,
        exercises: initialExercises,
      });
      setActiveWorkoutId(workoutId);
      setActiveInitialExercises(initialExercises);
      setActiveProgramName(workoutName);
      setActiveProgramAssignmentId(null);
      setActiveProgramSessionId(null);
      setPreviewTemplate(null);
      setSessionPhase('active');
    } catch {
      addToast('Could not start this custom program. Please try again.', 'error');
    }
  }

  async function handleProgramSessionStart(assignment, session) {
    if (!assignment?.id || !session?.id) {
      addToast('This program session is not available yet.', 'error');
      return;
    }
    if (applyProgramSessionMutation.isPending || startingSessionId) {
      addToast('A session is already starting. Please wait.', 'info');
      return;
    }

    setStartingSessionId(session.id);
    try {
      const response = await applyProgramSessionMutation.mutateAsync({
        session_id: session.id,
        data: {},
      });

      const workout = response?.workout || response;
      const workoutId = workout?.id || null;
      const initialExercises = mapAppliedWorkoutToSessionExercises(workout);
      const workoutName = workout?.name || session?.template?.name || assignment?.program?.name || 'Program Workout';
      const programName = assignment?.program?.name || 'Program';

      startWorkout({
        id: workoutId,
        name: workoutName,
        exercises: initialExercises,
        programAssignmentId: assignment.id,
        programSessionId: session.id,
      });
      setActiveWorkoutId(workoutId);
      setActiveInitialExercises(initialExercises);
      setActiveProgramName(programName);
      setActiveProgramAssignmentId(assignment.id);
      setActiveProgramSessionId(session.id);
      setSessionPhase('active');

      if (assignment.status === 'assigned') {
        updateProgramAssignmentStatusMutation.mutate({
          assignment_id: assignment.id,
          status: 'in_progress',
        });
      }
    } catch {
      addToast('Could not start this program session. Please try again.', 'error');
    } finally {
      setStartingSessionId(null);
    }
  }

  function handleAssignedProgramStart(assignment, preferredSession = null) {
    const completedSessionIds = getCompletedSessionIds(programProgress, assignment?.id);
    const nextSession = preferredSession
      || getNextProgramSessionByProgress(assignment, completedSessionIds)
      || getNextProgramSession(assignment);
    if (!nextSession) {
      addToast('No upcoming sessions are available in this program.', 'info');
      return;
    }
    handleProgramSessionStart(assignment, nextSession);
  }

  async function handleProgramAssignmentStatusChange(assignment, status) {
    if (!assignment?.id || !status) return;
    if (updatingAssignmentId) return;
    setUpdatingAssignmentId(assignment.id);
    try {
      const updated = await updateProgramAssignmentStatusMutation.mutateAsync({
        assignment_id: assignment.id,
        status,
      });
      const nextAssignment = updated?.id ? updated : { ...assignment, status };
      setPreviewProgramAssignment((prev) => (prev?.id === assignment.id ? nextAssignment : prev));
      if (status === 'completed') {
        markAssignmentFullyCompletedLocally(assignment);
      }
      addToast(`Program marked as ${getStatusLabel(status, t).toLowerCase()}.`, 'success');
    } catch {
      addToast('Could not update program status. Please try again.', 'error');
    } finally {
      setUpdatingAssignmentId(null);
    }
  }

  const [sessionMeta, setSessionMeta] = useState({ name: '', type: '', notes: '' });

  function handleSessionFinish(data, durationSecs, meta = {}) {
    setSessionData(data);
    setSessionDuration(durationSecs);
    setSessionMeta(meta);
    setSessionPhase('summary');
  }

  function handleSessionDiscard() {
    endWorkout();
    setSessionPhase('browse');
    setActiveWorkoutId(null);
    setActiveInitialExercises([]);
    setActiveProgramAssignmentId(null);
    setActiveProgramSessionId(null);
    setSessionData(null);
  }

  function handleSummarySave() {
    if (activeProgramAssignmentId && activeProgramSessionId) {
      markProgramSessionCompleted(activeProgramAssignmentId, activeProgramSessionId);
    }
    endWorkout();
    setSessionPhase('browse');
    setActiveWorkoutId(null);
    setActiveInitialExercises([]);
    setActiveProgramAssignmentId(null);
    setActiveProgramSessionId(null);
    setSessionData(null);
    setWkTab('history');
    navigate('/workouts/history');
  }

  if (sessionPhase === 'active') {
    return (
      <ActiveSession
        workoutId={activeWorkoutId}
        initialExercises={activeInitialExercises}
        programName={activeProgramName}
        onFinish={handleSessionFinish}
        onDiscard={handleSessionDiscard}
      />
    );
  }

  if (sessionPhase === 'summary') {
    return (
      <WorkoutSummary
        workoutId={activeWorkoutId}
        sessionData={sessionData}
        durationSeconds={sessionDuration}
        programName={activeProgramName}
        sessionMeta={sessionMeta}
        onSave={handleSummarySave}
        onDiscard={handleSessionDiscard}
      />
    );
  }

  return (
    <div className="wk-root">
      <div className="wk-scroll-area">
        {previewTemplate ? (
          <TemplatePreview
            template={previewTemplate}
            onBack={() => setPreviewTemplate(null)}
            onStart={handleTemplateStart}
            isStarting={applyTemplateMutation.isPending}
          />
        ) : previewProgramAssignment ? (
          <ProgramPreview
            assignment={previewProgramAssignment}
            onBack={() => setPreviewProgramAssignment(null)}
            onStartSession={(session) => handleProgramSessionStart(previewProgramAssignment, session)}
            onStatusChange={(status) => handleProgramAssignmentStatusChange(previewProgramAssignment, status)}
            progressByAssignment={programProgress}
            isStartingProgram={applyProgramSessionMutation.isPending || !!startingSessionId}
            startingSessionId={startingSessionId}
            isStatusUpdating={updatingAssignmentId === previewProgramAssignment?.id}
          />
        ) : (
          <>
            {wkTab === 'programs' && (
              <ProgramsView
                onProgramPreview={setPreviewProgramAssignment}
                onProgramStart={handleAssignedProgramStart}
                onTemplatePreview={setPreviewTemplate}
                onTemplateCreate={() => setShowTemplateBuilder(true)}
                onQuickStart={() => handleQuickStart()}
                progressByAssignment={programProgress}
                isStartingTemplate={applyTemplateMutation.isPending}
                isStartingProgram={applyProgramSessionMutation.isPending || !!startingSessionId}
              />
            )}
            {wkTab === 'library' && (
              <LibraryView
                sessionActive={!!storeActiveWorkout}
                onAddToWorkout={async (ex) => {
                  // If session active, add exercise directly
                  if (storeActiveWorkout) {
                    setActiveInitialExercises(prev => [...prev, ex]);
                    setSessionPhase('active');
                  } else {
                    await handleQuickStart({ name: 'Workout', exercises: [ex] });
                  }
                }}
              />
            )}
            {wkTab === 'history' && (
              <HistoryView
                onStartWorkout={() => handleQuickStart(null)}
              />
            )}
          </>
        )}
      </div>

      <WorkoutContextNav
        active={wkTab}
        onChange={tab => {
          setPreviewProgramAssignment(null);
          setPreviewTemplate(null);
          setWkTab(tab);
          const targetPath = WORKOUT_TAB_PATHS[tab] || WORKOUT_TAB_PATHS.programs;
          navigate(targetPath, { replace: false });
        }}
        onClose={onClose}
        visible={navVisible}
      />

      {showTemplateBuilder && (
        <CustomProgramBuilderModal
          onClose={() => setShowTemplateBuilder(false)}
          onSave={handleTemplateCreate}
          isSaving={createTemplateMutation.isPending}
        />
      )}
    </div>
  );
}
