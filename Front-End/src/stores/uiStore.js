import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nutritionStore } from './nutritionStore';

export function applyLanguageToDocument(lang) {
  if (typeof document === 'undefined') return;

  const safeLang = lang || 'en';
  const dir = safeLang === 'ar' ? 'rtl' : 'ltr';
  const html = document.documentElement;
  const body = document.body;

  html.setAttribute('dir', dir);
  html.setAttribute('lang', safeLang);
  html.classList.toggle('is-rtl', dir === 'rtl');
  html.classList.toggle('is-ltr', dir !== 'rtl');

  if (body) {
    body.setAttribute('dir', dir);
    body.dataset.dir = dir;
    body.dataset.lang = safeLang;
  }
}

export const uiStore = create(
  persist(
    (set, get) => ({
      // UI State
      language: 'en', // 'en', 'fr', 'ar'
      workoutFrequencyByUser: {}, // { [userId]: 1-7 days }
      offline: false,
      toasts: [], // array of { id, message, type, duration }
      activeModal: null,

      // Actions
      getWorkoutFrequencyForUser: (userId) => {
        const safeUserId = String(userId || '').trim();
        if (!safeUserId) return 5;
        const value = get().workoutFrequencyByUser?.[safeUserId];
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return 5;
        return Math.min(7, Math.max(1, Math.round(parsed)));
      },

      migrateLegacyWorkoutFrequencyForUser: (userId) => {
        const safeUserId = String(userId || '').trim();
        if (!safeUserId) return;
        const state = get();
        const existingValue = state.workoutFrequencyByUser?.[safeUserId];
        if (Number.isFinite(Number(existingValue))) return;

        const legacy = Number(state.workoutFrequency);
        if (!Number.isFinite(legacy)) return;

        const normalized = Math.min(7, Math.max(1, Math.round(legacy)));
        set((current) => ({
          workoutFrequencyByUser: {
            ...(current.workoutFrequencyByUser || {}),
            [safeUserId]: normalized,
          },
        }));
      },

      setWorkoutFrequencyForUser: (userId, days) => {
        const safeUserId = String(userId || '').trim();
        if (!safeUserId) return;
        const normalized = Math.min(7, Math.max(1, Math.round(Number(days) || 1)));
        set((state) => ({
          workoutFrequencyByUser: {
            ...(state.workoutFrequencyByUser || {}),
            [safeUserId]: normalized,
          },
        }));
      },

      // Backward-compatible setter for older callers.
      setWorkoutFrequency: (days) => {
        const normalized = Math.min(7, Math.max(1, Math.round(Number(days) || 1)));
        set({ workoutFrequency: normalized });
      },

      setLanguage: (lang) => {
        set({ language: lang });
        applyLanguageToDocument(lang);
      },

      setOffline: (offline) => {
        set({ offline });
      },

      addToast: (message, type = 'info', duration = 3000) => {
        const id = Date.now();
        set((state) => ({
          toasts: [
            ...state.toasts,
            { id, message, type, duration },
          ],
        }));

        // Auto-remove after duration
        if (duration > 0) {
          setTimeout(() => {
            get().removeToast(id);
          }, duration);
        }

        return id;
      },

      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },

      setActiveModal: (modal) => {
        set({ activeModal: modal });
      },

      closeModal: () => {
        set({ activeModal: null });
      },
    }),
    {
      name: 'um6p_fit_ui',
    }
  )
);

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    uiStore.getState().setOffline(false);
    // Do not clear pending workout sets on reconnect.
    // Replay is handled by the workout feature to avoid data loss.
    nutritionStore.getState().flushPendingMeals();
    nutritionStore.getState().flushPendingFoods();
  });

  window.addEventListener('offline', () => {
    uiStore.getState().setOffline(true);
  });

  applyLanguageToDocument(uiStore.getState().language);
  uiStore.persist?.onFinishHydration?.((state) => {
    applyLanguageToDocument(state.language);
  });
}
