import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { leaderboardAPI } from '../../../api/leaderboard';
import { useAuth } from '../../../hooks/useAuth';
import { useLeaderboard } from '../../../hooks/queries/useLeaderboard';
import { useI18n } from '../../../i18n/useI18n';
import './Leaderboard.css';

// ── Constants ──────────────────────────────────────────────────────────

const PERIOD_FILTERS = ['weekly', 'monthly', 'yearly'];

const PILLAR_META = {
  training:    { icon: 'fitness_center', tone: 'training' },
  nutrition:   { icon: 'restaurant',     tone: 'nutrition' },
  consistency: { icon: 'event_repeat',   tone: 'consistency' },
};

const LIMIT = 20;
const SNAPSHOT_LIMIT = 100;

// ── Helpers ────────────────────────────────────────────────────────────

function formatScore(value) {
  if (!Number.isFinite(value)) return '0';
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (value >= 100)  return value.toFixed(1);
  return value.toFixed(2);
}

function normalizeId(value) {
  return String(value || '').toLowerCase();
}

function getInitial(name) {
  return String(name || 'A').trim().charAt(0).toUpperCase() || 'A';
}

function getPillarMedal(entry) {
  if (!entry) return null;
  const scores = [
    { key: 'training',    value: Number(entry.training_score)    || 0 },
    { key: 'nutrition',   value: Number(entry.nutrition_score)   || 0 },
    { key: 'consistency', value: Number(entry.consistency_score) || 0 },
  ];
  const dominant = scores.sort((a, b) => b.value - a.value)[0];
  if (!dominant || dominant.value <= 0) return null;
  return { ...PILLAR_META[dominant.key], score: dominant.value };
}

// ── Sub-components ─────────────────────────────────────────────────────

function MedalBadge({ entry }) {
  const { t } = useI18n();
  const medal = getPillarMedal(entry);
  if (!medal) return null;
  return (
    <span className={`lb-medal lb-medal--${medal.tone}`}>
      <span className="material-symbols-outlined">{medal.icon}</span>
      {t(`leaderboardPage.medals.${medal.key}`)}
    </span>
  );
}

function Avatar({ entry, size = 'md' }) {
  return (
    <div className={`lb-avatar lb-avatar--${size}`}>
      {entry?.avatar
        ? <img src={entry.avatar} alt="" loading="lazy" />
        : <span>{getInitial(entry?.user_name)}</span>}
    </div>
  );
}

// ── Score Section ──────────────────────────────────────────────────────

function ScoreSection({
  currentEntry,
  percentile,
  period,
  onJoinBoard,
  isFindingEntry,
  showJoinButton = true,
}) {
  const { t } = useI18n();
  const hasEntry = !!currentEntry;
  const rank     = currentEntry?.rank;
  const score    = hasEntry ? (Number(currentEntry.score) || 0) : 0;

  return (
    <section className="lb-score-section">
      <div className="lb-score-inner">
        <div className="lb-score-accent" />

        <div className="lb-score-body">
          {/* Rank */}
          <div className="lb-score-rank-block">
            <div className="lb-score-metric-box">
              <span className="lb-eyebrow">{t('leaderboardPage.rank.title')}</span>
              <p className="lb-rank-display">{hasEntry ? `#${rank}` : '—'}</p>
            </div>
            <p className="lb-rank-context">
              {hasEntry
                ? t('leaderboardPage.rank.topPercentile', { percentile, period: t(`leaderboardPage.periods.${period}`) })
                : t('leaderboardPage.rank.startLogging')}
            </p>
          </div>

          {/* Score */}
          <div className="lb-score-pts-block">
            <div className="lb-score-metric-box lb-score-metric-box--score">
              <span className="lb-eyebrow">{t('leaderboardPage.score.title')}</span>
              <p className="lb-score-display">{hasEntry ? formatScore(score) : '—'}</p>
              <span className="lb-score-unit">{t('leaderboardPage.score.unit')}</span>
            </div>
            {hasEntry && <MedalBadge entry={currentEntry} />}
          </div>
        </div>

        {/* Pillar mini breakdown */}
        {hasEntry && (
          <div className="lb-score-breakdown">
            <div className="lb-breakdown-pill lb-breakdown-pill--training">
              <span className="material-symbols-outlined">fitness_center</span>
              <span>{formatScore(currentEntry.training_score)}</span>
            </div>
            <div className="lb-breakdown-pill lb-breakdown-pill--nutrition">
              <span className="material-symbols-outlined">restaurant</span>
              <span>{formatScore(currentEntry.nutrition_score)}</span>
            </div>
            <div className="lb-breakdown-pill lb-breakdown-pill--consistency">
              <span className="material-symbols-outlined">event_repeat</span>
              <span>{formatScore(currentEntry.consistency_score)}</span>
            </div>
          </div>
        )}

        {/* Join board CTA — only when not on board */}
        {showJoinButton && !hasEntry && (
          <button
            className="lb-join-btn"
            onClick={onJoinBoard}
            disabled={isFindingEntry}
          >
            <span className="material-symbols-outlined">emoji_events</span>
            {isFindingEntry ? t('leaderboardPage.actions.searching') : t('leaderboardPage.actions.joinBoard')}
          </button>
        )}
      </div>
    </section>
  );
}

