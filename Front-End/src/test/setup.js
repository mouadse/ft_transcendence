import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { server } from './msw/server';

function createMemoryStorage() {
  let store = {};
  return {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

const memoryLocalStorage = createMemoryStorage();
const memorySessionStorage = createMemoryStorage();

Object.defineProperty(window, 'localStorage', {
  value: memoryLocalStorage,
  configurable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: memorySessionStorage,
  configurable: true,
});

window.__CFIT_RUNTIME_CONFIG__ = {
  VITE_API_BASE_URL: 'http://localhost:8080',
};

const { workoutStore } = await import('../stores/workoutStore');
const { uiStore } = await import('../stores/uiStore');
const { authStore } = await import('../stores/authStore');
const { queryClient } = await import('../lib/queryClient');

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

beforeEach(() => {
  window.__CFIT_RUNTIME_CONFIG__ = {
    VITE_API_BASE_URL: 'http://localhost:8080',
  };
  localStorage.clear();
  sessionStorage.clear();
  queryClient.clear();
  authStore.setState({
    user: null,
    access_token: null,
    refresh_token: null,
    two_factor_token: null,
    two_factor_required: false,
    auth_bootstrapped: true,
  });
  workoutStore.setState({
    activeWorkout: null,
    restTimerActive: false,
    restSeconds: 0,
    pendingSets: [],
  });
  uiStore.setState({
    language: 'en',
    offline: false,
    toasts: [],
    activeModal: null,
    workoutFrequencyByUser: {},
  });
});

afterEach(() => {
  queryClient.clear();
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});
