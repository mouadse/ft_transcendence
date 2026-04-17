import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  usePersonalRecords,
  useWorkoutStats,
  useActivityCalendar,
  useStreaks,
  useWeeklySummary,
} from '../../../hooks/queries/useAnalytics';
import { getLocaleForLanguage, useI18n } from '../../../i18n/useI18n';
import './Progress.css';

/* ─── constants ─────────────────────────────────────────────────────── */

// Must match CSS: --cal-cell-size + --cal-gap
const CELL_SIZE = 13;
const CELL_GAP  = 4;
const COL_W     = CELL_SIZE + CELL_GAP; // 17px per column

/* ─── helpers ────────────────────────────────────────────────────────── */

function fmtNum(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
  return Math.round(n).toLocaleString();
}

function fmtDuration(mins) {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function clampPercent(value) {
  return Math.min(Math.max(value ?? 0, 0), 100);
}

function prTypeLabel(type, t) {
  switch (type) {
    case 'heaviest_set': return t('progressPage.pr.types.heaviestSet');
    case 'best_1rm':     return t('progressPage.pr.types.best1rm');
    case 'best_volume':  return t('progressPage.pr.types.bestVolume');
    case 'best_reps':    return t('progressPage.pr.types.bestReps');
    default:             return type;
  }
}

function prIcon(type) {
  switch (type) {
    case 'heaviest_set': return 'fitness_center';
    case 'best_1rm':     return 'bolt';
    case 'best_volume':  return 'local_fire_department';
    case 'best_reps':    return 'repeat';
    default:             return 'workspace_premium';
  }
}

function prAccent(type) {
  switch (type) {
    case 'heaviest_set': return 'green';
    case 'best_1rm':     return 'purple';
    case 'best_volume':  return 'amber';
    case 'best_reps':    return 'blue';
    default:             return 'green';
  }
}

/* ─── Activity Calendar (heatmap) ────────────────────────────────────── */

function ActivityCalendar({ data, locale, dayNames, monthNames, t }) {
  const [hovered, setHovered] = useState(null);

  // Build last 15 weeks (105 days) ending today
  const weeks = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 104);
    start.setDate(start.getDate() - start.getDay()); // snap to Sunday

    return Array.from({ length: 15 }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const date = new Date(start);
        date.setDate(date.getDate() + w * 7 + d);
        const key = date.toISOString().slice(0, 10);
        return {
          date: key,
          activities: data?.[key] || [],
          inFuture: date > today,
          dayIdx: d,
        };
      })
    );
  }, [data]);

  // Compute month label positions — one label per month transition
  const monthLabels = useMemo(() => {
    const labels = [];
    weeks.forEach((week, wi) => {
      const d  = new Date(week[0].date + 'T12:00:00');
      const pd = wi > 0 ? new Date(weeks[wi - 1][0].date + 'T12:00:00') : null;
      if (!pd || pd.getMonth() !== d.getMonth()) {
        labels.push({ label: monthNames[d.getMonth()], weekIdx: wi });
      }
    });
    return labels;
  }, [weeks, monthNames]);

  function intensity(activities) {
    const n = activities?.length ?? 0;
    if (n === 0) return 0;
    if (n >= 3)  return 3;
    if (n >= 2)  return 2;
    return 1;
  }

  return (
    <div className="prog-calendar">
      {/* Month labels — absolutely positioned to exact column offset */}
      <div className="prog-calendar-months">
        {monthLabels.map(({ label, weekIdx }) => (
          <span
            key={`${label}-${weekIdx}`}
            className="prog-calendar-month"
            style={{ left: weekIdx * COL_W + 'px' }}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="prog-calendar-grid">
        {/* Day labels */}
        <div className="prog-calendar-daylabels">
          {dayNames.map((d, i) => (
            <span key={d} className="prog-calendar-daylabel">
              {i % 2 === 1 ? d[0] : ''}
            </span>
          ))}
        </div>

        {/* Cells */}
        <div className="prog-calendar-cells">
          {weeks.map((week, wi) => (
            <div key={wi} className="prog-calendar-col">
              {week.map((cell) => {
                const lvl = intensity(cell.activities);
                return (
                  <div
                    key={cell.date}
                    className={[
                      'prog-cal-cell',
                      `prog-cal-cell--${lvl}`,
                      cell.inFuture ? 'prog-cal-cell--future' : '',
                    ].join(' ')}
                    onMouseEnter={() => !cell.inFuture && setHovered(cell)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {hovered === cell && (
                      <div className="prog-cal-tooltip">
                        <span className="prog-cal-tooltip-date">
                          {new Date(cell.date + 'T12:00:00').toLocaleDateString(locale, {
                            month: 'short', day: 'numeric',
                          })}
                        </span>
                        {cell.activities.length > 0 ? (
                          <span className="prog-cal-tooltip-acts">
                            {cell.activities.join(', ')}
                          </span>
                        ) : (
                          <span className="prog-cal-tooltip-acts prog-cal-tooltip-acts--empty">
                            {t('progressPage.calendar.restDay')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="prog-calendar-legend">
        <span className="prog-legend-label">{t('progressPage.calendar.less')}</span>
        {[0, 1, 2, 3].map(lvl => (
          <div key={lvl} className={`prog-cal-cell prog-cal-cell--${lvl} prog-cal-cell--legend`} />
        ))}
        <span className="prog-legend-label">{t('progressPage.calendar.more')}</span>
      </div>
    </div>
  );
}

/* ─── Mini Bar Chart (SVG) ────────────────────────────────────────────── */

function MiniBarChart({ data, t, color = 'oklch(0.44 0.15 140)', height = 88, barWidth = 26, gap = 8 }) {
  if (!data || data.length === 0) {
    return (
      <div className="prog-chart-empty">
        <span className="material-symbols-outlined">bar_chart</span>
        <span>{t('progressPage.charts.noData')}</span>
      </div>
    );
  }

  const maxVal      = Math.max(...data.map(d => d.value), 1);
  const totalWidth  = data.length * (barWidth + gap) - gap;
  const chartH      = height - 22;

  return (
    <svg
      className="prog-bar-chart"
      viewBox={`0 0 ${totalWidth} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {data.map((d, i) => {
        const barH = Math.max((d.value / maxVal) * chartH, 4);
        const x    = i * (barWidth + gap);
        const y    = chartH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={barH} rx={5} fill={color} opacity={0.9} />
            {d.label && (
              <text x={x + barWidth / 2} y={height - 5} textAnchor="middle" className="prog-bar-label">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Mini Line Chart (SVG) ──────────────────────────────────────────── */

function MiniLineChart({ data, t, color = 'oklch(0.44 0.15 140)', height = 88 }) {
  if (!data || data.length < 2) {
    return (
      <div className="prog-chart-empty">
        <span className="material-symbols-outlined">show_chart</span>
        <span>{t('progressPage.charts.notEnoughData')}</span>
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const minVal = Math.min(...data.map(d => d.value), 0);
  const range  = maxVal - minVal || 1;
  const w      = data.length * 48;
  const padTop = 8;
  const padBot = 22;
  const chartH = height - padTop - padBot;

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * w,
    y: padTop + chartH - ((d.value - minVal) / range) * chartH,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L${points.at(-1).x},${height - padBot} L${points[0].x},${height - padBot} Z`;
  const gradId = `lgrad-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg
      className="prog-line-chart"
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--bg-page)" stroke={color} strokeWidth="2.5" />
      ))}
      {data.map((d, i) => (
        <text key={i} x={points[i].x} y={height - 5} textAnchor="middle" className="prog-bar-label">
          {d.label}
        </text>
      ))}
    </svg>
  );
}

/* ─── Main Component ──────────────────────────────────────────────────── */

export default function Progress({ embedded = false }) {
  const navigate  = useNavigate();
  const { t, language } = useI18n();
  const locale = getLocaleForLanguage(language);
  const [prFilter, setPrFilter] = useState('all');

  const today         = new Date();
  const startOfRange  = new Date(today.getTime() - 105 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const endOfRange    = today.toISOString().slice(0, 10);

  const { data: recordsData,  isLoading: recordsLoading  } = usePersonalRecords({ limit: 100 });
  const { data: statsData,    isLoading: statsLoading    } = useWorkoutStats();
  const { data: calendarData, isLoading: calendarLoading } = useActivityCalendar({ start: startOfRange, end: endOfRange });
  const { data: streaksData,  isLoading: streaksLoading  } = useStreaks();
  const { data: weeklyData,   isLoading: weeklyLoading   } = useWeeklySummary();

  const records = useMemo(
    () => recordsData?.records || recordsData?.data || (Array.isArray(recordsData) ? recordsData : []),
    [recordsData]
  );
  const stats = useMemo(() => statsData || {}, [statsData]);
  const streaks  = streaksData?.streaks || {};
  const adherence = streaksData?.adherence_summary || {};

  const filteredRecords = useMemo(() => {
    if (prFilter === 'all') return records;
    return records.filter(r => r.type === prFilter);
  }, [records, prFilter]);

  const typeBreakdown = useMemo(() => {
    const types = stats?.workout_types || {};
    return Object.entries(types).map(([type, count]) => ({
      label: type.slice(0, 3).toUpperCase(),
      value: count,
    }));
  }, [stats]);

  const weeklyChart = useMemo(() => {
    if (!weeklyData) return [];
    if (Array.isArray(weeklyData.daily_breakdown) && weeklyData.daily_breakdown.length > 0) {
      return weeklyData.daily_breakdown.map(d => ({
        label: new Date(d.date).toLocaleDateString(locale, { weekday: 'short' }).slice(0, 2),
        value: d.workouts || d.calories || 0,
      }));
    }
    const totals = [
      { label: 'WO', value: weeklyData.workout_count ?? 0 },
      { label: 'ME', value: weeklyData.meal_count ?? 0 },
      {
        label: 'CA',
        value: weeklyData.target_calories > 0
          ? (weeklyData.total_calories / weeklyData.target_calories) * 100
          : 0,
      },
      {
        label: 'PR',
        value: weeklyData.target_protein > 0
          ? (weeklyData.total_protein / weeklyData.target_protein) * 100
          : 0,
      },
    ];
    return totals.some(p => p.value > 0) ? totals : [];
  }, [weeklyData, locale]);

  const isLoading = recordsLoading || statsLoading || calendarLoading || streaksLoading || weeklyLoading;

  const dayNames = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 7 + i).toLocaleDateString(locale, { weekday: 'short' })),
    [locale]
  );
  const monthNames = useMemo(
    () => Array.from({ length: 12 }, (_, i) => new Date(2024, i, 1).toLocaleDateString(locale, { month: 'short' })),
    [locale]
  );

  const PR_FILTERS = [
    { key: 'all',         label: t('progressPage.filters.all') },
    { key: 'heaviest_set', label: t('progressPage.filters.weight') },
    { key: 'best_1rm',    label: t('progressPage.filters.oneRm') },
    { key: 'best_volume', label: t('progressPage.filters.volume') },
    { key: 'best_reps',   label: t('progressPage.filters.reps') },
  ];

  return (
    <div className={`prog-root${embedded ? ' prog-root--embedded' : ''}`}>
      {/* ── Header ── */}
      <header className="prog-header">
        {!embedded && (
          <button className="prog-back-btn" onClick={() => navigate('/dashboard')} aria-label={t('common.actions.goBack')}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}
        <div className="prog-header-text">
          <h1 className="prog-title">{t('progressPage.title')}</h1>
          <p className="prog-subtitle">{t('progressPage.subtitle')}</p>
        </div>
        <div className="prog-header-actions">
          <button className="prog-motivate-btn" onClick={() => navigate('/dashboard#dashboard-leaderboard')}>
            <span className="material-symbols-outlined">emoji_events</span>
            <span>{t('progressPage.actions.motivation')}</span>
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="prog-loading">
          <div className="prog-spinner" />
          <span>{t('progressPage.loading')}</span>
        </div>
      ) : (
        <main className="prog-main">

          {/* ── Streaks & Consistency ── */}
          <section className="prog-section">
            <span className="prog-section-label">{t('progressPage.sections.streaks')}</span>

            <div className="prog-streaks-row">
              {[
                { icon: 'fitness_center',  val: streaks.workout_streak ?? 0,  unit: t('progressPage.units.week'), color: 'green',  label: t('progressPage.labels.workout') },
                { icon: 'restaurant',      val: streaks.meal_streak ?? 0,     unit: t('progressPage.units.day'), color: 'purple', label: t('progressPage.labels.nutrition') },
                { icon: 'monitor_weight',  val: streaks.weigh_in_streak ?? 0, unit: t('progressPage.units.day'), color: 'amber',  label: t('progressPage.labels.weighIn') },
              ].map((s, i) => (
                <div key={i} className={`prog-streak-col prog-streak-col--${s.color}`}>
                  <div className="prog-streak-icon-wrap">
                    <span className="material-symbols-outlined">{s.icon}</span>
                  </div>
                  <div className="prog-streak-num-row">
                    <span className="prog-streak-num">{s.val}</span>
                    <span className="prog-streak-unit">{s.unit}</span>
                  </div>
                  <span className="prog-streak-name">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="prog-adherence-block">
              <span className="prog-adherence-title">{t('progressPage.sections.adherence')}</span>
              {[
                { label: t('progressPage.labels.days7'),  val: adherence.days_7  },
                { label: t('progressPage.labels.days30'), val: adherence.days_30 },
                { label: t('progressPage.labels.days90'), val: adherence.days_90 },
              ].map(a => (
                <div key={a.label} className="prog-adherence-row">
                  <span className="prog-adherence-label">{a.label}</span>
                  <div className="prog-adherence-track">
                    <div
                      className="prog-adherence-fill"
                      style={{ width: `${clampPercent(a.val)}%` }}
                    />
                  </div>
                  <span className="prog-adherence-pct">
                    {a.val != null ? Math.round(clampPercent(a.val)) + '%' : '—'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Activity Calendar ── */}
          <section className="prog-section">
            <span className="prog-section-label">{t('progressPage.sections.activityCalendar')}</span>
            <ActivityCalendar data={calendarData} locale={locale} dayNames={dayNames} monthNames={monthNames} t={t} />
          </section>

          {/* ── Workout Stats ── */}
          <section className="prog-section">
            <span className="prog-section-label">{t('progressPage.sections.workoutStats')}</span>
            <div className="prog-stats-grid">
              {[
                { val: fmtNum(stats.total_workouts),          desc: t('progressPage.stats.totalWorkouts') },
                { val: fmtDuration(stats.avg_workout_duration), desc: t('progressPage.stats.avgDuration') },
                { val: fmtNum(stats.total_volume),            desc: t('progressPage.stats.totalVolume') },
                { val: fmtNum(stats.total_sets),              desc: t('progressPage.stats.totalSets') },
              ].map((s, i) => (
                <div key={i} className="prog-stat-tile">
                  <span className="prog-stat-val">{s.val}</span>
                  <span className="prog-stat-desc">{s.desc}</span>
                </div>
              ))}
            </div>
            {typeBreakdown.length > 0 && (
              <div className="prog-chart-block">
                <span className="prog-mini-label">{t('progressPage.labels.byType')}</span>
                <MiniBarChart data={typeBreakdown} t={t} color="oklch(0.44 0.15 140)" />
              </div>
            )}
          </section>

          {/* ── Personal Records ── */}
          <section className="prog-section">
            <div className="prog-prs-head">
              <span className="prog-section-label">{t('progressPage.sections.personalRecords')}</span>
              <div className="prog-pr-filters">
                {PR_FILTERS.map(f => (
                  <button
                    key={f.key}
                    className={`prog-pr-chip${prFilter === f.key ? ' prog-pr-chip--on' : ''}`}
                    onClick={() => setPrFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="prog-empty">
                <span className="material-symbols-outlined prog-empty-icon">workspace_premium</span>
                <p className="prog-empty-title">{t('progressPage.empty.noRecords')}</p>
                <span className="prog-empty-hint">{t('progressPage.empty.noRecordsHint')}</span>
              </div>
            ) : (
              <div className="prog-pr-list">
                {filteredRecords.map((pr, i) => (
                  <div
                    key={pr.exercise_id + pr.type + i}
                    className={`prog-pr-item prog-pr-item--${prAccent(pr.type)}`}
                  >
                    <div className={`prog-pr-icon prog-pr-icon--${prAccent(pr.type)}`}>
                      <span className="material-symbols-outlined">{prIcon(pr.type)}</span>
                    </div>
                    <div className="prog-pr-body">
                      <span className="prog-pr-exercise">{pr.exercise_name}</span>
                      <span className="prog-pr-meta">
                        {prTypeLabel(pr.type, t)}
                        {pr.date && (
                          <>
                            {' · '}
                            {new Date(pr.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="prog-pr-value">
                      <span className="prog-pr-num">{fmtNum(pr.value)}</span>
                      {pr.type === 'best_reps' ? (
                        <span className="prog-pr-unit">{t('progressPage.units.reps')}</span>
                      ) : (
                        <span className="prog-pr-unit">{t('common.units.kg')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Weekly Trends ── */}
          <section className="prog-section">
            <span className="prog-section-label">{t('progressPage.sections.weeklyTrends')}</span>
            {weeklyChart.length > 0 ? (
              <div className="prog-chart-block">
                <span className="prog-mini-label">{t('progressPage.labels.weeklySnapshot')}</span>
                <MiniLineChart data={weeklyChart} t={t} color="oklch(0.44 0.15 140)" />
              </div>
            ) : (
              <div className="prog-empty">
                <span className="material-symbols-outlined prog-empty-icon">trending_up</span>
                <p className="prog-empty-title">{t('progressPage.empty.trendsTitle')}</p>
                <span className="prog-empty-hint">{t('progressPage.empty.trendsHint')}</span>
              </div>
            )}
          </section>

          <div className="prog-bottom-spacer" />
        </main>
      )}
    </div>
  );
}
