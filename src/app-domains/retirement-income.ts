import type {
  RetirementIncomeBridgeLimits,
  RetirementIncomeBridgeParameters,
  RetirementIncomePoint,
} from "../RetirementIncomeBridgeChart";
import {
  calculateAdditionalGuaranteedIncomeStreamForDate,
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
  getAdditionalGuaranteedIncomeDisplayName,
  ALPHA_ADDED_PENSION_MONTHLY_MAX,
  LISA_MONTHLY_CONTRIBUTION_MAX,
  type PensionSettings,
} from "../settings";
import {
  getPartialRetirementStartAgeBounds,
  getPensionStartAgeBounds,
  getSippChartAccessAgeBounds,
  getStatePensionAgeBounds,
  getStandalonePensionStartAgeBounds,
  getUseByAgeBounds,
} from "./bridge-chart-bounds";
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
  const classicDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.classicPensionDrawAge
  );
  const classicPlusDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.classicPlusPensionDrawAge
  );
  const nuvosDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.nuvosPensionDrawAge
  );
  const premiumDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.premiumDrawAge
  );
  const sippDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.sippDrawAge
  );
  const isaDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.isaDrawAge
  );
  const lisaDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.lisaDrawAge
  );
  const sippUseByDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.sippWithdrawalTargetAge
  );
  const isaUseByDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.isaWithdrawalTargetAge
  );
  const lisaUseByDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.lisaWithdrawalTargetAge
  );

  const displayedRows = rows.filter((row) => row.date >= settings.startDate);
  const baseSeries = displayedRows.map((row, index) => {
    const age = row.age + row.ageMonths / 12;
    const previousRow = displayedRows[index - 1];
    const nextRow = displayedRows[index + 1];
    const isaIncomeAnnual = settings.showIsa
      ? getBridgePotIncomeAnnual({
          rowDate: row.date,
          drawDate: isaDrawDate,
          stopDate:
            settings.isaWithdrawalStrategy === "use_by_age"
              ? isaUseByDate
              : null,
          monthlyIncome: row.monthlyIsaPension,
          previousMonthlyIncome: previousRow?.monthlyIsaPension ?? 0,
          nextMonthlyIncome: nextRow?.monthlyIsaPension ?? 0,
        })
      : 0;
    const sippIncomeAnnual = settings.showSipp
      ? getBridgePotIncomeAnnual({
          rowDate: row.date,
          drawDate: sippDrawDate,
          stopDate:
            settings.sippWithdrawalStrategy === "use_by_age"
              ? sippUseByDate
              : null,
          monthlyIncome: row.monthlySippPension,
          previousMonthlyIncome: previousRow?.monthlySippPension ?? 0,
          nextMonthlyIncome: nextRow?.monthlySippPension ?? 0,
        })
      : 0;
    const lisaIncomeAnnual = settings.showLisa
      ? getBridgePotIncomeAnnual({
          rowDate: row.date,
          drawDate: lisaDrawDate,
          stopDate:
            settings.lisaWithdrawalStrategy === "use_by_age"
              ? lisaUseByDate
              : null,
          monthlyIncome: row.monthlyLisaPension,
          previousMonthlyIncome: previousRow?.monthlyLisaPension ?? 0,
          nextMonthlyIncome: nextRow?.monthlyLisaPension ?? 0,
        })
      : 0;
    const {
      alphaIncomeAnnual,
      classicIncomeAnnual,
      classicPlusIncomeAnnual,
      nuvosIncomeAnnual,
      premiumIncomeAnnual,
      statePensionIncomeAnnual,
    } = getSecureIncomeAnnual({
      settings,
      row,
      alphaDrawDate,
      classicDrawDate,
      classicPlusDrawDate,
      nuvosDrawDate,
      premiumDrawDate,
    });
    const partialRetirementIncomeAnnual =
      calculatePartialRetirementIncomeAnnual(
        settings,
        row.date,
        requirementDate
      );
    const additionalGuaranteedIncomeStreams =
      calculateAdditionalGuaranteedIncomeStreams(settings, row.date);
    const additionalGuaranteedIncomeAnnual =
      row.monthlyAdditionalGuaranteedIncomeGross * 12;
    const additionalGuaranteedIncomeTaxableAnnual =
      row.monthlyAdditionalGuaranteedIncomeTaxable * 12;
    const targetIncomeAnnual = calculateRetirementIncomeTargetAtDate(
      settings,
      row.date
    );
    const totalIncomeAnnual =
      isaIncomeAnnual +
      lisaIncomeAnnual +
      sippIncomeAnnual +
      partialRetirementIncomeAnnual +
      alphaIncomeAnnual +
      classicIncomeAnnual +
      classicPlusIncomeAnnual +
      nuvosIncomeAnnual +
      premiumIncomeAnnual +
      additionalGuaranteedIncomeAnnual +
      statePensionIncomeAnnual;
    const monthlyIncomeTax = calculateMonthlyIncomeTax({
      settings,
      monthlyAlphaPension: alphaIncomeAnnual / 12,
      monthlyClassicPension: classicIncomeAnnual / 12,
      monthlyClassicPlusPension: classicPlusIncomeAnnual / 12,
      monthlyNuvosPension: nuvosIncomeAnnual / 12,
      monthlyPremiumPension: premiumIncomeAnnual / 12,
      monthlyStatePension: statePensionIncomeAnnual / 12,
      monthlySippPension: sippIncomeAnnual / 12,
      monthlyAdditionalGuaranteedIncomeTaxable:
        additionalGuaranteedIncomeTaxableAnnual / 12,
    });
    const assessedIncomeAnnual = totalIncomeAnnual - monthlyIncomeTax * 12;

    return {
      date: row.date,
      age,
      targetIncomeAnnual,
      isaIncomeAnnual,
      lisaIncomeAnnual,
      sippIncomeAnnual,
      partialRetirementIncomeAnnual,
      alphaIncomeAnnual,
      classicIncomeAnnual,
      classicPlusIncomeAnnual,
      nuvosIncomeAnnual,
      premiumIncomeAnnual,
      additionalGuaranteedIncomeAnnual,
      additionalGuaranteedIncomeStreams,
      statePensionIncomeAnnual,
      totalIncomeAnnual,
      assessedIncomeAnnual,
      shortfallAnnual:
        row.date >= requirementDate
          ? Math.max(0, targetIncomeAnnual - assessedIncomeAnnual)
          : 0,
      isaBalance: row.isaPot,
      lisaBalance: row.lisaPot,
      sippBalance: row.sippPot,
      phase: getRetirementIncomePhase(age, settings, statePensionAge),
    };
  });

  return insertChartTransitionPoints(baseSeries, settings);
}