// ── Period Section ─────────────────────────────────────────────────────

function PeriodSection({ period, onChange }) {
  const { t } = useI18n();
  return (
    <section className="lb-period-section" role="tablist" aria-label={t('leaderboardPage.periodFilterAria')}>
      {PERIOD_FILTERS.map((item) => (
        <button
          key={item}
          role="tab"
          aria-selected={period === item}
          className={`lb-period-btn${period === item ? ' lb-period-btn--active' : ''}`}
          onClick={() => onChange(item)}
        >
          {t(`leaderboardPage.periods.${item}`)}
        </button>
      ))}
    </section>
  );
}

// ── Podium ─────────────────────────────────────────────────────────────

function PodiumCard({ entry, rankNumber, tone }) {
  const { t } = useI18n();
  if (!entry) return <div className={`lb-podium-card lb-podium-card--empty lb-podium-card--${tone}`} />;
  return (
    <article className={`lb-podium-card lb-podium-card--${tone}`}>
      <span className="lb-podium-pos">#{entry.rank || rankNumber}</span>
      <Avatar entry={entry} size="lg" />
      <h3 className="lb-podium-name">{entry.user_name}</h3>
      <p className="lb-podium-score">{formatScore(entry.score)} {t('leaderboardPage.score.unit')}</p>
    </article>
  );
}

// ── Row ────────────────────────────────────────────────────────────────

function RankingRow({ entry, isMe, rowRef }) {
  const { t } = useI18n();
  return (
    <article
      ref={rowRef}
      className={`lb-row${isMe ? ' lb-row--me' : ''}`}
    >
      <span className="lb-row-rank">#{entry.rank}</span>
      <Avatar entry={entry} size="sm" />
      <div className="lb-row-info">
        <div className="lb-row-name-line">
          <h3 className="lb-row-name">{entry.user_name}</h3>
          {isMe && <span className="lb-you-tag">{t('leaderboardPage.labels.you')}</span>}
        </div>
        <MedalBadge entry={entry} />
      </div>
      <div className="lb-row-score-col">
        <span className="lb-row-score">{formatScore(entry.score)}</span>
        <span className="lb-row-unit">{t('leaderboardPage.score.unit')}</span>
      </div>
    </article>
  );
}

// ── Ranking Section ────────────────────────────────────────────────────

