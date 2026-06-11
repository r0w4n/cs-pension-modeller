export type ChartNumberLimit = {
  min: number;
  max: number;
  step: number;
};

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function clampToLimit(value: number, limit: ChartNumberLimit) {
  return clampNumber(value, limit.min, limit.max);
}

export function snapToLimit(value: number, limit: ChartNumberLimit) {
  const clamped = clampToLimit(value, limit);
  const steps = Math.round((clamped - limit.min) / limit.step);
  const snapped = limit.min + steps * limit.step;

  return Number(snapToLimitPrecision(snapped, limit.step));
}

function snapToLimitPrecision(value: number, step: number) {
  const precision = Math.max(0, (step.toString().split(".")[1] ?? "").length);

  return value.toFixed(precision);
}
