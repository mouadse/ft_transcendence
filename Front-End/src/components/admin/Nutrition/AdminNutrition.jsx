import { useDeferredValue, useMemo, useState } from 'react';
import {
  useAdminFoods,
  useCreateAdminFood,
  useDeleteAdminFood,
  useUpdateAdminFood,
} from '../../../hooks/queries/useAdmin';
import { getLocaleForLanguage, useI18n } from '../../../i18n/useI18n';
import './AdminNutrition.css';

const FOOD_FORM_INITIAL = {
  name: '',
  brand: '',
  serving_size: 100,
  serving_unit: 'g',
  calories: 0,
  protein: 0,
  carbohydrates: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  sodium: 0,
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCompact(value, locale) {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(toNumber(value));
}

function formatDateTime(value, locale, emptyLabel) {
  if (!value) return emptyLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return emptyLabel;
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function sourceTone(source) {
  switch (String(source || '').toLowerCase()) {
    case 'usda':
      return 'adm-chip adm-chip--green';
    case 'user':
      return 'adm-chip adm-chip--purple';
    default:
      return 'adm-chip adm-chip--oat';
  }
}

function sourceLabel(source, t) {
  const normalized = String(source || '').trim().toLowerCase();
  if (!normalized) return t('admin.nutrition.sources.manual');
  if (normalized === 'usda') return t('admin.nutrition.sources.usda');
  if (normalized === 'user') return t('admin.nutrition.sources.user');
  return normalized.replaceAll('_', ' ');
}

function categoryLabel(category, t) {
  return category || t('admin.nutrition.labels.uncategorized');
}

function macroTotal(food) {
  return toNumber(food?.protein) + toNumber(food?.carbohydrates) + toNumber(food?.fat);
}

function buildExportRows(items, t) {
  const headers = [
    t('admin.nutrition.export.name'),
    t('admin.nutrition.export.brand'),
    t('admin.nutrition.export.source'),
    t('admin.nutrition.export.category'),
    t('admin.nutrition.export.servingSize'),
    t('admin.nutrition.export.servingUnit'),
    t('admin.nutrition.export.calories'),
    t('admin.nutrition.export.protein'),
    t('admin.nutrition.export.carbohydrates'),
    t('admin.nutrition.export.fat'),
    t('admin.nutrition.export.fiber'),
    t('admin.nutrition.export.sugar'),
    t('admin.nutrition.export.sodium'),
  ];
  const rows = items.map((item) => [
    `"${String(item?.name || '').replace(/"/g, '""')}"`,
    `"${String(item?.brand || '').replace(/"/g, '""')}"`,
    sourceLabel(item?.source, t),
    categoryLabel(item?.category, t),
    toNumber(item?.serving_size),
    item?.serving_unit || '',
    toNumber(item?.calories),
    toNumber(item?.protein),
    toNumber(item?.carbohydrates),
    toNumber(item?.fat),
    toNumber(item?.fiber),
    toNumber(item?.sugar),
    toNumber(item?.sodium),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

function DeleteFoodModal({ food, onClose, onConfirm, isPending, t }) {
  return (
    <div className="adm-modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="adm-modal" style={{ maxWidth: 420, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, margin: '0 auto 12px', borderRadius: '50%', background: '#fff4f1', border: '2px solid #f1c2b4', display: 'grid', placeItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#b02500' }}>delete_forever</span>
        </div>
        <h2 className="adm-modal-title">{t('admin.nutrition.deleteModal.title')}</h2>
        <p style={{ color: '#5b5c5a', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          {t('admin.nutrition.deleteModal.message', { name: food?.name || '' })}
        </p>
        <div className="adm-form-actions" style={{ justifyContent: 'center' }}>
          <button type="button" className="adm-btn-ghost" onClick={onClose}>{t('common.actions.close')}</button>
          <button
            type="button"
            className="adm-btn-primary"
            style={{ background: '#b02500', boxShadow: '-4px 4px 0 #2e2f2e' }}
            onClick={onConfirm}
            disabled={isPending}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{isPending ? 'progress_activity' : 'delete_forever'}</span>
            {isPending ? t('settings.saving') : t('common.actions.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

function FoodEditorModal({
  mode,
  food,
  form,
  t,
  locale,
  onClose,
  onChange,
  onSubmit,
  isPending,
}) {
  return (
    <div className="adm-modal-overlay">
      <div className="adm-modal adm-nut-modal">
        <button className="adm-modal-close" onClick={onClose} aria-label={t('admin.nutrition.modal.closeAria')}>
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="adm-nut-modal-copy">
          <p className="adm-page-eyebrow">{t('admin.nutrition.modal.eyebrow')}</p>
          <h2 className="adm-modal-title">
            {mode === 'edit' ? t('admin.nutrition.modal.editTitle') : t('admin.nutrition.modal.createTitle')}
          </h2>
          <p className="adm-nut-modal-desc">
            {t('admin.nutrition.modal.description')}
          </p>
        </div>

        <form onSubmit={onSubmit} className="adm-nut-form">
          <div className="adm-grid-2">
            <label className="adm-form-field">
              <span className="adm-form-label">{t('admin.nutrition.labels.foodName')}</span>
              <input className="adm-form-input" type="text" name="name" value={form.name} onChange={onChange} required maxLength={200} />
            </label>
            <label className="adm-form-field">
              <span className="adm-form-label">{t('admin.nutrition.labels.brand')}</span>
              <input
                className="adm-form-input"
                type="text"
                name="brand"
                value={form.brand}
                onChange={onChange}
                placeholder={t('admin.nutrition.labels.optional')}
                maxLength={200}
              />
            </label>
          </div>

          <div className="adm-grid-2">
            <label className="adm-form-field">
              <span className="adm-form-label">{t('admin.nutrition.labels.servingSize')}</span>
              <input className="adm-form-input" type="number" min="0" step="0.01" name="serving_size" value={form.serving_size} onChange={onChange} required />
            </label>
            <label className="adm-form-field">
              <span className="adm-form-label">{t('admin.nutrition.labels.servingUnit')}</span>
              <input className="adm-form-input" type="text" name="serving_unit" value={form.serving_unit} onChange={onChange} required maxLength={20} placeholder="g, ml, oz..." />
            </label>
          </div>

          {mode === 'edit' ? (
            <div className="adm-nut-modal-meta">
              <span className={sourceTone(food?.source)}>{sourceLabel(food?.source, t)}</span>
              <span className="adm-chip adm-chip--oat">{categoryLabel(food?.category, t)}</span>
              <span className="adm-chip adm-chip--oat">
                {t('admin.nutrition.labels.updatedAt', {
                  value: formatDateTime(food?.updated_at || food?.created_at, locale, t('admin.nutrition.time.noSync')),
                })}
              </span>
            </div>
          ) : null}

          <div className="adm-nut-macro-grid">
            {[
              ['calories', t('admin.nutrition.export.calories'), 'kcal'],
              ['protein', t('admin.nutrition.export.protein'), 'g'],
              ['carbohydrates', t('admin.nutrition.export.carbohydrates'), 'g'],
              ['fat', t('admin.nutrition.export.fat'), 'g'],
              ['fiber', t('admin.nutrition.export.fiber'), 'g'],
              ['sugar', t('admin.nutrition.export.sugar'), 'g'],
              ['sodium', t('admin.nutrition.export.sodium'), 'mg'],
            ].map(([key, label, unit]) => (
              <label key={key} className="adm-form-field">
                <span className="adm-form-label">{label}</span>
                <div className="adm-nut-field-unit">
                  <input
                    className="adm-form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    name={key}
                    value={form[key]}
                    onChange={onChange}
                  />
                  <span>{unit}</span>
                </div>
              </label>
            ))}
          </div>

          <div className="adm-form-actions">
            <button type="button" className="adm-btn-ghost" onClick={onClose}>{t('common.actions.close')}</button>
            <button type="submit" className="adm-btn-primary" disabled={isPending}>
              <span className="material-symbols-outlined">{isPending ? 'progress_activity' : 'check_circle'}</span>
              {isPending ? t('settings.saving') : mode === 'edit' ? t('admin.nutrition.actions.saveFood') : t('admin.nutrition.actions.createFood')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminNutrition() {
  const { t, language } = useI18n();
  const locale = getLocaleForLanguage(language);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editorMode, setEditorMode] = useState('create');
  const [editingFood, setEditingFood] = useState(null);
  const [form, setForm] = useState(FOOD_FORM_INITIAL);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const deferredSearch = useDeferredValue(search.trim());

  const foodsQuery = useAdminFoods({
    page,
    limit: 20,
    ...(deferredSearch ? { name: deferredSearch } : {}),
  });
  const createFood = useCreateAdminFood();
  const updateFood = useUpdateAdminFood();
  const deleteFood = useDeleteAdminFood();

  const foods = useMemo(() => foodsQuery.data?.items || [], [foodsQuery.data?.items]);
  const foodsMeta = foodsQuery.data?.metadata || {};
  const totalFoods = Number(foodsMeta?.total_count || foods.length || 0);
  const totalPages = Number(foodsMeta?.total_pages || 1);

  const handleOpenCreate = () => {
    setEditorMode('create');
    setEditingFood(null);
    setForm(FOOD_FORM_INITIAL);
    setActionError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (food) => {
    setEditorMode('edit');
    setEditingFood(food);
    setForm({
      name: food?.name || '',
      brand: food?.brand || '',
      serving_size: toNumber(food?.serving_size, 100),
      serving_unit: food?.serving_unit || 'g',
      calories: toNumber(food?.calories),
      protein: toNumber(food?.protein),
      carbohydrates: toNumber(food?.carbohydrates),
      fat: toNumber(food?.fat),
      fiber: toNumber(food?.fiber),
      sugar: toNumber(food?.sugar),
      sodium: toNumber(food?.sodium),
    });
    setActionError('');
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingFood(null);
    setActionError('');
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    const numericFields = new Set(['serving_size', 'calories', 'protein', 'carbohydrates', 'fat', 'fiber', 'sugar', 'sodium']);
    setForm((prev) => ({
      ...prev,
      [name]: numericFields.has(name) ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const handleSaveFood = async (event) => {
    event.preventDefault();
    setActionError('');

    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      serving_size: toNumber(form.serving_size, 100),
      serving_unit: String(form.serving_unit || '').trim() || 'g',
      calories: toNumber(form.calories),
      protein: toNumber(form.protein),
      carbohydrates: toNumber(form.carbohydrates),
      fat: toNumber(form.fat),
      fiber: toNumber(form.fiber),
      sugar: toNumber(form.sugar),
      sodium: toNumber(form.sodium),
    };

    try {
      if (editorMode === 'edit' && editingFood?.id) {
        await updateFood.mutateAsync({ food_id: editingFood.id, data: payload });
      } else {
        await createFood.mutateAsync(payload);
      }
      handleCloseModal();
    } catch (error) {
      setActionError(error?.response?.data?.error || t('admin.nutrition.errors.saveFailed'));
    }
  };

  const handleDeleteFood = (food) => {
    if (!food?.id) return;
    setDeleteTarget(food);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deleteFood.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      setActionError('');
    } catch (error) {
      setDeleteTarget(null);
      setActionError(error?.response?.data?.error || t('admin.nutrition.errors.deleteFailed'));
    }
  };

  const handleExport = () => {
    const csvContent = buildExportRows(foods, t);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'cfit_admin_foods_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="adm-nut-page">
      <div className="adm-page-header">
        <div>
          <div className="adm-page-eyebrow">{t('admin.nutrition.page.eyebrow')}</div>
          <h1 className="adm-page-title">{t('admin.nutrition.page.title')}</h1>
        </div>
        <div className="adm-page-actions">
          <button className="adm-btn-ghost" onClick={handleExport}>
            <span className="material-symbols-outlined">download</span>
            {t('admin.nutrition.actions.exportCurrentView')}
          </button>
          <button className="adm-btn-primary" onClick={handleOpenCreate}>
            <span className="material-symbols-outlined">add</span>
            {t('admin.nutrition.actions.addManualFood')}
          </button>
        </div>
      </div>

      <section className="adm-table-wrap adm-nut-table-shell">
        <div className="adm-nut-table-toolbar">
          <div className="adm-search-wrap adm-nut-toolbar-search">
            <span className="material-symbols-outlined adm-search-icon">search</span>
              <input
                type="text"
                className="adm-search"
                placeholder={t('admin.nutrition.search.placeholder')}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {actionError ? <div className="adm-nut-inline-error">{actionError}</div> : null}
        {foodsQuery.isError ? <div className="adm-nut-inline-error">{foodsQuery.errorMeta?.message || t('admin.nutrition.errors.loadFailed')}</div> : null}

        <div className="adm-nut-table-header">
          <div>
            <p className="adm-page-eyebrow">{t('admin.nutrition.section.eyebrow')}</p>
            <h3 className="adm-nut-section-title">{t('admin.nutrition.section.title')}</h3>
          </div>
          <span className="adm-chip adm-chip--oat">
            {foodsQuery.isFetching ? t('admin.nutrition.status.refreshing') : t('admin.nutrition.status.foodCount', { count: formatCompact(totalFoods, locale) })}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="adm-table">
            <thead>
              <tr>
                <th>{t('admin.nutrition.table.food')}</th>
                <th>{t('admin.nutrition.table.source')}</th>
                <th>{t('admin.nutrition.table.serving')}</th>
                <th>{t('admin.nutrition.table.macros')}</th>
                <th>{t('admin.nutrition.table.micros')}</th>
                <th>{t('admin.nutrition.table.updated')}</th>
                <th style={{ textAlign: 'right' }}>{t('admin.nutrition.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {foodsQuery.isLoading ? (
                <tr>
                  <td colSpan={7}>
                    <div className="adm-empty">
                      <span className="material-symbols-outlined adm-empty-icon">progress_activity</span>
                      <div className="adm-empty-text">{t('admin.nutrition.states.loadingDb')}</div>
                    </div>
                  </td>
                </tr>
              ) : foods.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="adm-empty">
                      <span className="material-symbols-outlined adm-empty-icon">search_off</span>
                      <div className="adm-empty-text">{t('admin.nutrition.states.noMatch')}</div>
                    </div>
                  </td>
                </tr>
              ) : foods.map((food) => (
                <tr key={food.id}>
                  <td>
                    <div className="adm-nut-food-cell">
                      <div className="adm-nut-food-mark">
                        <span className="material-symbols-outlined">restaurant</span>
                      </div>
                      <div>
                        <p className="adm-nut-food-name">{food.name}</p>
                        <p className="adm-nut-food-meta">
                          {[food.brand, categoryLabel(food.category, t)].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td><span className={sourceTone(food.source)}>{sourceLabel(food.source, t)}</span></td>
                  <td className="adm-td-mono">{toNumber(food.serving_size, 100)} {food.serving_unit || 'g'}</td>
                  <td>
                    <div className="adm-nut-macro-pills">
                      <span className="adm-chip adm-chip--green">P {toNumber(food.protein)}g</span>
                      <span className="adm-chip adm-chip--purple">C {toNumber(food.carbohydrates)}g</span>
                      <span className="adm-chip adm-chip--oat">F {toNumber(food.fat)}g</span>
                    </div>
                    <p className="adm-nut-macro-total">
                      {t('admin.nutrition.row.totalMacroMass', {
                        calories: toNumber(food.calories),
                        mass: macroTotal(food).toFixed(1),
                      })}
                    </p>
                  </td>
                  <td className="adm-td-mono">
                    {t('admin.nutrition.row.fiber', { value: toNumber(food.fiber) })}<br />
                    {t('admin.nutrition.row.sugar', { value: toNumber(food.sugar) })}<br />
                    {t('admin.nutrition.row.sodium', { value: toNumber(food.sodium) })}
                  </td>
                  <td className="adm-td-mono">{formatDateTime(food.updated_at || food.created_at, locale, t('admin.nutrition.time.noSync'))}</td>
                  <td>
                    <div className="adm-nut-actions">
                      <button className="adm-icon-btn adm-icon-btn--edit" onClick={() => handleOpenEdit(food)} title={t('admin.nutrition.actions.editFood')}>
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button className="adm-icon-btn adm-icon-btn--danger" onClick={() => handleDeleteFood(food)} title={t('admin.nutrition.actions.deleteFood')}>
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="adm-nut-pagination">
          <button className="adm-btn-ghost" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
            <span className="material-symbols-outlined">chevron_left</span>
            {t('admin.nutrition.pagination.prev')}
          </button>
          <span className="adm-chip adm-chip--oat">
            {t('admin.nutrition.pagination.page', { page, total: Math.max(1, totalPages) })}
          </span>
          <button className="adm-btn-ghost" onClick={() => setPage((prev) => Math.min(Math.max(1, totalPages), prev + 1))} disabled={page >= Math.max(1, totalPages)}>
            {t('admin.nutrition.pagination.next')}
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </section>

      {modalOpen ? (
        <FoodEditorModal
          mode={editorMode}
          food={editingFood}
          form={form}
          t={t}
          locale={locale}
          onClose={handleCloseModal}
          onChange={handleFormChange}
          onSubmit={handleSaveFood}
          isPending={createFood.isPending || updateFood.isPending}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteFoodModal
          food={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
          isPending={deleteFood.isPending}
          t={t}
        />
      ) : null}
    </div>
  );
}
