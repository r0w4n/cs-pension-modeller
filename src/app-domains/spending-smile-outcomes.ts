import type { RetirementIncomePoint } from "../RetirementIncomeBridgeChart";
import type { RetirementBridgeAnalysis } from "../projection";
import {
  classifyRlsTarget,
  resolveAnnualSpendingTarget,
  type RlsClassification,
  type SpendingPhase,
} from "../spending-smile";
import type { PensionSettings } from "../settings";

export type SpendingPhaseOutcomeStatus =
  | "FULLY_FUNDED"
  | "PARTIALLY_FUNDED"
  | "NOT_REACHED";

export type AnnualSpendingOutcome = {
  age: number;
  phase: SpendingPhase;
  targetReal: number;
  targetNominal: number;
  achievableReal: number;
  shortfallReal: number;
  targetMet: boolean;
};

export type SpendingPhaseOutcome = {
  phase: Exclude<SpendingPhase, "FLAT">;
  startAge: number;
  endAge: number | null;
  totalTargetReal: number;
  totalAchievableReal: number;
  totalShortfallReal: number;
  yearsInProjection: number;
  yearsTargetMet: number;
  firstShortfallAge: number | null;
  fundingRatio: number;
  fullyFunded: boolean;
  status: SpendingPhaseOutcomeStatus;
  rlsClassification: RlsClassification;
};

export function createAnnualSpendingOutcomes(
  series: RetirementIncomePoint[],
  settings: PensionSettings
): AnnualSpendingOutcome[] {
  if (settings.spendingStrategyType !== "SPENDING_SMILE") {
    return [];
  }

  const outcomes: AnnualSpendingOutcome[] = [];
  const firstAge = Math.ceil(settings.requirementAge);
  const lastAge = Math.floor(settings.lifeExpectancy);

  for (let age = firstAge; age <= lastAge; age += 1) {
    const point = findRepresentativePoint(series, age);

    if (!point) {
      continue;
    }

    const target = resolveAnnualSpendingTarget({
      settings,
      rowDate: point.date,
    });
    const nominalToRealFactor =
      target.annualNominalTarget > 0
        ? target.annualRealTarget / target.annualNominalTarget
        : 1;
    const achievableReal =
      settings.projectionBasis === "nominal"
        ? point.assessedIncomeAnnual * nominalToRealFactor
        : point.assessedIncomeAnnual;
    const fundedReal = Math.min(target.annualRealTarget, achievableReal);
    const shortfallReal = Math.max(0, target.annualRealTarget - achievableReal);

    outcomes.push({
      age,
      phase: target.phase,
      targetReal: target.annualRealTarget,
      targetNominal: target.annualNominalTarget,
      achievableReal: Math.max(0, fundedReal),
      shortfallReal,
      targetMet: shortfallReal <= 0.01,
    });
  }

  return outcomes;
}

export function aggregateSpendingPhaseOutcomes(
  annualOutcomes: AnnualSpendingOutcome[],
  settings: PensionSettings
): SpendingPhaseOutcome[] {
  const strategy = settings.spendingSmile;
  const definitions = createPhaseDefinitions(settings);

  return definitions.map((definition) => {
    const rows = annualOutcomes.filter(
      (outcome) => outcome.phase === definition.phase
    );
    const totalTargetReal = sum(rows.map((row) => row.targetReal));
    const totalAchievableReal = sum(rows.map((row) => row.achievableReal));
    const totalShortfallReal = sum(rows.map((row) => row.shortfallReal));
    const firstShortfall = rows.find((row) => !row.targetMet);
    const fullyFunded = rows.length > 0 && rows.every((row) => row.targetMet);
    const fundingRatio =
      totalTargetReal === 0 ? 1 : totalAchievableReal / totalTargetReal;
    const status: SpendingPhaseOutcomeStatus =
      rows.length === 0
        ? "NOT_REACHED"
        : fullyFunded
          ? "FULLY_FUNDED"
          : "PARTIALLY_FUNDED";

    return {
      phase: definition.phase,
      startAge: definition.startAge,
      endAge: definition.endAge,
      totalTargetReal,
      totalAchievableReal,
      totalShortfallReal,
      yearsInProjection: rows.length,
      yearsTargetMet: rows.filter((row) => row.targetMet).length,
      firstShortfallAge: firstShortfall?.age ?? null,
      fundingRatio,
      fullyFunded,
      status,
      rlsClassification: classifyRlsTarget(
        definition.target,
        strategy.householdType
      ),
    };
  });
}

