export function formatMeasureValue(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return '0';
  }

  return Number(numericValue.toFixed(2)).toString();
}

export function getServingSize(food) {
  const numericServingSize = Number(food?.serving_size);

  if (numericServingSize > 0) {
    return numericServingSize;
  }

  return 100;
}

export function formatMeasurement(value, unit) {
  const formattedValue = formatMeasureValue(value);
  const normalizedUnit = unit || 'g';
  return normalizedUnit === 'g' ? `${formattedValue}${normalizedUnit}` : `${formattedValue} ${normalizedUnit}`;
}

export function getFoodMeasurementMeta(food) {
  const servingSize = getServingSize(food);
  const servingUnit = 'g';
  const referenceQuantity = 100;
  const referenceLabel = '100g';

  return {
    gramBased: true,
    referenceQuantity,
    referenceLabel,
    servingSize,
    servingUnit,
  };
}

export function getQuickMeasurePresets(food) {
  const { servingSize } = getFoodMeasurementMeta(food);
  const dynamicPresets = [25, 50, 100, Math.round(servingSize), 150, 200];

  return Array.from(new Set(dynamicPresets.filter((value) => value > 0))).sort((a, b) => a - b);
}
