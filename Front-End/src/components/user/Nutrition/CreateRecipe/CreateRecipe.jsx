import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  useCreateRecipe,
  useDeleteRecipe,
  useLogRecipeToMeal,
  useMeals,
  useRecipes,
  useUpdateRecipe,
} from '../../../../hooks/queries/useNutrition';
import { formatMeasurement, getFoodMeasurementMeta } from '../foodMeasurement';
import { useI18n } from '../../../../i18n/useI18n';
import './CreateRecipe.css';

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateKey(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return getLocalDateKey(parsed);
}

function getDraftFromState(state) {
  return {
    mode: state?.mode === 'builder' ? 'builder' : 'list',
    recipeId: typeof state?.recipeId === 'string' ? state.recipeId : '',
    recipeName: typeof state?.recipeName === 'string' ? state.recipeName : '',
    servings: typeof state?.servings === 'number' && state.servings > 0 ? state.servings : 1,
    notes: typeof state?.notes === 'string' ? state.notes : '',
    ingredients: Array.isArray(state?.ingredients) ? state.ingredients : [],
    originalItemsSignature: Array.isArray(state?.originalItemsSignature) ? state.originalItemsSignature : [],
  };
}

function getTotalsFromIngredients(ingredients) {
  return ingredients.reduce(
    (acc, ingredient) => ({
      kcal: acc.kcal + (ingredient.macros?.kcal || 0),
      p: acc.p + (ingredient.macros?.p || 0),
      c: acc.c + (ingredient.macros?.c || 0),
      f: acc.f + (ingredient.macros?.f || 0),
    }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  );
}

function getTotalsFromRecipe(recipe) {
  return (recipe.items || []).reduce(
    (acc, item) => ({
      kcal: acc.kcal + ((item.food?.calories || 0) * (item.quantity || 0)),
      p: acc.p + ((item.food?.protein || 0) * (item.quantity || 0)),
      c: acc.c + ((item.food?.carbohydrates || 0) * (item.quantity || 0)),
      f: acc.f + ((item.food?.fat || 0) * (item.quantity || 0)),
    }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  );
}

function roundTotals(totals) {
  return {
    kcal: Math.round(totals.kcal || 0),
    p: Math.round(totals.p || 0),
    c: Math.round(totals.c || 0),
    f: Math.round(totals.f || 0),
  };
}

function getIngredientPresentation(food) {
  const haystack = `${food?.name || ''} ${food?.category || ''}`.toLowerCase();

  if (haystack.includes('egg')) {
    return { icon: 'egg', iconColor: '#b02500', iconBg: 'rgba(249, 86, 48, 0.12)' };
  }

  if (haystack.includes('oat') || haystack.includes('grain') || haystack.includes('bread') || haystack.includes('flour')) {
    return { icon: 'nutrition', iconColor: '#5d3fd3', iconBg: '#e7e0ff' };
  }

  if (haystack.includes('milk') || haystack.includes('dairy') || haystack.includes('protein') || haystack.includes('meat') || haystack.includes('fish')) {
    return { icon: 'grain', iconColor: '#38671a', iconBg: '#dff4cf' };
  }

  return { icon: 'restaurant', iconColor: '#8a5a00', iconBg: '#f7ecd8' };
}

function buildRecipeIngredient(item, t) {
  const food = item?.food || {};
  const { servingSize, servingUnit } = getFoodMeasurementMeta(food);
  const quantity = Number(item?.quantity || 0);
  const presentation = getIngredientPresentation(food);
  const totalQuantity = quantity * servingSize;

  return {
    id: item?.id || `${food.id}-${Date.now()}`,
    foodId: food.id,
    quantity,
    name: food.name || t('createRecipePage.labels.ingredient'),
    desc: [food.brand, food.category].filter(Boolean).join(' / ') || t('createRecipePage.labels.savedIngredient'),
    qty: formatMeasurement(totalQuantity, servingUnit),
    icon: presentation.icon,
    iconColor: presentation.iconColor,
    iconBg: presentation.iconBg,
    macros: {
      kcal: Math.round((Number(food.calories) || 0) * quantity),
      p: Math.round((Number(food.protein) || 0) * quantity),
      c: Math.round((Number(food.carbohydrates) || 0) * quantity),
      f: Math.round((Number(food.fat) || 0) * quantity),
    },
  };
}

function getItemsSignature(items) {
  return items
    .map((item) => ({
      foodId: item.foodId,
      quantity: Number(Number(item.quantity || 0).toFixed(4)),
    }))
    .filter((item) => item.foodId && item.quantity > 0)
    .sort((a, b) => {
      const idCompare = String(a.foodId).localeCompare(String(b.foodId));
      if (idCompare !== 0) return idCompare;
      return a.quantity - b.quantity;
    });
}

function RecipesListView() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data: recipesData, isLoading, isError } = useRecipes({ limit: 50 });
  const deleteRecipe = useDeleteRecipe();
  const logRecipe = useLogRecipeToMeal();
  
  const [loggingRecipeId, setLoggingRecipeId] = useState(null);
  const [logMealType, setLogMealType] = useState('snack');
  
  const todayKey = getLocalDateKey();
  const { data: mealsData } = useMeals({ date: todayKey });
  const todayMeals = Array.isArray(mealsData?.data) ? mealsData.data : Array.isArray(mealsData) ? mealsData : [];

  const recipes = Array.isArray(recipesData?.data)
    ? recipesData.data
    : Array.isArray(recipesData)
      ? recipesData
      : [];

  const handleDelete = (e, recipeId) => {
    e.stopPropagation();
    if (window.confirm(t('createRecipePage.confirm.deleteRecipe'))) {
      deleteRecipe.mutate(recipeId);
    }
  };

  return (
    <div className="cr-root">
      <header className="cr-header">
        <div className="cr-header-left">
          <div className="cr-avatar">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 20, color: '#38671a' }}>person</span>
          </div>
          <h1 className="cr-header-brand">{t('createRecipePage.brand')}</h1>
        </div>
        <div className="cr-header-right">
          <button
            className="cr-cal-btn"
            aria-label={t('createRecipePage.actions.createRecipe')}
            onClick={() => navigate('/nutrition/recipe', {
              state: { mode: 'builder', recipeId: '', recipeName: '', servings: 1, notes: '', ingredients: [], originalItemsSignature: [] },
            })}
          >
            <span className="material-symbols-outlined" style={{ color: '#38671a' }}>add_circle</span>
          </button>
          <div className="cr-tag-badge">{t('createRecipePage.badges.myRecipes')}</div>
        </div>
      </header>

      <main className="cr-main">
        <section className="cr-total-card">
          <span className="cr-step-label">{t('createRecipePage.library.stepLabel')}</span>
          <h2 className="cr-recipe-name">{t('createRecipePage.library.title')}</h2>
          <p className="cr-library-copy">{t('createRecipePage.library.description')}</p>
          <button
            id="cr-create-recipe-btn"
            className="cr-save-btn"
            onClick={() => navigate('/nutrition/recipe', {
              state: { mode: 'builder', recipeId: '', recipeName: '', servings: 1, notes: '', ingredients: [], originalItemsSignature: [] },
            })}
          >
            <span className="material-symbols-outlined">add_circle</span>
            {t('createRecipePage.actions.createRecipe')}
          </button>
        </section>

        <section className="cr-ingredients">
          <div className="cr-list-header-row">
            <h3 className="cr-section-title">{t('createRecipePage.library.savedRecipes')}</h3>
            {!isLoading && !isError && <span className="cr-list-count">{t('createRecipePage.library.totalCount', { count: recipes.length })}</span>}
          </div>

          {isLoading && <p className="cr-empty-state">{t('createRecipePage.states.loadingRecipes')}</p>}
          {isError && <p className="cr-empty-state">{t('createRecipePage.states.loadRecipesFailed')}</p>}
          {!isLoading && !isError && recipes.length === 0 && (
            <p className="cr-empty-state">{t('createRecipePage.states.noSavedRecipes')}</p>
          )}

          <div className="cr-recipe-library">
            {recipes.map((recipe, index) => {
              const totals = roundTotals(getTotalsFromRecipe(recipe));
              const servings = recipe.servings > 0 ? recipe.servings : 1;
              const perServing = roundTotals({
                kcal: totals.kcal / servings,
                p: totals.p / servings,
                c: totals.c / servings,
                f: totals.f / servings,
              });
              const tilts = ['cr-item--left', 'cr-item--right', 'cr-item--left-sm'];

              return (
                <div key={recipe.id} className={`cr-item cr-recipe-card ${tilts[index % tilts.length]}`}>
                  <div className="cr-recipe-card-top">
                    <div>
                      <p className="cr-item-name">{recipe.name}</p>
                      <p className="cr-item-desc">
                        {t('createRecipePage.library.recipeSummary', {
                          ingredients: recipe.items?.length || 0,
                          servings,
                          s: servings === 1 ? '' : 's',
                        })}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="cr-recipe-card-chip">{t('createRecipePage.library.kcalPerServing', { kcal: perServing.kcal })}</span>
                      <button
                        className="cr-log-btn"
                        onClick={() => navigate('/nutrition/recipe', {
                          state: {
                            mode: 'builder',
                            recipeId: recipe.id,
                            recipeName: recipe.name,
                            servings,
                            notes: recipe.notes || '',
                            ingredients: (recipe.items || []).map((item) => buildRecipeIngredient(item, t)),
                            originalItemsSignature: getItemsSignature(
                              (recipe.items || []).map((item) => ({
                                foodId: item.food?.id,
                                quantity: item.quantity,
                              })),
                            ),
                          },
                        })}
                        title={t('createRecipePage.actions.editRecipe')}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                      </button>
                      <button
                        className="cr-log-btn"
                        onClick={(e) => { e.stopPropagation(); setLoggingRecipeId(recipe.id); }}
                        title={t('createRecipePage.actions.logToMeal')}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_task</span>
                      </button>
                      <button
                        className="cr-remove-btn"
                        onClick={(e) => handleDelete(e, recipe.id)}
                        disabled={deleteRecipe.isPending}
                        title={t('createRecipePage.actions.deleteRecipe')}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#f95630' }}>delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="cr-sticker-row cr-sticker-row--compact">
                    <div className="cr-sticker cr-sticker--green">{perServing.p}g P</div>
                    <div className="cr-sticker cr-sticker--sand">{perServing.c}g C</div>
                    <div className="cr-sticker cr-sticker--red">{perServing.f}g F</div>
                  </div>

                  {!!recipe.items?.length && (
                    <div className="cr-recipe-card-items">
                      {recipe.items.slice(0, 3).map(item => (
                        <span key={item.id} className="cr-recipe-card-item-pill">{item.food?.name || t('createRecipePage.labels.ingredient')}</span>
                      ))}
                      {recipe.items.length > 3 && (
                        <span className="cr-recipe-card-item-pill">{t('createRecipePage.labels.moreItems', { count: recipe.items.length - 3 })}</span>
                      )}
                    </div>
                  )}

                  {loggingRecipeId === recipe.id && (
                    <div className="cr-log-panel">
                      <select 
                        value={logMealType} 
                        onChange={e => setLogMealType(e.target.value)} 
                        className="cr-recipe-input" 
                        style={{ marginTop: 0, padding: '6px 10px', width: 'auto' }}
                      >
                        <option value="breakfast">{t('nutrition.mealTypes.breakfast')}</option>
                        <option value="lunch">{t('nutrition.mealTypes.lunch')}</option>
                        <option value="dinner">{t('nutrition.mealTypes.dinner')}</option>
                        <option value="snack">{t('nutrition.mealTypes.snack')}</option>
                      </select>
                      <button
                        className="cr-save-btn"
                        style={{ padding: '8px 16px', fontSize: '12px', flex: 1 }}
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const existingMeal = todayMeals.find((meal) =>
                              meal.meal_type === logMealType && getDateKey(meal.date) === todayKey
                            );
                            await logRecipe.mutateAsync({
                              recipe_id: recipe.id,
                              data: {
                                date: todayKey,
                                meal_type: logMealType,
                                servings: 1,
                                ...(existingMeal ? { meal_id: existingMeal.id } : {})
                              }
                            });
                            setLoggingRecipeId(null);
                            navigate('/nutrition');
                          } catch (err) {
                            console.error('Failed to log recipe:', err);
                          }
                        }}
                        disabled={logRecipe.isPending}
                      >
                        {logRecipe.isPending ? t('createRecipePage.actions.logging') : t('createRecipePage.actions.logOneServing')}
                      </button>
                      <button
                        className="cr-remove-btn"
                        onClick={(e) => { e.stopPropagation(); setLoggingRecipeId(null); }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function RecipeBuilderView({ initialDraft }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const deleteRecipe = useDeleteRecipe();
  const [ingredients, setIngredients] = useState(initialDraft.ingredients);
  const [recipeId] = useState(initialDraft.recipeId);
  const [recipeName, setRecipeName] = useState(initialDraft.recipeName);
  const [servings, setServings] = useState(initialDraft.servings);
  const [notes, setNotes] = useState(initialDraft.notes);
  const [saveError, setSaveError] = useState('');
  const originalItemsSignature = useMemo(
    () => initialDraft.originalItemsSignature || [],
    [initialDraft.originalItemsSignature],
  );
  const isEditingExistingRecipe = Boolean(recipeId);

  const totals = getTotalsFromIngredients(ingredients);
  const validItems = ingredients.filter(ingredient => ingredient.foodId && ingredient.quantity > 0);
  const safeServings = servings > 0 ? servings : 1;
  const currentItemsSignature = useMemo(() => getItemsSignature(validItems), [validItems]);
  const didIngredientListChange = JSON.stringify(currentItemsSignature) !== JSON.stringify(originalItemsSignature);
  const perServing = roundTotals({
    kcal: totals.kcal / safeServings,
    p: totals.p / safeServings,
    c: totals.c / safeServings,
    f: totals.f / safeServings,
  });

  const removeIngredient = id => {
    setIngredients(prev => prev.filter(ingredient => ingredient.id !== id));
  };

  const handleSaveRecipe = async () => {
    if (!recipeName.trim()) {
      setSaveError(t('createRecipePage.errors.missingRecipeName'));
      return;
    }

    if (ingredients.length === 0) {
      setSaveError(t('createRecipePage.errors.missingIngredients'));
      return;
    }

    if (validItems.length === 0) {
      setSaveError(t('createRecipePage.errors.invalidIngredients'));
      return;
    }

    setSaveError('');

    try {
      const payload = {
        name: recipeName.trim(),
        servings: safeServings,
        notes: notes.trim(),
        items: validItems.map(ingredient => ({
          food_id: ingredient.foodId,
          quantity: ingredient.quantity,
        })),
      };

      if (isEditingExistingRecipe) {
        if (didIngredientListChange) {
          await createRecipe.mutateAsync(payload);
          await deleteRecipe.mutateAsync(recipeId);
        } else {
          await updateRecipe.mutateAsync({
            recipe_id: recipeId,
            data: {
              name: payload.name,
              servings: payload.servings,
              notes: payload.notes,
            },
          });
        }
      } else {
        await createRecipe.mutateAsync(payload);
      }

      navigate('/nutrition/recipe', { replace: true });
    } catch (error) {
      console.error('Failed to save recipe:', error);
      setSaveError(error?.response?.data?.error || t('createRecipePage.errors.saveFailed'));
    }
  };

  return (
    <div className="cr-root">
      <header className="cr-header">
        <div className="cr-header-left">
          <button
            id="cr-back-to-library-btn"
            className="cr-back-btn"
            onClick={() => navigate('/nutrition/recipe')}
            aria-label={t('createRecipePage.aria.backToRecipes')}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="cr-avatar">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 20, color: '#38671a' }}>person</span>
          </div>
          <h1 className="cr-header-brand">{t('createRecipePage.brand')}</h1>
        </div>
        <div className="cr-header-right">
          <div className="cr-tag-badge">{t('createRecipePage.badges.recipeBuilder')}</div>
        </div>
      </header>

      <main className="cr-main">
        <section className="cr-total-card">
          <span className="cr-step-label">{t('createRecipePage.builder.stepLabel')}</span>
          <h2 className="cr-recipe-name">
            {recipeName.trim() || (isEditingExistingRecipe ? t('createRecipePage.builder.editRecipe') : t('createRecipePage.builder.newRecipe'))}
          </h2>
          <input
            id="cr-recipe-name-input"
            className="cr-recipe-input"
            type="text"
            value={recipeName}
            onChange={event => setRecipeName(event.target.value)}
            placeholder={t('createRecipePage.placeholders.recipeName')}
            aria-label={t('createRecipePage.aria.recipeName')}
          />

          <div className="cr-servings-row">
            <label className="cr-servings-label" htmlFor="cr-servings-input">{t('createRecipePage.fields.servings')}</label>
            <input
              id="cr-servings-input"
              className="cr-servings-input"
              type="number"
              min={1}
              value={servings}
              onChange={event => setServings(Math.max(1, Number(event.target.value) || 1))}
            />
          </div>

          <div className="cr-sticker-row">
            <div className="cr-sticker cr-sticker--green cr-sticker--left">{t('createRecipePage.labels.totalKcal', { kcal: totals.kcal })}</div>
            <div className="cr-sticker cr-sticker--purple cr-sticker--right">{totals.p}g P</div>
            <div className="cr-sticker cr-sticker--sand">{totals.c}g C</div>
            <div className="cr-sticker cr-sticker--red cr-sticker--left">{totals.f}g F</div>
          </div>

          <div className="cr-per-serving-row">
            <span>{t('createRecipePage.labels.perServing')}</span>
            <span>{t('createRecipePage.labels.perServingMacros', { kcal: perServing.kcal, p: perServing.p, c: perServing.c, f: perServing.f })}</span>
          </div>

          <textarea
            className="cr-recipe-input cr-recipe-notes"
            value={notes}
            onChange={event => setNotes(event.target.value)}
            rows={3}
            placeholder={t('createRecipePage.placeholders.recipeNotes')}
            aria-label={t('createRecipePage.aria.recipeNotes')}
          />

          <div className="cr-deco-icon">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 80, opacity: 0.1 }}>restaurant</span>
          </div>
        </section>

        <section className="cr-ingredients">
          <h3 className="cr-section-title">{t('createRecipePage.builder.currentComposition')}</h3>
          <div className="cr-ingredient-list">
            {ingredients.length === 0 && (
              <p className="cr-empty-state">{t('createRecipePage.states.noIngredients')}</p>
            )}

            {ingredients.map((ingredient, index) => {
              const tilts = ['cr-item--left', 'cr-item--right', 'cr-item--left-sm'];
              return (
                <div
                  key={ingredient.id}
                  id={`cr-ingredient-${ingredient.id}`}
                  className={`cr-item ${tilts[index % tilts.length]}`}
                >
                  <div className="cr-item-left">
                    <div
                      className="cr-item-icon"
                      style={{
                        background: ingredient.iconBg,
                        borderColor: ingredient.iconColor,
                        color: ingredient.iconColor,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {ingredient.icon}
                      </span>
                    </div>
                    <div>
                      <p className="cr-item-name">{ingredient.name}</p>
                      <p className="cr-item-desc">{ingredient.desc}</p>
                    </div>
                  </div>
                  <div className="cr-item-right">
                    <span className="cr-item-qty">({ingredient.qty})</span>
                    <button
                      className="cr-edit-ingredient-btn"
                      onClick={() => navigate(`/nutrition/add-quantity?meal=recipe&foodId=${ingredient.foodId}&ingredientKey=${ingredient.id}&quantity=${ingredient.quantity}`, {
                        state: { mode: 'builder', ingredients, recipeId, recipeName, notes, servings: safeServings, originalItemsSignature },
                      })}
                      aria-label={t('createRecipePage.aria.editIngredient', { name: ingredient.name })}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                    </button>
                    <button
                      className="cr-remove-btn"
                      onClick={() => removeIngredient(ingredient.id)}
                      aria-label={t('createRecipePage.aria.removeIngredient', { name: ingredient.name })}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {saveError && <p className="cr-save-error">{saveError}</p>}

        <section className="cr-actions">
          <button
            id="cr-add-ingredient-btn"
            className="cr-add-ingredient-btn"
            onClick={() => navigate('/nutrition/food-search?meal=recipe', {
              state: { mode: 'builder', ingredients, recipeId, recipeName, notes, servings: safeServings, originalItemsSignature },
            })}
          >
            <span className="material-symbols-outlined">add_circle</span>
            {t('createRecipePage.actions.addIngredient')}
          </button>
          <button
            id="cr-save-btn"
            className="cr-save-btn"
            onClick={handleSaveRecipe}
            disabled={createRecipe.isPending || updateRecipe.isPending || deleteRecipe.isPending}
          >
            {createRecipe.isPending || updateRecipe.isPending || deleteRecipe.isPending
              ? t('createRecipePage.actions.saving')
              : isEditingExistingRecipe
                ? t('createRecipePage.actions.saveChanges')
                : t('createRecipePage.actions.saveRecipe')}
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </section>

        <section className="cr-image-card">
          <div className="cr-image-area">
            <span className="cr-image-emoji">🥞</span>
            <div className="cr-image-gradient" />
            <div className="cr-time-badge">{t('createRecipePage.labels.estimatedTime')}</div>
          </div>
          <div className="cr-image-caption">
            <p className="cr-image-quote">{t('createRecipePage.labels.quote')}</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function CreateRecipe() {
  const location = useLocation();
  const draft = getDraftFromState(location.state);

  if (draft.mode !== 'builder') {
    return <RecipesListView />;
  }

  return <RecipeBuilderView key={location.key} initialDraft={draft} />;
}