function RankingSection({
  entries, podiumEntries, total, isLoading, isError,
  offset, hasNext, hasPrev, isFetching,
  currentUserId, currentEntry, currentEntryOnPage,
  onPrev, onNext, onRetry, rowRefs, onJumpToMe,
  isFindingCurrentEntry,
  showMyRankBar = true,
}) {
  const { t } = useI18n();
  return (
    <section className="lb-ranking-section">
      {/* Podium */}
      {podiumEntries.length > 0 && (
        <div className="lb-podium-wrap">
          <span className="lb-eyebrow">{t('leaderboardPage.sections.topAthletes')}</span>
          <div className="lb-podium-grid">
            <PodiumCard entry={podiumEntries[1]} rankNumber={2} tone="silver" />
            <PodiumCard entry={podiumEntries[0]} rankNumber={1} tone="gold" />
            <PodiumCard entry={podiumEntries[2]} rankNumber={3} tone="bronze" />
          </div>
        </div>
      )}

      {/* List header */}
      <div className="lb-list-hd">
        <span className="lb-eyebrow">{t('leaderboardPage.sections.rankings')}</span>
        <div className="lb-list-hd-right">
          {total > 0 && (
            <span className="lb-total-count">{t('leaderboardPage.labels.athletesCount', { count: total.toLocaleString() })}</span>
          )}
          {currentEntry && !currentEntryOnPage && (
            <button className="lb-locate-btn" onClick={onJumpToMe} disabled={isFindingCurrentEntry}>
              <span className="material-symbols-outlined">my_location</span>
              {t('leaderboardPage.actions.findMe')}
            </button>
          )}
        </div>
      </div>

      {/* List body */}
      {isLoading ? (
        <div className="lb-skeletons">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="lb-skeleton-row" style={{ animationDelay: `${i * 0.07}s` }} />
          ))}
        </div>
      ) : isError ? (
        <div className="lb-error-state">
          <span className="material-symbols-outlined">warning</span>
          <p>{t('leaderboardPage.states.loadError')}</p>
          <button className="lb-retry-btn" onClick={onRetry}>{t('leaderboardPage.actions.tryAgain')}</button>
        </div>
      ) : entries.length === 0 ? (
        <div className="lb-empty-state">
          <span className="material-symbols-outlined">emoji_events</span>
          <p className="lb-empty-title">{t('leaderboardPage.states.noRankings')}</p>
          <p className="lb-empty-body">{t('leaderboardPage.states.noRankingsBody')}</p>
        </div>
      ) : (
        <div className="lb-list">
          {entries.map((entry) => {
            const isMe = normalizeId(entry.user_id) === currentUserId;
            return (
              <RankingRow
                key={`${entry.user_id}-${entry.rank}`}
                entry={entry}
                isMe={isMe}
                rowRef={(node) => {
                  const key = normalizeId(entry.user_id);
                  if (key) {
                    if (node) rowRefs.current[key] = node;
                    else delete rowRefs.current[key];
                  }
                }}
              />
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > LIMIT && (
        <div className="lb-pagination">
          <button className="lb-page-btn" disabled={!hasPrev} onClick={onPrev}>
            <span className="material-symbols-outlined">west</span>
            {t('leaderboardPage.pagination.prev')}
          </button>
          <span className="lb-page-info">
            {offset + 1}–{Math.min(offset + LIMIT, total)}
            {isFetching ? ` · ${t('leaderboardPage.pagination.syncing')}` : ''}
          </span>
          <button className="lb-page-btn" disabled={!hasNext} onClick={onNext}>
            {t('leaderboardPage.pagination.next')}
            <span className="material-symbols-outlined">east</span>
          </button>
        </div>
      )}

      {/* Sticky my-rank footer when off page */}
      {showMyRankBar && currentEntry && !currentEntryOnPage && entries.length > 0 && (
        <div className="lb-my-rank-bar">
          <div className="lb-my-rank-bar-inner">
            <Avatar entry={currentEntry} size="sm" />
            <span className="lb-my-rank-bar-name">{currentEntry.user_name}</span>
            <span className="lb-my-rank-bar-rank">#{currentEntry.rank}</span>
          </div>
          <button className="lb-locate-btn" onClick={onJumpToMe} disabled={isFindingCurrentEntry}>
            <span className="material-symbols-outlined">my_location</span>
            {t('leaderboardPage.actions.goToMyRank')}
          </button>
        </div>
      )}
    </section>
  );
}

// ── Main ───────────────────────────────────────────────────────────────

export default function Leaderboard({ embedded = false }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user }  = useAuth();

  const [period, setPeriod] = useState('weekly');
  const [offset, setOffset] = useState(0);

  const rowRefs          = useRef({});
  const pendingJumpRef   = useRef(false);

  const { data, isLoading, isError, refetch, isFetching } = useLeaderboard({
    period, pillar: 'all', offset, limit: LIMIT,
  });

  const { data: snapshotData } = useLeaderboard(
    { period, pillar: 'all', offset: 0, limit: SNAPSHOT_LIMIT },
    { enabled: !!user?.id }
  );

  const entries         = useMemo(() => data?.entries ?? [], [data?.entries]);
  const total           = data?.total || 0;
  const scanTotal       = data?.total || snapshotData?.total || 0;
  const currentUserId   = normalizeId(user?.id);

  const currentEntryOnPage = useMemo(
    () => entries.find((e) => normalizeId(e.user_id) === currentUserId),
    [entries, currentUserId]
  );

  const currentSnapshotEntry = useMemo(
    () => snapshotData?.entries?.find((e) => normalizeId(e.user_id) === currentUserId),
    [snapshotData, currentUserId]
  );

  const { data: currentScannedEntry, isFetching: isFindingCurrentEntry } = useQuery({
    queryKey: ['lb-scan', currentUserId, period, scanTotal],
    enabled: Boolean(currentUserId) && scanTotal > SNAPSHOT_LIMIT && !currentEntryOnPage && !currentSnapshotEntry,
    queryFn: async () => {
      let targetTotal = scanTotal;
      for (let scanOffset = 0; scanOffset < targetTotal; scanOffset += SNAPSHOT_LIMIT) {
        const page = await leaderboardAPI.getLeaderboard({ period, pillar: 'all', offset: scanOffset, limit: SNAPSHOT_LIMIT });
        if (Number(page?.total) > targetTotal) targetTotal = Number(page.total);
        const found = page?.entries?.find((e) => normalizeId(e.user_id) === currentUserId);
        if (found) return found;
        if (!Array.isArray(page?.entries) || page.entries.length === 0) break;
      }
      return null;
    },
    staleTime: 1000 * 30,
  });

  const currentEntry = currentEntryOnPage || currentSnapshotEntry || currentScannedEntry || null;
  const currentRank  = currentEntry?.rank || null;

  const percentile = useMemo(() => {
    if (!currentRank || !total) return null;
    return Math.max(1, Math.round(((total - currentRank + 1) / total) * 100));
  }, [currentRank, total]);

  const podiumEntries = useMemo(() => {
    const src = snapshotData?.entries?.length ? snapshotData.entries : entries;
    return src.slice(0, 3);
  }, [snapshotData, entries]);

  const hasPrev = offset > 0;
  const hasNext = offset + LIMIT < total;

  useEffect(() => {
    if (!pendingJumpRef.current || !currentEntryOnPage) return;
    const key = normalizeId(currentEntryOnPage.user_id);
    rowRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    pendingJumpRef.current = false;
  }, [currentEntryOnPage]);

  function changePeriod(next) {
    setPeriod(next);
    setOffset(0);
  }

  function jumpToMyRank() {
    if (isFindingCurrentEntry) return;
    if (!currentEntry) { navigate('/workouts'); return; }
    if (currentEntryOnPage) {
      rowRefs.current[normalizeId(currentEntryOnPage.user_id)]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (currentEntry.rank) {
      pendingJumpRef.current = true;
      setOffset(Math.floor((currentEntry.rank - 1) / LIMIT) * LIMIT);
    }
  }

  return (
    <div className={`lb-root${embedded ? ' lb-root--embedded' : ''}`}>
      {/* Header */}
      {!embedded && (
        <header className="lb-header">
          <button className="lb-back-btn" onClick={() => navigate(-1)} aria-label={t('common.actions.goBack')}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="lb-title">{t('leaderboardPage.title')}</h1>
            <p className="lb-subtitle">{t('leaderboardPage.subtitle')}</p>
          </div>
        </header>
      )}

      <main className="lb-main">
        {embedded && (
          <div className="lb-embed-head">
            <span className="lb-eyebrow">{t('leaderboardPage.community')}</span>
            <h2 className="lb-embed-title">{t('leaderboardPage.title')}</h2>
            <p className="lb-embed-subtitle">{t('leaderboardPage.subtitle')}</p>
          </div>
        )}

        {/* 1 — Score */}
        <ScoreSection
          currentEntry={currentEntry}
          percentile={percentile}
          period={period}
          onJoinBoard={jumpToMyRank}
          isFindingEntry={isFindingCurrentEntry}
          showJoinButton={!embedded}
        />

        {/* 2 — Period */}
        <PeriodSection period={period} onChange={changePeriod} />

        {/* 3 — Ranking */}
        <RankingSection
          entries={entries}
          podiumEntries={podiumEntries}
          total={total}
          isLoading={isLoading}
          isError={isError}
          offset={offset}
          hasNext={hasNext}
          hasPrev={hasPrev}
          isFetching={isFetching}
          currentUserId={currentUserId}
          currentEntry={currentEntry}
          currentEntryOnPage={currentEntryOnPage}
          onPrev={() => setOffset((p) => Math.max(0, p - LIMIT))}
          onNext={() => setOffset((p) => p + LIMIT)}
          onRetry={refetch}
          rowRefs={rowRefs}
          onJumpToMe={jumpToMyRank}
          isFindingCurrentEntry={isFindingCurrentEntry}
          showMyRankBar={!embedded}
        />
      </main>
    </div>
  );
}
