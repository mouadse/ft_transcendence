import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { weightAPI } from '../../../api/weight';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { getLocaleForLanguage, useI18n } from '../../../i18n/useI18n';
import './WeightTracker.css';

function getLocalDateInputValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().split('T')[0];
}

export default function WeightTracker() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const locale = getLocaleForLanguage(language);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(getLocalDateInputValue);
  const [notes, setNotes] = useState('');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['weightEntries', user?.id],
    queryFn: () => weightAPI.getEntries(),
    enabled: !!user?.id,
  });

  const addEntryMutation = useMutation({
    mutationFn: weightAPI.addEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weightEntries', user?.id] });
      setWeight('');
      setNotes('');
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: weightAPI.deleteEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weightEntries', user?.id] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!user?.id || !weight || Number.isNaN(Number(weight))) return;
    
    addEntryMutation.mutate({
      user_id: user.id,
      weight: parseFloat(weight),
      date: date,
      notes: notes
    });
  };

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [entries]);

  const { latestWeight, trend, trendValue } = useMemo(() => {
    if (sortedEntries.length === 0) return { latestWeight: null, trend: null, trendValue: null };
    if (sortedEntries.length === 1) return { latestWeight: sortedEntries[0].weight, trend: 'neutral', trendValue: 0 };

    const latest = sortedEntries[0].weight;
    const previous = sortedEntries[1].weight;
    const diff = latest - previous;
    
    return {
      latestWeight: latest,
      trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
      trendValue: Math.abs(diff).toFixed(1)
    };
  }, [sortedEntries]);

  // Very simple SVG chart path generation
  const chartPath = useMemo(() => {
    if (sortedEntries.length < 2) return null;
    const chronological = [...sortedEntries].reverse();
    
    const minWeight = Math.min(...chronological.map(e => e.weight));
    const maxWeight = Math.max(...chronological.map(e => e.weight));
    const range = maxWeight - minWeight || 1;
    
    const width = 600;
    const height = 200;
    const padding = 20;
    
    const points = chronological.map((entry, index) => {
      const x = padding + (index / (chronological.length - 1)) * (width - padding * 2);
      const y = height - padding - ((entry.weight - minWeight) / range) * (height - padding * 2);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [sortedEntries]);

  if (isLoading || !user?.id) {
    return (
      <div className="weight-root weight-loading">
        <p className="weight-label-mono">{t('weightTrackerPage.loadingMetrics')}</p>
      </div>
    );
  }

  return (
    <div className="weight-root">
      <header className="weight-header">
        <div className="weight-header-left">
          <button className="weight-back-btn" onClick={() => navigate(-1)}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="weight-title-display">{t('weightTrackerPage.title')}</h1>
        </div>
      </header>

      <main className="weight-main">
        {/* Hero Stats */}
        <section className="weight-hero-section">
          <div className="weight-hero-card">
            <span className="weight-label-mono">{t('weightTrackerPage.currentWeight')}</span>
            <div className="weight-hero-value">
              {latestWeight ? (
                <>
                  <span className="weight-hero-num">{latestWeight}</span>
                  <span className="weight-hero-unit">{t('common.units.kg')}</span>
                </>
              ) : (
                <span className="weight-hero-num">--</span>
              )}
            </div>
            
            {trendValue !== null && (
              <div className={`weight-trend weight-trend-${trend}`}>
                <span className="material-symbols-outlined">
                  {trend === 'up' ? 'trending_up' : trend === 'down' ? 'trending_down' : 'trending_flat'}
                </span>
                <span>{t('weightTrackerPage.trendSinceLastEntry', { value: trendValue, unit: t('common.units.kg') })}</span>
              </div>
            )}
          </div>
        </section>

        <div className="weight-content-grid">
          {/* Add Entry Form */}
          <section className="weight-form-section">
            <div className="weight-card">
              <h2 className="weight-card-title">{t('weightTrackerPage.logWeighIn')}</h2>
              <form onSubmit={handleSubmit} className="weight-form">
                <div className="weight-input-group">
                  <label className="weight-label-mono">{t('weightTrackerPage.fields.weight', { unit: t('common.units.kg') })}</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    className="weight-input" 
                    value={weight} 
                    onChange={(e) => setWeight(e.target.value)} 
                    placeholder={t('weightTrackerPage.placeholders.weight')} 
                    required 
                  />
                </div>
                
                <div className="weight-input-group">
                  <label className="weight-label-mono">{t('weightTrackerPage.fields.date')}</label>
                  <input 
                    type="date" 
                    className="weight-input" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    required 
                  />
                </div>

                <div className="weight-input-group">
                  <label className="weight-label-mono">{t('weightTrackerPage.fields.notesOptional')}</label>
                  <input 
                    type="text" 
                    className="weight-input" 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    placeholder={t('weightTrackerPage.placeholders.notes')} 
                  />
                </div>

                <button 
                  type="submit" 
                  className="weight-btn-pill weight-btn-slushie"
                  disabled={addEntryMutation.isPending}
                >
                  {addEntryMutation.isPending ? t('weightTrackerPage.actions.logging') : t('weightTrackerPage.actions.saveEntry')}
                </button>
              </form>
            </div>
          </section>

          {/* Chart Section */}
          <section className="weight-chart-section">
            <div className="weight-card weight-chart-card">
              <h2 className="weight-card-title">{t('weightTrackerPage.progressTrend')}</h2>
              <div className="weight-chart-container">
                {chartPath ? (
                  <svg viewBox="0 0 600 200" className="weight-svg-chart">
                    <path 
                      d={chartPath} 
                      fill="none" 
                      stroke="var(--swatch-matcha-primary)" 
                      strokeWidth="4" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                    />
                    {/* Add points */}
                    {chartPath.split(' L ').map((point, i) => {
                      const coords = point.replace('M ', '').split(',');
                      return (
                        <circle 
                          key={i} 
                          cx={coords[0]} 
                          cy={coords[1]} 
                          r="6" 
                          fill="#ffffff" 
                          stroke="var(--swatch-matcha-primary)" 
                          strokeWidth="3" 
                        />
                      );
                    })}
                  </svg>
                ) : (
                  <div className="weight-chart-empty">
                    <p>{t('weightTrackerPage.notEnoughData')}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* History List */}
        <section className="weight-history-section">
          <h2 className="weight-section-title">{t('weightTrackerPage.recentEntries')}</h2>
          {sortedEntries.length === 0 ? (
            <div className="weight-empty-state">
              <span className="material-symbols-outlined">monitor_weight</span>
              <p>{t('weightTrackerPage.empty')}</p>
            </div>
          ) : (
            <div className="weight-history-list">
              {sortedEntries.map(entry => (
                <div key={entry.id} className="weight-history-item">
                  <div className="weight-history-info">
                    <span className="weight-history-val">{entry.weight} {t('common.units.kg')}</span>
                    <span className="weight-label-mono">
                      {new Date(entry.date).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {entry.notes && <span className="weight-history-notes">{entry.notes}</span>}
                  </div>
                  <button 
                    className="weight-icon-btn" 
                    onClick={() => deleteEntryMutation.mutate(entry.id)}
                    aria-label={t('weightTrackerPage.deleteEntryAria')}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
