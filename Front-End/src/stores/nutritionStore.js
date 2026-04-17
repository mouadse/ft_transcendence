import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const nutritionStore = create(
  persist(
    (set) => ({
      // Offline queue for pending meals
      pendingMeals: [],
      pendingFoods: [],

      // Actions
      queueMeal: (mealData) => {
        set((state) => ({
          pendingMeals: [
            ...state.pendingMeals,
            { ...mealData, queuedAt: new Date().toISOString() },
          ],
        }));
      },

      queueFoodToMeal: (mealIndex, foodData) => {
        set((state) => {
          const updatedMeals = [...state.pendingMeals];
          if (updatedMeals[mealIndex]) {
            updatedMeals[mealIndex] = {
              ...updatedMeals[mealIndex],
              foods: [...(updatedMeals[mealIndex].foods || []), foodData],
            };
          }
          return { pendingMeals: updatedMeals };
        });
      },

      removePendingMeal: (index) => {
        set((state) => ({
          pendingMeals: state.pendingMeals.filter((_, i) => i !== index),
        }));
      },

      removePendingFood: (mealIndex, foodIndex) => {
        set((state) => {
          const updatedMeals = [...state.pendingMeals];
          if (updatedMeals[mealIndex]) {
            updatedMeals[mealIndex] = {
              ...updatedMeals[mealIndex],
              foods: updatedMeals[mealIndex].foods.filter((_, i) => i !== foodIndex),
            };
          }
          return { pendingMeals: updatedMeals };
        });
      },

      flushPendingMeals: () => {
        set({ pendingMeals: [] });
      },

      flushPendingFoods: () => {
        set({ pendingFoods: [] });
      },
    }),
    {
      name: 'um6p_fit_nutrition',
    }
  )
);
