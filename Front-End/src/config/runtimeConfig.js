const buildTimeConfig = {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_EXERCISE_IMAGE_BASE_URL: import.meta.env.VITE_EXERCISE_IMAGE_BASE_URL,
  VITE_ADMIN_REALTIME_WS_AUTH_MODE: import.meta.env.VITE_ADMIN_REALTIME_WS_AUTH_MODE,
};

function readRuntimeConfigObject() {
  if (typeof window === 'undefined') return {};
  const runtimeConfig = window.__CFIT_RUNTIME_CONFIG__;
  return runtimeConfig && typeof runtimeConfig === 'object' ? runtimeConfig : {};
}

export function readPublicConfig(key, fallback = '') {
  const runtimeValue = readRuntimeConfigObject()[key];
  const buildValue = buildTimeConfig[key];
  const nextValue = runtimeValue ?? buildValue ?? fallback;
  return typeof nextValue === 'string' ? nextValue.trim() : nextValue;
}

export function readPublicUrl(key, fallback) {
  const value = String(readPublicConfig(key, fallback) || '').trim();
  if (!value) return '';

  if (typeof window !== 'undefined' && /^\/(?!\/)/.test(value)) {
    return new URL(value, window.location.origin).toString().replace(/\/$/, '');
  }

  return value.replace(/\/$/, '');
}
