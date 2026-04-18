import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutsAPI } from '../../api/workouts';
import {
  normalizeWorkoutListVM,
  normalizeWorkoutDetailVM,
  normalizeExerciseListVM,
  normalizeExerciseHistoryListVM,
  normalizeProgramAssignmentListVM,
  normalizeProgramAssignmentEntityVM,
  normalizeProgramListVM,
  normalizeTemplateListVM,
  normalizeEntity,
} from '../../utils/apiAdapters';
import { mapApiError, shouldRetryQuery } from '../../utils/apiErrors';

export function useWorkoutList(params = {}) {
  const query = useQuery({
    queryKey: ['workouts', params],
    queryFn: () => workoutsAPI.getWorkouts(params),
    staleTime: 1000 * 60,
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    select: normalizeWorkoutListVM,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}

export function useWorkout(workout_id) {
  const query = useQuery({
    queryKey: ['workouts', workout_id],
    queryFn: () => workoutsAPI.getWorkout(workout_id),
    enabled: !!workout_id,
    staleTime: 1000 * 60,
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    select: normalizeWorkoutDetailVM,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}

export function useTemplateList(params = {}) {
  const query = useQuery({
    queryKey: ['workout-templates', params],
    queryFn: () => workoutsAPI.getTemplates(params),
    staleTime: 1000 * 60 * 5, // 5 minutes for templates
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    select: normalizeTemplateListVM,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}

export function useTemplate(template_id) {
  const query = useQuery({
    queryKey: ['workout-templates', template_id],
    queryFn: () => workoutsAPI.getTemplate(template_id),
    enabled: !!template_id,
    staleTime: 1000 * 60 * 5,
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    select: normalizeEntity,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => workoutsAPI.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-templates'] });
    },
  });
}

export function useApplyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ template_id, data }) => workoutsAPI.applyTemplate(template_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}

export function useExerciseHistory(exercise_id, params = {}) {
  const query = useQuery({
    queryKey: ['exercises', exercise_id, 'history', params],
    queryFn: () => workoutsAPI.getExerciseHistory(exercise_id, params),
    enabled: !!exercise_id,
    staleTime: 1000 * 30,
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    select: normalizeExerciseHistoryListVM,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}

export function useWorkoutPrograms(params = {}) {
  const query = useQuery({
    queryKey: ['programs', params],
    queryFn: () => workoutsAPI.getPrograms(params),
    staleTime: 1000 * 60 * 5,
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    select: normalizeProgramListVM,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}

export function useProgramAssignments(params = {}) {
  const query = useQuery({
    queryKey: ['program-assignments', params],
    queryFn: () => workoutsAPI.getProgramAssignments(params),
    staleTime: 1000 * 60 * 5,
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    select: normalizeProgramAssignmentListVM,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}

export function useProgramAssignment(assignment_id) {
  const query = useQuery({
    queryKey: ['program-assignments', assignment_id],
    queryFn: () => workoutsAPI.getProgramAssignment(assignment_id),
    enabled: !!assignment_id,
    staleTime: 1000 * 60 * 5,
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    select: normalizeProgramAssignmentEntityVM,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}

export function useCreateWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => workoutsAPI.createWorkout(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}

export function useUpdateWorkout(workout_id) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => workoutsAPI.updateWorkout(workout_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts', workout_id] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}

export function useExercises(params = {}, options = {}) {
  const { keepPreviousData = false } = options;
  const query = useQuery({
    queryKey: ['exercises', params],
    queryFn: () => workoutsAPI.searchExercises(params),
    staleTime: 1000 * 60 * 5,
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    placeholderData: keepPreviousData ? (previousData) => previousData : undefined,
    select: normalizeExerciseListVM,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}

export function useAddExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workout_id, exercise_id, notes }) =>
      workoutsAPI.addExercise(workout_id, exercise_id, notes),
    onSuccess: (_, { workout_id }) => {
      queryClient.invalidateQueries({ queryKey: ['workouts', workout_id] });
    },
  });
}

export function useUpdateWorkoutExercise(workout_id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ exercise_id, data }) => workoutsAPI.updateWorkoutExercise(exercise_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts', workout_id] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}

export function useFinishWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workout_id, data }) => workoutsAPI.updateWorkout(workout_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}

export function useAddSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workout_id, exercise_id, data }) =>
      workoutsAPI.addSet(workout_id, exercise_id, data),
    onSuccess: (_, { workout_id }) => {
      queryClient.invalidateQueries({ queryKey: ['workouts', workout_id] });
    },
  });
}

export function useUpdateSet(workout_id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ set_id, data }) => workoutsAPI.updateSet(set_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts', workout_id] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}

export function useDeleteSet(workout_id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ set_id }) => workoutsAPI.deleteSet(set_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts', workout_id] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}

export function useDeleteWorkoutExercise(workout_id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ exercise_id }) => workoutsAPI.deleteWorkoutExercise(exercise_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts', workout_id] });
    },
  });
}

