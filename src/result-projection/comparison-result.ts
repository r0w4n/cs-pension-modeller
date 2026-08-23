import {
  calculateRetirementIncomeTargetAtDate,
  type PensionSummary,
  type ProjectionRow,
} from "../projection";
import {
  type PensionSettings,
  type RetirementIncomeTargetBasis,
} from "../settings";
import type { RetirementPlanAssessment } from "../calculation/retirement-plan-assessment";
import type { RetirementPlanResult } from "../calculation/retirement-plan";
import { addYearsToIsoDate } from "../model-date";
import { normalizeMoney } from "../money";

export type ComparisonScenario = {
  id: string;
  name: string;
  settings: PensionSettings;
  createdAt: string;
  updatedAt: string;
};

export type ComparisonResult = {
  scenario: ComparisonScenario;
  rows: ProjectionRow[];
  summary: PensionSummary;
  assessment: RetirementPlanAssessment;
  annualIncome: number;
  annualTarget: number;
  annualGap: number;
  isaDepletedAge: number | null;
  lisaDepletedAge: number | null;
  sippDepletedAge: number | null;
  csAvcDepletedAge: number | null;
  lifeExpectancyAnnualIncome: number;
  statePensionAssumptionAffectsTarget: boolean;
  currentMatchesSaved: boolean;
};

export type CachedComparisonResult = Omit<
  ComparisonResult,
  "scenario" | "currentMatchesSaved"
>;

export function clonePensionSettings(
  settings: PensionSettings
): PensionSettings {
  return JSON.parse(JSON.stringify(settings)) as PensionSettings;
}

export function getSettingsSignature(settings: PensionSettings) {
  return JSON.stringify(settings);
}

export function createComparisonResult(
  scenario: ComparisonScenario,
  currentSettingsSignature: string,
  plan: RetirementPlanResult
): ComparisonResult {
  const settingsSignature = getSettingsSignature(scenario.settings);

  if (getSettingsSignature(plan.settings) !== settingsSignature) {
    throw new Error(
      "Comparison projection requires a matching retirement plan."
    );
  }

  const { assessment, rows, summary } = plan;
  const retirementDate = addYearsToIsoDate(
    scenario.settings.dateOfBirth,
    scenario.settings.requirementAge
  );
  const annualTarget = calculateRetirementIncomeTargetAtDate(
    scenario.settings,
    retirementDate
  );
  const annualIncome = getTargetBasisAnnualIncome(
    summary,
    scenario.settings.retirementIncomeTargetBasis
  );
  return {
    rows,
    summary,
    assessment,
    annualIncome,
    annualTarget,
    annualGap: normalizeMoney(annualIncome - annualTarget),
    isaDepletedAge: findPotDepletedAge(
      rows,
      "isaPot",
      scenario.settings.isaDrawAge,
      scenario.settings.showIsa &&
        scenario.settings.isaWithdrawalStrategy === "use_by_age"
        ? scenario.settings.isaWithdrawalTargetAge
        : null
    ),
    sippDepletedAge: findPotDepletedAge(
      rows,
      "sippPot",
      scenario.settings.sippDrawAge,
      scenario.settings.showSipp &&
        scenario.settings.sippWithdrawalStrategy === "use_by_age"
        ? scenario.settings.sippWithdrawalTargetAge
        : null
    ),
    csAvcDepletedAge: findPotDepletedAge(
      rows,
      "csAvcPot",
      scenario.settings.csAvcDrawAge,
      scenario.settings.showCsAvc &&
        scenario.settings.csAvcWithdrawalStrategy === "use_by_age"
        ? scenario.settings.csAvcWithdrawalTargetAge
        : null
    ),
    lisaDepletedAge: findPotDepletedAge(
      rows,
      "lisaPot",
      scenario.settings.lisaDrawAge,
      scenario.settings.showLisa &&
        scenario.settings.lisaWithdrawalStrategy === "use_by_age"
        ? scenario.settings.lisaWithdrawalTargetAge
        : null
    ),
    lifeExpectancyAnnualIncome: findAnnualIncomeAtAge(
      rows,
      scenario.settings.lifeExpectancy,
      scenario.settings.retirementIncomeTargetBasis
    ),
    statePensionAssumptionAffectsTarget:
      plan.statePensionAssumptionAffectsTarget,
    scenario,
    currentMatchesSaved: settingsSignature === currentSettingsSignature,
  };
}

function findPotDepletedAge(
  rows: ProjectionRow[],
  potKey: "isaPot" | "lisaPot" | "sippPot" | "csAvcPot",
  drawAge: number,
  targetAge: number | null = null
) {
  const depletionRow = rows.find(
    (row) => row.age + row.ageMonths / 12 >= drawAge && row[potKey] <= 0
  );

  if (!depletionRow) {
    return null;
  }

  const depletionAge = depletionRow.age + depletionRow.ageMonths / 12;
  return targetAge !== null && depletionAge < targetAge
    ? targetAge
    : depletionAge;
}

function findAnnualIncomeAtAge(
  rows: ProjectionRow[],
  targetAge: number,
  targetBasis: RetirementIncomeTargetBasis
) {
  const row =
    rows.find(
      (candidate) => candidate.age + candidate.ageMonths / 12 >= targetAge
    ) ?? rows.at(-1);

  return (
    ((targetBasis === "after_tax"
      ? row?.totalMonthlyNetIncome
      : row?.totalMonthlyIncomeBeforeTax) ?? 0) * 12
  );
}

function getTargetBasisAnnualIncome(
  summary: PensionSummary,
  targetBasis: RetirementIncomeTargetBasis
) {
  if (targetBasis === "after_tax") {
    return summary.retirementIncome.totalAnnualIncome;
  }

  return (
    summary.retirementIncome.sources.reduce(
      (total, source) =>
        source.key === "incomeTax" ? total : total + source.monthlyIncome,
      0
    ) * 12
  );
}
