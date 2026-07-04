import type {
  ClassicCalculationMode,
  ClassicFinalSalaryLink,
  PensionSettings,
  PensionValidationIssue,
  StoredPensionSettings,
} from "../settings-types";

export const classicDefaults = {
  showClassic: false,
  showClassicPlus: false,
  classicCalculationMode: "manual",
  classicFinalSalaryLink: "broken",
  classicCurrentFinalPensionableEarnings: 42000,
  classicPreservedFinalPensionableEarnings: 42000,
  classicReckonableServiceYears: 0,
  classicAnnualPension: 0,
  classicAutomaticLumpSum: 0,
  classicPensionDrawAge: 60,
  classicApplyPensionIncreases: false,
  classicPlusCalculationMode: "manual",
  classicPlusFinalSalaryLink: "broken",
  classicPlusCurrentFinalPensionableEarnings: 42000,
  classicPlusPreservedFinalPensionableEarnings: 42000,
  classicPlusPre2002ServiceYears: 0,
  classicPlusPost2002ServiceYears: 0,
  classicPlusAnnualPension: 0,
  classicPlusAutomaticLumpSum: 0,
  classicPlusPensionDrawAge: 60,
  classicPlusApplyPensionIncreases: false,
} as const;

export const classicNumericSettingRules = {
  classicCurrentFinalPensionableEarnings: {
    min: 0,
    max: 300000,
    step: 1,
  },
  classicPreservedFinalPensionableEarnings: {
    min: 0,
    max: 300000,
    step: 1,
  },
  classicReckonableServiceYears: { min: 0, max: 45, step: 0.0001 },
  classicAnnualPension: { min: 0, max: 100000, step: 1 },
  classicAutomaticLumpSum: { min: 0, max: 300000, step: 1 },
  classicPensionDrawAge: { min: 55, max: 70, step: 1 },
  classicPlusCurrentFinalPensionableEarnings: {
    min: 0,
    max: 300000,
    step: 1,
  },
  classicPlusPreservedFinalPensionableEarnings: {
    min: 0,
    max: 300000,
    step: 1,
  },
  classicPlusPre2002ServiceYears: { min: 0, max: 45, step: 0.0001 },
  classicPlusPost2002ServiceYears: { min: 0, max: 45, step: 0.0001 },
  classicPlusAnnualPension: { min: 0, max: 100000, step: 1 },
  classicPlusAutomaticLumpSum: { min: 0, max: 300000, step: 1 },
  classicPlusPensionDrawAge: { min: 55, max: 70, step: 1 },
} as const;

export function normalizeClassicBooleanSetting(value: unknown) {
  return Boolean(value);
}

export function normalizeClassicCalculationMode(
  value: unknown
): ClassicCalculationMode {
  return value === "estimate" || value === "manual" ? value : "manual";
}

export function normalizeClassicFinalSalaryLink(
  value: unknown
): ClassicFinalSalaryLink {
  return value === "maintained" || value === "broken" ? value : "broken";
}

export type ClassicValidationContext = {
  settings: Pick<
    PensionSettings,
    | "showClassic"
    | "showClassicPlus"
    | "classicPensionDrawAge"
    | "classicPlusPensionDrawAge"
  >;
  lifeExpectancyDate: string;
  classicDrawDate: string;
  classicPlusDrawDate: string;
};

export function validateClassicRules({
  settings,
  lifeExpectancyDate,
  classicDrawDate,
  classicPlusDrawDate,
}: ClassicValidationContext): PensionValidationIssue[] {
  const issues: PensionValidationIssue[] = [];

  if (settings.showClassic && classicDrawDate > lifeExpectancyDate) {
    issues.push({
      field: "classicPensionDrawAge",
      message: "classic pension draw age must be within life expectancy.",
    });
  }

  if (settings.showClassicPlus && classicPlusDrawDate > lifeExpectancyDate) {
    issues.push({
      field: "classicPlusPensionDrawAge",
      message: "classic plus pension draw age must be within life expectancy.",
    });
  }

  return issues;
}

function coerceNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function coerceBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function coerceClassicCalculationMode(value: unknown) {
  return value === "estimate" || value === "manual" ? value : undefined;
}

function coerceClassicFinalSalaryLink(value: unknown) {
  return value === "maintained" || value === "broken" ? value : undefined;
}

export function coerceClassicSettings(
  input: Partial<StoredPensionSettings>
): Partial<StoredPensionSettings> {
  return {
    showClassic: coerceBoolean(input.showClassic),
    showClassicPlus: coerceBoolean(input.showClassicPlus),
    classicCalculationMode: coerceClassicCalculationMode(
      input.classicCalculationMode
    ),
    classicFinalSalaryLink: coerceClassicFinalSalaryLink(
      input.classicFinalSalaryLink
    ),
    classicCurrentFinalPensionableEarnings: coerceNumber(
      input.classicCurrentFinalPensionableEarnings
    ),
    classicPreservedFinalPensionableEarnings: coerceNumber(
      input.classicPreservedFinalPensionableEarnings
    ),
    classicReckonableServiceYears: coerceNumber(
      input.classicReckonableServiceYears
    ),
    classicAnnualPension: coerceNumber(input.classicAnnualPension),
    classicAutomaticLumpSum: coerceNumber(input.classicAutomaticLumpSum),
    classicPensionDrawAge: coerceNumber(input.classicPensionDrawAge),
    classicApplyPensionIncreases: coerceBoolean(
      input.classicApplyPensionIncreases
    ),
    classicPlusCalculationMode: coerceClassicCalculationMode(
      input.classicPlusCalculationMode
    ),
    classicPlusFinalSalaryLink: coerceClassicFinalSalaryLink(
      input.classicPlusFinalSalaryLink
    ),
    classicPlusCurrentFinalPensionableEarnings: coerceNumber(
      input.classicPlusCurrentFinalPensionableEarnings
    ),
    classicPlusPreservedFinalPensionableEarnings: coerceNumber(
      input.classicPlusPreservedFinalPensionableEarnings
    ),
    classicPlusPre2002ServiceYears: coerceNumber(
      input.classicPlusPre2002ServiceYears
    ),
    classicPlusPost2002ServiceYears: coerceNumber(
      input.classicPlusPost2002ServiceYears
    ),
    classicPlusAnnualPension: coerceNumber(input.classicPlusAnnualPension),
    classicPlusAutomaticLumpSum: coerceNumber(
      input.classicPlusAutomaticLumpSum
    ),
    classicPlusPensionDrawAge: coerceNumber(input.classicPlusPensionDrawAge),
    classicPlusApplyPensionIncreases: coerceBoolean(
      input.classicPlusApplyPensionIncreases
    ),
  };
}
