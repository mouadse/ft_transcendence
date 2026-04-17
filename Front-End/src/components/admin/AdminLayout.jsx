import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LANGUAGE_OPTIONS, useI18n } from '../../i18n/useI18n';
import './Admin.css';

const NAV_ITEMS = [
  { id: 'dashboard', path: '/admin', icon: 'dashboard', labelKey: 'admin.nav.dashboard' },
  { id: 'users', path: '/admin/users', icon: 'group', labelKey: 'admin.nav.users' },
  { id: 'exercises', path: '/admin/exercises', icon: 'fitness_center', labelKey: 'admin.nav.exercises' },
  { id: 'programs', path: '/admin/programs', icon: 'event_note', labelKey: 'admin.nav.programs' },
  { id: 'nutrition', path: '/admin/nutrition', icon: 'restaurant', labelKey: 'admin.nav.nutrition' },
];

function isActive(item, pathname) {
  if (item.path === '/admin') return pathname === '/admin' || pathname === '/admin/';
  return pathname.startsWith(item.path);
}

function getInitials(value) {
  const safeValue = String(value || '').trim();
  if (!safeValue) return 'A';
  const parts = safeValue.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || '').join('') || safeValue.slice(0, 2).toUpperCase();
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [mobileOpenPath, setMobileOpenPath] = useState(null);
  const [prevPathname, setPrevPathname] = useState(location.pathname);

  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    setMobileOpenPath(null);
  }

  const mobileOpen = mobileOpenPath === location.pathname;

  // Lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const navItems = NAV_ITEMS.map((item) => ({ ...item, label: t(item.labelKey) }));
  const activeItem = navItems.find((item) => isActive(item, location.pathname));
  const adminIdentity = user?.name || user?.email || t('common.labels.rootAdmin');

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="adm-shell">
      {/* ── Side Nav ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="adm-mobile-overlay adm-mobile-overlay--active"
          onClick={() => setMobileOpenPath(null)}
          aria-label={t('common.labels.closeMenu')}
          role="presentation"
        />
      )}

      <aside
        id="adm-sidenav"
        className={`adm-sidenav${expanded ? ' adm-sidenav--open' : ''}${mobileOpen ? ' adm-sidenav--mobile-open' : ''}`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        aria-label={t('common.labels.adminNavigation')}
      >
        <div className="adm-sidenav-logo">
          <div className="adm-sidenav-logo-icon">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
          </div>
          <div className="adm-sidenav-logo-text">
            <span className="adm-sidenav-wordmark">UM6P_FIT</span>
            <span className="adm-sidenav-subtitle">{t('common.labels.adminTerminal')}</span>
          </div>
        </div>

        <nav className="adm-sidenav-nav">
          {navItems.map(item => {
            const active = isActive(item, location.pathname);
            return (
              <button
                key={item.id}
                className={`adm-nav-btn${active ? ' adm-nav-btn--active' : ''}`}
                onClick={() => { navigate(item.path); setMobileOpenPath(null); }}
                title={item.label}
              >
                <span
                  className="material-symbols-outlined adm-nav-btn-icon"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                <span className="adm-nav-btn-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="adm-sidenav-footer">
          <div className="adm-sidenav-avatar">{getInitials(adminIdentity)}</div>
          <div className="adm-sidenav-user-info">
            <span className="adm-sidenav-user-role">{t('common.labels.rootAdmin')}</span>
            <span className="adm-sidenav-user-name">{user?.email || adminIdentity}</span>
          </div>
        </div>
      </aside>

      {/* ── Main Area ─────────────────────────────────────────── */}
      <div className="adm-main">
        {/* Top Bar */}
        <header className="adm-topbar">
          <div className="adm-topbar-left">
            <button
              className="adm-hamburger"
              type="button"
              onClick={() => setMobileOpenPath(location.pathname)}
              aria-label={t('common.labels.openMenu')}
              aria-expanded={mobileOpen}
              aria-controls="adm-sidenav"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <span className="adm-topbar-title">
              {activeItem?.label ?? t('admin.shell.title')}
            </span>
          </div>
          <div className="adm-topbar-right">
            <div className="adm-topbar-status">
              <span className="adm-topbar-status-dot" />
              <span className="adm-topbar-status-label">{t('common.labels.systemOnline')}</span>
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLanguage(option.value)}
                  title={t(option.titleKey)}
                  aria-label={t(option.titleKey)}
                  aria-pressed={language === option.value}
                  style={{
                    padding: '4px 8px',
                    border: '2px solid #dad4c8',
                    borderRadius: 9999,
                    background: language === option.value ? '#38671a' : 'transparent',
                    color: language === option.value ? '#d6ffb7' : '#5b5c5a',
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    letterSpacing: '0.5px',
                  }}
                >
                  {option.shortLabel}
                </button>
              ))}
            </div>
            <button
              className="adm-topbar-logout"
              type="button"
              onClick={handleLogout}
              title={t('common.labels.backToApp')}
              aria-label={t('common.labels.backToApp')}
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="adm-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
