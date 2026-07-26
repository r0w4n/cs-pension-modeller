import { calculateAnchoredMonthDifference } from "./projection-date";
import type {
  PensionSettings,
  SpendingSmileStrategy,
} from "./settings/settings-types";

export type SpendingPhase = "FLAT" | "GO_GO" | "SLOW_GO" | "NO_GO";
export type SmilePercentageField =
  | "goGoPercentage"
  | "slowGoPercentage"
  | "noGoPercentage";
export type SmileStartAgeField = "slowGoStartAge" | "noGoStartAge";
export type SmileStartAgeBounds = { min: number; max: number };

export type ResolvedSpendingTarget = {
  phase: SpendingPhase;
  percentageOfTarget: number;
  annualRealTarget: number;
  annualNominalTarget: number;
};

export const MAX_SPENDING_SMILE_PERCENTAGE = 300;
export const MIN_SPENDING_SMILE_PERCENTAGE = 1;
export const MAX_SUPPORTED_MODELLING_AGE = 100;

export function createDefaultSpendingSmile(): SpendingSmileStrategy {
  return {
    goGoPercentage: 100,
    slowGoStartAge: 75,
    slowGoPercentage: 85,
    noGoStartAge: 85,
    noGoPercentage: 70,
  };
}

export function reconcileSpendingSmilePhaseAges(
  strategy: SpendingSmileStrategy,
  retirementAge: number,
  lifeExpectancy: number
): SpendingSmileStrategy {
  const maximumNoGoStartAge = Math.min(
    MAX_SUPPORTED_MODELLING_AGE,
    Math.floor(lifeExpectancy)
  );
  const minimumSlowGoStartAge = Math.floor(retirementAge) + 1;
  const minimumNoGoStartAge = minimumSlowGoStartAge + 1;
  const noGoStartAge = clampWholeAge(
    strategy.noGoStartAge,
    minimumNoGoStartAge,
    Math.max(minimumNoGoStartAge, maximumNoGoStartAge)
  );

  return {
    ...strategy,
    slowGoStartAge: clampWholeAge(
      strategy.slowGoStartAge,
      minimumSlowGoStartAge,
      noGoStartAge - 1
    ),
    noGoStartAge,
  };
}

export function updateSpendingSmileStartAge(
  strategy: SpendingSmileStrategy,
  field: SmileStartAgeField,
  age: number,
  retirementAge: number,
  lifeExpectancy: number
): SpendingSmileStrategy {
  const reconciled = reconcileSpendingSmilePhaseAges(
    strategy,
    retirementAge,
    lifeExpectancy
  );
  const bounds = getSpendingSmileStartAgeBounds(
    reconciled,
    field,
    retirementAge,
    lifeExpectancy
  );

  return {
    ...reconciled,
    [field]: clampWholeAge(age, bounds.min, bounds.max),
  };
}

export function getSpendingSmileStartAgeBounds(
  strategy: SpendingSmileStrategy,
  field: SmileStartAgeField,
  retirementAge: number,
  lifeExpectancy: number
): SmileStartAgeBounds {
  const minimumSlowGoStartAge = Math.floor(retirementAge) + 1;
  const maximumNoGoStartAge = Math.max(
    minimumSlowGoStartAge + 1,
    Math.min(MAX_SUPPORTED_MODELLING_AGE, Math.floor(lifeExpectancy))
  );

  if (field === "slowGoStartAge") {
    return {
      min: minimumSlowGoStartAge,
      max: Math.max(
        minimumSlowGoStartAge,
        Math.min(strategy.noGoStartAge - 1, maximumNoGoStartAge - 1)
      ),
    };
  }

  const minimumNoGoStartAge = strategy.slowGoStartAge + 1;
  return {
    min: minimumNoGoStartAge,
    max: Math.max(minimumNoGoStartAge, maximumNoGoStartAge),
  };
}

export function calculateSmilePhaseTarget(
  targetIncome: number,
  percentage: number
) {
  return targetIncome * (percentage / 100);
}

export function getSpendingSmilePercentageField(
  age: number,
  strategy: SpendingSmileStrategy
): SmilePercentageField {
  if (age < strategy.slowGoStartAge) {
    return "goGoPercentage";
  }
  if (age < strategy.noGoStartAge) {
    return "slowGoPercentage";
  }
  return "noGoPercentage";
}

