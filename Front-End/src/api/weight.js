import client from './client';

const WEIGHT_ENTRY_PAGE_SIZE = 100;

export const weightAPI = {
  // Get one page of weight entries
  getEntriesPage: async (params = {}) => {
    const response = await client.get('/v1/weight-entries', { params });
    return response.data;
  },

  // Get all weight entries across paginated results
  getEntries: async (params = {}) => {
    const entries = [];
    let page = 1;
    let hasNext = true;

    while (hasNext) {
      const response = await weightAPI.getEntriesPage({
        ...params,
        page,
        limit: params.limit ?? WEIGHT_ENTRY_PAGE_SIZE,
      });

      entries.push(...(response.data || []));
      const totalPages = Number(response.metadata?.total_pages || 0);
      hasNext = Boolean(response.metadata?.has_next) || (totalPages > 0 && page < totalPages) || (response.data || []).length === (params.limit ?? WEIGHT_ENTRY_PAGE_SIZE);
      page += 1;
    }

    return entries;
  },

  // Add a new weigh-in
  addEntry: async (data) => {
    const response = await client.post('/v1/weight-entries', data);
    return response.data;
  },

  // Get a specific entry
  getEntry: async (id) => {
    const response = await client.get(`/v1/weight-entries/${id}`);
    return response.data;
  },

  // Update an entry
  updateEntry: async (id, data) => {
    const response = await client.patch(`/v1/weight-entries/${id}`, data);
    return response.data;
  },

  // Delete an entry
  deleteEntry: async (id) => {
    const response = await client.delete(`/v1/weight-entries/${id}`);
    return response.data;
  }
};
