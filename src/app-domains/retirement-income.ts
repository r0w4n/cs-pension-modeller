import type {
  RetirementIncomeBridgeLimits,
  RetirementIncomeBridgeParameters,
  RetirementIncomePoint,
} from "../RetirementIncomeBridgeChart";
import {
  calculateMonthlyIncomeTax,
  calculateRetirementIncomeTargetAtDate,
  type ProjectionRow,
} from "../projection";
import {
  calculateDateAge,
  calculateMinimumPensionAccessAge,
  calculateMinimumSippAccessAge,
  calculateMinimumStatePensionDrawAge,
  calculateStatePensionDrawAge,
  type PensionSettings,
} from "../settings";
import { addYearsToIsoDate, clampNumber } from "./shared";

export function createRetirementIncomeSeries(
  rows: ProjectionRow[],
  settings: PensionSettings
): RetirementIncomePoint[] {
  const statePensionAge = calculateDateAge(
    settings.dateOfBirth,
    settings.statePensionDrawDate
  );
  const requirementDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.requirementAge
  );
  const alphaDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.alphaPensionDrawAge
  );
  const nuvosDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.nuvosPensionDrawAge
  );
  const sippDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.sippDrawAge
  );
  const isaDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.isaDrawAge
  );
  const sippUseByDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.sippWithdrawalTargetAge
  );
  const isaUseByDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.isaWithdrawalTargetAge
  );

  const baseSeries = rows
    .filter((row) => row.date >= settings.startDate)
    .map((row, index) => {
      const age = row.age + row.ageMonths / 12;
      const previousRow = index > 0 ? rows[index - 1] : undefined;
      const isaIncomeAnnual = settings.showIsa
        ? getBridgePotIncomeAnnual({
            row,
            previousRow,
            rowDate: row.date,
            drawDate: isaDrawDate,
            stopDate:
              settings.isaWithdrawalStrategy === "use_by_age"
                ? isaUseByDate
                : null,
            monthlyIncome: row.monthlyIsaPension,
            previousMonthlyIncome: previousRow?.monthlyIsaPension ?? 0,
          })
        : 0;
      const sippIncomeAnnual = settings.showSipp
        ? getBridgePotIncomeAnnual({
            row,
            previousRow,
            rowDate: row.date,
            drawDate: sippDrawDate,
            stopDate:
              settings.sippWithdrawalStrategy === "use_by_age"
                ? sippUseByDate
                : null,
            monthlyIncome: row.monthlySippPension,
            previousMonthlyIncome: previousRow?.monthlySippPension ?? 0,
          })
        : 0;
      const alphaIncomeAnnual =
        row.date >= alphaDrawDate ? row.monthlyAlphaPensionGross * 12 : 0;
      const nuvosIncomeAnnual =
        settings.showNuvos && row.date >= nuvosDrawDate
          ? row.monthlyNuvosPensionGross * 12
          : 0;
      const partialRetirementIncomeAnnual =
        calculatePartialRetirementIncomeAnnual(
          settings,
          row.date,
          requirementDate
        );
      const statePensionIncomeAnnual =
        settings.showStatePension && row.date >= settings.statePensionDrawDate
          ? row.monthlyStatePension * 12
          : 0;
      const targetIncomeAnnual = calculateRetirementIncomeTargetAtDate(
        settings,
        row.date
      );
      const totalIncomeAnnual =
        isaIncomeAnnual +
        sippIncomeAnnual +
        partialRetirementIncomeAnnual +
        alphaIncomeAnnual +
        nuvosIncomeAnnual +
        statePensionIncomeAnnual;
      const monthlyIncomeTax = calculateMonthlyIncomeTax({
        settings,
        monthlyAlphaPension: alphaIncomeAnnual / 12,
        monthlyNuvosPension: nuvosIncomeAnnual / 12,
        monthlyStatePension: statePensionIncomeAnnual / 12,
        monthlySippPension: sippIncomeAnnual / 12,
      });
      const assessedIncomeAnnual = totalIncomeAnnual - monthlyIncomeTax * 12;

      return {
        date: row.date,
        age,
        targetIncomeAnnual,
        isaIncomeAnnual,
        sippIncomeAnnual,
        partialRetirementIncomeAnnual,
        alphaIncomeAnnual,
        nuvosIncomeAnnual,
        statePensionIncomeAnnual,
        totalIncomeAnnual,
        assessedIncomeAnnual,
        shortfallAnnual:
          row.date >= requirementDate
            ? Math.max(0, targetIncomeAnnual - assessedIncomeAnnual)
            : 0,
        isaBalance: row.isaPot,
        sippBalance: row.sippPot,
        phase: getRetirementIncomePhase(age, settings, statePensionAge),
      };
    });

  return insertChartTransitionPoints(baseSeries, settings);
}

