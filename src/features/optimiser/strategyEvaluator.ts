import {
  addYears,
  createProjectionTable,
  generateMonthlyDateRange,
  type ProjectionRow,
} from "../../projection";
import { createRetirementIncomeSeries } from "../../app-domains";
import {
  calculateMinimumSippAccessAge,
  calculateStatePensionDrawAge,
  formatCurrency,
  type PensionSettings,
} from "../../settings";
import type {
  CandidateStrategy,
  EvaluatedStrategy,
  OptimisationTarget,
  WithdrawalOrder,
} from "./optimiserTypes";

export function evaluateStrategy(input: {
  settings: PensionSettings;
  candidate: CandidateStrategy;
  target: OptimisationTarget;
}): EvaluatedStrategy {
  const strategySettings = createStrategyProjectionSettings(input);
  const projectionRows = createProjectionTable(strategySettings);
  const retirementDate = addYears(
    strategySettings.dateOfBirth,
    input.candidate.retirementAge
  );
  const endDate = addYears(
    strategySettings.dateOfBirth,
    input.target.incomeEndAge
  );
  const alphaStartDate = addYears(
    strategySettings.dateOfBirth,
    input.candidate.alphaDrawAge
  );
  const incomeProjection = evaluateIncomeProjection({
    settings: strategySettings,
    projectionRows,
    target: input.target,
    retirementDate,
    endDate,
  });
  const alphaDrawRow =
    findFirstRowAtOrAfterDate(projectionRows, alphaStartDate) ??
    projectionRows.at(-1);
  const alphaTakenEarly =
    input.settings.showAlpha &&
    input.candidate.alphaDrawAge < input.settings.normalPensionAge;
  const totalMonthlyContribution =
    input.candidate.monthlySippContribution +
    input.candidate.monthlyIsaContribution +
    input.candidate.monthlyAddedPensionContribution;
  const viable = incomeProjection.totalAnnualShortfall <= 0.005;
  const projectedSurplusOrShortfall = viable
    ? incomeProjection.lowestAnnualTargetMargin
    : -incomeProjection.largestAnnualShortfall;
  const firstFailureAge = incomeProjection.firstFailureDate
    ? getAgeAtDate(
        strategySettings.dateOfBirth,
        incomeProjection.firstFailureDate
      )
    : null;
  const failureReason =
    incomeProjection.firstFailureDate === null
      ? null
      : "projected income is below the selected target before the target income period ends";

  return {
    ...input.candidate,
    viable,
    totalMonthlyContribution,
    alphaTakenEarly,
    annualAlphaPensionAfterReduction:
      alphaDrawRow?.annualAlphaPensionIncludingReduction ?? 0,
    bridgeYearsBeforeAlphaStarts: Math.max(
      0,
      input.candidate.alphaDrawAge - input.candidate.retirementAge
    ),
    lowestProjectedBridgeBalance: incomeProjection.lowestProjectedBridgeBalance,
    firstFailureAge,
    firstFailureDate: incomeProjection.firstFailureDate,
    failureReason,
    projectedSurplusOrShortfall,
    rankingScore: 0,
    scoreBreakdown: {
      contributionScore: totalMonthlyContribution,
      retirementAgeScore: input.candidate.retirementAge,
      complexityScore: calculateComplexityScore(input.candidate),
      surplusScore: incomeProjection.largestAvoidableAnnualSurplus,
    },
    explanation: createStrategyExplanation({
      candidate: input.candidate,
      target: input.target,
      viable,
      totalMonthlyContribution,
      firstFailureAge,
      alphaTakenEarly,
      withdrawalStrategy: input.candidate.withdrawalStrategy,
      annualAlphaPensionAfterReduction:
        alphaDrawRow?.annualAlphaPensionIncludingReduction ?? 0,
    }),
  };
}

