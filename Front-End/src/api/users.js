import client from './client';

export const usersAPI = {
  // Get user profile
  getProfile: async (user_id) => {
    const response = await client.get(`/v1/users/${user_id}`);
    return response.data;
  },

  // Update user profile
  updateProfile: async (user_id, data) => {
    const response = await client.patch(`/v1/users/${user_id}`, data);
    return response.data;
  },

  // Get TDEE and nutrition targets
  getNutritionTargets: async (user_id) => {
    const response = await client.get(`/v1/users/${user_id}/nutrition-targets`);
    return response.data;
  },

  // Get daily summary (calories, macros, etc.)
  getSummary: async (user_id) => {
    const response = await client.get(`/v1/users/${user_id}/summary`);
    return response.data;
  },

  // Get streaks (workout, nutrition)
  getStreaks: async (user_id) => {
    const response = await client.get(`/v1/users/${user_id}/streaks`);
    return response.data;
  },

  // Get recommendations (integration rules output)
  getRecommendations: async (user_id) => {
    const response = await client.get(`/v1/users/${user_id}/recommendations`);
    return response.data;
  },

  // Get weight entries
  getWeightEntries: async (user_id, params = {}) => {
    const response = await client.get(`/v1/users/${user_id}/weight-entries`, { params });
    return response.data;
  },

  // Add weight entry
  addWeightEntry: async (user_id, weight) => {
    const response = await client.post(`/v1/users/${user_id}/weight-entries`, { weight });
    return response.data;
  },

  // Get weekly summary (calories, macros, workouts for current week)
  getWeeklySummary: async () => {
    const response = await client.get('/v1/weekly-summary');
    return response.data;
  },

  // Get AI coach summary for dashboard
  getCoachSummary: async (user_id) => {
    const response = await client.get(`/v1/users/${user_id}/coach-summary`);
    return response.data;
  },

  // Get activity records (PRs, history, etc.)
  getRecords: async (user_id, params = {}) => {
    const response = await client.get(`/v1/users/${user_id}/records`, { params });
    return response.data;
  },
};