function getSecureIncomeAnnual(input: {
  settings: PensionSettings;
  row: ProjectionRow;
  alphaDrawDate: string;
  classicDrawDate: string;
  classicPlusDrawDate: string;
  nuvosDrawDate: string;
  premiumDrawDate: string;
}) {
  const {
    settings,
    row,
    alphaDrawDate,
    classicDrawDate,
    classicPlusDrawDate,
    nuvosDrawDate,
    premiumDrawDate,
  } = input;

  return {
    alphaIncomeAnnual:
      settings.showAlpha && row.date >= alphaDrawDate
        ? row.monthlyAlphaPensionGross * 12
        : 0,
    classicIncomeAnnual:
      settings.showClassic && row.date >= classicDrawDate
        ? row.monthlyClassicPensionGross * 12
        : 0,
    classicPlusIncomeAnnual:
      settings.showClassicPlus && row.date >= classicPlusDrawDate
        ? row.monthlyClassicPlusPensionGross * 12
        : 0,
    nuvosIncomeAnnual:
      settings.showNuvos && row.date >= nuvosDrawDate
        ? row.monthlyNuvosPensionGross * 12
        : 0,
    premiumIncomeAnnual:
      settings.showPremium && row.date >= premiumDrawDate
        ? row.monthlyPremiumPensionGross * 12
        : 0,
    statePensionIncomeAnnual:
      settings.showStatePension && row.date >= settings.statePensionDrawDate
        ? row.monthlyStatePension * 12
        : 0,
  };
}