export function updateSpendingSmilePercentage(
  strategy: SpendingSmileStrategy,
  field: SmilePercentageField,
  percentage: number
): SpendingSmileStrategy {
  return {
    ...strategy,
    [field]: normalizeWholePercentage(percentage, strategy[field]),
  };
}

export function resolveAnnualSpendingTarget(input: {
  settings: PensionSettings;
  rowDate: string;
}): ResolvedSpendingTarget {
  const { settings, rowDate } = input;
  const age =
    calculateAnchoredMonthDifference(settings.dateOfBirth, rowDate) / 12;
  const phaseAndPercentage =
    settings.spendingStrategyType === "SPENDING_SMILE"
      ? getSmilePhaseAndPercentage(age, settings.spendingSmile)
      : {
          phase: "FLAT" as const,
          percentageOfTarget: 100,
        };
  const annualRealTarget = calculateSmilePhaseTarget(
    settings.desiredRetirementIncome,
    phaseAndPercentage.percentageOfTarget
  );
  const monthsFromBase = Math.max(
    0,
    calculateAnchoredMonthDifference(settings.startDate, rowDate)
  );
  const monthlyInflationRate =
    (1 + settings.inflationRateAnnual / 100) ** (1 / 12) - 1;

  return {
    ...phaseAndPercentage,
    annualRealTarget,
    annualNominalTarget:
      annualRealTarget * (1 + monthlyInflationRate) ** monthsFromBase,
  };
}

export function normalizeSpendingSmile(
  value: unknown,
  existingAnnualTarget: number
): SpendingSmileStrategy {
  const fallback = createDefaultSpendingSmile();

  if (!isRecord(value)) {
    return fallback;
  }

  return {
    goGoPercentage: normalizePercentage(
      value.goGoPercentage,
      getLegacyPercentage(value.goGo, existingAnnualTarget),
      fallback.goGoPercentage
    ),
    slowGoStartAge: clampFinite(
      value.slowGoStartAge,
      0,
      MAX_SUPPORTED_MODELLING_AGE,
      fallback.slowGoStartAge
    ),
    slowGoPercentage: normalizePercentage(
      value.slowGoPercentage,
      getLegacyPercentage(value.slowGo, existingAnnualTarget),
      fallback.slowGoPercentage
    ),
    noGoStartAge: clampFinite(
      value.noGoStartAge,
      0,
      MAX_SUPPORTED_MODELLING_AGE,
      fallback.noGoStartAge
    ),
    noGoPercentage: normalizePercentage(
      value.noGoPercentage,
      getLegacyPercentage(value.noGo, existingAnnualTarget),
      fallback.noGoPercentage
    ),
  };
}

function getSmilePhaseAndPercentage(
  age: number,
  strategy: SpendingSmileStrategy
) {
  const percentageField = getSpendingSmilePercentageField(age, strategy);
  const phase =
    percentageField === "goGoPercentage"
      ? ("GO_GO" as const)
      : percentageField === "slowGoPercentage"
        ? ("SLOW_GO" as const)
        : ("NO_GO" as const);

  return {
    phase,
    percentageOfTarget: strategy[percentageField],
  };
}

function normalizePercentage(
  value: unknown,
  legacyValue: number | undefined,
  fallback: number
) {
  return normalizeWholePercentage(value ?? legacyValue, fallback);
}

function normalizeWholePercentage(value: unknown, fallback: number) {
  return Math.round(
    clampFinite(value, 0, MAX_SPENDING_SMILE_PERCENTAGE, fallback)
  );
}

function getLegacyPercentage(
  value: unknown,
  existingAnnualTarget: number
): number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const annualAmount = Number(value.annualAmountReal);
  if (Number.isFinite(annualAmount) && existingAnnualTarget > 0) {
    return (
      Math.round((annualAmount / existingAnnualTarget) * 100 * 1_000_000) /
      1_000_000
    );
  }

  const percentageOfGoGo = Number(value.percentageOfGoGo);
  return Number.isFinite(percentageOfGoGo) ? percentageOfGoGo : undefined;
}

function clampFinite(value: unknown, min: number, max: number, fallback = min) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(max, Math.max(min, parsed))
    : fallback;
}

function clampWholeAge(value: unknown, min: number, max: number) {
  return Math.round(clampFinite(value, min, max, min));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
