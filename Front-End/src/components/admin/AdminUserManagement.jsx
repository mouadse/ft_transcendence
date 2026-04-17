import { createPortal } from 'react-dom';
import { useState } from 'react';
import { FormSelect, PillSelect } from './AdminExerciseLibrary';
import { getLocaleForLanguage, useI18n } from '../../i18n/useI18n';
import {
  useAdminUser,
  useAdminUsers,
  useBanUser,
  useDeleteAdminUser,
  useUnbanUser,
  useUpdateAdminUser,
} from '../../hooks/queries/useAdmin';
import { authStore } from '../../stores/authStore';

const ROLE_CHIP = {
  admin: 'adm-chip--green',
  moderator: 'adm-chip--purple',
  user: 'adm-chip--oat',
};

const STATUS_CHIP = {
  active: { cls: 'adm-chip--green', labelKey: 'admin.userManagement.status.active' },
  banned: { cls: 'adm-chip--red', labelKey: 'admin.userManagement.status.banned' },
};

const GOAL_OPTIONS = [
  { value: '', labelKey: 'admin.userManagement.goals.notSet' },
  { value: 'build_muscle', labelKey: 'admin.userManagement.goals.buildMuscle' },
  { value: 'lose_fat', labelKey: 'admin.userManagement.goals.loseFat' },
  { value: 'maintain', labelKey: 'admin.userManagement.goals.maintain' },
];

const ACTIVITY_OPTIONS = [
  { value: '', labelKey: 'admin.userManagement.activity.notSet' },
  { value: 'sedentary', labelKey: 'admin.userManagement.activity.sedentary' },
  { value: 'lightly_active', labelKey: 'admin.userManagement.activity.lightlyActive' },
  { value: 'moderately_active', labelKey: 'admin.userManagement.activity.moderatelyActive' },
  { value: 'active', labelKey: 'admin.userManagement.activity.active' },
  { value: 'very_active', labelKey: 'admin.userManagement.activity.veryActive' },
];

const ROLE_OPTIONS = [
  { value: 'user', labelKey: 'admin.userManagement.roles.user' },
  { value: 'moderator', labelKey: 'admin.userManagement.roles.moderator' },
  { value: 'admin', labelKey: 'admin.userManagement.roles.admin' },
];

const PAGE_SIZE = 20;
const AVATAR_COLORS = ['#c3fb9c', '#b4a5ff', '#f8cc65', '#f95630', '#3bd3fd', '#c3fb9c'];
const AVATAR_TEXT = ['#214f01', '#180058', '#9d6a09', '#520c00', '#0089ad', '#214f01'];

function ModalPortal({ children }) {
  if (typeof document === 'undefined') return children;
  return createPortal(children, document.body);
}

function isBanned(user) {
  return Boolean(user?.banned_at);
}

function normalizeRole(role) {
  return String(role || 'user').trim().toLowerCase();
}

function formatGoal(goal, t) {
  if (!goal) return t('admin.userManagement.goals.notSet');
  return String(goal).replaceAll('_', ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDate(value, locale, fallback) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date).toUpperCase();
}

function formatRelativeTime(value, language, fallback) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  const diffMinutes = Math.round((date.getTime() - Date.now()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, 'day');
}

function getInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return '?';
  return parts.map((part) => part[0]?.toUpperCase() || '').join('');
}

function getUserStatus(user) {
  return isBanned(user) ? 'banned' : 'active';
}

function isSameUserId(firstId, secondId) {
  return firstId != null && secondId != null && String(firstId) === String(secondId);
}

function buildUserSummary(items) {
  const users = Array.isArray(items) ? items : [];
  return {
    total: users.length,
    active: users.filter((user) => !isBanned(user)).length,
    banned: users.filter((user) => isBanned(user)).length,
    admins: users.filter((user) => normalizeRole(user.role) === 'admin').length,
    moderators: users.filter((user) => normalizeRole(user.role) === 'moderator').length,
  };
}

