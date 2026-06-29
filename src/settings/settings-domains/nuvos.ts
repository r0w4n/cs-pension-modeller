import {
  DEFAULT_NUVOS_ABS_YEAR,
  type PensionSettings,
  type PensionValidationIssue,
  type StoredPensionSettings,
} from "../settings-types";

export const nuvosDefaults = {
  showNuvos: false,
  nuvosPensionAbsDate: DEFAULT_NUVOS_ABS_YEAR,
  nuvosAccruedPensionAtLastAbs: 0,
  nuvosPensionableEarnings: 42000,
  nuvosPensionLeaveAge: 65,
  nuvosPensionDrawAge: 65,
  nuvosApplyPensionIncreases: false,
  nuvosAssumedCpiPercent: 2,
} as const;

export const nuvosNumericSettingRules = {
  nuvosAccruedPensionAtLastAbs: { min: 0, max: 50000, step: 1 },
  nuvosPensionableEarnings: { min: 10000, max: 150000, step: 500 },
  nuvosPensionLeaveAge: { min: 40, max: 70, step: 1 },
  nuvosPensionDrawAge: { min: 55, max: 70, step: 1 },
  nuvosAssumedCpiPercent: { min: 0, max: 10, step: 0.1 },
} as const;

export function normalizeNuvosBooleanSetting(value: unknown) {
  return Boolean(value);
}

export type NuvosValidationContext = {
  settings: Pick<
    PensionSettings,
    "showNuvos" | "nuvosPensionAbsDate" | "startDate"
  >;
  lifeExpectancyDate: string;
  nuvosDrawDate: string;
  nuvosAbsDate: string;
};

export function validateNuvosRules({
  settings,
  lifeExpectancyDate,
  nuvosDrawDate,
  nuvosAbsDate,
}: NuvosValidationContext): PensionValidationIssue[] {
  const issues: PensionValidationIssue[] = [];

  if (settings.showNuvos && nuvosDrawDate > lifeExpectancyDate) {
    issues.push({
      field: "nuvosPensionDrawAge",
      message: "nuvos pension draw age must be within life expectancy.",
    });
  }

  if (settings.showNuvos && nuvosAbsDate > settings.startDate) {
    issues.push({
      field: "nuvosPensionAbsDate",
      message:
        "nuvos Annual Benefit Statement must be on or before the calculation start date.",
    });
  }

  return issues;
}

function coerceNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function coerceString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function coerceBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

export function coerceNuvosSettings(
  input: Partial<StoredPensionSettings>
): Partial<StoredPensionSettings> {
  return {
    showNuvos: coerceBoolean(input.showNuvos),
    nuvosPensionAbsDate: coerceString(input.nuvosPensionAbsDate),
    nuvosAccruedPensionAtLastAbs: coerceNumber(
      input.nuvosAccruedPensionAtLastAbs
    ),
    nuvosPensionableEarnings: coerceNumber(input.nuvosPensionableEarnings),
    nuvosPensionLeaveAge: coerceNumber(input.nuvosPensionLeaveAge),
    nuvosPensionDrawAge: coerceNumber(input.nuvosPensionDrawAge),
    nuvosApplyPensionIncreases: coerceBoolean(input.nuvosApplyPensionIncreases),
    nuvosAssumedCpiPercent: coerceNumber(input.nuvosAssumedCpiPercent),
  };
}