export function createStrategyProjectionSettings(input: {
  settings: PensionSettings;
  candidate: CandidateStrategy;
  target: OptimisationTarget;
}): PensionSettings {
  const { settings, candidate, target } = input;
  const sippAccessAge = calculateMinimumSippAccessAge(settings.dateOfBirth);
  const nuvosDrawAge =
    candidate.nuvosDrawAge ?? Math.max(candidate.retirementAge, 65);
  const sippDrawAge = Math.max(candidate.retirementAge, sippAccessAge);
  const isaUseByTargetAge = getIsaUseByTargetAge({
    candidate,
    settings,
    target,
    sippDrawAge,
    nuvosDrawAge,
  });
  const sippUseByTargetAge = getSippUseByTargetAge({
    settings,
    target,
    sippDrawAge,
    alphaDrawAge: candidate.alphaDrawAge,
    nuvosDrawAge,
  });

  return {
    ...settings,
    desiredRetirementIncome: target.targetAnnualIncome,
    requirementAge: candidate.retirementAge,
    lifeExpectancy: target.incomeEndAge,
    showSipp: true,
    showIsa: true,
    sippMonthlyContribution: candidate.monthlySippContribution,
    isaMonthlyContribution: candidate.monthlyIsaContribution,
    alphaAddedPensionMonthly: candidate.monthlyAddedPensionContribution,
    alphaPensionLeaveAge: candidate.retirementAge,
    alphaPensionDrawAge: Math.max(candidate.alphaDrawAge, 57),
    nuvosPensionLeaveAge: candidate.retirementAge,
    nuvosPensionDrawAge: Math.max(candidate.retirementAge, nuvosDrawAge),
    partialRetirementEnabled: candidate.partialRetirementEnabled,
    partialRetirementStartAge:
      candidate.partialRetirementStartAge ?? settings.partialRetirementStartAge,
    partialRetirementWorkPercent:
      candidate.partialRetirementWorkPercent ??
      settings.partialRetirementWorkPercent,
    isaDrawAge: candidate.retirementAge,
    sippDrawAge,
    sippWithdrawalStrategy: candidate.withdrawalStrategy,
    isaWithdrawalStrategy: candidate.withdrawalStrategy,
    sippWithdrawalTargetAge:
      candidate.withdrawalStrategy === "use_by_age"
        ? getUseByTargetAge(sippDrawAge, sippUseByTargetAge)
        : settings.sippWithdrawalTargetAge,
    isaWithdrawalTargetAge:
      candidate.withdrawalStrategy === "use_by_age"
        ? getUseByTargetAge(candidate.retirementAge, isaUseByTargetAge)
        : settings.isaWithdrawalTargetAge,
  };
}

function evaluateIncomeProjection(input: {
  settings: PensionSettings;
  projectionRows: ProjectionRow[];
  target: OptimisationTarget;
  retirementDate: string;
  endDate: string;
}) {
  const monthlyRowDates = new Set(
    generateMonthlyDateRange(input.retirementDate, input.endDate)
  );
  const incomeSeries = createRetirementIncomeSeries(
    input.projectionRows,
    input.settings
  ).filter(
    (point) =>
      monthlyRowDates.has(point.date) &&
      point.date >= input.retirementDate &&
      point.date <= input.endDate
  );
  let lowestProjectedBridgeBalance = Number.POSITIVE_INFINITY;
  let firstFailureDate: string | null = null;
  let totalAnnualShortfall = 0;
  let largestAnnualShortfall = 0;
  let largestAvoidableAnnualSurplus = 0;
  let lowestAnnualTargetMargin = Number.POSITIVE_INFINITY;

  for (const point of incomeSeries) {
    const annualTargetMargin =
      point.assessedIncomeAnnual - point.targetIncomeAnnual;
    const annualShortfall = Math.max(0, point.shortfallAnnual);
    const flexibleIncomeAnnual = point.isaIncomeAnnual + point.sippIncomeAnnual;
    const avoidableAnnualSurplus = Math.min(
      flexibleIncomeAnnual,
      Math.max(0, annualTargetMargin)
    );

    if (annualShortfall > 0.005 && firstFailureDate === null) {
      firstFailureDate = point.date;
    }

    totalAnnualShortfall += annualShortfall;
    largestAnnualShortfall = Math.max(largestAnnualShortfall, annualShortfall);
    largestAvoidableAnnualSurplus = Math.max(
      largestAvoidableAnnualSurplus,
      avoidableAnnualSurplus
    );
    lowestAnnualTargetMargin = Math.min(
      lowestAnnualTargetMargin,
      annualTargetMargin
    );
    lowestProjectedBridgeBalance = Math.min(
      lowestProjectedBridgeBalance,
      (point.isaBalance ?? 0) + (point.sippBalance ?? 0)
    );
  }

  return {
    firstFailureDate,
    lowestProjectedBridgeBalance: Number.isFinite(lowestProjectedBridgeBalance)
      ? lowestProjectedBridgeBalance
      : 0,
    totalAnnualShortfall,
    largestAnnualShortfall,
    largestAvoidableAnnualSurplus,
    lowestAnnualTargetMargin: Number.isFinite(lowestAnnualTargetMargin)
      ? lowestAnnualTargetMargin
      : -input.target.targetAnnualIncome,
  };
}

