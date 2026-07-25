import { calculateAnchoredMonthDifference } from "./projection-date";
import { featureFlags } from "./feature-flags";
import type {
  PensionSettings,
  RetirementHouseholdType,
  SpendingPhaseTarget,
  SpendingSmileStrategy,
  SpendingTargetSource,
} from "./settings/settings-types";

export const retirementLivingStandards = {
  version: "2026-06",
  publishedDate: "2026-06-03",
  currency: "GBP",
  valueBasis: "ANNUAL_NET_HOUSEHOLD_EXPENDITURE",
  housingCostsIncluded: false,
  values: {
    ONE_PERSON: {
      minimum: 13_900,
      moderate: 32_700,
      comfortable: 45_400,
    },
    TWO_PERSON: {
      minimum: 22_500,
      moderate: 45_400,
      comfortable: 62_700,
    },
  },
} as const;

export type SpendingPhase = "FLAT" | "GO_GO" | "SLOW_GO" | "NO_GO";
export type RlsLevel = "minimum" | "moderate" | "comfortable";
export type RlsClassification =
  | "BELOW_MINIMUM"
  | "MINIMUM_TO_MODERATE"
  | "MODERATE_TO_COMFORTABLE"
  | "COMFORTABLE_OR_ABOVE";

export type ResolvedSpendingTarget = {
  phase: SpendingPhase;
  annualRealTarget: number;
  annualNominalTarget: number;
};

const MAX_ANNUAL_SPENDING = 200_000;
const MAX_PERCENTAGE = 300;

export function createDefaultSpendingSmile(
  existingAnnualTarget: number
): SpendingSmileStrategy {
  return {
    initialized: false,
    inputMode: "ANNUAL_AMOUNT",
    householdType: "ONE_PERSON",
    slowGoStartAge: 75,
    noGoStartAge: 85,
    goGo: createPhaseTarget(existingAnnualTarget, 100, "EXISTING_TARGET"),
    slowGo: createPhaseTarget(
      existingAnnualTarget * 0.85,
      85,
      "PERCENTAGE_DEFAULT"
    ),
    noGo: createPhaseTarget(
      existingAnnualTarget * 0.75,
      75,
      "PERCENTAGE_DEFAULT"
    ),
    rlsVersion: retirementLivingStandards.version,
  };
}

export function initializeSpendingSmile(
  strategy: SpendingSmileStrategy,
  existingAnnualTarget: number
) {
  return strategy.initialized
    ? strategy
    : {
        ...createDefaultSpendingSmile(existingAnnualTarget),
        initialized: true,
      };
}

export function resolveAnnualSpendingTarget(input: {
  settings: PensionSettings;
  rowDate: string;
}): ResolvedSpendingTarget {
  const { settings, rowDate } = input;
  const age =
    calculateAnchoredMonthDifference(settings.dateOfBirth, rowDate) / 12;
  const strategy = settings.spendingSmile;
  const phaseAndTarget =
    featureFlags.spendingSmileStrategy &&
    settings.spendingStrategyType === "SPENDING_SMILE"
      ? getSmilePhaseAndTarget(age, strategy)
      : {
          phase: "FLAT" as const,
          annualRealTarget: settings.desiredRetirementIncome,
        };
  const monthsFromBase = Math.max(
    0,
    calculateAnchoredMonthDifference(settings.startDate, rowDate)
  );
  const monthlyInflationRate =
    (1 + settings.inflationRateAnnual / 100) ** (1 / 12) - 1;

  return {
    ...phaseAndTarget,
    annualNominalTarget:
      phaseAndTarget.annualRealTarget *
      (1 + monthlyInflationRate) ** monthsFromBase,
  };
}

export function updateGoGoAnnualAmount(
  strategy: SpendingSmileStrategy,
  annualAmountReal: number
): SpendingSmileStrategy {
  const amount = clampFinite(annualAmountReal, 0, MAX_ANNUAL_SPENDING);
  const goGo = createPhaseTarget(amount, 100, "CUSTOM");

  if (strategy.inputMode === "PERCENTAGE_OF_GO_GO") {
    return {
      ...strategy,
      goGo,
      slowGo: updateTargetFromPercentage(strategy.slowGo, amount),
      noGo: updateTargetFromPercentage(strategy.noGo, amount),
    };
  }

  return {
    ...strategy,
    goGo,
    slowGo: updatePercentageFromAmount(strategy.slowGo, amount),
    noGo: updatePercentageFromAmount(strategy.noGo, amount),
  };
}

