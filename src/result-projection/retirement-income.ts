import type {
  RetirementIncomeChartLimits,
  RetirementIncomeChartParameters,
  RetirementIncomePoint,
} from "./retirement-income-chart-model";
import type { ProjectionRow } from "../projection";
import {
  calculateDateAge,
  calculateMinimumPensionAccessAge,
  calculateMinimumSippAccessAge,
  calculateMinimumStatePensionDrawAge,
  calculateStatePensionDrawAge,
  ALPHA_ADDED_PENSION_MONTHLY_MAX,
  LISA_MONTHLY_CONTRIBUTION_MAX,
  MODEL_AGE_STEP,
  type PensionSettings,
} from "../settings";
import {
  getPartialRetirementStartAgeBounds,
  getPensionStartAgeBounds,
  getSippChartAccessAgeBounds,
  getStatePensionAgeBounds,
  getStandalonePensionStartAgeBounds,
  getUseByAgeBounds,
} from "./retirement-income-chart-bounds";
import { addYearsToIsoDate } from "../model-date";
import { getSpendingSmileStartAgeBounds } from "../spending-smile";
import { createRetirementIncomeAssessmentSeries } from "../calculation/retirement-income-assessment";

const CHART_FLEXIBLE_MONTHLY_CONTRIBUTION_MAX = 2000;

export function createRetirementIncomeSeries(
  rows: ProjectionRow[],
  settings: PensionSettings
): RetirementIncomePoint[] {
  return insertChartTransitionPoints(
    createRetirementIncomeAssessmentSeries(rows, settings),
    settings
  );
}
function insertChartTransitionPoints(
  points: RetirementIncomePoint[],
  settings: PensionSettings
) {
  type TransitionBoundary = {
    date: string;
    age: number;
  };

  const transitionPoints: TransitionBoundary[] = [
    {
      date: addYearsToIsoDate(settings.dateOfBirth, settings.requirementAge),
      age: settings.requirementAge,
    },
    ...getSpendingSmileTransitionBoundaries(settings),
    settings.showIsa
      ? {
          date: addYearsToIsoDate(settings.dateOfBirth, settings.isaDrawAge),
          age: settings.isaDrawAge,
        }
      : null,
    settings.showIsa && settings.isaWithdrawalStrategy === "use_by_age"
      ? {
          date: addYearsToIsoDate(
            settings.dateOfBirth,
            settings.isaWithdrawalTargetAge
          ),
          age: settings.isaWithdrawalTargetAge,
        }
      : null,
    settings.showSipp
      ? {
          date: addYearsToIsoDate(settings.dateOfBirth, settings.sippDrawAge),
          age: settings.sippDrawAge,
        }
      : null,
    settings.showSipp && settings.sippWithdrawalStrategy === "use_by_age"
      ? {
          date: addYearsToIsoDate(
            settings.dateOfBirth,
            settings.sippWithdrawalTargetAge
          ),
          age: settings.sippWithdrawalTargetAge,
        }
      : null,
    settings.showCsAvc
      ? {
          date: addYearsToIsoDate(settings.dateOfBirth, settings.csAvcDrawAge),
          age: settings.csAvcDrawAge,
        }
      : null,
    settings.showCsAvc && settings.csAvcWithdrawalStrategy === "use_by_age"
      ? {
          date: addYearsToIsoDate(
            settings.dateOfBirth,
            settings.csAvcWithdrawalTargetAge
          ),
          age: settings.csAvcWithdrawalTargetAge,
        }
      : null,
    settings.showLisa
      ? {
          date: addYearsToIsoDate(settings.dateOfBirth, settings.lisaDrawAge),
          age: settings.lisaDrawAge,
        }
      : null,
    settings.showLisa && settings.lisaWithdrawalStrategy === "use_by_age"
      ? {
          date: addYearsToIsoDate(
            settings.dateOfBirth,
            settings.lisaWithdrawalTargetAge
          ),
          age: settings.lisaWithdrawalTargetAge,
        }
      : null,
    settings.showAlpha
      ? {
          date: addYearsToIsoDate(
            settings.dateOfBirth,
            settings.alphaPensionDrawAge
          ),
          age: settings.alphaPensionDrawAge,
        }
      : null,
    settings.showNuvos
      ? {
          date: addYearsToIsoDate(
            settings.dateOfBirth,
            settings.nuvosPensionDrawAge
          ),
          age: settings.nuvosPensionDrawAge,
        }
      : null,
    settings.showPremium
      ? {
          date: addYearsToIsoDate(
            settings.dateOfBirth,
            settings.premiumDrawAge
          ),
          age: settings.premiumDrawAge,
        }
      : null,
    settings.showStatePension
      ? {
          date: settings.statePensionDrawDate,
          age: calculateStatePensionDrawAge(
            settings.dateOfBirth,
            settings.statePensionDrawDate
          ),
        }
      : null,
    settings.partialRetirementEnabled
      ? {
          date: addYearsToIsoDate(
            settings.dateOfBirth,
            settings.partialRetirementStartAge
          ),
          age: settings.partialRetirementStartAge,
        }
      : null,
    ...(settings.showAdditionalGuaranteedIncome
      ? settings.additionalGuaranteedIncomes
      : []
    ).flatMap((income) => {
      if (
        income.annualAmount === null ||
        income.annualAmount <= 0 ||
        income.startAge === null
      ) {
        return [];
      }

      return [
        {
          date: addYearsToIsoDate(settings.dateOfBirth, income.startAge),
          age: income.startAge,
        },
        income.endAge === null || income.endAge === undefined
          ? null
          : {
              date: addYearsToIsoDate(settings.dateOfBirth, income.endAge + 1),
              age: income.endAge + 1,
            },
      ];
    }),
  ]
    .filter((point): point is TransitionBoundary => Boolean(point))
    .filter(
      (point, index, points) =>
        points.findIndex((candidate) => candidate.date === point.date) === index
    )
    .sort((left, right) => left.date.localeCompare(right.date));

  let nextPoints = [...points];

  transitionPoints.forEach((transitionPoint) => {
    nextPoints = insertChartTransitionPoint(nextPoints, transitionPoint);
  });

  return nextPoints;
}

