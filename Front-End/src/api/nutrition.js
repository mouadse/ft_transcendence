import client from './client';
import { authStore } from '../stores/authStore';

export const nutritionAPI = {
  // Get meals for a date
  getMeals: async (params = {}) => {
    const response = await client.get('/v1/meals', { params });
    return response.data;
  },

  // Get single meal
  getMeal: async (meal_id) => {
    const response = await client.get(`/v1/meals/${meal_id}`);
    return response.data;
  },

  // Create meal
  createMeal: async (data) => {
    const response = await client.post('/v1/meals', data);
    return response.data;
  },

  // Update meal
  updateMeal: async (meal_id, data) => {
    const response = await client.patch(`/v1/meals/${meal_id}`, data);
    return response.data;
  },

  // Delete meal
  deleteMeal: async (meal_id) => {
    const response = await client.delete(`/v1/meals/${meal_id}`);
    return response.data;
  },

  // Add food to meal
  addFoodToMeal: async (meal_id, food_id, quantity) => {
    const response = await client.post(`/v1/meals/${meal_id}/foods`, {
      food_id,
      quantity,
    });
    return response.data;
  },

  // Remove food from meal
  removeFoodFromMeal: async (meal_food_id) => {
    const response = await client.delete(`/v1/meal-foods/${meal_food_id}`);
    return response.data;
  },

  // Update meal food
  updateMealFood: async (meal_food_id, data) => {
    const response = await client.patch(`/v1/meal-foods/${meal_food_id}`, data);
    return response.data;
  },

  // List foods inside meal
  getMealFoods: async (meal_id, params = {}) => {
    const response = await client.get(`/v1/meals/${meal_id}/foods`, { params });
    return response.data;
  },

  // Search foods
  searchFoods: async (query, params = {}) => {
    const response = await client.get('/v1/foods', { params: { name: query, ...params } });
    return response.data;
  },

  // Recent foods
  getRecentFoods: async (params = {}) => {
    const response = await client.get('/v1/foods/recent', { params });
    return response.data;
  },

  // Get food details
  getFood: async (food_id) => {
    const response = await client.get(`/v1/foods/${food_id}`);
    return response.data;
  },

  // Create custom food
  createFood: async (data) => {
    const response = await client.post('/v1/foods', data);
    return response.data;
  },

  // Get recipes
  getRecipes: async (params = {}) => {
    const response = await client.get('/v1/recipes', { params });
    return response.data;
  },

  // Get single recipe
  getRecipe: async (recipe_id) => {
    const response = await client.get(`/v1/recipes/${recipe_id}`);
    return response.data;
  },

  // Create recipe
  createRecipe: async (data) => {
    const response = await client.post('/v1/recipes', data);
    return response.data;
  },

  // Update recipe metadata
  updateRecipe: async (recipe_id, data) => {
    const response = await client.patch(`/v1/recipes/${recipe_id}`, data);
    return response.data;
  },

  // Delete recipe
  deleteRecipe: async (recipe_id) => {
    const response = await client.delete(`/v1/recipes/${recipe_id}`);
    return response.data;
  },

  // Log recipe to meal
  logRecipeToMeal: async (recipe_id, data) => {
    const response = await client.post(`/v1/recipes/${recipe_id}/log-to-meal`, data);
    return response.data;
  },

  // Get favorite foods
  getFavorites: async (params = {}) => {
    const user_id = params.user_id || authStore.getState().user?.id;
    const { user_id: _ignored, ...queryParams } = params;
    if (!user_id) return { data: [], metadata: { page: 1, limit: 20, total_count: 0, total_pages: 1, has_next: false } };
    const response = await client.get(`/v1/users/${user_id}/favorites`, { params: queryParams });
    return response.data;
  },

  // Add food to favorites
  addFavorite: async (food_id) => {
    const response = await client.post(`/v1/foods/${food_id}/favorite`);
    return response.data;
  },

  // Remove food from favorites
  removeFavorite: async (food_id) => {
    const response = await client.delete(`/v1/foods/${food_id}/favorite`);
    return response.data;
  },
};
