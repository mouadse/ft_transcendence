import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { nutritionAPI } from '../../../../api/nutrition';
import {
  useAddFavorite,
  useFavorites,
  useLogRecipeToMeal,
  useRecentFoods,
  useRecipes,
  useRemoveFavorite,
} from '../../../../hooks/queries/useNutrition';
import { getFoodMeasurementMeta } from '../foodMeasurement';
import { useI18n } from '../../../../i18n/useI18n';
import './FoodSearch.css';

const FILTER_CHIPS = [
  { value: 'all', labelKey: 'foodSearchPage.filters.all' },
  { value: 'recent', labelKey: 'foodSearchPage.filters.recent' },
  { value: 'favorites', labelKey: 'foodSearchPage.filters.favorites' },
  { value: 'recipes', labelKey: 'foodSearchPage.filters.myRecipes' },
  { value: 'custom', labelKey: 'foodSearchPage.filters.custom' },
];

const CATEGORY_EMOJI = {
  'Dairy': '🥛', 'Milk': '🥛',
  'Fruit': '🍎', 'Fruits': '🍎',
  'Vegetable': '🥦', 'Vegetables': '🥦',
  'Poultry': '🍗', 'Chicken': '🍗',
  'Beef': '🥩', 'Pork': '🥩', 'Lamb': '🥩',
  'Fish': '🐟', 'Seafood': '🦐',
  'Grain': '🌾', 'Grains': '🌾', 'Bread': '🍞', 'Cereal': '🥣',
  'Legume': '🫘', 'Beans': '🫘', 'Lentil': '🫘',
  'Nut': '🥜', 'Nuts': '🥜', 'Seeds': '🌻',
  'Snack': '🍿', 'Sweets': '🍬', 'Candy': '🍬',
  'Beverage': '🥤', 'Juice': '🧃',
  'Oil': '🫙', 'Fat': '🧈',
  'Egg': '🥚',
  'Soup': '🍲',
  'Spice': '🧂', 'Herb': '🌿',
};

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getCategoryEmoji(category = '') {
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return '🍽️';
}

function normalizeList(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
}