function getSpendingSmileTransitionBoundaries(settings: PensionSettings) {
  if (settings.spendingStrategyType !== "SPENDING_SMILE") {
    return [];
  }

  return [
    {
      date: addYearsToIsoDate(
        settings.dateOfBirth,
        settings.spendingSmile.slowGoStartAge
      ),
      age: settings.spendingSmile.slowGoStartAge,
    },
    {
      date: addYearsToIsoDate(
        settings.dateOfBirth,
        settings.spendingSmile.noGoStartAge
      ),
      age: settings.spendingSmile.noGoStartAge,
    },
  ];
}

function insertChartTransitionPoint(
  points: RetirementIncomePoint[],
  transitionBoundary: { date: string; age: number }
) {
  const { date, age } = transitionBoundary;

  if (points.length === 0 || points.some((point) => point.date === date)) {
    return points;
  }

  const insertionIndex = points.findIndex((point) => point.date > date);

  if (insertionIndex <= 0) {
    return points;
  }

  const nextPoint = points[insertionIndex];

  if (!nextPoint) {
    return points;
  }

  const insertedPoint: RetirementIncomePoint = {
    ...nextPoint,
    date,
    age,
  };

  return [
    ...points.slice(0, insertionIndex),
    insertedPoint,
    ...points.slice(insertionIndex),
  ];
}

