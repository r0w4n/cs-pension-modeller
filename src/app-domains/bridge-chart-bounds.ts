export type ChartAgeBounds = {
  min: number;
  max: number;
};

const MINIMUM_WITHDRAWAL_TARGET_AGE_GAP = 0.25;
const MAXIMUM_CHART_PENSION_START_AGE = 70;
const MAXIMUM_WITHDRAWAL_TARGET_AGE = 100;

export function getEarliestSippChartStartAge({
  minimumSippAccessAge,
  retirementAge,
}: {
  minimumSippAccessAge: number;
  retirementAge: number;
}) {
  return Math.max(minimumSippAccessAge, retirementAge);
}

export function getSippChartAccessAgeBounds({
  lifeExpectancy,
  minimumSippAccessAge,
  retirementAge,
}: {
  lifeExpectancy: number;
  minimumSippAccessAge: number;
  retirementAge: number;
}): ChartAgeBounds {
  const min = getEarliestSippChartStartAge({
    minimumSippAccessAge,
    retirementAge,
  });

  return {
    min,
    max: Math.max(min, lifeExpectancy, minimumSippAccessAge),
  };
}

export function getPartialRetirementStartAgeBounds({
  currentPlanningAge,
  lifeExpectancy,
  retirementAge,
}: {
  currentPlanningAge: number;
  lifeExpectancy: number;
  retirementAge: number;
}): ChartAgeBounds {
  return {
    min: currentPlanningAge,
    max: Math.max(
      currentPlanningAge,
      Math.min(
        retirementAge - MINIMUM_WITHDRAWAL_TARGET_AGE_GAP,
        MAXIMUM_CHART_PENSION_START_AGE,
        lifeExpectancy
      )
    ),
  };
}

export function getStatePensionAgeBounds({
  defaultStatePensionAge,
  lifeExpectancy,
}: {
  defaultStatePensionAge: number;
  lifeExpectancy: number;
}): ChartAgeBounds {
  return {
    min: defaultStatePensionAge,
    max: Math.max(defaultStatePensionAge, lifeExpectancy),
  };
}

export function getPensionStartAgeBounds({
  currentPlanningAge,
  leaveAge,
  minimumPensionAccessAge,
  retirementAge,
}: {
  currentPlanningAge: number;
  leaveAge: number;
  minimumPensionAccessAge: number;
  retirementAge: number;
}): ChartAgeBounds {
  const min = Math.max(
    currentPlanningAge,
    retirementAge,
    leaveAge,
    minimumPensionAccessAge
  );

  return {
    min,
    max: Math.max(min, MAXIMUM_CHART_PENSION_START_AGE),
  };
}

export function getUseByAgeBounds({
  drawAge,
  lifeExpectancy,
}: {
  drawAge: number;
  lifeExpectancy: number;
}): ChartAgeBounds {
  const min = drawAge + MINIMUM_WITHDRAWAL_TARGET_AGE_GAP;

  return {
    min,
    max: Math.max(min, Math.min(MAXIMUM_WITHDRAWAL_TARGET_AGE, lifeExpectancy)),
  };
}
