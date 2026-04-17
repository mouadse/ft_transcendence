function messageFromError(error) {
  if (!error) return 'Unexpected error.';
  const responseMessage =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.response?.data?.detail;
  return responseMessage || error.message || 'Unexpected error.';
}

export function mapApiError(error) {
  const message = messageFromError(error);
  const lower = String(message).toLowerCase();
  const status = error?.response?.status || 0;
  const isNetwork = !error?.response;
  const isTimeout = error?.code === 'ECONNABORTED';
  const isServer = status >= 500;
  const isTooManyRequests = status === 429;
  const isGroupBy =
    lower.includes('must appear in group by') ||
    lower.includes('group by');
  const isUnauthorized = status === 401 || status === 403;

  return {
    status,
    message,
    isNetwork,
    isTimeout,
    isServer,
    isTooManyRequests,
    isGroupBy,
    isUnauthorized,
    // Read queries may retry if transient/network/server failure.
    retryable: isNetwork || isTimeout || isServer || isTooManyRequests,
    // We prefer graceful fallback for read failures in these categories.
    shouldFallback: isNetwork || isTimeout || isServer || isGroupBy,
  };
}

export function shouldRetryQuery(error, failureCount, maxRetries = 2) {
  if (failureCount >= maxRetries) return false;
  return mapApiError(error).retryable;
}