export function createRetirementIncomeChartParameters(
  settings: PensionSettings
): RetirementIncomeChartParameters {
  return {
    targetIncomeAnnual: settings.desiredRetirementIncome,
    spendingSmileEnabled: settings.spendingStrategyType === "SPENDING_SMILE",
    goGoPercentage: settings.spendingSmile.goGoPercentage,
    slowGoStartAge: settings.spendingSmile.slowGoStartAge,
    slowGoPercentage: settings.spendingSmile.slowGoPercentage,
    noGoStartAge: settings.spendingSmile.noGoStartAge,
    noGoPercentage: settings.spendingSmile.noGoPercentage,
    alphaMonthlyAddedPension: settings.alphaAddedPensionMonthly,
    isaMonthlyContribution: settings.isaMonthlyContribution,
    lisaMonthlyContribution: settings.lisaMonthlyContribution,
    sippMonthlyContribution: settings.sippMonthlyContribution,
    retirementAge: settings.requirementAge,
    alphaLeaveAge: settings.alphaPensionLeaveAge,
    sippAccessAge: settings.sippDrawAge,
    sippUseByAge: settings.sippWithdrawalTargetAge,
    isaAccessAge: settings.isaDrawAge,
    lisaAccessAge: settings.lisaDrawAge,
    alphaStartAge: settings.alphaPensionDrawAge,
    nuvosStartAge: settings.nuvosPensionDrawAge,
    premiumStartAge: settings.premiumDrawAge,
    isaUseByAge: settings.isaWithdrawalTargetAge,
    lisaUseByAge: settings.lisaWithdrawalTargetAge,
    partialRetirementStartAge: settings.partialRetirementStartAge,
    partialRetirementWorkPercent: settings.partialRetirementWorkPercent,
    partialRetirementEnabled: settings.partialRetirementEnabled,
    statePensionAge: calculateStatePensionDrawAge(
      settings.dateOfBirth,
      settings.statePensionDrawDate
    ),
    showAlpha: settings.showAlpha,
    showClassic: settings.showClassic,
    showClassicPlus: settings.showClassicPlus,
    showCsAvc: settings.showCsAvc,
    showIsa: settings.showIsa,
    showLisa: settings.showLisa,
    showSipp: settings.showSipp,
    sippUseByAgeEnabled:
      settings.showSipp && settings.sippWithdrawalStrategy === "use_by_age",
    showNuvos: settings.showNuvos,
    showPremium: settings.showPremium,
    isaUseByAgeEnabled:
      settings.showIsa && settings.isaWithdrawalStrategy === "use_by_age",
    lisaUseByAgeEnabled:
      settings.showLisa && settings.lisaWithdrawalStrategy === "use_by_age",
    showStatePension: settings.showStatePension,
  };
}