export function updatePhaseAnnualAmount(
  strategy: SpendingSmileStrategy,
  phase: "slowGo" | "noGo",
  annualAmountReal: number
): SpendingSmileStrategy {
  const target = {
    ...strategy[phase],
    annualAmountReal: clampFinite(annualAmountReal, 0, MAX_ANNUAL_SPENDING),
    source: "CUSTOM" as const,
  };

  return {
    ...strategy,
    [phase]: updatePercentageFromAmount(target, strategy.goGo.annualAmountReal),
  };
}

export function updatePhasePercentage(
  strategy: SpendingSmileStrategy,
  phase: "slowGo" | "noGo",
  percentageOfGoGo: number
): SpendingSmileStrategy {
  const percentage = clampFinite(percentageOfGoGo, 0, MAX_PERCENTAGE);

  return {
    ...strategy,
    [phase]: {
      annualAmountReal: strategy.goGo.annualAmountReal * (percentage / 100),
      percentageOfGoGo: percentage,
      source: "CUSTOM",
    },
  };
}

export function switchSpendingSmileInputMode(
  strategy: SpendingSmileStrategy,
  inputMode: SpendingSmileStrategy["inputMode"]
): SpendingSmileStrategy {
  if (inputMode === strategy.inputMode) {
    return strategy;
  }

  return {
    ...strategy,
    inputMode,
    slowGo: updatePercentageFromAmount(
      strategy.slowGo,
      strategy.goGo.annualAmountReal
    ),
    noGo: updatePercentageFromAmount(
      strategy.noGo,
      strategy.goGo.annualAmountReal
    ),
  };
}

export function applyRlsTarget(
  strategy: SpendingSmileStrategy,
  phase: "goGo" | "slowGo" | "noGo",
  level: RlsLevel
): SpendingSmileStrategy {
  const amount =
    retirementLivingStandards.values[strategy.householdType][level];
  const source = `RLS_${level.toUpperCase()}` as SpendingTargetSource;
  const target = createPhaseTarget(
    amount,
    calculatePercentage(amount, strategy.goGo.annualAmountReal),
    source
  );
  const next = { ...strategy, [phase]: target };

  if (phase === "goGo") {
    next.goGo = { ...target, percentageOfGoGo: 100 };
    next.slowGo =
      strategy.inputMode === "PERCENTAGE_OF_GO_GO"
        ? updateTargetFromPercentage(next.slowGo, amount)
        : updatePercentageFromAmount(next.slowGo, amount);
    next.noGo =
      strategy.inputMode === "PERCENTAGE_OF_GO_GO"
        ? updateTargetFromPercentage(next.noGo, amount)
        : updatePercentageFromAmount(next.noGo, amount);
  }

  return next;
}

export function applySpendingSmileProfile(
  strategy: SpendingSmileStrategy,
  profile: "EXISTING_REDUCTIONS" | "RLS_TIERED" | "MODERATE",
  existingAnnualTarget: number
): SpendingSmileStrategy {
  if (profile === "RLS_TIERED") {
    const values = retirementLivingStandards.values[strategy.householdType];
    return {
      ...strategy,
      goGo: createPhaseTarget(values.comfortable, 100, "RLS_COMFORTABLE"),
      slowGo: createPhaseTarget(
        values.moderate,
        calculatePercentage(values.moderate, values.comfortable),
        "RLS_MODERATE"
      ),
      noGo: createPhaseTarget(
        values.minimum,
        calculatePercentage(values.minimum, values.comfortable),
        "RLS_MINIMUM"
      ),
    };
  }

  const goGoAmount =
    profile === "MODERATE"
      ? retirementLivingStandards.values[strategy.householdType].moderate
      : existingAnnualTarget;
  const goGoSource =
    profile === "MODERATE" ? "RLS_MODERATE" : "EXISTING_TARGET";

  return {
    ...strategy,
    goGo: createPhaseTarget(goGoAmount, 100, goGoSource),
    slowGo: createPhaseTarget(goGoAmount * 0.85, 85, "PERCENTAGE_DEFAULT"),
    noGo: createPhaseTarget(goGoAmount * 0.75, 75, "PERCENTAGE_DEFAULT"),
  };
}

export function classifyRlsTarget(
  target: number,
  householdType: RetirementHouseholdType
): RlsClassification {
  const thresholds = retirementLivingStandards.values[householdType];

  if (target < thresholds.minimum) {
    return "BELOW_MINIMUM";
  }
  if (target < thresholds.moderate) {
    return "MINIMUM_TO_MODERATE";
  }
  if (target < thresholds.comfortable) {
    return "MODERATE_TO_COMFORTABLE";
  }
  return "COMFORTABLE_OR_ABOVE";
}