export function createBridgeSpendingPhaseOutcomes(
  analysis: Pick<RetirementBridgeAnalysis, "potProjection">,
  settings: PensionSettings
): SpendingPhaseOutcome[] {
  const monthlyOutcomes = analysis.potProjection.map((row) => {
    const target = resolveAnnualSpendingTarget({
      settings,
      rowDate: row.date,
    });
    const nominalToRealFactor =
      target.annualNominalTarget > 0
        ? target.annualRealTarget / target.annualNominalTarget
        : 1;
    const targetReal = target.annualRealTarget / 12;
    const shortfallReal =
      row.unfundedShortfall *
      (settings.projectionBasis === "nominal" ? nominalToRealFactor : 1);

    return {
      age: row.age,
      phase: target.phase,
      targetReal,
      achievableReal: Math.max(0, targetReal - shortfallReal),
      shortfallReal,
      targetMet: shortfallReal <= 0.01,
    };
  });
  const strategy = settings.spendingSmile;

  return createPhaseDefinitions(settings).map((definition) => {
    const rows = monthlyOutcomes.filter(
      (outcome) => outcome.phase === definition.phase
    );
    const projectedAges = [...new Set(rows.map((row) => row.age))];
    const metAges = projectedAges.filter((age) =>
      rows.filter((row) => row.age === age).every((row) => row.targetMet)
    );
    const totalTargetReal = sum(rows.map((row) => row.targetReal));
    const totalAchievableReal = sum(rows.map((row) => row.achievableReal));
    const totalShortfallReal = sum(rows.map((row) => row.shortfallReal));
    const firstShortfall = rows.find((row) => !row.targetMet);
    const fullyFunded = rows.length > 0 && rows.every((row) => row.targetMet);
    const fundingRatio =
      totalTargetReal === 0 ? 1 : totalAchievableReal / totalTargetReal;

    return {
      phase: definition.phase,
      startAge: definition.startAge,
      endAge: definition.endAge,
      totalTargetReal,
      totalAchievableReal,
      totalShortfallReal,
      yearsInProjection: projectedAges.length,
      yearsTargetMet: metAges.length,
      firstShortfallAge: firstShortfall?.age ?? null,
      fundingRatio,
      fullyFunded,
      status:
        rows.length === 0
          ? "NOT_REACHED"
          : fullyFunded
            ? "FULLY_FUNDED"
            : "PARTIALLY_FUNDED",
      rlsClassification: classifyRlsTarget(
        definition.target,
        strategy.householdType
      ),
    };
  });
}

function createPhaseDefinitions(settings: PensionSettings) {
  const strategy = settings.spendingSmile;

  return [
    {
      phase: "GO_GO" as const,
      startAge: settings.requirementAge,
      endAge: strategy.slowGoStartAge - 1,
      target: strategy.goGo.annualAmountReal,
    },
    {
      phase: "SLOW_GO" as const,
      startAge: strategy.slowGoStartAge,
      endAge: strategy.noGoStartAge - 1,
      target: strategy.slowGo.annualAmountReal,
    },
    {
      phase: "NO_GO" as const,
      startAge: strategy.noGoStartAge,
      endAge: null,
      target: strategy.noGo.annualAmountReal,
    },
  ];
}

function findRepresentativePoint(series: RetirementIncomePoint[], age: number) {
  return series
    .filter((point) => point.age >= age && point.age < age + 1)
    .sort((left, right) => left.age - right.age)[0];
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
