import client from './client';

export const analyticsAPI = {
  // Get personal records
  getRecords: async (user_id, params = {}) => {
    const response = await client.get(`/v1/users/${user_id}/records`, { params });
    return response.data;
  },

  // Get workout stats
  getWorkoutStats: async (user_id, params = {}) => {
    const response = await client.get(`/v1/users/${user_id}/workout-stats`, { params });
    return response.data;
  },

  // Get activity calendar
  getActivityCalendar: async (user_id, params = {}) => {
    const response = await client.get(`/v1/users/${user_id}/activity-calendar`, { params });
    return response.data;
  },

  // Get streaks & adherence
  getStreaks: async (user_id, params = {}) => {
    const response = await client.get(`/v1/users/${user_id}/streaks`, { params });
    return response.data;
  },

  // Get weekly summary
  getWeeklySummary: async (user_id, params = {}) => {
    const response = await client.get(`/v1/users/${user_id}/weekly-summary`, { params });
    return response.data;
  },

  // Get exercise history / progression
  getExerciseHistory: async (exercise_id, params = {}) => {
    const response = await client.get(`/v1/exercises/${exercise_id}/history`, { params });
    return response.data;
  },
};