function UserModal({ userId, currentUserId, onClose, onSave, isSaving, t, language, locale }) {
  const userQuery = useAdminUser(userId);
  const detail = userQuery.data?.item || {};
  const user = detail.user || null;
  const stats = detail.stats || {};
  const isCurrentUser = isSameUserId(user?.id, currentUserId);

  return (
    <ModalPortal>
      <div className="adm-modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
        <div className="adm-modal" style={{ maxWidth: 620 }}>
          <button className="adm-modal-close" onClick={onClose}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
          <h2 className="adm-modal-title">{t('admin.userManagement.modal.editUserTitle')}</h2>

          {userQuery.isLoading && !user ? (
            <p style={{ color: '#5b5c5a', marginTop: 0 }}>{t('admin.userManagement.modal.loadingDetails')}</p>
          ) : null}
          {userQuery.error && !user ? (
            <p style={{ color: '#b02500', marginTop: 0 }}>{t('admin.userManagement.modal.loadDetailsFailed')}</p>
          ) : null}

          {user ? <UserModalForm key={user.id} user={user} stats={stats} isCurrentUser={isCurrentUser} onClose={onClose} onSave={onSave} isSaving={isSaving} t={t} language={language} locale={locale} /> : null}
        </div>
      </div>
    </ModalPortal>
  );
}

