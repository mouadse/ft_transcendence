const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
};

const GOAL_ADJUSTMENTS = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

const MACRO_SPLITS = {
  lose: { proteinPerKg: 2.0, fatPct: 0.25 },
  maintain: { proteinPerKg: 1.8, fatPct: 0.28 },
  gain: { proteinPerKg: 2.2, fatPct: 0.25 },
};

export function computeTDEE({ age, height, weight, gender, activityLevel, goal }) {
  const bmr =
    gender === 'female'
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5;

  const factor = ACTIVITY_FACTORS[activityLevel] ?? 1.375;
  const tdee = Math.round(bmr * factor);
  const adj = GOAL_ADJUSTMENTS[goal] ?? 0;
  const calories = Math.max(1200, tdee + adj);

  const { proteinPerKg, fatPct } = MACRO_SPLITS[goal] ?? MACRO_SPLITS.maintain;
  const protein = Math.round(weight * proteinPerKg);
  const fat = Math.round((calories * fatPct) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  return { calories, protein, carbs, fat };
}