export function createRetirementIncomeChartLimits(
  settings: PensionSettings
): RetirementIncomeChartLimits {
  const statePensionAge = calculateStatePensionDrawAge(
    settings.dateOfBirth,
    settings.statePensionDrawDate
  );
  const minimumSippAccessAge = calculateMinimumSippAccessAge(
    settings.dateOfBirth,
    settings
  );
  const minimumAlphaAccessAge = calculateMinimumPensionAccessAge(
    settings.dateOfBirth
  );
  const currentPlanningAge = calculateCurrentPlanningAge(settings);
  const defaultStatePensionAge = calculateMinimumStatePensionDrawAge(
    settings.dateOfBirth
  );
  const ageUpperLimit = Math.max(
    currentPlanningAge,
    Math.min(70, statePensionAge)
  );
  const sippAccessAgeBounds = getSippChartAccessAgeBounds({
    lifeExpectancy: settings.lifeExpectancy,
    minimumSippAccessAge,
    retirementAge: settings.requirementAge,
  });
  const isaAccessAgeMax = Math.max(currentPlanningAge, settings.lifeExpectancy);
  const partialRetirementStartAgeBounds = getPartialRetirementStartAgeBounds({
    currentPlanningAge,
    lifeExpectancy: settings.lifeExpectancy,
    retirementAge: settings.requirementAge,
  });
  const sippUseByAgeBounds = getUseByAgeBounds({
    drawAge: settings.sippDrawAge,
    lifeExpectancy: settings.lifeExpectancy,
  });
  const isaUseByAgeBounds = getUseByAgeBounds({
    drawAge: settings.isaDrawAge,
    lifeExpectancy: settings.lifeExpectancy,
  });
  const lisaUseByAgeBounds = getUseByAgeBounds({
    drawAge: settings.lisaDrawAge,
    lifeExpectancy: settings.lifeExpectancy,
  });
  const alphaStartAgeBounds = getPensionStartAgeBounds({
    currentPlanningAge,
    leaveAge: settings.alphaPensionLeaveAge,
    minimumPensionAccessAge: minimumAlphaAccessAge,
    retirementAge: settings.requirementAge,
  });
  const nuvosStartAgeBounds = getStandalonePensionStartAgeBounds({
    currentPlanningAge,
    minimumPensionAccessAge: minimumAlphaAccessAge,
  });
  const premiumStartAgeBounds = getPensionStartAgeBounds({
    currentPlanningAge,
    leaveAge: 0,
    minimumPensionAccessAge: settings.premiumEarliestAccessAge,
    retirementAge: settings.requirementAge,
  });
  const statePensionAgeBounds = getStatePensionAgeBounds({
    defaultStatePensionAge,
    lifeExpectancy: settings.lifeExpectancy,
  });
  const slowGoStartAgeBounds = getSpendingSmileStartAgeBounds(
    settings.spendingSmile,
    "slowGoStartAge",
    settings.requirementAge,
    settings.lifeExpectancy
  );
  const noGoStartAgeBounds = getSpendingSmileStartAgeBounds(
    settings.spendingSmile,
    "noGoStartAge",
    settings.requirementAge,
    settings.lifeExpectancy
  );

  return {
    targetIncomeAnnual: { min: 0, max: 200000, step: 600 },
    alphaMonthlyAddedPension: {
      min: 0,
      max: ALPHA_ADDED_PENSION_MONTHLY_MAX,
      step: 25,
    },
    isaMonthlyContribution: {
      min: 0,
      max: CHART_FLEXIBLE_MONTHLY_CONTRIBUTION_MAX,
      step: 25,
    },
    lisaMonthlyContribution: {
      min: 0,
      max: LISA_MONTHLY_CONTRIBUTION_MAX,
      step: 25,
    },
    sippMonthlyContribution: {
      min: 0,
      max: CHART_FLEXIBLE_MONTHLY_CONTRIBUTION_MAX,
      step: 25,
    },
    retirementAge: {
      min: currentPlanningAge,
      max: Math.max(
        currentPlanningAge,
        settings.showAlpha
          ? Math.min(ageUpperLimit, settings.alphaPensionDrawAge)
          : ageUpperLimit
      ),
      step: MODEL_AGE_STEP,
    },
    slowGoStartAge: {
      ...slowGoStartAgeBounds,
      step: MODEL_AGE_STEP,
    },
    noGoStartAge: {
      ...noGoStartAgeBounds,
      step: MODEL_AGE_STEP,
    },
    alphaLeaveAge: {
      min: currentPlanningAge,
      max: Math.max(
        currentPlanningAge,
        Math.min(ageUpperLimit, settings.requirementAge)
      ),
      step: MODEL_AGE_STEP,
    },
    sippAccessAge: {
      min: sippAccessAgeBounds.min,
      max: sippAccessAgeBounds.max,
      step: MODEL_AGE_STEP,
    },
    sippUseByAge: {
      min: sippUseByAgeBounds.min,
      max: sippUseByAgeBounds.max,
      step: MODEL_AGE_STEP,
    },
    isaAccessAge: {
      min: currentPlanningAge,
      max: isaAccessAgeMax,
      step: MODEL_AGE_STEP,
    },
    lisaAccessAge: {
      min: 60,
      max: Math.max(60, settings.lifeExpectancy),
      step: MODEL_AGE_STEP,
    },
    alphaStartAge: {
      min: alphaStartAgeBounds.min,
      max: alphaStartAgeBounds.max,
      step: MODEL_AGE_STEP,
    },
    nuvosStartAge: {
      min: nuvosStartAgeBounds.min,
      max: nuvosStartAgeBounds.max,
      step: MODEL_AGE_STEP,
    },
    premiumStartAge: {
      min: premiumStartAgeBounds.min,
      max: premiumStartAgeBounds.max,
      step: MODEL_AGE_STEP,
    },
    isaUseByAge: {
      min: isaUseByAgeBounds.min,
      max: isaUseByAgeBounds.max,
      step: MODEL_AGE_STEP,
    },
    lisaUseByAge: {
      min: lisaUseByAgeBounds.min,
      max: lisaUseByAgeBounds.max,
      step: MODEL_AGE_STEP,
    },
    partialRetirementStartAge: {
      min: partialRetirementStartAgeBounds.min,
      max: partialRetirementStartAgeBounds.max,
      step: MODEL_AGE_STEP,
    },
    partialRetirementWorkPercent: { min: 0, max: 100, step: 1 },
    statePensionAge: {
      min: statePensionAgeBounds.min,
      max: statePensionAgeBounds.max,
      step: MODEL_AGE_STEP,
    },
  };
}

function calculateCurrentPlanningAge(settings: PensionSettings) {
  return Math.max(
    0,
    Math.ceil(calculateDateAge(settings.dateOfBirth, settings.startDate))
  );
}

export { calculateCurrentPlanningAge };
