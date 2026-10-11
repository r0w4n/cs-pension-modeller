import {
  calculateRetirementPlan,
  type RetirementPlanResult,
} from "./retirement-plan";
import {
  calculateNormalPensionAge,
  calculateStatePensionDrawDate,
  isValidIsoDate,
  normalizeSettings,
  validateSettings,
  type PensionSettings,
  type PensionValidationIssue,
} from "../settings";
import { addYearsToIsoDate } from "../model-date";
import {
  assessRegularAddedPensionSupport,
  formatRegularAddedPensionSupportNote,
} from "./added-pension-purchase-support";

export const QUICK_CALCULATOR_SCENARIOS = [
  ["normal-standard", "normal", "standard", "Standard"],
  ["normal-added", "normal", "added", "With Added Pension"],
  ["normal-reduced", "normal", "reduced", "With reduced hours"],
  ["normal-reduced-added", "normal", "reduced-added", "With both"],
  ["selected-standard", "selected", "standard", "Standard"],
  ["selected-added", "selected", "added", "With Added Pension"],
  ["selected-reduced", "selected", "reduced", "With reduced hours"],
  ["selected-reduced-added", "selected", "reduced-added", "With both"],
] as const;

export type QuickCalculatorScenarioId =
  (typeof QUICK_CALCULATOR_SCENARIOS)[number][0];
export type QuickCalculatorRetirementBasis = "normal" | "selected";
export type QuickCalculatorVariant =
  "standard" | "added" | "reduced" | "reduced-added";

export type QuickCalculatorScenarioResult = {
  id: QuickCalculatorScenarioId;
  basis: QuickCalculatorRetirementBasis;
  variant: QuickCalculatorVariant;
  label: string;
  retirementAge: number;
  settings: PensionSettings;
  validationIssues: PensionValidationIssue[];
  result: RetirementPlanResult | null;
  notes: string[];
};

export type QuickCalculatorBatchResult = {
  calculationDate: string;
  settingsSignature: string;
  scenarios: QuickCalculatorScenarioResult[];
};

export type QuickCalculatorBaseSettingsResult =
  | { status: "ready"; settings: PensionSettings; validationIssues: [] }
  | {
      status: "invalid";
      settings: null;
      validationIssues: PensionValidationIssue[];
    };

export function createQuickCalculatorBaseSettings({
  defaults,
  inputs,
  calculationDate,
}: {
  defaults: PensionSettings;
  inputs: PensionSettings;
  calculationDate: string;
}): QuickCalculatorBaseSettingsResult {
  const rawValidationIssues = validateQuickCalculatorRawInputs(inputs);
  if (rawValidationIssues.length > 0) {
    return {
      status: "invalid",
      settings: null,
      validationIssues: rawValidationIssues,
    };
  }

  const normalPensionAge = calculateNormalPensionAge(inputs.dateOfBirth);
  const statePensionDrawDate = calculateStatePensionDrawDate(
    inputs.dateOfBirth
  );

  const settings = normalizeSettings(
    {
      ...defaults,
      startDate: calculationDate,
      dateOfBirth: inputs.dateOfBirth,
      lifeExpectancy: Math.max(defaults.lifeExpectancy, 80),
      requirementAge: inputs.alphaPensionDrawAge,
      normalPensionAge,
      showAlpha: true,
      showClassic: false,
      showClassicPlus: false,
      showNuvos: false,
      showPremium: false,
      showStatePension: inputs.showStatePension,
      showSipp: false,
      showCsAvc: false,
      showIsa: false,
      showLisa: false,
      showAdditionalGuaranteedIncome: false,
      additionalGuaranteedIncomes: [],
      taxationEnabled: false,
      retirementIncomeTargetBasis: "gross",
      desiredRetirementIncome: 0,
      spendingStrategyType: "FLAT",
      flexibleWithdrawalPriority: [],
      projectionBasis: "real",
      applyPensionIncreases: true,
      alphaPayRisePercent: 0,
      alphaPensionAbsDate: inputs.alphaPensionAbsDate,
      accruedPensionAtLastAbs: inputs.accruedPensionAtLastAbs,
      pensionableEarnings: inputs.pensionableEarnings,
      fullSalary: inputs.pensionableEarnings,
      alphaPensionLeaveAge: inputs.alphaPensionDrawAge,
      alphaPensionDrawAge: inputs.alphaPensionDrawAge,
      alphaHasProtectedPensionAge: inputs.alphaHasProtectedPensionAge,
      alphaAddedPensionMonthly: inputs.alphaAddedPensionMonthly,
      alphaAddedPensionFactorType: inputs.alphaAddedPensionFactorType,
      alphaAddedPensionLumpSums: [],
      partialRetirementEnabled: true,
      partialRetirementStartAge: inputs.partialRetirementStartAge,
      partialRetirementWorkPercent: inputs.partialRetirementWorkPercent,
      currentStatePension: inputs.currentStatePension,
      statePensionForecastConfirmed: inputs.statePensionForecastConfirmed,
      statePensionDrawDate,
      statePensionApplyFutureGrowth: false,
      alphaEpaEnabled: inputs.alphaEpaEnabled,
      alphaEpaPeriods: inputs.alphaEpaPeriods.map((period) => ({ ...period })),
      jointRetirement: {
        ...defaults.jointRetirement,
        enabled: false,
        flexibleWithdrawalPriority: [],
        spendingSmile: { ...defaults.jointRetirement.spendingSmile },
      },
      partner: undefined,
    },
    { fallbackStartDate: calculationDate }
  );

  // The shared normaliser exposes a quarter-year State Pension draw-age
  // control. The quick calculator has no such override and must retain the
  // exact statutory date derived for the entered birth date.
  settings.statePensionDrawDate = statePensionDrawDate;

  return { status: "ready", settings, validationIssues: [] };
}

