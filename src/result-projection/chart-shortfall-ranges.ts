import type { RetirementIncomePoint } from "./retirement-income-chart-model";

/** Consecutive displayed shortfall points, keeping funded intervals separate. */
export function buildChartShortfallRanges(
  points: readonly Pick<
    RetirementIncomePoint,
    "age" | "timelineValue" | "shortfallAnnual"
  >[],
  retirementTimelineValue: number
): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  let activeRange: { start: number; end: number } | undefined;
  for (const point of points) {
    const value = point.timelineValue ?? point.age;
    if (value < retirementTimelineValue) continue;
    if (point.shortfallAnnual <= 0) {
      activeRange = undefined;
    } else if (activeRange) {
      activeRange.end = value;
    } else {
      activeRange = { start: value, end: value };
      ranges.push(activeRange);
    }
  }
  return ranges;
}