function calculateAdditionalGuaranteedIncomeStreams(
  settings: PensionSettings,
  rowDate: string
) {
  const labelCounts = new Map<string, number>();

  return settings.additionalGuaranteedIncomes.map((income) => {
    const baseLabel = getAdditionalGuaranteedIncomeDisplayName(income);
    const currentCount = labelCounts.get(baseLabel) ?? 0;
    const nextCount = currentCount + 1;
    labelCounts.set(baseLabel, nextCount);

    return {
      id: income.id,
      label: currentCount === 0 ? baseLabel : `${baseLabel} #${nextCount}`,
      annualAmount: calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income,
        rowDate,
      }),
    };
  });
}

function getBridgePotIncomeAnnual(input: {
  rowDate: string;
  drawDate: string;
  stopDate: string | null;
  monthlyIncome: number;
  previousMonthlyIncome: number;
  nextMonthlyIncome: number;
}) {
  const {
    rowDate,
    drawDate,
    stopDate,
    monthlyIncome,
    previousMonthlyIncome,
    nextMonthlyIncome,
  } = input;

  if (rowDate < drawDate) {
    return 0;
  }

  if (
    rowDate >= drawDate &&
    (!stopDate || rowDate < stopDate) &&
    monthlyIncome <= 0 &&
    nextMonthlyIncome > 0
  ) {
    return nextMonthlyIncome * 12;
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
    ...settings.additionalGuaranteedIncomes.flatMap((income) => {
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

  return {
    targetIncomeAnnual: { min: 0, max: 200000, step: 600 },
    alphaMonthlyAddedPension: {
      min: 0,
      max: ALPHA_ADDED_PENSION_MONTHLY_MAX,
      step: 25,
    },
    isaMonthlyContribution: { min: 0, max: 5000, step: 25 },
    lisaMonthlyContribution: {
      min: 0,
      max: LISA_MONTHLY_CONTRIBUTION_MAX,
      step: 25,
    },
    sippMonthlyContribution: { min: 0, max: 5000, step: 25 },
    retirementAge: {
      min: currentPlanningAge,
      max: Math.max(
        currentPlanningAge,
        settings.showAlpha
          ? Math.min(ageUpperLimit, settings.alphaPensionDrawAge)
          : ageUpperLimit
      ),
      step: 1,
    },
    alphaLeaveAge: {
      min: currentPlanningAge,
      max: Math.max(
        currentPlanningAge,
        Math.min(ageUpperLimit, settings.requirementAge)
      ),
      step: 1,
    },
    sippAccessAge: {
      min: sippAccessAgeBounds.min,
      max: sippAccessAgeBounds.max,
      step: 1,
    },
    sippUseByAge: {
      min: sippUseByAgeBounds.min,
      max: sippUseByAgeBounds.max,
      step: 1,
    },
    isaAccessAge: {
      min: currentPlanningAge,
      max: isaAccessAgeMax,
      step: 1,
    },
    lisaAccessAge: {
      min: 60,
      max: Math.max(60, settings.lifeExpectancy),
      step: 1,
    },
    alphaStartAge: {
      min: alphaStartAgeBounds.min,
      max: alphaStartAgeBounds.max,
      step: 1,
    },
    nuvosStartAge: {
      min: nuvosStartAgeBounds.min,
      max: nuvosStartAgeBounds.max,
      step: 1,
    },
    premiumStartAge: {
      min: premiumStartAgeBounds.min,
      max: premiumStartAgeBounds.max,
      step: 1,
    },
    isaUseByAge: {
      min: isaUseByAgeBounds.min,
      max: isaUseByAgeBounds.max,
      step: 1,
    },
    lisaUseByAge: {
      min: lisaUseByAgeBounds.min,
      max: lisaUseByAgeBounds.max,
      step: 1,
    },
    partialRetirementStartAge: {
      min: partialRetirementStartAgeBounds.min,
      max: partialRetirementStartAgeBounds.max,
      step: 1,
    },
    partialRetirementWorkPercent: { min: 0, max: 100, step: 1 },
    statePensionAge: {
      min: statePensionAgeBounds.min,
      max: statePensionAgeBounds.max,
      step: 1,
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
