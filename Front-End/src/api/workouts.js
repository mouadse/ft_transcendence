import client from './client';

function firstMuscle(value) {
  if (!value || typeof value !== 'string') return '';
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)[0] || '';
}

function collectionFromResponse(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function normalizeExercise(exercise) {
  if (!exercise || typeof exercise !== 'object') return exercise;

  const primaryMuscle =
    exercise.primary_muscle ||
    exercise.muscle_group ||
    firstMuscle(exercise.primary_muscles) ||
    '';

  return {
    ...exercise,
    primary_muscle: primaryMuscle,
    muscle_group: exercise.muscle_group || primaryMuscle,
    difficulty: exercise.difficulty || exercise.level || '',
    type: exercise.type || exercise.category || '',
  };
}

function normalizeTemplateExercise(item) {
  const exercise = normalizeExercise(item?.exercise || item);
  const sets = collectionFromResponse(item, 'sets').length > 0
    ? collectionFromResponse(item, 'sets')
    : collectionFromResponse(item, 'workout_template_sets').map((set) => ({
        ...set,
        weight_kg: set.weight_kg ?? set.weight ?? 0,
      }));

  return {
    ...exercise,
    ...item,
    exercise,
    name: exercise?.name || item?.name || 'Exercise',
    id: item?.id || exercise?.id,
    exercise_id: item?.exercise_id || exercise?.id || null,
    template_exercise_id: item?.id || null,
    sets,
    sets_count: item?.sets_count ?? item?.sets ?? sets.length,
    reps: item?.reps ?? null,
    weight_kg: item?.weight_kg ?? item?.weight ?? 0,
    rest_time: item?.rest_time ?? 0,
    notes: item?.notes || '',
  };
}

function normalizeTemplate(template) {
  if (!template || typeof template !== 'object') return template;

  const exercises = collectionFromResponse(template, 'exercises').length > 0
    ? collectionFromResponse(template, 'exercises').map(normalizeTemplateExercise)
    : collectionFromResponse(template, 'workout_template_exercises').map(normalizeTemplateExercise);

  return {
    ...template,
    description: template.description || template.notes || '',
    exercises,
    estimated_duration_minutes:
      template.estimated_duration_minutes ||
      template.estimatedDurationMinutes ||
      null,
  };
}

function normalizeWorkoutExercise(item) {
  const exercise = normalizeExercise(item?.exercise || item);
  const sets = collectionFromResponse(item, 'sets').length > 0
    ? collectionFromResponse(item, 'sets')
    : collectionFromResponse(item, 'workout_sets').map((set) => ({
        ...set,
        weight_kg: set.weight_kg ?? set.weight ?? 0,
      }));

  return {
    ...exercise,
    ...item,
    exercise,
    name: exercise?.name || item?.name || 'Exercise',
    id: item?.id || exercise?.id,
    exercise_id: item?.exercise_id || exercise?.id || null,
    workoutExerciseId: item?.id || item?.workoutExerciseId || null,
    sets,
    notes: item?.notes || '',
  };
}

function normalizeWorkout(workout) {
  if (!workout || typeof workout !== 'object') return workout;

  const exercises = collectionFromResponse(workout, 'exercises').length > 0
    ? collectionFromResponse(workout, 'exercises').map(normalizeWorkoutExercise)
    : collectionFromResponse(workout, 'workout_exercises').map(normalizeWorkoutExercise);

  const workoutName =
    workout.name ||
    workout.program_name ||
    workout.template_name ||
    workout.workout_template?.name ||
    workout.program?.name ||
    null;

  return {
    ...workout,
    name: workoutName,
    started_at: workout.started_at || workout.date || workout.created_at || null,
    completed_at: workout.completed_at || null,
    exercises,
  };
}

function normalizeCollectionResponse(payload, key, normalizer) {
  const items = collectionFromResponse(payload, key).map(normalizer);
  return {
    ...payload,
    [key]: items,
    data: items,
  };
}

export const workoutsAPI = {
  // Get workout history
  getWorkouts: async (params = {}) => {
    const response = await client.get('/v1/workouts', { params });
    return normalizeCollectionResponse(response.data, 'workouts', normalizeWorkout);
  },

  // Get single workout
  getWorkout: async (workout_id) => {
    const response = await client.get(`/v1/workouts/${workout_id}`);
    return normalizeWorkout(response.data);
  },

  // Create new workout
  createWorkout: async (data) => {
    const response = await client.post('/v1/workouts', data);
    return normalizeWorkout(response.data);
  },

  // Update workout
  updateWorkout: async (workout_id, data) => {
    const response = await client.patch(`/v1/workouts/${workout_id}`, data);
    return normalizeWorkout(response.data);
  },

  // Add exercise to workout
  addExercise: async (workout_id, exercise_id, notes = '') => {
    const response = await client.post(`/v1/workouts/${workout_id}/exercises`, {
      exercise_id,
      notes,
    });
    return normalizeWorkoutExercise(response.data);
  },

  // Log a set for an exercise
  addSet: async (workout_id, exercise_id, data) => {
    const payload = {
      ...data,
      weight: data?.weight ?? data?.weight_kg ?? 0,
    };
    delete payload.weight_kg;

    const response = await client.post(
      `/v1/workout-exercises/${exercise_id}/sets`,
      payload
    );
    return response.data;
  },

  // Add cardio entry
  addCardio: async (workout_id, data) => {
    const response = await client.post(`/v1/workouts/${workout_id}/cardio`, data);
    return response.data;
  },

  // Get workout templates
  getTemplates: async (params = {}) => {
    const response = await client.get('/v1/workout-templates', { params });
    return normalizeCollectionResponse(response.data, 'templates', normalizeTemplate);
  },

  // Get single template
  getTemplate: async (template_id) => {
    const response = await client.get(`/v1/workout-templates/${template_id}`);
    return normalizeTemplate(response.data);
  },

  // Create workout template
  createTemplate: async (data) => {
    const response = await client.post('/v1/workout-templates', data);
    return normalizeTemplate(response.data);
  },

  // Apply workout template
  applyTemplate: async (template_id, data) => {
    const response = await client.post(`/v1/workout-templates/${template_id}/apply`, data);
    return response.data;
  },

  // Search exercise library
  searchExercises: async (params = {}) => {
    const nextParams = { ...params };
    if (nextParams.q) {
      nextParams.name = nextParams.q;
      delete nextParams.q;
    }
    const response = await client.get('/v1/exercises', { params: nextParams });
    return normalizeCollectionResponse(response.data, 'exercises', normalizeExercise);
  },

  // Get exercise history
  getExerciseHistory: async (exercise_id, params = {}) => {
    const response = await client.get(`/v1/exercises/${exercise_id}/history`, { params });
    return response.data;
  },

  // Get workout programs
  getPrograms: async (params = {}) => {
    const response = await client.get('/v1/programs', { params });
    return response.data;
  },

  // Get program assignments
  getProgramAssignments: async (params = {}) => {
    const response = await client.get('/v1/program-assignments', { params });
    return response.data;
  },

  // Get program assignment details
  getProgramAssignment: async (assignment_id) => {
    const response = await client.get(`/v1/program-assignments/${assignment_id}`);
    return response.data;
  },

  // Update own program assignment status
  updateProgramAssignmentStatus: async (assignment_id, status) => {
    const response = await client.patch(`/v1/program-assignments/${assignment_id}/status`, { status });
    return response.data;
  },

  // Apply a program session to today's workout
  applyProgramSession: async (session_id, data = {}) => {
    const response = await client.post(`/v1/program-sessions/${session_id}/apply`, data);
    return response.data;
  },

  // Delete workout
  deleteWorkout: async (workout_id) => {
    const response = await client.delete(`/v1/workouts/${workout_id}`);
    return response.data;
  },

  // Update a set
  updateSet: async (set_id, data) => {
    const response = await client.patch(`/v1/workout-sets/${set_id}`, data);
    return response.data;
  },

  // Delete a set
  deleteSet: async (set_id) => {
    const response = await client.delete(`/v1/workout-sets/${set_id}`);
    return response.data;
  },

  // Update a workout exercise
  updateWorkoutExercise: async (exercise_id, data) => {
    const response = await client.patch(`/v1/workout-exercises/${exercise_id}`, data);
    return response.data;
  },

  // Delete a workout exercise
  deleteWorkoutExercise: async (exercise_id) => {
    const response = await client.delete(`/v1/workout-exercises/${exercise_id}`);
    return response.data;
  },

  // Get sets for a workout exercise
  getExerciseSets: async (exercise_id) => {
    const response = await client.get(`/v1/workout-exercises/${exercise_id}/sets`);
    return response.data;
  },

  // Update cardio entry
  updateCardio: async (cardio_id, data) => {
    const response = await client.patch(`/v1/workout-cardio/${cardio_id}`, data);
    return response.data;
  },

  // Delete cardio entry
  deleteCardio: async (cardio_id) => {
    const response = await client.delete(`/v1/workout-cardio/${cardio_id}`);
    return response.data;
  },

  // Get cardio entries for workout
  getCardio: async (workout_id) => {
    const response = await client.get(`/v1/workouts/${workout_id}/cardio`);
    return response.data;
  },

  // Get single exercise
  getExercise: async (exercise_id) => {
    const response = await client.get(`/v1/exercises/${exercise_id}`);
    return response.data;
  },

  // Create exercise
  createExercise: async (data) => {
    const response = await client.post('/v1/exercises', data);
    return response.data;
  },

  // Update exercise
  updateExercise: async (exercise_id, data) => {
    const response = await client.patch(`/v1/exercises/${exercise_id}`, data);
    return response.data;
  },

  // Delete exercise
  deleteExercise: async (exercise_id) => {
    const response = await client.delete(`/v1/exercises/${exercise_id}`);
    return response.data;
  },

  // Semantic search
  semanticSearchExercises: async (query) => {
    const response = await client.post('/v1/exercises/search', { query });
    return response.data;
  },

  // Get exercise library meta (filters)
  getExerciseMeta: async () => {
    const response = await client.get('/v1/exercises/library-meta');
    return response.data;
  },
};
