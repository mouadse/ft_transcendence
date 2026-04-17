import client from './client';

function getFilenameFromDisposition(disposition, fallbackName) {
  if (!disposition || typeof disposition !== 'string') return fallbackName;

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) return plainMatch[1];

  return fallbackName;
}

export const accountAPI = {
  // Create an export job
  createExport: async () => {
    const response = await client.post('/v1/exports');
    return response.data;
  },

  // Get export job status/result
  getExport: async (id) => {
    const response = await client.get(`/v1/exports/${id}`);
    return response.data;
  },

  // Download export file content when it is ready
  downloadExport: async (id) => {
    const response = await client.get(`/v1/exports/${id}`, {
      params: { download: true },
      responseType: 'blob',
      timeout: 120000,
    });

    const fallbackName = `export-${id}.json`;
    return {
      blob: response.data,
      filename: getFilenameFromDisposition(response.headers['content-disposition'], fallbackName),
      contentType: response.headers['content-type'] || 'application/octet-stream',
    };
  },

  // Request account deletion
  deleteAccount: async () => {
    const response = await client.post('/v1/account/delete-request');
    return response.data;
  }
};