export function validateQuickCalculatorRawInputs(
  inputs: PensionSettings
): PensionValidationIssue[] {
  if (!inputs.alphaEpaEnabled) {
    return [];
  }

  const issues: PensionValidationIssue[] = [];
  for (const period of inputs.alphaEpaPeriods) {
    if (!isValidIsoDate(period.startDate)) {
      issues.push({
        field: "alphaEpaPeriods",
        itemId: period.id,
        message: "Enter a valid EPA start date.",
      });
    }
    if (!isValidIsoDate(period.endDate)) {
      issues.push({
        field: "alphaEpaPeriods",
        itemId: period.id,
        message: "Enter a valid EPA end date.",
      });
    }
  }
  return issues;
}

export function runQuickCalculatorScenarios({
  baseSettings,
  calculationDate,
  settingsSignature = JSON.stringify(baseSettings),
}: {
  baseSettings: PensionSettings;
  calculationDate: string;
  settingsSignature?: string;
}): QuickCalculatorBatchResult {
  const calculatedBySignature = new Map<string, RetirementPlanResult>();
  const scenarios = QUICK_CALCULATOR_SCENARIOS.map(
    ([id, basis, variant, label]): QuickCalculatorScenarioResult => {
      const retirementAge =
        basis === "normal"
          ? baseSettings.normalPensionAge
          : baseSettings.alphaPensionDrawAge;
      const usesAddedPension =
        variant === "added" || variant === "reduced-added";
      const requestsReducedHours =
        variant === "reduced" || variant === "reduced-added";
      const appliesReducedHours =
        requestsReducedHours &&
        baseSettings.partialRetirementStartAge < retirementAge;
      const settings = cloneQuickSettings(baseSettings);

      settings.requirementAge = retirementAge;
      settings.alphaPensionLeaveAge = retirementAge;
      settings.alphaPensionDrawAge = retirementAge;
      settings.startDate = calculationDate;
      settings.alphaAddedPensionMonthly = usesAddedPension
        ? baseSettings.alphaAddedPensionMonthly
        : 0;
      settings.partialRetirementEnabled = appliesReducedHours;

      const notes: string[] = [];
      if (requestsReducedHours && !appliesReducedHours) {
        notes.push(
          "Reduced hours start at or after this retirement age, so they do not change this estimate."
        );
      }
      if (usesAddedPension && appliesReducedHours) {
        const effectivePayment =
          (settings.alphaAddedPensionMonthly *
            settings.partialRetirementWorkPercent) /
          100;
        notes.push(
          `After reduced hours begin, £${settings.alphaAddedPensionMonthly.toLocaleString("en-GB")} per month becomes £${effectivePayment.toLocaleString("en-GB")} at ${settings.partialRetirementWorkPercent}% working hours.`
        );
      }

      const retirementDate = addYearsToIsoDate(
        settings.dateOfBirth,
        retirementAge
      );
      const validationIssues = validateSettings(settings);
      if (retirementDate < calculationDate) {
        validationIssues.unshift({
          field: "alphaPensionDrawAge",
          message:
            "This retirement date is before the calculation date. The quick calculator models prospective retirement and cannot reconstruct retirement already taken.",
        });
      }
      if (validationIssues.length > 0) {
        return {
          id,
          basis,
          variant,
          label,
          retirementAge,
          settings,
          validationIssues,
          result: null,
          notes,
        };
      }

      const signature = JSON.stringify(settings);
      let result = calculatedBySignature.get(signature);
      if (!result) {
        result = calculateRetirementPlan(settings, {
          includeTargetBasedWithdrawalPreviews: false,
        });
        calculatedBySignature.set(signature, result);
      }

      if (usesAddedPension) {
        const supportDiagnostic = assessRegularAddedPensionSupport(
          settings,
          result.rows
        );
        if (supportDiagnostic) {
          notes.push(formatRegularAddedPensionSupportNote(supportDiagnostic));
        }
      }

      return {
        id,
        basis,
        variant,
        label,
        retirementAge,
        settings,
        validationIssues: result.validationIssues,
        result,
        notes,
      };
    }
  );

  return { calculationDate, settingsSignature, scenarios };
}

function cloneQuickSettings(settings: PensionSettings): PensionSettings {
  return {
    ...settings,
    alphaAddedPensionLumpSums: settings.alphaAddedPensionLumpSums.map(
      (item) => ({ ...item })
    ),
    alphaEpaPeriods: settings.alphaEpaPeriods.map((period) => ({ ...period })),
    additionalGuaranteedIncomes: settings.additionalGuaranteedIncomes.map(
      (income) => ({ ...income })
    ),
    spendingSmile: { ...settings.spendingSmile },
    flexibleWithdrawalPriority: [...settings.flexibleWithdrawalPriority],
    jointRetirement: {
      ...settings.jointRetirement,
      spendingSmile: { ...settings.jointRetirement.spendingSmile },
      flexibleWithdrawalPriority: [
        ...settings.jointRetirement.flexibleWithdrawalPriority,
      ],
    },
    partner: undefined,
  };
}
