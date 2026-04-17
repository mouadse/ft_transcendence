import { useEffect } from 'react';
import { useAdminDashboard, useAdminLogs, useAdminMetrics } from '../../hooks/queries/useAdmin';
import { useAdminRealtime } from '../../hooks/queries/useAdminRealtime';
import { getLocaleForLanguage, useI18n } from '../../i18n/useI18n';
import { useQueryClient } from '@tanstack/react-query';

const ROLE_COLOR = { admin: 'adm-chip--green', coach: 'adm-chip--purple', user: 'adm-chip--oat' };

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function firstNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function resolveRealtimeNumber(realtimeValue, fallbackValue) {
  const parsed = Number(realtimeValue);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
}

function realtimeStatusMeta(status, t) {
  switch (status) {
    case 'live':
      return { label: `🟢 ${t('admin.dashboard.status.live')}`, className: 'adm-chip adm-chip--green' };
    case 'reconnecting':
    case 'connecting':
      return { label: `🟡 ${t('admin.dashboard.status.reconnecting')}`, className: 'adm-chip adm-chip--oat' };
    case 'disabled':
      return { label: `🟡 ${t('admin.dashboard.status.pollingFallback')}`, className: 'adm-chip adm-chip--oat' };
    default:
      return { label: `🔴 ${t('admin.dashboard.status.disconnected')}`, className: 'adm-chip adm-chip--red' };
  }
}

function safePercent(value, total) {
  const base = toNumber(total);
  if (base <= 0) return 0;
  return Math.max(0, Math.min(100, (toNumber(value) / base) * 100));
}

function formatNumber(value, locale) {
  return new Intl.NumberFormat(locale).format(toNumber(value));
}

function formatCompact(value, locale) {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(toNumber(value));
}

function formatPercent(value, digits = 0) {
  return `${toNumber(value).toFixed(digits)}%`;
}

function formatTimestamp(value, locale, emptyLabel) {
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

function formatRelativeTime(value, language, emptyLabel) {
  if (!value) return emptyLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return emptyLabel;
  const diffMs = date.getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });

  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffHours = Math.round(diffMin / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, 'day');
}

