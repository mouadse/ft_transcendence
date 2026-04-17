import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAddFoodToMeal, useFood, useUpdateMealFood } from '../../../../hooks/queries/useNutrition';
import {
  formatMeasureValue,
  formatMeasurement,
  getFoodMeasurementMeta,
  getQuickMeasurePresets,
} from '../foodMeasurement';
import { useI18n } from '../../../../i18n/useI18n';
import './AddQuantity.css';

const RECIPE_INGREDIENT_PRESETS = [
  { keywords: ['egg'], icon: 'egg', iconColor: '#b02500', iconBg: 'rgba(249,86,48,0.1)' },
  { keywords: ['oat', 'grain', 'bread', 'cereal', 'flour'], icon: 'nutrition', iconColor: '#5d3fd3', iconBg: '#b4a5ff' },
  { keywords: ['milk', 'dairy', 'protein', 'poultry', 'beef', 'fish', 'seafood', 'meat'], icon: 'grain', iconColor: '#38671a', iconBg: '#c3fb9c' },
];

function getIngredientPresentation(food) {
  const haystack = `${food?.name || ''} ${food?.category || ''}`.toLowerCase();
  const match = RECIPE_INGREDIENT_PRESETS.find(({ keywords }) => keywords.some(keyword => haystack.includes(keyword)));

  return match || {
    icon: 'restaurant',
    iconColor: '#8a5a00',
    iconBg: '#f7d28a',
  };
}

function StickyCTA({ children }) {
  if (typeof document === 'undefined') return children;
  return createPortal(children, document.body);
}