export function getRlsClassificationLabel(classification: RlsClassification) {
  const labels: Record<RlsClassification, string> = {
    BELOW_MINIMUM: "Below the current Minimum standard",
    MINIMUM_TO_MODERATE: "Between Minimum and Moderate",
    MODERATE_TO_COMFORTABLE: "Between Moderate and Comfortable",
    COMFORTABLE_OR_ABOVE: "At or above Comfortable",
  };

  return labels[classification];
}

export function normalizeSpendingSmile(
  value: unknown,
  existingAnnualTarget: number
): SpendingSmileStrategy {
  const fallback = createDefaultSpendingSmile(existingAnnualTarget);

  if (!isRecord(value)) {
    return fallback;
  }

  const goGo = normalizePhaseTarget(value.goGo, fallback.goGo);
  const slowGo = normalizePhaseTarget(value.slowGo, fallback.slowGo);
  const noGo = normalizePhaseTarget(value.noGo, fallback.noGo);

  return {
    initialized: value.initialized === true,
    inputMode:
      value.inputMode === "PERCENTAGE_OF_GO_GO"
        ? "PERCENTAGE_OF_GO_GO"
        : "ANNUAL_AMOUNT",
    householdType:
      value.householdType === "TWO_PERSON" ? "TWO_PERSON" : "ONE_PERSON",
    slowGoStartAge: clampFinite(value.slowGoStartAge, 0, 120, 75),
    noGoStartAge: clampFinite(value.noGoStartAge, 0, 120, 85),
    goGo: { ...goGo, percentageOfGoGo: 100 },
    slowGo,
    noGo,
    rlsVersion:
      typeof value.rlsVersion === "string"
        ? value.rlsVersion
        : retirementLivingStandards.version,
  };
}

function getSmilePhaseAndTarget(age: number, strategy: SpendingSmileStrategy) {
  if (age < strategy.slowGoStartAge) {
    return {
      phase: "GO_GO" as const,
      annualRealTarget: strategy.goGo.annualAmountReal,
    };
  }
  if (age < strategy.noGoStartAge) {
    return {
      phase: "SLOW_GO" as const,
      annualRealTarget: strategy.slowGo.annualAmountReal,
    };
  }
  return {
    phase: "NO_GO" as const,
    annualRealTarget: strategy.noGo.annualAmountReal,
  };
}

function createPhaseTarget(
  annualAmountReal: number,
  percentageOfGoGo: number,
  source: SpendingTargetSource
): SpendingPhaseTarget {
  return { annualAmountReal, percentageOfGoGo, source };
}

function updateTargetFromPercentage(
  target: SpendingPhaseTarget,
  goGoAmount: number
) {
  return {
    ...target,
    annualAmountReal: goGoAmount * (target.percentageOfGoGo / 100),
    source: "CUSTOM" as const,
  };
}

function updatePercentageFromAmount(
  target: SpendingPhaseTarget,
  goGoAmount: number
) {
  return {
    ...target,
    percentageOfGoGo: calculatePercentage(target.annualAmountReal, goGoAmount),
  };
}

function calculatePercentage(amount: number, goGoAmount: number) {
  return goGoAmount === 0 ? 0 : (amount / goGoAmount) * 100;
}

function normalizePhaseTarget(
  value: unknown,
  fallback: SpendingPhaseTarget
): SpendingPhaseTarget {
  if (!isRecord(value)) {
    return fallback;
  }

  const allowedSources: SpendingTargetSource[] = [
    "EXISTING_TARGET",
    "RLS_MINIMUM",
    "RLS_MODERATE",
    "RLS_COMFORTABLE",
    "PERCENTAGE_DEFAULT",
    "CUSTOM",
  ];

  return {
    annualAmountReal: clampFinite(
      value.annualAmountReal,
      0,
      MAX_ANNUAL_SPENDING,
      fallback.annualAmountReal
    ),
    percentageOfGoGo: clampFinite(
      value.percentageOfGoGo,
      0,
      MAX_PERCENTAGE,
      fallback.percentageOfGoGo
    ),
    source: allowedSources.includes(value.source as SpendingTargetSource)
      ? (value.source as SpendingTargetSource)
      : fallback.source,
  };
}

function clampFinite(value: unknown, min: number, max: number, fallback = min) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(max, Math.max(min, parsed))
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
