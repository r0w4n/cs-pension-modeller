import type { PensionSettings } from "./settings";
import {
  generateRetirementBridgeAnalysis as generateRetirementBridgeAnalysisDomain,
  prepareBridgeProjectionSettings as prepareBridgeProjectionSettingsDomain,
  type RetirementBridgeAnalysis as RetirementBridgeAnalysisDomain,
} from "./projection-domains/bridge-analysis";
import {
  createProjectionRuntimeDates,
  deriveProjectionInputs,
} from "./derive-inputs";
import { createProjectionTableBase } from "./row-engine-base";
import { createProjectionTableWithPensionIncreases } from "./row-engine-with-pension-increases";
import { generatePensionSummary as generatePensionSummaryFromSummary } from "./summary";

export type ProjectionRow = {
  date: string;
  age: number;
  ageMonths: number;
  milestones: string[];
  milestoneDates: string[];
  monthlyAddedPension: number;
  lumpSumAddedPension: number;
  annualStandardAlphaPension: number;
  annualEpaAlphaPension: number;
  annualAccruedAlphaPension: number;
  annualAlphaPensionIncludingReduction: number;
  monthlyAlphaPensionGross: number;
  annualNuvosPension: number;
  annualNuvosPensionIncludingReduction: number;
  monthlyNuvosPensionGross: number;
  monthlyStatePension: number;
  sippPot: number;
  monthlySippPension: number;
  isaPot: number;
  monthlyIsaPension: number;
  lisaPot: number;
  monthlyLisaPension: number;
  totalMonthlyIncomeBeforeTax: number;
  monthlyIncomeTax: number;
  totalMonthlyNetIncome: number;
};

export type PensionSummary = {
  keyDates: {
    stopsAlphaAccrual: string;
    startsAlphaPension: string;
    stopsNuvosAccrual: string;
    startsNuvosPension: string;
    startsSippDraw: string;
    startsIsaDraw: string;
    startsLisaDraw: string;
    startsStatePension: string;
  };
  alphaPension: {
    annualAtDraw: number;
    monthlyAtDraw: number;
    maximumAnnualAccrued: number;
    totalAddedAfterToday: number;
  };
  nuvosPension: {
    annualAtDraw: number;
    monthlyAtDraw: number;
    maximumAnnualAccrued: number;
  };
  sippPension: {
    potAtDraw: number;
    monthlyAtDraw: number;
    totalContributionsAfterTaxRelief: number;
  };
  isaPension: {
    potAtDraw: number;
    monthlyAtDraw: number;
    totalContributions: number;
  };
  lisaPension: {
    potAtDraw: number;
    monthlyAtDraw: number;
    totalContributionsWithBonus: number;
  };
  incomeOverTime: {
    monthlyAtAlphaStart: number;
    monthlyAtStateStart: number;
    monthlyAfterStatePension: number;
    monthlyStatePension: number;
  };
  transitions: {
    yearsBetweenStoppingAccrualAndDrawingPension: number;
    yearsBetweenAlphaPensionAndStatePension: number;
  };
  calculated: {
    normalPensionAge: number;
    statePensionAge: number;
    earlyRetirementReductionPercent: number;
  };
  retirementIncome: RetirementIncomeSummary;
};

export type RetirementIncomeDisplay = "monthly" | "annual";

export type RetirementIncomeSource = {
  key:
    | "alpha"
    | "nuvos"
    | "sipp"
    | "isa"
    | "lisa"
    | "statePension"
    | "incomeTax";
  label: string;
  monthlyIncome: number;
  annualIncome: number;
};

export type RetirementIncomeSummary = {
  sources: RetirementIncomeSource[];
  totalMonthlyIncome: number;
  totalAnnualIncome: number;
};

export type BridgePhase = {
  startDate: string;
  endDate: string;
  startAge: number;
  startAgeMonths: number;
  endAge: number;
  endAgeMonths: number;
  label: string;
  incomeSourcesActive: string[];
  potUsed: string;
  annualTargetIncome: number;
  annualAlphaPension: number;
  annualNuvosPension: number;
  annualStatePension: number;
  annualIsaBridge: number;
  annualLisaBridge: number;
  annualSippBridge: number;
  annualShortfall: number;
  annualSurplus: number;
  totalIsaBridge: number;
  totalLisaBridge: number;
  totalSippBridge: number;
  totalBridgeRequired: number;
  unfundedShortfall: number;
};

export type BridgePotProjectionRow = {
  date: string;
  age: number;
  ageMonths: number;
  monthlyAlphaPension: number;
  monthlyNuvosPension: number;
  monthlyStatePension: number;
  isaBalance: number;
  lisaBalance: number;
  sippBalance: number;
  isaDrawdown: number;
  lisaDrawdown: number;
  sippDrawdown: number;
  unfundedShortfall: number;
  growth: number;
  milestones: string[];
  milestoneDates: string[];
};

export type RetirementBridgeAnalysis = RetirementBridgeAnalysisDomain;

export {
  addMonths,
  addYears,
  calculateAge,
  calculateAgeMonths,
  calculateWholeMonthDifference,
  createProjectionRuntimeDates,
  deriveInflationAssumptions,
  deriveProjectionInputs,
  generateMonthlyDateRange,
  getLifeExpectancyDate,
  type DerivedInflationAssumptions,
  type DerivedProjectionInputs,
} from "./derive-inputs";
export { buildMilestoneMap, generateMilestoneDefinitions } from "./milestones";
export { calculateTotalGrossMonthlyIncome } from "./row-assembly";
export const generatePensionSummary = generatePensionSummaryFromSummary;

export function createProjectionTable(
  settings: PensionSettings
): ProjectionRow[] {
  const derivedInputs = deriveProjectionInputs(settings);

  if (!derivedInputs) {
    return [];
  }

  const runtimeDates = createProjectionRuntimeDates(settings);

  if (settings.applyPensionIncreases) {
    return createProjectionTableWithPensionIncreases(
      settings,
      derivedInputs,
      runtimeDates
    );
  }

  return createProjectionTableBase(settings, derivedInputs, runtimeDates);
}

export function prepareBridgeProjectionSettings(
  settings: PensionSettings
): PensionSettings {
  return prepareBridgeProjectionSettingsDomain(settings);
}

export function generateRetirementBridgeAnalysis(
  pensionRows: ProjectionRow[],
  settings: PensionSettings,
  options: { calculateSafeDrawAge?: boolean } = {}
): RetirementBridgeAnalysis {
  return generateRetirementBridgeAnalysisDomain(pensionRows, settings, options);
}