function filterFoods(foods, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return foods;
  return foods.filter((food) => {
    const haystack = `${food?.name || ''} ${food?.brand || ''} ${food?.category || ''}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export default function FoodSearch() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const legacyMeal = searchParams.get('meal') || '';
  const mealId = searchParams.get('mealId') || '';
  const mealType = searchParams.get('mealType') || legacyMeal || 'meal';
  const mealLabel = mealType === 'snack'
    ? t('nutrition.mealTypes.snack')
    : t(`nutrition.mealTypes.${mealType}`);

  const [query, setQuery] = useState('');
  const [active, setActive] = useState('all');

  const isSearching = query.length >= 2;

  /* Search results when user types */
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['foods', 'search', query],
    queryFn: () => nutritionAPI.searchFoods(query, { limit: 20 }),
    enabled: isSearching,
    staleTime: 1000 * 30,
  });

  /* Suggested foods on load (no query) */
  const { data: suggestedData, isLoading: suggestedLoading } = useQuery({
    queryKey: ['foods', 'suggested'],
    queryFn: () => nutritionAPI.searchFoods('', { limit: 10 }),
    enabled: !isSearching,
    staleTime: 1000 * 60 * 5,
  });

  const { data: customData, isLoading: customLoading } = useQuery({
    queryKey: ['foods', 'custom', query],
    queryFn: () => nutritionAPI.searchFoods(query, { limit: 20, source: 'user' }),
    staleTime: 1000 * 30,
  });
  const { data: recentData, isLoading: recentLoading } = useRecentFoods({ limit: 20 });
  const { data: favoritesData, isLoading: favoritesLoading } = useFavorites({ limit: 50 });
  const logRecipeToMeal = useLogRecipeToMeal();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const { data: recipesData, isLoading: recipesLoading } = useRecipes({ limit: 50 });
  const recipes = Array.isArray(recipesData?.data) ? recipesData.data : (Array.isArray(recipesData) ? recipesData : []);
  const defaultFoods = isSearching ? normalizeList(searchData) : normalizeList(suggestedData);
  const customFoods = normalizeList(customData);
  const recentFoods = normalizeList(recentData);
  const favoriteEntries = normalizeList(favoritesData);
  const favoriteFoods = favoriteEntries.map((entry) => entry.food).filter(Boolean);
  const favoriteIds = new Set(favoriteEntries.map((entry) => String(entry.food_id || entry.food?.id || '')));

  let foods = defaultFoods;
  let isLoading = isSearching ? searchLoading : suggestedLoading;
  let resultsLabel = isSearching
    ? t('foodSearchPage.results.forQuery', { count: defaultFoods.length, query })
    : t('foodSearchPage.results.suggestedFoods');

  if (active === 'recent') {
    foods = filterFoods(recentFoods, query);
    isLoading = recentLoading;
    resultsLabel = query ? t('foodSearchPage.results.recentMatches', { query }) : t('foodSearchPage.results.recentFoods');
  } else if (active === 'favorites') {
    foods = filterFoods(favoriteFoods, query);
    isLoading = favoritesLoading;
    resultsLabel = query ? t('foodSearchPage.results.favoriteMatches', { query }) : t('foodSearchPage.results.favoriteFoods');
  } else if (active === 'custom') {
    foods = customFoods;
    isLoading = customLoading;
    resultsLabel = query ? t('foodSearchPage.results.customForQuery', { query }) : t('foodSearchPage.results.customFoods');
  } else if (active === 'recipes') {
    isLoading = recipesLoading;
    resultsLabel = t('foodSearchPage.results.yourRecipes');
  }
  const isSuggestedMode = active === 'all' && !isSearching;

  const handleLogRecipe = async (recipe) => {
    if (!mealType || mealType === 'recipe') return;
    try {
      await logRecipeToMeal.mutateAsync({
        recipe_id: recipe.id,
        data: {
          date: getLocalDateKey(),
          ...(mealId ? { meal_id: mealId } : {}),
          meal_type: mealType,
          servings: 1,
        }
      });
      navigate('/nutrition');
    } catch (err) {
      console.error('Failed to log recipe:', err);
      alert(t('foodSearchPage.errors.logRecipeFailed'));
    }
  };

  const toggleFavorite = async (event, food) => {
    event.stopPropagation();
    try {
      if (favoriteIds.has(String(food.id))) {
        await removeFavorite.mutateAsync(food.id);
      } else {
        await addFavorite.mutateAsync(food.id);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const goToAddQuantity = (food) => {
    const params = new URLSearchParams({ foodId: food.id });

    if (mealId) {
      params.set('mealId', mealId);
    }

    if (mealType === 'recipe' && !mealId) {
      params.set('meal', 'recipe');
    } else {
      params.set('mealType', mealType);
    }

    navigate(`/nutrition/add-quantity?${params.toString()}`, {
      state: location.state,
    });
  };

  const tilts = ['fs-row--tilt-left', '', 'fs-row--tilt-right-sm', 'fs-row--tilt-right'];

  const handleBack = () => {
    if (mealType === 'recipe') {
      navigate('/nutrition/recipe', { state: location.state });
      return;
    }

    navigate('/nutrition');
  };

  return (
    <div className="fs-root">
      {/* Header */}
      <nav className="fs-header">
        <div className="fs-header-left">
          <button
            id="fs-back-btn"
            className="fs-back-btn"
            onClick={handleBack}
            aria-label={t('common.actions.goBack')}
          >
            <span className="material-symbols-outlined fs-back-icon">arrow_back</span>
          </button>
          <h1 className="fs-title">{t('foodSearchPage.title', { meal: mealLabel })}</h1>
        </div>
        <div className="fs-avatar">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 20, color: '#38671a' }}>person</span>
        </div>
      </nav>

      <main className="fs-main">
        {/* Search Input */}
        <div className="fs-search-wrap">
          <span className="material-symbols-outlined fs-search-icon">search</span>
          <input
            id="fs-search-input"
            type="text"
            className="fs-search-input"
            placeholder={t('foodSearchPage.searchPlaceholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {isLoading && (
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#aaa', animation: 'spin 1s linear infinite' }}>progress_activity</span>
          )}
        </div>

        {/* Filter Chips */}
        <div className="fs-chips">
          {FILTER_CHIPS.map(chip => (
            <button
              key={chip.value}
              id={`fs-chip-${chip.value}`}
              className={`fs-chip${active === chip.value ? ' fs-chip--active' : ''}`}
              onClick={() => setActive(chip.value)}
            >
              {t(chip.labelKey)}
            </button>
          ))}
        </div>

        {/* Results */}
        <section className="fs-results">
          <div className="fs-results-header">
            <h2 className="fs-results-title">{isLoading ? t('foodSearchPage.loading') : resultsLabel}</h2>
            <span className="material-symbols-outlined fs-sort-icon">sort</span>
          </div>

          {active === 'recipes' ? (
            recipesLoading ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#888' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }}>progress_activity</span>
                <p style={{ margin: 0, fontSize: 14 }}>{t('foodSearchPage.recipes.loading')}</p>
              </div>
            ) : recipes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#888' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>menu_book</span>
                <p style={{ margin: 0, fontSize: 14 }}>{t('foodSearchPage.recipes.emptyTitle')}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>{t('foodSearchPage.recipes.emptyBody')}</p>
              </div>
            ) : (
              recipes.map((recipe, i) => (
                <div
                  key={recipe.id}
                  id={`fs-recipe-${recipe.id}`}
                  className={`fs-row ${tilts[i % tilts.length]}`}
                  onClick={() => handleLogRecipe(recipe)}
                  role="button"
                >
                  <div className="fs-row-left">
                    <div className="fs-thumbnail">🥞</div>
                    <div>
                      <div className="fs-food-name-row">
                        <h3 className="fs-food-name">{recipe.name}</h3>
                      </div>
                      <div className="fs-food-macros">
                          <span className="fs-macro-tag" style={{ marginTop: '4px' }}>
                          {t('foodSearchPage.recipes.ingredientsCount', { count: recipe.items?.length || 0 })}
                          </span>
                      </div>
                    </div>
                  </div>
                  <div className="fs-row-right">
                    <span className="fs-food-emoji">🥞</span>
                    <button
                        className="fs-add-btn"
                        onClick={e => { e.stopPropagation(); handleLogRecipe(recipe); }}
                        aria-label={t('foodSearchPage.aria.logRecipe', { name: recipe.name })}
                        disabled={logRecipeToMeal.isPending}
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            <>
              {!isLoading && foods.length === 0 && isSearching && (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#888' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>search_off</span>
                  <p style={{ margin: 0, fontSize: 14 }}>{t('foodSearchPage.empty.noFoodsForQuery', { query })}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                    {active === 'favorites'
                      ? t('foodSearchPage.empty.favoriteHint')
                      : active === 'recent'
                        ? t('foodSearchPage.empty.recentHint')
                        : t('foodSearchPage.empty.defaultHint')}
                  </p>
                </div>
              )}

              {!isLoading && foods.length === 0 && !isSearching && active === 'favorites' && (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#888' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>favorite</span>
                  <p style={{ margin: 0, fontSize: 14 }}>{t('foodSearchPage.empty.noFavorites')}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12 }}>{t('foodSearchPage.empty.noFavoritesHint')}</p>
                </div>
              )}

              {!isLoading && foods.length === 0 && !isSearching && active === 'recent' && (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#888' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>history</span>
                  <p style={{ margin: 0, fontSize: 14 }}>{t('foodSearchPage.empty.noRecent')}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12 }}>{t('foodSearchPage.empty.noRecentHint')}</p>
                </div>
              )}

              {foods.map((food, i) => {
                const emoji = getCategoryEmoji(food.category);
                const { referenceLabel, referenceQuantity, servingSize } = getFoodMeasurementMeta(food);
                const isFavorite = favoriteIds.has(String(food.id));
                const isSuggested = isSuggestedMode && i < 3;
                const referenceValue = (key) => Math.round(
                  ((food[key] || 0) / servingSize) * referenceQuantity
                );

                return (
                  <div
                    key={food.id}
                    id={`fs-food-${food.id}`}
                    className={`fs-row ${tilts[i % tilts.length]}${isSuggested ? ' fs-row--suggested' : ''}`}
                    onClick={() => goToAddQuantity(food)}
                    role="button"
                  >
                    <div className="fs-row-left">
                      <div className="fs-thumbnail">{emoji}</div>
                      <div>
                        {isSuggested && <p className="fs-suggested-kicker">{t('foodSearchPage.labels.suggestedPick')}</p>}
                        <div className="fs-food-name-row">
                          <h3 className="fs-food-name">{food.name}</h3>
                        </div>
                        {food.brand && <p style={{ margin: '0 0 2px', fontSize: 11, color: '#888' }}>{food.brand}</p>}
                        <div className="fs-food-macros">
                          <span className="fs-macro-tag">
                            <span className="fs-dot fs-dot--kcal" />
                            {referenceValue('calories')} kcal
                          </span>
                          <span className="fs-macro-tag">
                            <span className="fs-dot fs-dot--protein" />
                            {t('foodSearchPage.labels.proteinValue', { value: referenceValue('protein') })}
                          </span>
                          <span style={{ fontSize: 10, color: '#aaa', alignSelf: 'center' }}>
                            {t('foodSearchPage.labels.perReference', { reference: referenceLabel })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="fs-row-right">
                      <button
                        className={`fs-fav-btn${isFavorite ? ' fs-fav-btn--active' : ''}`}
                        onClick={(event) => toggleFavorite(event, food)}
                        aria-label={isFavorite
                          ? t('foodSearchPage.aria.removeFavorite', { name: food.name })
                          : t('foodSearchPage.aria.addFavorite', { name: food.name })}
                      >
                        <span className="material-symbols-outlined" style={isFavorite ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                          favorite
                        </span>
                      </button>
                      <button
                        id={`fs-add-${food.id}`}
                        className="fs-add-btn"
                        onClick={e => { e.stopPropagation(); goToAddQuantity(food); }}
                        aria-label={t('foodSearchPage.aria.addFood', { name: food.name })}
                      >
                        <span className="material-symbols-outlined">add</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </section>

        {/* Custom food callout */}
        <section className="fs-custom-callout">
          <span className="material-symbols-outlined fs-custom-icon">inventory_2</span>
          <div>
            <p className="fs-custom-title">
              {active === 'custom' ? t('foodSearchPage.customCallout.customTitle') : t('foodSearchPage.customCallout.defaultTitle')}
            </p>
            <p className="fs-custom-desc">
              {active === 'custom'
                ? t('foodSearchPage.customCallout.customDescription')
                : t('foodSearchPage.customCallout.defaultDescription')}
            </p>
          </div>
          <button
            id="fs-create-custom-btn"
            className="fs-custom-btn"
            onClick={() => {
              const params = new URLSearchParams();
              if (mealId) params.set('mealId', mealId);
              if (mealType) params.set('mealType', mealType);
              navigate(`/nutrition/custom-food?${params.toString()}`);
            }}
          >
            {t('foodSearchPage.customCallout.action')}
          </button>
        </section>
      </main>
    </div>
  );
}
