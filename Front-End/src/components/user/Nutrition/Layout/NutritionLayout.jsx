import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../../../../i18n/useI18n';
import './NutritionLayout.css';

const CTX_NAV = [
  { id: 'close', icon: 'close', labelKey: 'common.actions.close' },
  { id: 'journal', path: '/nutrition', icon: 'restaurant', labelKey: 'nutrition.nav.journal' },
  { id: 'recipes', path: '/nutrition/recipe', icon: 'menu_book', labelKey: 'nutrition.nav.recipes' },
  { id: 'trends', path: '/nutrition/history', icon: 'query_stats', labelKey: 'nutrition.nav.trends' },
];

export default function NutritionLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useI18n();
  const [navVisible, setNavVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setNavVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="nut-layout">
      <div className="nut-content">
        <Outlet />
      </div>

      {/* Contextual nav — slides on top of AppLayout nav, like workouts */}
      <nav className={`nut-ctx-nav${navVisible ? ' nut-ctx-nav--visible' : ''}`}>
        {CTX_NAV.map(item => {
          const isClose = item.id === 'close';
          const label = t(item.labelKey);
          const isJournalFlow = pathname.startsWith('/nutrition') &&
            !pathname.startsWith('/nutrition/recipe') &&
            !pathname.startsWith('/nutrition/history');
          const isActive = !isClose && (
            item.id === 'journal'
              ? isJournalFlow
              : pathname.startsWith(item.path)
          );
          return (
            <button
              key={item.id}
              className={`nut-ctx-btn${isActive ? ' nut-ctx-btn--active' : ''}${isClose ? ' nut-ctx-btn--close' : ''}`}
              onClick={() => isClose ? navigate('/dashboard') : navigate(item.path)}
              aria-label={label}
            >
              <span
                className="material-symbols-outlined nut-ctx-icon"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="nut-ctx-label">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