export function useAddCardio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workout_id, data }) => workoutsAPI.addCardio(workout_id, data),
    onSuccess: (_, { workout_id }) => {
      queryClient.invalidateQueries({ queryKey: ['workouts', workout_id] });
    },
  });
}

function isWorkoutListQuery(queryKey) {
  if (!Array.isArray(queryKey) || queryKey[0] !== 'workouts') return false;
  if (queryKey.length === 1) return true;
  const scope = queryKey[1];
  return typeof scope === 'object' && scope !== null && !Array.isArray(scope);
}

function removeWorkoutFromCachedList(oldData, workout_id) {
  if (!oldData) return oldData;
  if (Array.isArray(oldData.workouts)) {
    return { ...oldData, workouts: oldData.workouts.filter((workout) => workout.id !== workout_id) };
  }
  if (Array.isArray(oldData.data)) {
    return { ...oldData, data: oldData.data.filter((workout) => workout.id !== workout_id) };
  }
  if (Array.isArray(oldData)) {
    return oldData.filter((workout) => workout.id !== workout_id);
  }
  return oldData;
}

function getWorkoutListSnapshots(queryClient) {
  return queryClient
    .getQueriesData({ queryKey: ['workouts'] })
    .filter(([queryKey]) => isWorkoutListQuery(queryKey));
}

function invalidateWorkoutLists(queryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) => isWorkoutListQuery(query.queryKey),
  });
}

export function useDeleteWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workout_id }) => workoutsAPI.deleteWorkout(workout_id),
    onMutate: async ({ workout_id }) => {
      const previousWorkoutLists = getWorkoutListSnapshots(queryClient);
      const previousWorkoutDetail = queryClient.getQueryData(['workouts', workout_id]);

      await queryClient.cancelQueries({ queryKey: ['workouts', workout_id], exact: true });
      await queryClient.cancelQueries({
        predicate: (query) => isWorkoutListQuery(query.queryKey),
      });

      previousWorkoutLists.forEach(([queryKey]) => {
        queryClient.setQueryData(queryKey, (oldData) => removeWorkoutFromCachedList(oldData, workout_id));
      });

      return { previousWorkoutLists, previousWorkoutDetail, workout_id };
    },
    onError: (_error, { workout_id }, context) => {
      context?.previousWorkoutLists?.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      if (context?.previousWorkoutDetail !== undefined) {
        queryClient.setQueryData(['workouts', workout_id], context.previousWorkoutDetail);
      }
    },
    onSuccess: (_data, { workout_id }) => {
      queryClient.cancelQueries({ queryKey: ['workouts', workout_id], exact: true });
    },
    onSettled: (_data, _error, { workout_id }) => {
      queryClient.cancelQueries({ queryKey: ['workouts', workout_id], exact: true });
      invalidateWorkoutLists(queryClient);
    },
  });
}

export function useUpdateProgramAssignmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignment_id, status }) =>
      workoutsAPI.updateProgramAssignmentStatus(assignment_id, status),
    onSuccess: (_, { assignment_id }) => {
      queryClient.invalidateQueries({ queryKey: ['program-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['program-assignments', assignment_id] });
    },
  });
}

export function useApplyProgramSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ session_id, data }) => workoutsAPI.applyProgramSession(session_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}

export function useExercise(exercise_id) {
  const query = useQuery({
    queryKey: ['exercises', exercise_id],
    queryFn: () => workoutsAPI.getExercise(exercise_id),
    enabled: !!exercise_id,
    staleTime: 1000 * 60 * 5,
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    select: normalizeEntity,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}

export function useCreateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => workoutsAPI.createExercise(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['exercises-meta'] });
    },
  });
}

export function useUpdateExerciseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ exercise_id, data }) => workoutsAPI.updateExercise(exercise_id, data),
    onSuccess: (_, { exercise_id }) => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['exercises', exercise_id] });
      queryClient.invalidateQueries({ queryKey: ['exercises-meta'] });
    },
  });
}

export function useDeleteExerciseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ exercise_id }) => workoutsAPI.deleteExercise(exercise_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['exercises-meta'] });
    },
  });
}

export function useSemanticSearch() {
  return useMutation({
    mutationFn: (data) => workoutsAPI.semanticSearchExercises(data),
  });
}

export function useExerciseMeta() {
  const query = useQuery({
    queryKey: ['exercises-meta'],
    queryFn: () => workoutsAPI.getExerciseMeta(),
    staleTime: 1000 * 60 * 10,
    retry: (failureCount, error) => shouldRetryQuery(error, failureCount),
    select: normalizeEntity,
  });
  return { ...query, errorMeta: mapApiError(query.error) };
}
