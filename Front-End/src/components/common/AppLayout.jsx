import { useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n/useI18n';
import './AppLayout.css';

const NAV_ITEMS = [
  { id: 'dashboard', path: '/dashboard', icon: 'dashboard', labelKey: 'common.nav.home' },
  { id: 'workouts', path: '/workouts', icon: 'fitness_center', labelKey: 'common.nav.workout', match: ['/workouts'] },
  { id: 'nutrition', path: '/nutrition', icon: 'restaurant', labelKey: 'common.nav.nutrition' },
  { id: 'ai', path: '/ai', icon: 'smart_toy', labelKey: 'common.nav.coach' },
  { id: 'settings', path: '/settings', icon: 'settings', labelKey: 'common.nav.settings' },
];

export default function AppLayout({ children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useI18n();

  const hideNav = false;

  return (
    <div className="app-layout">
      <div className={`app-content${hideNav ? ' app-content--no-pad' : ''}`}>
        {children}
      </div>

      {!hideNav && (
        <nav className="app-nav">
          {NAV_ITEMS.map(item => {
            const paths = item.match || [item.path];
            const isActive = paths.some((path) => pathname === path || pathname.startsWith(path + '/'));
            const label = t(item.labelKey);
            return (
              <button
                key={item.id}
                className={`app-nav-item${isActive ? ' app-nav-item--active' : ''}`}
                onClick={() => navigate(item.path)}
                aria-label={label}
              >
                <span
                  className="material-symbols-outlined app-nav-icon"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span className="app-nav-label">{label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
