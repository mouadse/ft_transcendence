import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCreateFood } from '../../../../hooks/queries/useNutrition';
import { useI18n } from '../../../../i18n/useI18n';
import './CustomFood.css';

export default function CustomFood() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const createFood = useCreateFood();
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    servingSize: '100',
    servingUnit: 'g',
    calories: '',
    protein: '',
    carbohydrates: '',
    fat: '',
    fiber: '',
    sugar: '',
    sodium: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const food = await createFood.mutateAsync({
        name: formData.name.trim(),
        brand: formData.brand.trim(),
        serving_size: Number(formData.servingSize) || 100,
        serving_unit: formData.servingUnit.trim() || 'g',
        calories: Number(formData.calories) || 0,
        protein: Number(formData.protein) || 0,
        carbohydrates: Number(formData.carbohydrates) || 0,
        fat: Number(formData.fat) || 0,
        fiber: Number(formData.fiber) || 0,
        sugar: Number(formData.sugar) || 0,
        sodium: Number(formData.sodium) || 0,
      });

      const params = new URLSearchParams();
      const mealId = searchParams.get('mealId');
      const mealType = searchParams.get('mealType');

      params.set('foodId', food.id);
      if (mealId) {
        params.set('mealId', mealId);
      }
      if (mealType) {
        params.set('mealType', mealType);
      }

      navigate(`/nutrition/add-quantity?${params.toString()}`);
    } catch (error) {
      console.error('Error saving custom food:', error);
      setError(error?.response?.data?.error || t('customFoodPage.errors.saveFailed'));
    }
  };

  return (
    <div className="cf-root">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="cf-header">
        <div className="cf-header-left">
          <button
            id="cf-back-btn"
            className="cf-back-btn"
            onClick={() => navigate(-1)}
            aria-label={t('common.actions.goBack')}
          >
            <span className="material-symbols-outlined" style={{ color: '#38671a' }}>arrow_back</span>
          </button>
          <h1 className="cf-header-title">{t('customFoodPage.title')}</h1>
        </div>
        <div className="cf-avatar">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 20, color: '#38671a' }}>person</span>
        </div>
      </header>

      <main className="cf-main">
        {/* ── Hero / Intro ─────────────────────────────────────────── */}
        <section className="cf-hero">
          <div className="cf-hero-icon">
            <span className="material-symbols-outlined">inventory_2</span>
          </div>
          <h2 className="cf-hero-title">{t('customFoodPage.hero.title')}</h2>
          <p className="cf-hero-desc">{t('customFoodPage.hero.description')}</p>
        </section>

        {/* ── Form Canvas ──────────────────────────────────────────── */}
        <form className="cf-form-card" onSubmit={handleSave}>
          <div className="cf-form-section">
            <h3 className="cf-section-label">{t('customFoodPage.sections.generalInfo')}</h3>

            <div className="cf-input-group">
              <label htmlFor="name" className="cf-label">{t('customFoodPage.fields.foodNameRequired')}</label>
              <input
                type="text"
                id="name"
                name="name"
                className="cf-input"
                placeholder={t('customFoodPage.placeholders.foodName')}
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="cf-input-group">
              <label htmlFor="brand" className="cf-label">{t('customFoodPage.fields.brandOptional')}</label>
              <input
                type="text"
                id="brand"
                name="brand"
                className="cf-input"
                placeholder={t('customFoodPage.placeholders.brand')}
                value={formData.brand}
                onChange={handleChange}
              />
            </div>

            <div className="cf-serving-grid">
              <div className="cf-input-group">
                <label htmlFor="servingSize" className="cf-label">{t('customFoodPage.fields.servingSize')}</label>
                <input
                  type="number"
                  id="servingSize"
                  name="servingSize"
                  className="cf-input"
                  placeholder="100"
                  value={formData.servingSize}
                  onChange={handleChange}
                  required
                  min="0.25"
                  step="0.25"
                />
              </div>

              <div className="cf-input-group">
                <label htmlFor="servingUnit" className="cf-label">{t('customFoodPage.fields.servingUnit')}</label>
                <input
                  type="text"
                  id="servingUnit"
                  name="servingUnit"
                  className="cf-input"
                  placeholder={t('common.units.grams')}
                  value={formData.servingUnit}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="cf-form-section">
            <div className="cf-section-header">
              <h3 className="cf-section-label">{t('customFoodPage.sections.macros')}</h3>
              <div className="cf-serving-chip">{t('customFoodPage.labels.perServing')}</div>
            </div>

            <div className="cf-macros-grid">
              <div className="cf-input-group cf-input-group--macro cf-input-group--kcal">
                <label htmlFor="kcal" className="cf-label">{t('customFoodPage.fields.calories')}</label>
                <div className="cf-macro-input-wrap">
                  <input
                    type="number"
                    id="calories"
                    name="calories"
                    className="cf-input cf-input--large"
                    placeholder="0"
                    value={formData.calories}
                    onChange={handleChange}
                    required
                    min="0"
                  />
                  <span className="cf-input-unit">kcal</span>
                </div>
              </div>

              {[
                  { id: 'protein', label: t('customFoodPage.fields.protein') },
                  { id: 'carbohydrates', label: t('customFoodPage.fields.carbs') },
                  { id: 'fat', label: t('customFoodPage.fields.fats') },
                  { id: 'fiber', label: t('customFoodPage.fields.fiber') },
                  { id: 'sugar', label: t('customFoodPage.fields.sugar') },
                  { id: 'sodium', label: t('customFoodPage.fields.sodiumMg') },
              ].map(macro => (
                <div key={macro.id} className="cf-input-group cf-input-group--macro">
                  <label htmlFor={macro.id} className="cf-label">{macro.label}</label>
                  <div className="cf-macro-input-wrap">
                    <input
                    type="number"
                    id={macro.id}
                    name={macro.id}
                    className="cf-input cf-input--large"
                    placeholder="0"
                      value={formData[macro.id]}
                    onChange={handleChange}
                    min="0"
                  />
                    <span className="cf-input-unit">{macro.id === 'sodium' ? 'mg' : 'g'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        {error && <p className="cf-error">{error}</p>}
      </main>

      {/* ── Sticky CTA ───────────────────────────────────────────── */}
      <div className="cf-sticky-cta">
        <div className="cf-cta-inner">
          <button
            type="submit"
            id="cf-save-btn"
            className="cf-save-btn"
            onClick={handleSave}
            disabled={!formData.name || !formData.calories || createFood.isPending}
          >
            <span className="material-symbols-outlined">{createFood.isPending ? 'progress_activity' : 'check_circle'}</span>
            {createFood.isPending ? t('customFoodPage.actions.saving') : t('customFoodPage.actions.createAndContinue')}
          </button>
        </div>
      </div>
    </div>
  );
}
