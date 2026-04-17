import { createPortal } from 'react-dom';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useCreateMeal,
  useDeleteMeal,
  useDeleteMealFood,
  useMeals,
  useUpdateMeal,
} from '../../../../hooks/queries/useNutrition';
import { weightAPI } from '../../../../api/weight';
import { authStore } from '../../../../stores/authStore';
import { useI18n } from '../../../../i18n/useI18n';
import './Nutrition.css';

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDateKey(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return trimmed;
}

function formatHeaderDate(dateKey, locale) {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return parsed.toLocaleDateString(locale, { month: 'long', day: 'numeric' });
}

function normalizeList(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
}

const MEAL_CONFIGS = [
  { type: 'breakfast' },
  { type: 'lunch' },
  { type: 'dinner' },
  { type: 'snack' },
];

function getMealTimestamp(meal) {
  const parsed = Date.parse(meal?.updated_at || meal?.created_at || '');
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildMealGroup(meals) {
  if (!meals.length) return null;

  const primaryMeal = [...meals].sort((a, b) => {
    const timeDiff = getMealTimestamp(b) - getMealTimestamp(a);
    if (timeDiff !== 0) return timeDiff;
    return String(b.id || '').localeCompare(String(a.id || ''));
  })[0] || meals[meals.length - 1];

  return {
    items: meals.flatMap((meal) => meal.items ?? []),
    mealCount: meals.length,
    primaryMeal,
    total_calories: meals.reduce((sum, meal) => sum + (meal.total_calories || 0), 0),
    total_carbs: meals.reduce((sum, meal) => sum + (meal.total_carbs || 0), 0),
    total_fat: meals.reduce((sum, meal) => sum + (meal.total_fat || 0), 0),
    total_protein: meals.reduce((sum, meal) => sum + (meal.total_protein || 0), 0),
  };
}

function getWeightDateLabel(value, locale) {
  const dateKey = getEntryDateKey(value);
  if (!dateKey) return 'N/A';

  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateKey;

  return parsed.toLocaleDateString(locale, { month: 'short', day: '2-digit' }).toUpperCase();
}

function getEntryDateKey(value) {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function ModalPortal({ children }) {
  if (typeof document === 'undefined') return children;
  return createPortal(children, document.body);
}

function MealEditorModal({
  meal,
  onClose,
  onSubmit,
  onDelete,
  onAddIngredient,
  onEditIngredient,
  onRemoveIngredient,
  isSaving,
  isDeleting,
  deletingIngredientId,
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    notes: meal?.notes || '',
  });

  return (
    <ModalPortal>
      <div className="nd-modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
        <div className="nd-modal">
          <button className="nd-modal-close" onClick={onClose} aria-label={t('nutritionDashboard.mealEditor.close')}>
            <span className="material-symbols-outlined">close</span>
          </button>

          <div className="nd-modal-copy">
            <p className="nd-modal-eyebrow">{t('nutritionDashboard.mealEditor.eyebrow')}</p>
            <h3 className="nd-modal-title">{t('nutritionDashboard.mealEditor.title')}</h3>
            <p className="nd-modal-desc">
              {t('nutritionDashboard.mealEditor.desc')}
            </p>
          </div>

          <label className="nd-modal-field">
            <span>{t('nutritionDashboard.mealEditor.notes')}</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              rows={3}
              placeholder={t('nutritionDashboard.mealEditor.notesPlaceholder')}
            />
          </label>

          <div className="nd-modal-meta-actions">
            <button
              className="nd-modal-primary"
              onClick={() => onSubmit(form)}
              disabled={isSaving}
            >
              <span className="material-symbols-outlined">{isSaving ? 'progress_activity' : 'check_circle'}</span>
              {isSaving ? t('nutritionDashboard.mealEditor.saving') : t('nutritionDashboard.mealEditor.saveNotes')}
            </button>
          </div>

          <div className="nd-modal-meal-items">
            <div className="nd-modal-items-head">
              <span>{t('nutritionDashboard.mealEditor.currentIngredients')}</span>
              <span>{t('nutritionDashboard.mealEditor.itemsCount', { count: meal?.items?.length || 0 })}</span>
            </div>

            {!meal?.items?.length ? (
              <p className="nd-modal-empty">{t('nutritionDashboard.mealEditor.noIngredients')}</p>
            ) : (
              <div className="nd-modal-item-list">
                {meal.items.map((item) => {
                  return (
                    <div key={item.id} className="nd-modal-item-row nd-modal-item-row--editable">
                      <div className="nd-modal-item-info">
                        <span className="nd-modal-item-name" title={item.food?.name || t('nutritionDashboard.mealEditor.ingredient')}>
                          {item.food?.name || t('nutritionDashboard.mealEditor.ingredient')}
                        </span>
                        <span className="nd-modal-item-meta">
                          {t('nutritionDashboard.mealEditor.quantityServing', { quantity: Number(item.quantity || 0).toFixed(2) })}
                        </span>
                      </div>

                      <div className="nd-modal-item-actions">
                        <button
                          className="nd-modal-mini"
                          onClick={() => onEditIngredient(item)}
                        >
                          {t('nutritionDashboard.mealEditor.edit')}
                        </button>
                        <button
                          className="nd-modal-mini nd-modal-mini--danger"
                          onClick={() => onRemoveIngredient(item)}
                          disabled={deletingIngredientId === item.id}
                        >
                          {deletingIngredientId === item.id ? t('nutritionDashboard.mealEditor.removing') : t('nutritionDashboard.mealEditor.remove')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          <button className="nd-modal-add-cta" onClick={onAddIngredient}>
            <span>{t('nutritionDashboard.mealEditor.addIngredient')}</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>

          <button className="nd-modal-danger" onClick={onDelete} disabled={isDeleting}>
            <span className="material-symbols-outlined">delete</span>
            {isDeleting ? t('nutritionDashboard.mealEditor.deletingMeal') : t('nutritionDashboard.mealEditor.deleteMeal')}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

export default function Nutrition() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const user = authStore((state) => state.user);
  const { t, locale } = useI18n();
  const today = getTodayDateKey();

  const requestedDate = normalizeDateKey(searchParams.get('date'));
  const isReadOnly = searchParams.get('readonly') === '1';
  const journalDate = isReadOnly && requestedDate ? requestedDate : today;
  const headerDate = formatHeaderDate(journalDate, locale);

  const [mealEditor, setMealEditor] = useState(null);
  const [creatingMealType, setCreatingMealType] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [weightFeedback, setWeightFeedback] = useState('');
  const [weightError, setWeightError] = useState('');

  const { data: mealsData, isLoading } = useMeals({ date: journalDate, limit: 50 });
  const { data: weightEntriesData = [] } = useQuery({
    queryKey: ['weightEntries', user?.id],
    queryFn: () => weightAPI.getEntries(),
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  });

  const createMeal = useCreateMeal();
  const updateMeal = useUpdateMeal(mealEditor?.meal?.id);
  const deleteMeal = useDeleteMeal(mealEditor?.meal?.id);
  const deleteMealFood = useDeleteMealFood();

  const meals = normalizeList(mealsData);
  const weightEntries = useMemo(
    () => (Array.isArray(weightEntriesData) ? weightEntriesData : []),
    [weightEntriesData],
  );

  const logWeight = useMutation({
    mutationFn: async (data) => {
      const existingResponse = await weightAPI.getEntriesPage({ date: data.date, limit: 1 });
      const existingEntry = Array.isArray(existingResponse?.data) ? existingResponse.data[0] : null;

      if (existingEntry?.id) {
        const entry = await weightAPI.updateEntry(existingEntry.id, {
          weight: data.weight,
          date: data.date,
          notes: existingEntry.notes || '',
        });
        return { entry, mode: 'updated' };
      }

      try {
        const entry = await weightAPI.addEntry(data);
        return { entry, mode: 'created' };
      } catch (error) {
        const fallbackResponse = await weightAPI.getEntriesPage({ date: data.date, limit: 1 });
        const fallbackEntry = Array.isArray(fallbackResponse?.data) ? fallbackResponse.data[0] : null;

        if (fallbackEntry?.id) {
          const entry = await weightAPI.updateEntry(fallbackEntry.id, {
            weight: data.weight,
            date: data.date,
            notes: fallbackEntry.notes || '',
          });
          return { entry, mode: 'updated' };
        }

        throw error;
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['weightEntries', user?.id] });
      setWeightInput('');
      setWeightError('');
      setWeightFeedback(result?.mode === 'updated' ? t('nutritionDashboard.weightUpdated') : t('nutritionDashboard.weightLogged'));
    },
    onError: () => {
      setWeightFeedback('');
      setWeightError(t('nutritionDashboard.weightFailed'));
    },
  });

  const mealsByType = meals.reduce((groupedMeals, meal) => {
    const key = meal.meal_type || 'meal';
    if (!groupedMeals[key]) groupedMeals[key] = [];
    groupedMeals[key].push(meal);
    return groupedMeals;
  }, {});

  const mealGroupsByType = Object.fromEntries(
    MEAL_CONFIGS.map(({ type }) => [type, buildMealGroup(mealsByType[type] ?? [])]),
  );
  const mealConfigs = MEAL_CONFIGS.map((config) => ({
    ...config,
    label: t(`nutrition.mealTypes.${config.type}`),
  }));

  const totalCalories = Math.round(meals.reduce((sum, meal) => sum + (meal.total_calories || 0), 0));
  const totalProtein = Math.round(meals.reduce((sum, meal) => sum + (meal.total_protein || 0), 0));
  const totalCarbs = Math.round(meals.reduce((sum, meal) => sum + (meal.total_carbs || 0), 0));
  const totalFat = Math.round(meals.reduce((sum, meal) => sum + (meal.total_fat || 0), 0));

  const tdee = user?.tdee || 2000;
  const goals = {
    calories: tdee,
    protein: Math.round((tdee * 0.3) / 4),
    carbs: Math.round((tdee * 0.45) / 4),
    fat: Math.round((tdee * 0.25) / 9),
  };

  const kcalLeft = Math.max(goals.calories - totalCalories, 0);
  const ringRadius = 88;
  const ringCirc = 2 * Math.PI * ringRadius;
  const progress = Math.min(totalCalories / goals.calories, 1);
  const offset = ringCirc * (1 - progress);

  const sortedWeightEntries = useMemo(
    () =>
      [...weightEntries]
        .map((entry) => ({ ...entry, dateKey: getEntryDateKey(entry.date) }))
        .filter((entry) => entry.dateKey)
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
    [weightEntries],
  );

  const monthlyWeightEntries = useMemo(() => {
    const monthAgo = new Date();
    monthAgo.setHours(0, 0, 0, 0);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoKey = getEntryDateKey(monthAgo);

    return sortedWeightEntries.filter((entry) => entry.dateKey >= monthAgoKey);
  }, [sortedWeightEntries]);

  const weightChartBars = useMemo(() => {
    if (monthlyWeightEntries.length === 0) return [];

    const values = monthlyWeightEntries.map((entry) => Number(entry.weight) || 0);
    const minWeight = Math.min(...values);
    const maxWeight = Math.max(...values);

    return values.map((value) => {
      if (minWeight === maxWeight) return 70;
      return 35 + (((value - minWeight) / (maxWeight - minWeight)) * 55);
    });
  }, [monthlyWeightEntries]);

  const monthlyDelta = useMemo(() => {
    if (monthlyWeightEntries.length < 2) return null;

    const firstWeight = Number(monthlyWeightEntries[0].weight) || 0;
    const latestWeight = Number(monthlyWeightEntries[monthlyWeightEntries.length - 1].weight) || 0;
    return latestWeight - firstWeight;
  }, [monthlyWeightEntries]);

  const handleOpenMealLogger = async (mealType) => {
    if (isReadOnly) return;

    const existingGroup = mealGroupsByType[mealType];
    if (existingGroup?.primaryMeal?.id) {
      navigate(`/nutrition/food-search?mealId=${existingGroup.primaryMeal.id}&mealType=${mealType}`);
      return;
    }

    setCreatingMealType(mealType);
    try {
      const meal = await createMeal.mutateAsync({
        user_id: user?.id,
        meal_type: mealType,
        date: today,
        notes: '',
      });
      navigate(`/nutrition/food-search?mealId=${meal.id}&mealType=${mealType}`);
    } catch (error) {
      console.error('Failed to create meal:', error);
    } finally {
      setCreatingMealType('');
    }
  };

  const openEditMeal = (mealType, meal) => {
    if (isReadOnly) return;
    setMealEditor({ mealType, meal });
  };

  const handleSaveMeal = async (form) => {
    try {
      await updateMeal.mutateAsync({
        notes: form.notes,
      });
      setMealEditor(null);
    } catch (error) {
      console.error('Failed to save meal:', error);
    }
  };

  const handleDeleteMeal = async () => {
    try {
      await deleteMeal.mutateAsync();
      setMealEditor(null);
    } catch (error) {
      console.error('Failed to delete meal:', error);
    }
  };

  const handleRemoveIngredient = async (item) => {
    if (!mealEditor?.meal?.id) return;

    try {
      await deleteMealFood.mutateAsync({
        meal_food_id: item.id,
        meal_id: mealEditor.meal.id,
      });

      setMealEditor((prev) => {
        if (!prev?.meal?.items) return prev;
        return {
          ...prev,
          meal: {
            ...prev.meal,
            items: prev.meal.items.filter((mealItem) => mealItem.id !== item.id),
          },
        };
      });
    } catch (error) {
      console.error('Failed to remove ingredient:', error);
    }
  };

  const handleEditIngredient = (item) => {
    if (!mealEditor?.meal?.id || !item?.food?.id) return;

    const params = new URLSearchParams({
      mealId: mealEditor.meal.id,
      mealType: mealEditor.meal.meal_type || 'meal',
      foodId: item.food.id,
      mealFoodId: item.id,
      quantity: String(item.quantity || ''),
    });

    navigate(`/nutrition/add-quantity?${params.toString()}`);
    setMealEditor(null);
  };

  const handleLogWeight = () => {
    if (isReadOnly) {
      setWeightFeedback('');
      setWeightError(t('nutritionDashboard.readOnlyError'));
      return;
    }

    const numericWeight = Number(weightInput);
    if (!user?.id) {
      setWeightFeedback('');
      setWeightError(t('nutritionDashboard.authError'));
      return;
    }
    if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
      setWeightFeedback('');
      setWeightError(t('nutritionDashboard.weightInputError'));
      return;
    }

    setWeightError('');
    setWeightFeedback('');
    logWeight.mutate({
      user_id: user.id,
      weight: Number(numericWeight.toFixed(2)),
      date: today,
    });
  };

  return (
    <div className="nd-root">
      <header className="nd-header">
        <div className="nd-header-left">
          <div className="nd-avatar">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 22, color: '#38671a' }}>
              person
            </span>
          </div>
          <h1 className="nd-title">{t('nutritionDashboard.title')}</h1>
        </div>
        <div className="nd-header-right">
          <div className="nd-date-pill">
            <span className="nd-date-text">
              {isReadOnly
                ? t('nutritionDashboard.historyDate', { date: headerDate })
                : t('nutritionDashboard.todayDate', { date: headerDate })}
            </span>
            <span className="material-symbols-outlined nd-date-icon">calendar_today</span>
          </div>
          <button
            id="nd-history-btn"
            className="nd-icon-btn"
            onClick={() => navigate('/nutrition/history')}
            aria-label={t('nutritionDashboard.viewHistory')}
          >
            <span className="material-symbols-outlined">history</span>
          </button>
        </div>
      </header>

      <main className="nd-main">
        {isReadOnly && (
          <section className="nd-readonly-banner">
            <p className="nd-readonly-copy">{t('nutritionDashboard.readonlyBanner', { date: headerDate })}</p>
            <button className="nd-readonly-btn" onClick={() => navigate('/nutrition')}>{t('nutritionDashboard.backToToday')}</button>
          </section>
        )}

        <section className="nd-macro-card">
          <div className="nd-macro-inner">
            <div className="nd-ring-wrap">
              <svg className="nd-ring-svg" viewBox="0 0 192 192">
                <circle cx="96" cy="96" r={ringRadius} fill="transparent" stroke="#dad4c8" strokeWidth="16" />
                <circle
                  cx="96"
                  cy="96"
                  r={ringRadius}
                  fill="transparent"
                  stroke="#38671a"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray={ringCirc}
                  strokeDashoffset={isLoading ? ringCirc : offset}
                  transform="rotate(-90 96 96)"
                  className="nd-ring-progress"
                />
              </svg>
              <div className="nd-ring-center">
                {isLoading ? (
                  <span className="nd-ring-goal" style={{ fontSize: 13 }}>{t('nutritionDashboard.loading')}</span>
                ) : (
                  <>
                    <span className="nd-ring-kcal">{totalCalories.toLocaleString(locale)}</span>
                    <span className="nd-ring-goal">/ {goals.calories.toLocaleString(locale)} {t('common.units.kcal').toUpperCase()}</span>
                  </>
                )}
              </div>
              {!isLoading && <div className="nd-ring-sticker">{t('nutritionDashboard.kcalLeft', { value: kcalLeft.toLocaleString(locale) })}</div>}
            </div>

            <div className="nd-bars">
              {[
                { label: t('nutritionDashboard.protein'), consumed: totalProtein, goal: goals.protein, color: '#38671a' },
                { label: t('nutritionDashboard.carbs'), consumed: totalCarbs, goal: goals.carbs, color: '#5d3fd3' },
                { label: t('nutritionDashboard.fats'), consumed: totalFat, goal: goals.fat, color: '#f95630' },
              ].map(({ label, consumed, goal, color }) => (
                <div key={label} className="nd-bar-row">
                  <div className="nd-bar-labels">
                    <span>{label}</span>
                    <span>{consumed}{t('common.units.grams')} / {goal}{t('common.units.grams')}</span>
                  </div>
                  <div className="nd-bar-track">
                    <div
                      className="nd-bar-fill"
                      style={{ width: `${Math.min((consumed / goal) * 100, 100)}%`, background: color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="nd-meals-grid">
          {mealConfigs.map((config, index) => {
            const mealGroup = mealGroupsByType[config.type];
            const items = mealGroup?.items ?? [];
            const isEmpty = !mealGroup || items.length === 0;
            const rotate = index % 2 === 0 ? 'nd-card--tilt-left' : 'nd-card--tilt-right';
            const mealKcal = Math.round(mealGroup?.total_calories || 0);
            const isCreating = creatingMealType === config.type && createMeal.isPending;

            if (isEmpty) {
              return (
                <div
                  key={config.type}
                  id={`nd-meal-${config.type}`}
                  className={`nd-card nd-card--empty${isReadOnly ? ' nd-card--disabled' : ''}`}
                  onClick={() => !isReadOnly && handleOpenMealLogger(config.type)}
                  role="button"
                  aria-label={t('nutritionDashboard.createMeal', { meal: config.label })}
                >
                  <h3 className="nd-card-title nd-card-title--faded">{config.label}</h3>
                  <span className="nd-card-empty-label">{isReadOnly ? t('nutritionDashboard.readOnly') : t('nutritionDashboard.noItemsLogged')}</span>
                  <button className="nd-card-add-circle" tabIndex={-1} disabled={isReadOnly || isCreating}>
                    <span className="material-symbols-outlined">{isCreating ? 'progress_activity' : 'add'}</span>
                  </button>
                </div>
              );
            }

            return (
              <div key={config.type} id={`nd-meal-${config.type}`} className={`nd-card ${rotate}`}>
                <div>
                  <div className="nd-card-header">
                    <div>
                      <h3 className="nd-card-title">{config.label}</h3>
                      {mealGroup.mealCount > 1 && (
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#888' }}>
                          {t('nutritionDashboard.mealsMerged', { count: mealGroup.mealCount })}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {!isReadOnly && (
                        <button
                          className="nd-icon-btn nd-card-icon"
                          title={t('nutritionDashboard.editMeal')}
                          onClick={() => openEditMeal(config.type, mealGroup.primaryMeal)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                        </button>
                      )}
                      <span className="nd-card-kcal-pill">{mealKcal} KCAL</span>
                    </div>
                  </div>

                  <ul className="nd-card-items">
                    {items.slice(0, 4).map((item) => (
                      <li key={item.id} className="nd-card-item">
                        <div className="nd-item-thumb">🍽️</div>
                        <span className="nd-item-name">{item.food?.name ?? t('nutritionDashboard.food')}</span>
                      </li>
                    ))}
                    {items.length > 4 && (
                      <li className="nd-card-item" style={{ opacity: 0.6, fontSize: 11 }}>
                        {t('nutritionDashboard.moreItems', { count: items.length - 4 })}
                      </li>
                    )}
                  </ul>
                </div>

                <button
                  id={`nd-add-food-${config.type}`}
                  className="nd-add-food-btn"
                  onClick={() => handleOpenMealLogger(config.type)}
                  disabled={isReadOnly || isCreating}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    {isCreating ? 'progress_activity' : 'add'}
                  </span>
                  {isReadOnly ? t('nutritionDashboard.readOnly') : t('nutritionDashboard.addIngredient')}
                </button>
              </div>
            );
          })}
        </div>

        <section className="nd-weight-card">
          <div className="nd-weight-top">
            <div>
              <h3 className="nd-weight-title">{t('nutritionDashboard.weightTitle')}</h3>
              <p className="nd-weight-desc">{t('nutritionDashboard.weightDesc')}</p>
            </div>
            <div className="nd-weight-input-row">
              <div className="nd-weight-input-wrap">
                <input
                  id="nd-weight-input"
                  type="number"
                  step="0.1"
                  min="0"
                  className="nd-weight-input"
                  placeholder="00.0"
                  aria-label={t('nutritionDashboard.enterWeightKg')}
                  value={weightInput}
                  onChange={(event) => setWeightInput(event.target.value)}
                  disabled={isReadOnly}
                />
                <span className="nd-weight-unit">{t('common.units.kg').toUpperCase()}</span>
              </div>
              <button
                id="nd-log-weight-btn"
                className="nd-log-btn"
                onClick={handleLogWeight}
                disabled={logWeight.isPending || isReadOnly}
              >
                {logWeight.isPending ? t('nutritionDashboard.loggingWeight') : t('nutritionDashboard.logWeight')}
              </button>
            </div>
          </div>
          {weightError && <p className="nd-weight-feedback nd-weight-feedback--error">{weightError}</p>}
          {weightFeedback && <p className="nd-weight-feedback">{weightFeedback}</p>}

          <div className="nd-chart-section">
            <div className="nd-chart-labels">
              <span className="nd-chart-period">{t('nutritionDashboard.trendLabel')}</span>
              <span className="nd-chart-delta">
                {monthlyDelta === null
                  ? t('nutritionDashboard.needTwoEntries')
                  : t('nutritionDashboard.thisMonthDelta', { delta: `${monthlyDelta > 0 ? '+' : ''}${monthlyDelta.toFixed(1)}` })}
              </span>
            </div>
            {weightChartBars.length === 0 ? (
              <p className="nd-weight-empty">{t('nutritionDashboard.noWeightEntries')}</p>
            ) : (
              <>
                <div className="nd-chart-bars">
                  {weightChartBars.map((height, index) => (
                    <div
                      key={index}
                      className={`nd-chart-bar${index === weightChartBars.length - 1 ? ' nd-chart-bar--active' : ''}`}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
                <div className="nd-chart-x-labels">
                  {monthlyWeightEntries.map((entry) => <span key={entry.id}>{getWeightDateLabel(entry.dateKey, locale)}</span>)}
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      {mealEditor && !isReadOnly ? (
        <MealEditorModal
          key={mealEditor.meal?.id}
          meal={mealEditor.meal}
          onClose={() => setMealEditor(null)}
          onSubmit={handleSaveMeal}
          onDelete={handleDeleteMeal}
          onAddIngredient={() => {
            navigate(`/nutrition/food-search?mealId=${mealEditor.meal.id}&mealType=${mealEditor.meal.meal_type}`);
            setMealEditor(null);
          }}
          onEditIngredient={handleEditIngredient}
          onRemoveIngredient={handleRemoveIngredient}
          isSaving={updateMeal.isPending}
          isDeleting={deleteMeal.isPending}
          deletingIngredientId={deleteMealFood.variables?.meal_food_id || ''}
        />
      ) : null}
    </div>
  );
}
