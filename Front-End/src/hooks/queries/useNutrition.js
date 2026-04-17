import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nutritionAPI } from '../../api/nutrition';

export function useMeals(params = {}) {
  return useQuery({
    queryKey: ['meals', params],
    queryFn: () => nutritionAPI.getMeals(params),
    staleTime: 1000 * 30,
  });
}

export function useMeal(meal_id) {
  return useQuery({
    queryKey: ['meals', meal_id],
    queryFn: () => nutritionAPI.getMeal(meal_id),
    enabled: !!meal_id,
    staleTime: 1000 * 30,
  });
}

export function useSearchFoods(query, params = {}) {
  return useQuery({
    queryKey: ['foods', query, params],
    queryFn: () => nutritionAPI.searchFoods(query, params),
    enabled: !!query && query.length > 1,
    staleTime: 1000 * 30,
  });
}

export function useFood(food_id) {
  return useQuery({
    queryKey: ['foods', food_id],
    queryFn: () => nutritionAPI.getFood(food_id),
    enabled: !!food_id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useRecipes(params = {}) {
  return useQuery({
    queryKey: ['recipes', params],
    queryFn: () => nutritionAPI.getRecipes(params),
    staleTime: 1000 * 60 * 5,
  });
}

export function useRecipe(recipe_id) {
  return useQuery({
    queryKey: ['recipes', recipe_id],
    queryFn: () => nutritionAPI.getRecipe(recipe_id),
    enabled: !!recipe_id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useFavorites(params = {}) {
  return useQuery({
    queryKey: ['favorites', params],
    queryFn: () => nutritionAPI.getFavorites(params),
    staleTime: 1000 * 60 * 5,
  });
}

export function useRecentFoods(params = {}) {
  return useQuery({
    queryKey: ['foods', 'recent', params],
    queryFn: () => nutritionAPI.getRecentFoods(params),
    staleTime: 1000 * 60 * 5,
  });
}

export function useMealFoods(meal_id, params = {}) {
  return useQuery({
    queryKey: ['meal-foods', meal_id, params],
    queryFn: () => nutritionAPI.getMealFoods(meal_id, params),
    enabled: !!meal_id,
    staleTime: 1000 * 30,
  });
}

export function useCreateMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => nutritionAPI.createMeal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });
}

export function useUpdateMeal(meal_id) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => nutritionAPI.updateMeal(meal_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', meal_id] });
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });
}

export function useDeleteMeal(meal_id) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => nutritionAPI.deleteMeal(meal_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });
}

export function useAddFoodToMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ meal_id, food_id, quantity }) =>
      nutritionAPI.addFoodToMeal(meal_id, food_id, quantity),
    onSuccess: (_, { meal_id }) => {
      queryClient.invalidateQueries({ queryKey: ['meals', meal_id] });
      queryClient.invalidateQueries({ queryKey: ['meal-foods', meal_id] });
      queryClient.invalidateQueries({ queryKey: ['foods', 'recent'] });
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });
}

export function useUpdateMealFood() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ meal_food_id, data }) => nutritionAPI.updateMealFood(meal_food_id, data),
    onSuccess: (result) => {
      const mealId = result?.meal_id;
      if (mealId) {
        queryClient.invalidateQueries({ queryKey: ['meal-foods', mealId] });
        queryClient.invalidateQueries({ queryKey: ['meals', mealId] });
      }
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });
}

export function useDeleteMealFood() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ meal_food_id }) => nutritionAPI.removeFoodFromMeal(meal_food_id),
    onSuccess: (_, variables) => {
      if (variables?.meal_id) {
        queryClient.invalidateQueries({ queryKey: ['meal-foods', variables.meal_id] });
        queryClient.invalidateQueries({ queryKey: ['meals', variables.meal_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => nutritionAPI.createRecipe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recipe_id, data }) => nutritionAPI.updateRecipe(recipe_id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      if (variables?.recipe_id) {
        queryClient.invalidateQueries({ queryKey: ['recipes', variables.recipe_id] });
      }
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipe_id) => nutritionAPI.deleteRecipe(recipe_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useLogRecipeToMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recipe_id, data }) => nutritionAPI.logRecipeToMeal(recipe_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });
}

export function useAddFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (food_id) => nutritionAPI.addFavorite(food_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods', 'recent'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (food_id) => nutritionAPI.removeFavorite(food_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods', 'recent'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

export function useCreateFood() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => nutritionAPI.createFood(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] });
      queryClient.invalidateQueries({ queryKey: ['foods', 'recent'] });
    },
  });
}
