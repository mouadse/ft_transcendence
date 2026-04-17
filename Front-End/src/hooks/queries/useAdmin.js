import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../../api/admin';
import {
  normalizeEntity,
  normalizeFoodListVM,
  normalizeProgramAssignmentEntityVM,
  normalizeProgramAssignmentListVM,
  normalizeProgramEntityVM,
  normalizeProgramListVM,
  normalizeUserListVM,
} from '../../utils/apiAdapters';
import { mapApiError, shouldRetryQuery } from '../../utils/apiErrors';

export function useAdminDashboard(params = {}) {
  const query = useQuery({
    queryKey: ['admin', 'dashboard', params],
    queryFn: () => adminAPI.getDashboard(params),
    staleTime: 1000 * 30,
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    select: normalizeEntity,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}

export function useAdminUsers(params = {}) {
  const query = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => adminAPI.getUsers(params),
    staleTime: 1000 * 30,
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    select: normalizeUserListVM,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}

export function useAdminUser(user_id) {
  const query = useQuery({
    queryKey: ['admin', 'users', user_id],
    queryFn: () => adminAPI.getUser(user_id),
    enabled: !!user_id,
    staleTime: 1000 * 30,
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    select: normalizeEntity,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}

export function useAdminMetrics(params = {}) {
  const query = useQuery({
    queryKey: ['admin', 'metrics', params],
    queryFn: () => adminAPI.getMetrics(params),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60, // Refetch every minute
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    select: normalizeEntity,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}

export function useAdminNutritionStats(params = {}) {
  const query = useQuery({
    queryKey: ['admin', 'nutrition-stats', params],
    queryFn: () => adminAPI.getNutritionStats(params),
    staleTime: 1000 * 30,
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    select: normalizeEntity,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}

export function useAdminFoods(params = {}) {
  const query = useQuery({
    queryKey: ['admin', 'foods', params],
    queryFn: () => adminAPI.getFoods(params),
    staleTime: 1000 * 30,
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    select: normalizeFoodListVM,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}

export function useAdminLogs(params = {}) {
  const query = useQuery({
    queryKey: ['admin', 'logs', params],
    queryFn: () => adminAPI.getLogs(params),
    staleTime: 1000 * 30,
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    select: normalizeEntity,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}

export function useBanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ user_id, reason }) => adminAPI.banUser(user_id, reason),
    onSuccess: (_, { user_id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', user_id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] });
    },
  });
}

export function useUnbanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (user_id) => adminAPI.unbanUser(user_id),
    onSuccess: (_, user_id) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', user_id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] });
    },
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ user_id, data }) => adminAPI.updateUser(user_id, data),
    onSuccess: (_, { user_id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', user_id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] });
    },
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (user_id) => adminAPI.deleteUser(user_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'logs'] });
    },
  });
}

export function useCreateAdminFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => adminAPI.createFood(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'foods'] });
    },
  });
}

export function useUpdateAdminFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ food_id, data }) => adminAPI.updateFood(food_id, data),
    onSuccess: (_, { food_id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'foods'] });
      queryClient.invalidateQueries({ queryKey: ['foods', food_id] });
    },
  });
}

export function useDeleteAdminFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (food_id) => adminAPI.deleteFood(food_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'foods'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'nutrition-stats'] });
    },
  });
}

export function useAdminPrograms(params = {}) {
  const query = useQuery({
    queryKey: ['admin', 'programs', params],
    queryFn: () => adminAPI.getPrograms(params),
    staleTime: 1000 * 60,
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    select: normalizeProgramListVM,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}

export function useAdminProgram(program_id) {
  const query = useQuery({
    queryKey: ['admin', 'programs', program_id],
    queryFn: () => adminAPI.getProgram(program_id),
    enabled: !!program_id,
    staleTime: 1000 * 60,
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    select: normalizeProgramEntityVM,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}

export function useCreateAdminProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => adminAPI.createProgram(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs'] });
    },
  });
}

export function useUpdateAdminProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ program_id, data }) => adminAPI.updateProgram(program_id, data),
    onSuccess: (_, { program_id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs', program_id] });
    },
  });
}

export function useDeleteAdminProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (program_id) => adminAPI.deleteProgram(program_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs'] });
    },
  });
}

export function useCreateAdminProgramWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ program_id, data }) => adminAPI.createProgramWeek(program_id, data),
    onSuccess: (_, { program_id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs', program_id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs'] });
    },
  });
}

export function useUpdateAdminProgramWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ week_id, data }) => adminAPI.updateProgramWeek(week_id, data),
    onSuccess: (_, { program_id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs', program_id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs'] });
    },
  });
}

export function useDeleteAdminProgramWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ week_id }) => adminAPI.deleteProgramWeek(week_id),
    onSuccess: (_, { program_id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs', program_id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs'] });
    },
  });
}

export function useCreateAdminProgramSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ week_id, data }) => adminAPI.createProgramSession(week_id, data),
    onSuccess: (_, { program_id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs', program_id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs'] });
    },
  });
}

export function useUpdateAdminProgramSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ session_id, data }) => adminAPI.updateProgramSession(session_id, data),
    onSuccess: (_, { program_id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs', program_id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs'] });
    },
  });
}

export function useDeleteAdminProgramSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ session_id }) => adminAPI.deleteProgramSession(session_id),
    onSuccess: (_, { program_id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs', program_id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs'] });
    },
  });
}

export function useAdminProgramAssignments(program_id) {
  const query = useQuery({
    queryKey: ['admin', 'program-assignments', program_id],
    queryFn: () => adminAPI.getProgramAssignments(program_id),
    enabled: !!program_id,
    staleTime: 1000 * 30,
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    select: normalizeProgramAssignmentListVM,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}

export function useCreateAdminProgramAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ program_id, data }) => adminAPI.createProgramAssignment(program_id, data),
    onSuccess: (_, { program_id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'program-assignments', program_id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs'] });
    },
  });
}

export function useUpdateAdminProgramAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignment_id, data }) => adminAPI.updateProgramAssignment(assignment_id, data),
    onSuccess: (_, { program_id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'program-assignments', program_id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs'] });
    },
  });
}

export function useDeleteAdminProgramAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignment_id }) => adminAPI.deleteProgramAssignment(assignment_id),
    onSuccess: (_, { program_id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'program-assignments', program_id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'programs'] });
    },
  });
}

export function useAdminProgramAssignment(assignment_id, fallbackData = null) {
  const query = useQuery({
    queryKey: ['admin', 'program-assignment', assignment_id],
    queryFn: async () => fallbackData,
    enabled: !!assignment_id,
    staleTime: Infinity,
    select: normalizeProgramAssignmentEntityVM,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}