function formatGoal(goal, unknownLabel) {
  if (!goal) return unknownLabel;
  return String(goal)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatAction(action, unknownLabel) {
  if (!action) return unknownLabel;
  return String(action)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function shortId(value, fallback) {
  if (!value) return fallback;
  return String(value).slice(0, 8);
}

function buildPopularExercises(rows, unknownExerciseLabel) {
  const data = asArray(rows)
    .map((row) => ({
      name: row?.exercise_name || row?.name || unknownExerciseLabel,
      logs: toNumber(row?.usage_count || row?.count),
      uniqueUsers: toNumber(row?.unique_users),
    }))
    .slice(0, 5);
  const max = Math.max(1, ...data.map((row) => row.logs));
  return data.map((row) => ({
    ...row,
    pct: Math.max(10, (row.logs / max) * 100),
  }));
}

function buildGoalBreakdown(rows, totalUsers, unknownGoalLabel) {
  const total = Math.max(1, toNumber(totalUsers));
  return asArray(rows)
    .map((row) => ({
      goal: formatGoal(row?.goal, unknownGoalLabel),
      count: toNumber(row?.count),
      pct: safePercent(row?.count, total),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}

function buildRecentActivity(rows, t, language) {
  return asArray(rows).slice(0, 6).map((row) => ({
    id: row?.id || `${row?.admin_id}-${row?.created_at}`,
    actor: t('admin.dashboard.recent.actorWithId', {
      id: shortId(row?.admin_id, t('admin.dashboard.recent.system')),
    }),
    action: formatAction(row?.action, t('admin.dashboard.unknown.action')),
    entity: formatGoal(row?.entity_type, t('admin.dashboard.unknown.goal')),
    time: formatRelativeTime(row?.created_at, language, t('admin.dashboard.time.justNow')),
    role: 'admin',
    createdAt: row?.created_at,
  }));
}

function MetricCard({ label, value, badge, bar, background, valueColor, labelColor, barColor }) {
  return (
    <div className="adm-metric-card" style={background ? { background } : undefined}>
      {badge ? (
        <div
          className="adm-metric-badge"
          style={background && background !== '#fff' ? { background: '#2e2f2e', color: '#faf9f7' } : undefined}
        >
          {badge}
        </div>
      ) : null}
      <p className="adm-metric-label" style={labelColor ? { color: labelColor } : undefined}>
        {label}
      </p>
      <p className="adm-metric-value" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </p>
      {bar !== null && bar !== undefined ? (
        <div className="adm-metric-bar-wrap">
          <div className="adm-metric-bar" style={{ width: `${Math.max(0, Math.min(100, bar))}%`, background: barColor || '#38671a' }} />
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="adm-card" style={{ padding: 24 }}>
      <p style={{ fontWeight: 800, marginBottom: 8 }}>{title}</p>
      <p style={{ color: '#5b5c5a', margin: 0 }}>{body}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { t, language } = useI18n();
  const locale = getLocaleForLanguage(language);
  const dashboardQuery = useAdminDashboard();
  const metricsQuery = useAdminMetrics();
  const logsQuery = useAdminLogs({ page: 1, limit: 6 });
  const queryClient = useQueryClient();
  const realtime = useAdminRealtime((eventType) => {
    // A signup changes both the counters and the user list, so refresh the
    // affected admin queries immediately instead of waiting for the next poll.
    if (eventType !== 'user_signup') return;

    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] });
  });

  useEffect(() => {
    // When the WebSocket is live we still periodically refresh REST data
    // because the WS payload does not cover every admin field (e.g. goal
    // breakdown, popular exercises, etc.).  Use a longer interval since
    // critical counters (totalUsers, workoutsToday, mealsToday) come from WS.
    const interval = realtime.isLive ? 30_000 : 5_000;
    const timerId = window.setInterval(() => {
      dashboardQuery.refetch();
      metricsQuery.refetch();
    }, interval);
    return () => window.clearInterval(timerId);
  }, [realtime.isLive, dashboardQuery, metricsQuery]);

  const dashboard = dashboardQuery.data?.item || {};
  const summary = dashboard.summary || {};
  const metrics = metricsQuery.data?.item || {};
  const userStats = metrics.users || {};
  const workoutStats = metrics.workouts || {};
  const nutritionStats = metrics.nutrition || {};
  const moderationStats = metrics.moderation || {};
  const logsPayload = logsQuery.data?.item || {};
  const logs = asArray(logsPayload.data || logsPayload.items || logsPayload.logs || logsPayload);

  const totalUsers = resolveRealtimeNumber(realtime.metrics?.totalUsers, firstNumber(userStats.total_users, summary.total_users));
  const activeToday = resolveRealtimeNumber(realtime.metrics?.activeUsers, firstNumber(summary.dau));
  const active7d = firstNumber(userStats.active_users_7d);
  const mau = firstNumber(summary.mau, userStats.mau);
  const newUsers7d = resolveRealtimeNumber(realtime.metrics?.newUsers7d, firstNumber(summary.new_users_7d));
  const totalWorkouts = firstNumber(workoutStats.total_workouts);
  const workoutsToday = resolveRealtimeNumber(
    realtime.metrics?.workoutsToday,
    firstNumber(summary.workouts_today, workoutStats.workouts_today)
  );
  const mealsToday = resolveRealtimeNumber(
    realtime.metrics?.mealsToday,
    firstNumber(nutritionStats.meals_today)
  );
  const lastSyncAt = realtime.metrics?.timestamp || summary.updated_at;
  const realtimeStatus = realtimeStatusMeta(realtime.connectionStatus, t);

  const cards = [
    {
      label: t('admin.dashboard.cards.totalUsers'),
      value: formatNumber(totalUsers, locale),
      badge: t('admin.dashboard.cards.mau', { value: formatNumber(mau, locale) }),
      bar: safePercent(active7d, totalUsers),
      background: '#fff',
    },
    {
      label: t('admin.dashboard.cards.activeToday'),
      value: formatNumber(activeToday, locale),
      badge: formatPercent(firstNumber(summary.dau_mau_ratio), 1),
      bar: safePercent(activeToday, mau),
      background: '#c3fb9c',
      valueColor: '#214f01',
      labelColor: 'rgba(33,79,1,0.72)',
    },
    {
      label: t('admin.dashboard.cards.newThisWeek'),
      value: formatNumber(newUsers7d, locale),
      badge: t('admin.dashboard.cards.active7d', { count: formatNumber(active7d, locale) }),
      bar: safePercent(newUsers7d, totalUsers),
      background: '#fff',
    },
    {
      label: t('admin.dashboard.cards.workoutsLogged'),
      value: formatNumber(workoutsToday, locale),
      badge: t('admin.dashboard.cards.total', { value: formatCompact(totalWorkouts, locale) }),
      bar: safePercent(workoutsToday, Math.max(totalWorkouts, workoutsToday, 1)),
      background: '#b4a5ff',
      valueColor: '#180058',
      labelColor: 'rgba(24,0,88,0.65)',
      barColor: '#180058',
    },
  ];

  const popularExercises = buildPopularExercises(workoutStats.popular_exercises, t('admin.dashboard.unknown.exercise'));
  const goalBreakdown = buildGoalBreakdown(
    userStats.goal_breakdown,
    firstNumber(userStats.total_users, summary.total_users),
    t('admin.dashboard.unknown.goal')
  );
  const recentActivity = buildRecentActivity(logs, t, language);

  const isLoading = dashboardQuery.isLoading || metricsQuery.isLoading;
  const hasCriticalData = Object.keys(summary).length > 0 || Object.keys(metrics).length > 0;
  const hasErrors = dashboardQuery.error || metricsQuery.error || logsQuery.error;

  if (isLoading && !hasCriticalData) {
    return (
      <div>
        <div className="adm-page-header">
          <div>
            <p className="adm-page-eyebrow">// OVERVIEW_TERMINAL_V1</p>
            <h1 className="adm-page-title">
              {t('admin.dashboard.header.line1')}
              <br />
              {t('admin.dashboard.header.line2')}
            </h1>
          </div>
        </div>
        <div className="adm-grid-4" style={{ marginBottom: 28 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="adm-metric-card" style={{ minHeight: 182, opacity: 0.72 }}>
              <p className="adm-metric-label">{t('admin.dashboard.loading.metric')}</p>
            </div>
          ))}
        </div>
        <EmptyState
          title={t('admin.dashboard.loading.title')}
          body={t('admin.dashboard.loading.body')}
        />
      </div>
    );
  }

  if (!hasCriticalData && hasErrors) {
    return (
      <div>
        <div className="adm-page-header">
          <div>
            <p className="adm-page-eyebrow">// OVERVIEW_TERMINAL_V1</p>
            <h1 className="adm-page-title">
              {t('admin.dashboard.header.line1')}
              <br />
              {t('admin.dashboard.header.line2')}
            </h1>
          </div>
        </div>
        <EmptyState
          title={t('admin.dashboard.unavailable.title')}
          body={t('admin.dashboard.unavailable.body')}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="adm-page-header">
        <div>
          <p className="adm-page-eyebrow">// OVERVIEW_TERMINAL_V1</p>
          <h1 className="adm-page-title">
            {t('admin.dashboard.header.line1')}
            <br />
            {t('admin.dashboard.header.line2')}
          </h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          <div className="adm-sticker adm-sticker--rotate-r" style={{ background: hasErrors ? '#f8cc65' : '#c3fb9c' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              {hasErrors ? 'warning' : 'bolt'}
            </span>
            {t('admin.dashboard.lastSync', {
              value: formatTimestamp(lastSyncAt, locale, t('admin.dashboard.time.noSync')),
            })}
          </div>
          <span className={realtimeStatus.className}>{realtimeStatus.label}</span>
          {hasErrors ? (
            <span className="adm-chip adm-chip--oat">{t('admin.dashboard.partialData')}</span>
          ) : null}
        </div>
      </div>

      <div className="adm-grid-4" style={{ marginBottom: 28 }}>
        {cards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            badge={card.badge}
            bar={card.bar}
            background={card.background}
            valueColor={card.valueColor}
            labelColor={card.labelColor}
            barColor={card.barColor}
          />
        ))}
      </div>

      <div className="adm-grid-2" style={{ marginBottom: 28 }}>
        <div style={{ background: '#faf9f7', border: '2px dashed #dad4c8', borderRadius: 16, padding: 24 }}>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', color: '#38671a', fontWeight: 700, marginBottom: 20, textDecoration: 'underline', textDecorationStyle: 'wavy', textUnderlineOffset: 6 }}>
            {t('admin.dashboard.sections.popularExercises')}
          </p>
          {popularExercises.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {popularExercises.map((exercise) => (
                <div key={exercise.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                    <span>{exercise.name}</span>
                    <span style={{ color: '#5b5c5a' }}>
                      {t('admin.dashboard.sections.logs', { count: formatNumber(exercise.logs, locale) })}
                    </span>
                  </div>
                  <div style={{ height: 8, background: '#e8e2d6', borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${exercise.pct}%`, background: '#38671a', borderRadius: 9999 }} />
                  </div>
                  <div style={{ marginTop: 6, fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#767775' }}>
                    {t('admin.dashboard.sections.distinctUsers', { count: formatNumber(exercise.uniqueUsers, locale) })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#5b5c5a', margin: 0 }}>{t('admin.dashboard.sections.popularEmpty')}</p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="adm-metric-card" style={{ background: '#c3fb9c', flex: 1 }}>
            <p className="adm-metric-label" style={{ color: 'rgba(33,79,1,0.72)' }}>
              {t('admin.dashboard.sections.goalBreakdown')}
            </p>
            {goalBreakdown.length ? (
              <>
                <p className="adm-metric-value" style={{ color: '#214f01', fontSize: 36 }}>
                  {goalBreakdown[0].goal}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                  {goalBreakdown.map((goal) => (
                    <div key={goal.goal}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: '#214f01' }}>
                        <span>{goal.goal}</span>
                        <span>{formatNumber(goal.count, locale)}</span>
                      </div>
                      <div style={{ height: 7, background: 'rgba(33,79,1,0.14)', borderRadius: 9999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${goal.pct}%`, background: '#214f01', borderRadius: 9999 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: '#214f01', margin: 0 }}>{t('admin.dashboard.sections.goalEmpty')}</p>
            )}
          </div>

          <div className="adm-metric-card" style={{ flex: 1 }}>
            <div style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: '50%', background: '#f9f2e5', border: '2px dashed #38671a', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(12deg)' }}>
              <span className="material-symbols-outlined" style={{ color: '#38671a', fontSize: 20 }}>restaurant</span>
            </div>
            <p className="adm-metric-label">{t('admin.dashboard.sections.nutritionOps')}</p>
            <p className="adm-metric-value">
              {formatNumber(mealsToday, locale)}
              <span style={{ fontSize: 20 }}>
                {' '}
                {t('admin.dashboard.sections.mealsToday')}
              </span>
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              <span className="adm-chip adm-chip--oat">
                {t('admin.dashboard.sections.totalMeals', {
                  count: formatCompact(firstNumber(nutritionStats.total_meals, nutritionStats.total_meals_logged), locale),
                })}
              </span>
              <span className="adm-chip adm-chip--purple">
                {t('admin.dashboard.sections.pendingExports', {
                  count: formatNumber(firstNumber(moderationStats.pending_exports), locale),
                })}
              </span>
              <span className="adm-chip adm-chip--red">
                {t('admin.dashboard.sections.deletionRequests', {
                  count: formatNumber(firstNumber(moderationStats.deletion_requests), locale),
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#2e2f2e', fontWeight: 700, margin: 0 }}>
            {t('admin.dashboard.recent.title')}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className={`adm-chip ${ROLE_COLOR.admin}`}>{t('admin.dashboard.recent.auditLogs')}</span>
            <span className="adm-chip adm-chip--oat">
              {t('admin.dashboard.recent.showingLatest', {
                count: formatNumber(recentActivity.length || 0, locale),
              })}
            </span>
          </div>
        </div>
        <div className="adm-table-wrap">
          {recentActivity.length ? (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>{t('admin.dashboard.table.actor')}</th>
                  <th>{t('admin.dashboard.table.action')}</th>
                  <th>{t('admin.dashboard.table.entity')}</th>
                  <th>{t('admin.dashboard.table.role')}</th>
                  <th>{t('admin.dashboard.table.time')}</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((entry) => (
                  <tr key={entry.id}>
                    <td><strong>{entry.actor}</strong></td>
                    <td style={{ color: '#5b5c5a' }}>{entry.action}</td>
                    <td><span className="adm-chip adm-chip--oat">{entry.entity}</span></td>
                    <td><span className={`adm-chip ${ROLE_COLOR[entry.role]}`}>{t(`admin.dashboard.roles.${entry.role}`)}</span></td>
                    <td className="adm-td-mono">{entry.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 24, color: '#5b5c5a' }}>{t('admin.dashboard.recent.empty')}</div>
          )}
        </div>
      </div>
    </div>
  );
}