function UserModalForm({ user, stats, isCurrentUser, onClose, onSave, isSaving, t }) {
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    role: normalizeRole(user.role),
    goal: user.goal || '',
    activity_level: user.activity_level || '',
    avatar: user.avatar || '',
  });
  const [errors, setErrors] = useState({});

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = t('admin.userManagement.errors.nameRequired');
    if (!form.email.trim()) next.email = t('admin.userManagement.errors.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = t('admin.userManagement.errors.emailInvalid');
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    onSave(form);
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <span className={`adm-chip ${ROLE_CHIP[normalizeRole(user.role)] || 'adm-chip--oat'}`}>{t(`admin.userManagement.roles.${normalizeRole(user.role)}`)}</span>
        <span className={`adm-chip ${STATUS_CHIP[getUserStatus(user)]?.cls || 'adm-chip--oat'}`}>{t(STATUS_CHIP[getUserStatus(user)]?.labelKey || 'admin.userManagement.status.unknown')}</span>
        <span className="adm-chip adm-chip--oat">{t('admin.userManagement.modal.workoutsCount', { count: stats.workouts_count ?? 0 })}</span>
        <span className="adm-chip adm-chip--oat">{t('admin.userManagement.modal.mealsCount', { count: stats.meals_count ?? 0 })}</span>
      </div>

      <div className="adm-grid-2">
        <div className="adm-form-field">
          <label className="adm-form-label">{t('admin.userManagement.fields.fullName')}</label>
          <input
            className="adm-form-input"
            value={form.name}
            onChange={(event) => setField('name', event.target.value)}
            placeholder={t('admin.userManagement.fields.fullNamePlaceholder')}
            style={errors.name ? { borderColor: '#b02500' } : undefined}
          />
          {errors.name && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#b02500' }}>{errors.name}</p>}
        </div>
        <div className="adm-form-field">
          <label className="adm-form-label">{t('admin.userManagement.fields.email')}</label>
          <input
            className="adm-form-input"
            type="email"
            value={form.email}
            onChange={(event) => setField('email', event.target.value)}
            placeholder={t('admin.userManagement.fields.emailPlaceholder')}
            style={errors.email ? { borderColor: '#b02500' } : undefined}
          />
          {errors.email && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#b02500' }}>{errors.email}</p>}
        </div>
      </div>

      <div className="adm-grid-2">
        <div className="adm-form-field">
          <label className="adm-form-label">{t('admin.userManagement.fields.role')}</label>
          <FormSelect
            value={form.role}
            onChange={(value) => setField('role', value)}
            options={ROLE_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
            disabled={isCurrentUser}
          />
        </div>
        <div className="adm-form-field">
          <label className="adm-form-label">{t('admin.userManagement.fields.goal')}</label>
          <FormSelect
            value={form.goal}
            onChange={(value) => setField('goal', value)}
            options={GOAL_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
          />
        </div>
      </div>

      <div className="adm-grid-2">
        <div className="adm-form-field">
          <label className="adm-form-label">{t('admin.userManagement.fields.activityLevel')}</label>
          <FormSelect
            value={form.activity_level}
            onChange={(value) => setField('activity_level', value)}
            options={ACTIVITY_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
          />
        </div>
        <div className="adm-form-field">
          <label className="adm-form-label">{t('admin.userManagement.fields.avatarUrl')}</label>
          <input className="adm-form-input" value={form.avatar} onChange={(event) => setField('avatar', event.target.value)} placeholder={t('admin.userManagement.fields.avatarPlaceholder')} />
        </div>
      </div>

      {isBanned(user) ? (
        <div className="adm-form-field">
          <label className="adm-form-label">{t('admin.userManagement.fields.banReason')}</label>
          <div className="adm-card" style={{ padding: 14, boxShadow: 'none' }}>
            <p style={{ margin: 0, color: '#5b5c5a' }}>{user.ban_reason || t('admin.userManagement.fields.noReason')}</p>
          </div>
        </div>
      ) : null}

      <div className="adm-form-actions">
        <button className="adm-btn-ghost" onClick={onClose}>{t('common.actions.close')}</button>
        <button className="adm-btn-primary" onClick={handleSave} disabled={isSaving || !user}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
          {isSaving ? t('settings.saving') : t('admin.userManagement.actions.saveChanges')}
        </button>
      </div>
    </>
  );
}

function BanUserModal({ user, onClose, onConfirm, isSubmitting, t }) {
  const [reason, setReason] = useState(user?.ban_reason || '');
  const isUserBanned = isBanned(user);

  return (
    <ModalPortal>
      <div className="adm-modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
        <div className="adm-modal" style={{ maxWidth: 460 }}>
          <button className="adm-modal-close" onClick={onClose}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
          <h2 className="adm-modal-title">{isUserBanned ? t('admin.userManagement.actions.unbanUser') : t('admin.userManagement.actions.banUser')}</h2>
          <p style={{ color: '#5b5c5a', lineHeight: 1.6 }}>
            {isUserBanned
              ? t('admin.userManagement.modal.unbanDescription', { name: user?.name || t('admin.userManagement.labels.thisUser') })
              : t('admin.userManagement.modal.banDescription', { name: user?.name || t('admin.userManagement.labels.thisUser') })}
          </p>

          {!isUserBanned ? (
            <div className="adm-form-field">
              <label className="adm-form-label">{t('admin.userManagement.fields.reason')}</label>
              <textarea
                className="adm-form-input"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t('admin.userManagement.fields.reasonPlaceholder')}
                rows={4}
                style={{ borderRadius: 18, resize: 'vertical', minHeight: 108, paddingTop: 14 }}
              />
            </div>
          ) : null}

          <div className="adm-form-actions">
            <button className="adm-btn-ghost" onClick={onClose}>{t('common.actions.close')}</button>
            <button
              className="adm-btn-primary"
              style={isUserBanned ? undefined : { background: '#b02500', boxShadow: '-4px 4px 0 #2e2f2e' }}
              onClick={() => onConfirm(reason)}
              disabled={isSubmitting}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {isUserBanned ? 'verified_user' : 'block'}
              </span>
              {isSubmitting ? t('settings.saving') : isUserBanned ? t('admin.userManagement.actions.unbanUser') : t('admin.userManagement.actions.banUser')}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function DeleteConfirm({ user, onClose, onConfirm, isDeleting, t }) {
  return (
    <ModalPortal>
      <div className="adm-modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
        <div className="adm-modal" style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
          <h2 className="adm-modal-title">{t('admin.userManagement.modal.deleteUserTitle')}</h2>
          <p style={{ color: '#5b5c5a', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            {t('admin.userManagement.modal.deleteUserBody', { name: user?.name || t('admin.userManagement.labels.thisUser') })}
          </p>
          <div className="adm-form-actions" style={{ justifyContent: 'center' }}>
            <button className="adm-btn-ghost" onClick={onClose}>{t('common.actions.close')}</button>
            <button
              className="adm-btn-primary"
              style={{ background: '#b02500', boxShadow: '-4px 4px 0 #2e2f2e' }}
              onClick={onConfirm}
              disabled={isDeleting}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete_forever</span>
              {isDeleting ? t('admin.userManagement.actions.deleting') : t('admin.userManagement.actions.deleteUser')}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export default function AdminUserManagement() {
  const { t, language } = useI18n();
  const locale = getLocaleForLanguage(language);
  const currentUserId = authStore((state) => state.user?.id);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [banTarget, setBanTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const searchValue = search.trim();
  const queryParams = {
    page,
    limit: PAGE_SIZE,
    ...(searchValue ? { search: searchValue } : {}),
    ...(roleFilter !== 'ALL' ? { role: roleFilter.toLowerCase() } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  };

  const usersQuery = useAdminUsers(queryParams);
  const usersVm = usersQuery.data || {};
  const users = usersVm.items || usersVm.users || [];
  const metadata = usersVm.metadata || usersVm.raw?.metadata || null;
  const summary = buildUserSummary(users);

  const updateUser = useUpdateAdminUser();
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();
  const deleteUser = useDeleteAdminUser();

  function handleSaveUser(form) {
    if (!selectedUserId) return;
    const isCurrentUser = isSameUserId(selectedUserId, currentUserId);
    const data = {
      name: form.name.trim(),
      email: form.email.trim(),
      goal: form.goal || '',
      activity_level: form.activity_level || '',
      avatar: form.avatar?.trim() || '',
    };

    if (!isCurrentUser) {
      data.role = form.role;
    }

    updateUser.mutate(
      {
        user_id: selectedUserId,
        data,
      },
      {
        onSuccess: () => {
          setSelectedUserId(null);
        },
      },
    );
  }

  function handleBanToggle(reason) {
    if (!banTarget) return;
    const targetId = banTarget.id;
    const mutation = isBanned(banTarget) ? unbanUser : banUser;
    const payload = isBanned(banTarget) ? targetId : { user_id: targetId, reason: reason?.trim() || '' };

    mutation.mutate(payload, {
      onSuccess: () => {
        setBanTarget(null);
      },
    });
  }

  function handleDeleteUser() {
    if (!deleteTarget) return;
    deleteUser.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
      },
    });
  }

  return (
    <div>
      <div className="adm-page-header">
        <div>
          <div className="adm-sticker adm-sticker--purple adm-sticker--rotate-l" style={{ marginBottom: 12 }}>
            {t('admin.userManagement.header.eyebrow')}
          </div>
          <h1 className="adm-page-title">
            {t('admin.userManagement.header.titleLine1')}
            <br />
            {t('admin.userManagement.header.titleLine2')}
          </h1>
        </div>
        <div className="adm-page-actions">
          <div className="adm-search-wrap">
            <span className="material-symbols-outlined adm-search-icon">search</span>
            <input
              className="adm-search"
              type="text"
              placeholder={t('admin.userManagement.search.placeholder')}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <PillSelect
            value={roleFilter}
            onChange={(value) => {
              setRoleFilter(value);
              setPage(1);
            }}
            options={[
              { value: 'ALL', label: t('admin.userManagement.filters.roleAll') },
              { value: 'ADMIN', label: t('admin.userManagement.roles.admin') },
              { value: 'MODERATOR', label: t('admin.userManagement.roles.moderator') },
              { value: 'USER', label: t('admin.userManagement.roles.user') },
            ]}
          />
          <PillSelect
            value={statusFilter.toUpperCase()}
            onChange={(value) => {
              setStatusFilter(value.toLowerCase());
              setPage(1);
            }}
            options={[
              { value: 'ALL', label: t('admin.userManagement.filters.statusAll') },
              { value: 'ACTIVE', label: t('admin.userManagement.status.active') },
              { value: 'BANNED', label: t('admin.userManagement.status.banned') },
            ]}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <span className="adm-chip adm-chip--oat">{t('admin.userManagement.summary.loaded', { count: summary.total })}</span>
        <span className="adm-chip adm-chip--green">{t('admin.userManagement.summary.active', { count: summary.active })}</span>
        <span className="adm-chip adm-chip--red">{t('admin.userManagement.summary.banned', { count: summary.banned })}</span>
        <span className="adm-chip adm-chip--purple">{t('admin.userManagement.summary.moderators', { count: summary.moderators })}</span>
        <span className="adm-chip adm-chip--green">{t('admin.userManagement.summary.admins', { count: summary.admins })}</span>
      </div>

      <div className="adm-table-wrap">
        {usersQuery.isLoading && !users.length ? (
          <div className="adm-empty">
            <span className="adm-empty-icon material-symbols-outlined">hourglass_top</span>
            <p className="adm-empty-text">{t('admin.userManagement.states.loadingUsers')}</p>
          </div>
        ) : usersQuery.error && !users.length ? (
          <div className="adm-empty">
            <span className="adm-empty-icon material-symbols-outlined">cloud_off</span>
            <p className="adm-empty-text">{t('admin.userManagement.states.loadFailed')}</p>
          </div>
        ) : !users.length ? (
          <div className="adm-empty">
            <span className="adm-empty-icon material-symbols-outlined">search_off</span>
            <p className="adm-empty-text">{t('admin.userManagement.states.noMatch')}</p>
          </div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>{t('admin.userManagement.table.user')}</th>
                <th>{t('admin.userManagement.table.email')}</th>
                <th>{t('admin.userManagement.table.role')}</th>
                <th>{t('admin.userManagement.table.status')}</th>
                <th>{t('admin.userManagement.table.goal')}</th>
                <th>{t('admin.userManagement.table.joined')}</th>
                <th>{t('admin.userManagement.table.updated')}</th>
                <th style={{ textAlign: 'right' }}>{t('admin.userManagement.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => {
                const role = normalizeRole(user.role);
                const status = getUserStatus(user);
                const isCurrentUser = isSameUserId(user.id, currentUserId);

                return (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            background: AVATAR_COLORS[index % AVATAR_COLORS.length],
                            color: AVATAR_TEXT[index % AVATAR_TEXT.length],
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 13,
                            border: '2px solid #dad4c8',
                            flexShrink: 0,
                            overflow: 'hidden',
                            backgroundImage: user.avatar ? `url(${user.avatar})` : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        >
                          {user.avatar ? '' : getInitials(user.name)}
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 13, color: '#2e2f2e', margin: 0 }}>{user.name || t('admin.userManagement.labels.unnamedUser')}</p>
                          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#767775', letterSpacing: '0.5px', margin: '2px 0 0' }}>
                            {String(user.id).slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="adm-td-mono">{user.email || t('admin.userManagement.labels.notAvailable')}</td>
                    <td><span className={`adm-chip ${ROLE_CHIP[role] || 'adm-chip--oat'}`}>{t(`admin.userManagement.roles.${role}`)}</span></td>
                    <td><span className={`adm-chip ${STATUS_CHIP[status]?.cls || 'adm-chip--oat'}`}>{t(STATUS_CHIP[status]?.labelKey || 'admin.userManagement.status.unknown')}</span></td>
                    <td><span className="adm-chip adm-chip--oat">{formatGoal(user.goal, t)}</span></td>
                    <td className="adm-td-mono">{formatDate(user.created_at, locale, t('admin.userManagement.labels.notAvailable'))}</td>
                    <td className="adm-td-mono">{formatRelativeTime(user.updated_at, language, t('admin.userManagement.labels.notAvailable'))}</td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                        <button
                          className="adm-icon-btn adm-icon-btn--edit"
                          title={t('admin.userManagement.actions.editUser')}
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit_note</span>
                        </button>
                        <button
                          className="adm-icon-btn"
                          title={status === 'banned' ? t('admin.userManagement.actions.unbanUser') : t('admin.userManagement.actions.banUser')}
                          onClick={() => setBanTarget(user)}
                          disabled={isCurrentUser}
                          style={status === 'banned' ? { color: '#38671a' } : { color: '#b02500' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                            {status === 'banned' ? 'verified_user' : 'block'}
                          </span>
                        </button>
                        <button
                          className="adm-icon-btn adm-icon-btn--danger"
                          title={t('admin.userManagement.actions.deleteUser')}
                          onClick={() => setDeleteTarget(user)}
                          disabled={isCurrentUser}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete_sweep</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: '1px', color: '#767775', margin: 0 }}>
          {t('admin.userManagement.pagination.showing', {
            loaded: users.length,
            total: metadata?.total_count || users.length,
            page: metadata?.page || page,
          })}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="adm-btn-ghost" style={{ padding: '8px 14px', fontSize: 11 }} onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={!metadata?.page || metadata.page <= 1}>
            {t('admin.userManagement.pagination.previous')}
          </button>
          <button className="adm-btn-primary" style={{ padding: '8px 14px', fontSize: 11 }}>
            {metadata?.page || page}
          </button>
          <button className="adm-btn-ghost" style={{ padding: '8px 14px', fontSize: 11 }} onClick={() => setPage((current) => current + 1)} disabled={!metadata?.has_next}>
            {t('admin.userManagement.pagination.next')}
          </button>
        </div>
      </div>

      {selectedUserId ? (
        <UserModal
          userId={selectedUserId}
          currentUserId={currentUserId}
          onClose={() => setSelectedUserId(null)}
          onSave={handleSaveUser}
          isSaving={updateUser.isPending}
          t={t}
          language={language}
          locale={locale}
        />
      ) : null}

      {banTarget ? (
        <BanUserModal
          user={banTarget}
          onClose={() => setBanTarget(null)}
          onConfirm={handleBanToggle}
          isSubmitting={banUser.isPending || unbanUser.isPending}
          t={t}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteConfirm
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteUser}
          isDeleting={deleteUser.isPending}
          t={t}
        />
      ) : null}
    </div>
  );
}
