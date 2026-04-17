import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../../../i18n/useI18n';
import './Workouts.css';

const CTX_NAV = [
  { id: 'close',    icon: 'close',       labelKey: 'workouts.nav.close' },
  { id: 'programs', path: '/workouts',          icon: 'grid_view',   labelKey: 'workouts.nav.programs' },
  { id: 'library',  path: '/workouts/library',  icon: 'book',        labelKey: 'workouts.nav.library' },
  { id: 'history',  path: '/workouts/history',  icon: 'history',     labelKey: 'workouts.nav.history' },
];

export default function WorkoutsLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useI18n();
  const [navVisible, setNavVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setNavVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const isPrograms = pathname === '/workouts' || pathname === '/workouts/';

  return (
    <>
      <Outlet />
      <nav className={`wk-ctx-nav${navVisible ? ' wk-ctx-nav--visible' : ''}`}>
        {CTX_NAV.map(item => {
          const isClose = item.id === 'close';
          const label = t(item.labelKey);
          const isActive = !isClose && (
            item.id === 'programs'
              ? isPrograms
              : pathname.startsWith(item.path)
          );
          return (
            <button
              key={item.id}
              className={`wk-ctx-btn${isActive ? ' wk-ctx-btn--active' : ''}${isClose ? ' wk-ctx-btn--close' : ''}`}
              onClick={() => isClose ? navigate('/dashboard') : navigate(item.path)}
              aria-label={label}
            >
              <span className="material-symbols-outlined wk-ctx-icon">{item.icon}</span>
              <span className="wk-ctx-label">{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