function calculateComplexityScore(candidate: CandidateStrategy) {
  return (
    (candidate.monthlySippContribution > 0 ? 1 : 0) +
    (candidate.monthlyIsaContribution > 0 ? 1 : 0) +
    (candidate.monthlyAddedPensionContribution > 0 ? 2 : 0) +
    (candidate.withdrawalOrder === "blended" ? 1 : 0) +
    (candidate.withdrawalStrategy !== "use_by_age" ? 1 : 0) +
    (candidate.partialRetirementEnabled ? 1 : 0)
  );
}

function createStrategyExplanation(input: {
  candidate: CandidateStrategy;
  target: OptimisationTarget;
  viable: boolean;
  totalMonthlyContribution: number;
  firstFailureAge: number | null;
  alphaTakenEarly: boolean;
  withdrawalStrategy: CandidateStrategy["withdrawalStrategy"];
  annualAlphaPensionAfterReduction: number;
}) {
  if (!input.viable) {
    return input.firstFailureAge
      ? `This near miss reaches the target until about age ${input.firstFailureAge}, then fails when bridge funds are exhausted.`
      : "This option does not fully meet the target within the selected search range.";
  }

  const alphaTradeOff = input.alphaTakenEarly
    ? "It draws Alpha before Normal Pension Age, reducing the bridge period but permanently lowering modelled Alpha income."
    : "It waits until Normal Pension Age for Alpha, preserving more modelled Alpha income but requiring a longer bridge.";
  const partialRetirementCopy = input.candidate.partialRetirementEnabled
    ? ` It also models partial retirement from age ${input.candidate.partialRetirementStartAge} at ${input.candidate.partialRetirementWorkPercent}% working time before full retirement.`
    : "";

  return `Under the current assumptions, this option meets ${formatCurrency(input.target.targetAnnualIncome)}/year from age ${input.candidate.retirementAge} to ${input.target.incomeEndAge} with ${formatCurrency(input.totalMonthlyContribution)}/month of modelled contributions using the ${formatWithdrawalStrategy(input.withdrawalStrategy)} withdrawal strategy. ${alphaTradeOff}${partialRetirementCopy}`;
}

function findFirstRowAtOrAfterDate(rows: ProjectionRow[], date: string) {
  return rows.find((row) => row.date >= date);
}

function getAgeAtDate(dateOfBirth: string, date: string) {
  const birthYear = Number(dateOfBirth.slice(0, 4));
  const rowYear = Number(date.slice(0, 4));

  return rowYear - birthYear;
}

export function getDefaultOptimisationTarget(
  settings: PensionSettings
): OptimisationTarget {
  return {
    targetAnnualIncome: settings.desiredRetirementIncome,
    targetRetirementAge: settings.requirementAge,
    incomeStartAge: settings.requirementAge,
    incomeEndAge: settings.lifeExpectancy,
    incomeBasis: settings.taxationEnabled ? "net" : "gross",
  };
}