export default function AddQuantity() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const foodId = searchParams.get('foodId') || '';
  const legacyMeal = searchParams.get('meal') || '';
  const mealId = searchParams.get('mealId') || '';
  const mealFoodId = searchParams.get('mealFoodId') || '';
  const ingredientKey = searchParams.get('ingredientKey') || '';
  const initialQuantityMultiplier = Number(searchParams.get('quantity'));
  const mealType = searchParams.get('mealType') || legacyMeal || 'meal';
  const isRecipeFlow = mealType === 'recipe';
  const isEditIngredientFlow = Boolean(mealFoodId && mealId);
  const isRecipeIngredientEditFlow = Boolean(isRecipeFlow && ingredientKey);
  const mealLabel = mealType === 'snack'
    ? t('nutrition.mealTypes.snack')
    : t(`nutrition.mealTypes.${mealType}`);

  const { data: food, isLoading, isError } = useFood(foodId);
  const addFoodToMeal = useAddFoodToMeal();
  const updateMealFood = useUpdateMealFood();

  const [qty, setQty] = useState(100);

  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const {
    referenceLabel,
    referenceQuantity,
    servingSize,
    servingUnit,
  } = getFoodMeasurementMeta(food);

  useEffect(() => {
    if (!food?.id) {
      return;
    }

    if (isEditIngredientFlow && Number.isFinite(initialQuantityMultiplier) && initialQuantityMultiplier > 0) {
      setQty(initialQuantityMultiplier * servingSize);
      return;
    }

    setQty(referenceQuantity);
  }, [food?.id, referenceQuantity, initialQuantityMultiplier, isEditIngredientFlow, servingSize]);

  const perReference = (key) => (
    ((food?.[key] || 0) / servingSize) * referenceQuantity
  );
  const calc = (key) => Math.round((perReference(key) * qty) / referenceQuantity);
  const apiMultiplier = servingSize > 0 ? qty / servingSize : 0;
  const quickAmounts = getQuickMeasurePresets(food);

  const handleQuick = (g) => setQty(g);
  const handleInput = (e) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v >= 0) setQty(v);
    else if (e.target.value === '') setQty(0);
  };

  const handleAddFood = async () => {
    if (!food) return;
    setAdding(true);
    setAddError('');
    try {
      if (isRecipeFlow) {
        const ingredients = Array.isArray(location.state?.ingredients) ? location.state.ingredients : [];
        const recipeName = typeof location.state?.recipeName === 'string' ? location.state.recipeName : '';
        const servings = typeof location.state?.servings === 'number' && location.state.servings > 0
          ? location.state.servings
          : 1;
        const presentation = getIngredientPresentation(food);

        navigate('/nutrition/recipe', {
          state: {
            mode: 'builder',
            recipeName,
            servings,
            recipeId: location.state?.recipeId || '',
            notes: typeof location.state?.notes === 'string' ? location.state.notes : '',
            originalItemsSignature: Array.isArray(location.state?.originalItemsSignature) ? location.state.originalItemsSignature : [],
            ingredients: isRecipeIngredientEditFlow
              ? ingredients.map((ingredient) => (
                ingredient.id === ingredientKey
                  ? {
                    ...ingredient,
                    foodId: food.id,
                    quantity: apiMultiplier,
                    name: food.name,
                    desc: [food.brand, food.category].filter(Boolean).join(' / ') || t('addQuantityPage.labels.customIngredient'),
                    qty: formatMeasurement(qty, servingUnit),
                    icon: presentation.icon,
                    iconColor: presentation.iconColor,
                    iconBg: presentation.iconBg,
                    macros: {
                      kcal: calc('calories'),
                      p: calc('protein'),
                      c: calc('carbohydrates'),
                      f: calc('fat'),
                    },
                  }
                  : ingredient
              ))
              : [
                ...ingredients,
                {
                  id: `${food.id}-${Date.now()}`,
                  foodId: food.id,
                    quantity: apiMultiplier,
                    name: food.name,
                    desc: [food.brand, food.category].filter(Boolean).join(' / ') || t('addQuantityPage.labels.customIngredient'),
                  qty: formatMeasurement(qty, servingUnit),
                  icon: presentation.icon,
                  iconColor: presentation.iconColor,
                  iconBg: presentation.iconBg,
                  macros: {
                    kcal: calc('calories'),
                    p: calc('protein'),
                    c: calc('carbohydrates'),
                    f: calc('fat'),
                  },
                },
              ],
          },
        });
        return;
      }

      if (!mealId) return;

      if (isEditIngredientFlow) {
        await updateMealFood.mutateAsync({
          meal_food_id: mealFoodId,
          data: { quantity: apiMultiplier },
        });
      } else {
        await addFoodToMeal.mutateAsync({
          meal_id: mealId,
          food_id: food.id,
          quantity: apiMultiplier,
        });
      }
      navigate('/nutrition');
    } catch (err) {
      console.error('Error logging food:', err);
      setAddError(isEditIngredientFlow ? t('addQuantityPage.errors.updateIngredient') : t('addQuantityPage.errors.addFood'));
    } finally {
      setAdding(false);
    }
  };

  /* ── Loading / Error states ─────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="aq-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#888' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>progress_activity</span>
          <p style={{ margin: 0, fontSize: 14 }}>{t('addQuantityPage.loadingFoodDetails')}</p>
        </div>
      </div>
    );
  }

  if (isError || !food) {
    return (
      <div className="aq-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#888' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>error</span>
          <p style={{ margin: 0, fontSize: 14 }}>{t('addQuantityPage.foodNotFound')}</p>
          <button onClick={() => navigate(-1)} style={{ marginTop: 16, padding: '8px 16px', borderRadius: 8, border: '1px solid #ccc', background: 'transparent', cursor: 'pointer' }}>
            {t('common.actions.goBack')}
          </button>
        </div>
      </div>
    );
  }

  const displayDesc = [food.brand, food.category].filter(Boolean).join(' · ') || t('addQuantityPage.labels.wholeFood');

  return (
    <div className="aq-root">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="aq-header">
        <div className="aq-header-left">
          <button
            id="aq-back-btn"
            className="aq-back-btn"
            onClick={() => navigate(-1)}
            aria-label={t('common.actions.goBack')}
          >
            <span className="material-symbols-outlined" style={{ color: '#38671a' }}>arrow_back</span>
          </button>
          <h1 className="aq-header-title">{t('addQuantityPage.header.title')}</h1>
        </div>
        <div className="aq-header-right">
          <span className="material-symbols-outlined" style={{ opacity: 0.5 }}>calendar_today</span>
          <div className="aq-avatar">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 20, color: '#38671a' }}>person</span>
          </div>
        </div>
      </header>

      <main className="aq-main">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="aq-hero">
          <div className="aq-hero-top">
            <h2 className="aq-food-name">🍽️ {food.name}</h2>
            <div className="aq-ref-chip">{t('addQuantityPage.labels.reference', { value: referenceLabel })}</div>
          </div>
          <p className="aq-food-desc">{displayDesc}</p>

          <div className="aq-ref-card">
            <div>
              <span className="aq-ref-label">Per {referenceLabel}</span>
              <span className="aq-ref-kcal">{Math.round(perReference('calories'))} {t('common.units.kcal')}</span>
            </div>
            <div className="aq-ref-macros">
              {[
                { k: 'P', v: Math.round(perReference('protein')) },
                { k: 'C', v: Math.round(perReference('carbohydrates')) },
                { k: 'F', v: Math.round(perReference('fat')) },
              ].map(m => (
                <div key={m.k} className="aq-ref-macro">
                  <span className="aq-ref-macro-key">{m.k}</span>
                  <span className="aq-ref-macro-val">{m.v}g</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Quantity Input Canvas ─────────────────────────────────── */}
        <section className="aq-input-canvas">
          <div className="aq-sticker-badge">{t('addQuantityPage.labels.freshBatch')}</div>
          <label className="aq-qty-label">{t('addQuantityPage.labels.selectQuantity')}</label>
          <div className="aq-qty-row">
            <input
              id="aq-qty-input"
              type="number"
              className="aq-qty-input"
              value={qty}
              onChange={handleInput}
              min={0}
              step={1}
              aria-label={t('addQuantityPage.aria.quantityInput')}
            />
            <span className="aq-qty-unit">{servingUnit}</span>
          </div>
          <div className="aq-qty-underline" />

          <div className="aq-quick-amounts">
            {quickAmounts.map(amount => (
              <button
                key={amount}
                id={`aq-quick-${formatMeasureValue(amount).replace('.', '-')}`}
                className={`aq-quick-btn${qty === amount ? ' aq-quick-btn--active' : ''}`}
                onClick={() => handleQuick(amount)}
              >
                {formatMeasurement(amount, servingUnit)}
              </button>
            ))}
          </div>
        </section>

        {/* ── Live Macros Grid ─────────────────────────────────────── */}
        <section className="aq-macros-grid">
          <div className="aq-macro-chip aq-macro-chip--kcal">
            <span className="aq-macro-chip-label">{t('addQuantityPage.macros.calories')}</span>
            <span className="aq-macro-chip-val">{calc('calories')} <span className="aq-macro-chip-unit">{t('common.units.kcal')}</span></span>
          </div>
          {[
            { key: 'protein', label: t('addQuantityPage.macros.protein') },
            { key: 'carbohydrates', label: t('addQuantityPage.macros.carbs') },
            { key: 'fat', label: t('addQuantityPage.macros.fats') },
          ].map(m => (
            <div key={m.key} className="aq-macro-chip">
              <span className="aq-macro-chip-label">{m.label}</span>
              <span className="aq-macro-chip-val">{calc(m.key)} <span className="aq-macro-chip-unit">g</span></span>
            </div>
          ))}
        </section>

        {food.fiber > 0 && (
          <p style={{ textAlign: 'center', fontSize: 12, color: '#888', margin: '0 16px' }}>
            {t('addQuantityPage.labels.fiberSodium', { fiber: calc('fiber'), sodium: calc('sodium') })}
          </p>
        )}

        {/* ── Food Image Card ──────────────────────────────────────── */}
        <div className="aq-image-card">
          <div className="aq-image-placeholder">
            <span className="aq-image-emoji">🍽️</span>
          </div>
          <div className="aq-image-overlay">
            <p className="aq-image-title">{food.name}</p>
            <p className="aq-image-subtitle">
              {(food.category || t('addQuantityPage.labels.wholeFood'))}
              {' · '}
              {food.source === 'usda' ? t('addQuantityPage.labels.usdaDatabase') : t('addQuantityPage.labels.customFood')}
            </p>
          </div>
        </div>

        {addError && (
          <p style={{ color: '#e53e3e', textAlign: 'center', fontSize: 13, margin: '8px 16px' }}>{addError}</p>
        )}
      </main>

      {/* ── Sticky CTA ───────────────────────────────────────────── */}
      <StickyCTA>
        <div className="aq-sticky-cta">
          <div className="aq-cta-inner">
            <button
              id="aq-add-btn"
              className="aq-add-btn"
              onClick={handleAddFood}
              disabled={adding || qty <= 0 || (!mealId && !isRecipeFlow)}
            >
              <span className="material-symbols-outlined">{adding ? 'progress_activity' : 'add_circle'}</span>
              {adding
                ? (isEditIngredientFlow ? t('addQuantityPage.actions.updating') : t('addQuantityPage.actions.adding'))
                : isRecipeFlow
                  ? t('addQuantityPage.actions.addIngredient')
                  : isEditIngredientFlow
                    ? t('addQuantityPage.actions.updateIngredient')
                    : isRecipeIngredientEditFlow
                      ? t('addQuantityPage.actions.updateIngredient')
                      : t('addQuantityPage.actions.addIngredientToMeal', { meal: mealLabel })}
            </button>
          </div>
        </div>
      </StickyCTA>
    </div>
  );
}
