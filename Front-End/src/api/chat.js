import client from './client';

export const chatAPI = {
  // Send a message to AI coach
  sendMessage: async ({ message, conversation_id }) => {
    const payload = { message };
    if (conversation_id) payload.conversation_id = conversation_id;

    const response = await client.post('/v1/chat', payload);
    return response.data;
  },

  // Get paginated conversation list OR a single conversation detail
  getHistory: async (params = {}) => {
    const response = await client.get('/v1/chat/history', { params });
    return response.data;
  },

  // Persist thumbs up / thumbs down on assistant message
  submitFeedback: async ({ message_id, feedback }) => {
    const response = await client.post('/v1/chat/feedback', { message_id, feedback });
    return response.data;
  },

  // Fetch AI coach context used to ground the conversation
  getCoachSummary: async (user_id, params = {}) => {
    const response = await client.get(`/v1/users/${user_id}/coach-summary`, { params });
    return response.data;
  },
};