export function getDefaultOptimisationSearchSpace(input: {
  settings: PensionSettings;
  targetRetirementAge: number;
  maxMonthlyContribution: number;
  includeAddedPension: boolean;
  includePartialRetirement: boolean;
}) {
  const normalPensionAge = input.settings.normalPensionAge;
  const monthlyContributionMax = Math.min(input.maxMonthlyContribution, 2_000);
  const addedPensionMax = input.includeAddedPension ? 400 : 0;
  const statePensionAge = calculateStatePensionDrawAge(
    input.settings.dateOfBirth,
    input.settings.statePensionDrawDate
  );

  return {
    searchSpace: {
      maxTotalMonthlyContribution: monthlyContributionMax,
      monthlySippContribution: {
        min: 0,
        max: monthlyContributionMax,
        step: 500,
      },
      monthlyIsaContribution: {
        min: 0,
        max: monthlyContributionMax,
        step: 500,
      },
      monthlyAddedPensionContribution: input.includeAddedPension
        ? {
            min: 0,
            max: addedPensionMax,
            step: 100,
          }
        : undefined,
      retirementAge: {
        min: input.targetRetirementAge,
        max: Math.min(
          input.targetRetirementAge + 5,
          input.settings.lifeExpectancy
        ),
        step: 1,
      },
      alphaDrawAge: {
        min: input.targetRetirementAge,
        max: normalPensionAge,
        step: 2,
      },
      partialRetirementStartAge: input.includePartialRetirement
        ? {
            min: Math.max(18, input.targetRetirementAge - 4),
            max: Math.max(18, input.targetRetirementAge - 1),
            step: 2,
          }
        : undefined,
      partialRetirementWorkPercent: input.includePartialRetirement
        ? {
            min: 60,
            max: 80,
            step: 20,
          }
        : undefined,
      withdrawalOrders: [
        "isa-first",
        "sipp-first",
        "blended",
      ] satisfies WithdrawalOrder[],
      withdrawalStrategies: [
        "use_by_age",
        "zero_at_death",
        "percentage",
      ] satisfies CandidateStrategy["withdrawalStrategy"][],
    },
    statePensionAge,
  };
}

function getIsaUseByTargetAge(input: {
  candidate: CandidateStrategy;
  settings: PensionSettings;
  target: OptimisationTarget;
  sippDrawAge: number;
  nuvosDrawAge: number;
}) {
  const candidateAges = [
    input.sippDrawAge,
    input.candidate.alphaDrawAge,
    input.settings.showNuvos ? input.nuvosDrawAge : null,
    input.settings.showStatePension
      ? calculateStatePensionDrawAge(
          input.settings.dateOfBirth,
          input.settings.statePensionDrawDate
        )
      : null,
    input.target.incomeEndAge,
  ].filter((age): age is number => age !== null);
  const nextIncomeAge = candidateAges
    .filter((age) => age > input.candidate.retirementAge)
    .sort((first, second) => first - second)[0];

  return nextIncomeAge ?? input.target.incomeEndAge;
}

function getSippUseByTargetAge(input: {
  settings: PensionSettings;
  target: OptimisationTarget;
  sippDrawAge: number;
  alphaDrawAge: number;
  nuvosDrawAge: number;
}) {
  const candidateAges = [
    input.alphaDrawAge,
    input.settings.showNuvos ? input.nuvosDrawAge : null,
    input.settings.showStatePension
      ? calculateStatePensionDrawAge(
          input.settings.dateOfBirth,
          input.settings.statePensionDrawDate
        )
      : null,
    input.target.incomeEndAge,
  ].filter((age): age is number => age !== null);
  const nextIncomeAge = candidateAges
    .filter((age) => age > input.sippDrawAge)
    .sort((first, second) => first - second)[0];

  return nextIncomeAge ?? input.target.incomeEndAge;
}

function getUseByTargetAge(drawAge: number, preferredTargetAge: number) {
  if (preferredTargetAge > drawAge) {
    return preferredTargetAge;
  }

  return drawAge + 0.25;
}

function formatWithdrawalStrategy(
  strategy: CandidateStrategy["withdrawalStrategy"]
) {
  if (strategy === "zero_at_death") {
    return "zero at death";
  }

  if (strategy === "percentage") {
    return "annual percentage";
  }

  return "use by age";
}
