/**
 * Lightweight frontend view models (VM) for backend response normalization.
 * This keeps components stable across paginated and legacy payload shapes.
 */

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstArray(payload, keys = []) {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function metadataOf(payload) {
  return payload?.metadata || payload?.pagination || payload?.meta || null;
}

function normalizeListPayload(payload, keys = []) {
  if (Array.isArray(payload)) {
    return { items: payload, metadata: null };
  }
  if (Array.isArray(payload?.data)) {
    return { items: payload.data, metadata: metadataOf(payload) };
  }
  const keyed = firstArray(payload, keys);
  if (keyed.length > 0) {
    return { items: keyed, metadata: metadataOf(payload) };
  }
  return { items: [], metadata: metadataOf(payload) };
}

export function normalizeWorkoutListVM(payload) {
  const { items, metadata } = normalizeListPayload(payload, ['workouts']);
  return {
    items,
    workouts: items,
    data: items,
    metadata,
    raw: payload,
  };
}

export function normalizeWorkoutDetailVM(payload) {
  const workout = payload?.workout || payload?.data || payload || null;
  return {
    item: workout,
    workout,
    data: workout,
    raw: payload,
  };
}

export function normalizeExerciseListVM(payload) {
  const { items, metadata } = normalizeListPayload(payload, ['exercises']);
  return {
    items,
    exercises: items,
    data: items,
    metadata,
    raw: payload,
  };
}

export function normalizeExerciseHistoryListVM(payload) {
  const { items, metadata } = normalizeListPayload(payload, ['history']);
  return {
    items,
    history: items,
    data: items,
    metadata,
    raw: payload,
  };
}

export function normalizeFoodListVM(payload) {
  const { items, metadata } = normalizeListPayload(payload, ['foods']);
  return {
    items,
    foods: items,
    data: items,
    metadata,
    raw: payload,
  };
}

export function normalizeProgramAssignmentListVM(payload) {
  const { items, metadata } = normalizeListPayload(payload, ['assignments', 'program_assignments']);
  return {
    items,
    assignments: items,
    data: items,
    metadata,
    raw: payload,
  };
}

export function normalizeProgramListVM(payload) {
  const { items, metadata } = normalizeListPayload(payload, ['programs']);
  return {
    items,
    programs: items,
    data: items,
    metadata,
    raw: payload,
  };
}

export function normalizeTemplateListVM(payload) {
  const { items, metadata } = normalizeListPayload(payload, ['templates', 'workout_templates']);
  return {
    items,
    templates: items,
    data: items,
    metadata,
    raw: payload,
  };
}

export function normalizeProgramEntityVM(payload) {
  const program = payload?.program || payload?.data || payload || null;
  return {
    item: program,
    program,
    data: program,
    raw: payload,
  };
}

export function normalizeProgramAssignmentEntityVM(payload) {
  const assignment = payload?.assignment || payload?.data || payload || null;
  return {
    item: assignment,
    assignment,
    data: assignment,
    raw: payload,
  };
}

export function normalizeUserListVM(payload) {
  const { items, metadata } = normalizeListPayload(payload, ['users']);
  return {
    items,
    users: items,
    data: items,
    metadata,
    raw: payload,
  };
}

export function normalizeEntity(payload) {
  const item = payload?.data || payload || null;
  return { item, data: item, raw: payload };
}

export function hasItems(value) {
  return asArray(value).length > 0;
}