function getBridgePotIncomeAnnual(input: {
  row: ProjectionRow;
  previousRow?: ProjectionRow;
  rowDate: string;
  drawDate: string;
  stopDate: string | null;
  monthlyIncome: number;
  previousMonthlyIncome: number;
}) {
  const { rowDate, drawDate, stopDate, monthlyIncome, previousMonthlyIncome } =
    input;

  if (rowDate < drawDate) {
    return 0;
  }

  if (
    stopDate &&
    rowDate < stopDate &&
    monthlyIncome <= 0 &&
    previousMonthlyIncome > 0
  ) {
    return previousMonthlyIncome * 12;
  }

  return monthlyIncome * 12;
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
    {
      date: addYearsToIsoDate(
        settings.dateOfBirth,
        settings.alphaPensionDrawAge
      ),
      age: settings.alphaPensionDrawAge,
    },
    settings.showNuvos
      ? {
          date: addYearsToIsoDate(
            settings.dateOfBirth,
            settings.nuvosPensionDrawAge
          ),
          age: settings.nuvosPensionDrawAge,
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

function calculatePartialRetirementIncomeAnnual(
  settings: PensionSettings,
  rowDate: string,
  requirementDate: string
) {
  const partialRetirementStartDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.partialRetirementStartAge
  );

  if (
    !settings.partialRetirementEnabled ||
    rowDate < partialRetirementStartDate ||
    rowDate >= requirementDate
  ) {
    return 0;
  }

  return settings.fullSalary * (settings.partialRetirementWorkPercent / 100);
}

export function createBridgeChartParameters(
  settings: PensionSettings
): RetirementIncomeBridgeParameters {
  return {
    targetIncomeAnnual: settings.desiredRetirementIncome,
    alphaMonthlyAddedPension: settings.alphaAddedPensionMonthly,
    isaMonthlyContribution: settings.isaMonthlyContribution,
    sippMonthlyContribution: settings.sippMonthlyContribution,
    retirementAge: settings.requirementAge,
    alphaLeaveAge: settings.alphaPensionLeaveAge,
    sippAccessAge: settings.sippDrawAge,
    sippUseByAge: settings.sippWithdrawalTargetAge,
    isaAccessAge: settings.isaDrawAge,
    alphaStartAge: settings.alphaPensionDrawAge,
    nuvosStartAge: settings.nuvosPensionDrawAge,
    isaUseByAge: settings.isaWithdrawalTargetAge,
    partialRetirementStartAge: settings.partialRetirementStartAge,
    partialRetirementWorkPercent: settings.partialRetirementWorkPercent,
    partialRetirementEnabled: settings.partialRetirementEnabled,
    statePensionAge: calculateStatePensionDrawAge(
      settings.dateOfBirth,
      settings.statePensionDrawDate
    ),
    showIsa: settings.showIsa,
    showSipp: settings.showSipp,
    sippUseByAgeEnabled:
      settings.showSipp && settings.sippWithdrawalStrategy === "use_by_age",
    showNuvos: settings.showNuvos,
    isaUseByAgeEnabled:
      settings.showIsa && settings.isaWithdrawalStrategy === "use_by_age",
    showStatePension: settings.showStatePension,
  };
}

export function createBridgeChartLimits(
  settings: PensionSettings
): RetirementIncomeBridgeLimits {
  const statePensionAge = calculateStatePensionDrawAge(
    settings.dateOfBirth,
    settings.statePensionDrawDate
  );
  const minimumSippAccessAge = calculateMinimumSippAccessAge(
    settings.dateOfBirth
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
  const isaAccessAgeMax = Math.max(currentPlanningAge, settings.lifeExpectancy);
  const partialRetirementMaxAge = Math.max(
    currentPlanningAge,
    Math.min(settings.requirementAge - 0.25, 70, settings.lifeExpectancy)
  );
  const sippUseByMin = settings.sippDrawAge + 0.25;
  const isaUseByMin = settings.isaDrawAge + 0.25;
  const useByMax = Math.min(100, settings.lifeExpectancy);

  return {
    targetIncomeAnnual: { min: 0, max: 200000, step: 600 },
    alphaMonthlyAddedPension: { min: 0, max: 1000, step: 25 },
    isaMonthlyContribution: { min: 0, max: 5000, step: 25 },
    sippMonthlyContribution: { min: 0, max: 5000, step: 25 },
    retirementAge: {
      min: currentPlanningAge,
      max: Math.max(
        currentPlanningAge,
        Math.min(ageUpperLimit, settings.alphaPensionDrawAge)
      ),
      step: 0.25,
    },
    alphaLeaveAge: {
      min: currentPlanningAge,
      max: Math.max(
        currentPlanningAge,
        Math.min(ageUpperLimit, settings.requirementAge)
      ),
      step: 0.25,
    },
    sippAccessAge: {
      min: minimumSippAccessAge,
      max: ageUpperLimit,
      step: 0.25,
    },
    sippUseByAge: {
      min: sippUseByMin,
      max: Math.max(sippUseByMin, useByMax),
      step: 0.25,
    },
    isaAccessAge: {
      min: currentPlanningAge,
      max: isaAccessAgeMax,
      step: 0.25,
    },
    alphaStartAge: {
      min: Math.max(
        currentPlanningAge,
        settings.requirementAge,
        settings.alphaPensionLeaveAge,
        minimumAlphaAccessAge
      ),
      max: Math.max(
        Math.max(
          currentPlanningAge,
          settings.requirementAge,
          settings.alphaPensionLeaveAge,
          minimumAlphaAccessAge
        ),
        70
      ),
      step: 0.25,
    },
    nuvosStartAge: {
      min: Math.max(
        currentPlanningAge,
        settings.requirementAge,
        settings.nuvosPensionLeaveAge,
        minimumAlphaAccessAge
      ),
      max: Math.max(
        Math.max(
          currentPlanningAge,
          settings.requirementAge,
          settings.nuvosPensionLeaveAge,
          minimumAlphaAccessAge
        ),
        70
      ),
      step: 0.25,
    },
    isaUseByAge: {
      min: isaUseByMin,
      max: Math.max(isaUseByMin, useByMax),
      step: 0.25,
    },
    partialRetirementStartAge: {
      min: currentPlanningAge,
      max: partialRetirementMaxAge,
      step: 0.25,
    },
    partialRetirementWorkPercent: { min: 0, max: 100, step: 1 },
    statePensionAge: {
      min: defaultStatePensionAge,
      max: Math.max(defaultStatePensionAge, settings.lifeExpectancy),
      step: 0.25,
    },
  };
}

function getRetirementIncomePhase(
  age: number,
  settings: PensionSettings,
  statePensionAge: number
): RetirementIncomePoint["phase"] {
  if (age < settings.isaDrawAge) {
    return "build-up";
  }

  if (settings.showIsa && (!settings.showSipp || age < settings.sippDrawAge)) {
    return "isa-bridge";
  }

  if (settings.showSipp && age < settings.alphaPensionDrawAge) {
    return "sipp-bridge";
  }

  if (!settings.showStatePension || age < statePensionAge) {
    if (!settings.showSipp) {
      return "alpha-only";
    }

    return "alpha-sipp";
  }

  return "alpha-state";
}

function calculateCurrentPlanningAge(settings: PensionSettings) {
  return Math.max(
    0,
    Math.ceil(calculateDateAge(settings.dateOfBirth, settings.startDate))
  );
}

export { addYearsToIsoDate, calculateCurrentPlanningAge, clampNumber };
