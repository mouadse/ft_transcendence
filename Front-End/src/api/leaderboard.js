import client from './client';

function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return entry;

  return {
    rank: Number(entry.rank) || 0,
    user_id: entry.user_id,
    user_name: entry.user_name || 'Athlete',
    avatar: entry.avatar || '',
    score: Number(entry.score) || 0,
    training_score: Number(entry.training_score) || 0,
    nutrition_score: Number(entry.nutrition_score) || 0,
    consistency_score: Number(entry.consistency_score) || 0,
    breakdown: entry.breakdown || {},
  };
}

export const leaderboardAPI = {
  getLeaderboard: async (params = {}) => {
    const response = await client.get('/v1/leaderboard', { params });
    const data = response.data || {};

    return {
      period: data.period || params.period || 'weekly',
      pillar: data.pillar || params.pillar || 'all',
      total: Number(data.total) || 0,
      offset: Number(data.offset) || 0,
      limit: Number(data.limit) || Number(params.limit) || 20,
      entries: Array.isArray(data.entries) ? data.entries.map(normalizeEntry) : [],
    };
  },
};
