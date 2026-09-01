import {
  DEFAULT_STATE_PENSION_DRAW_DATE,
  type PensionSettings,
  type PensionValidationIssue,
  type StoredPensionSettings,
} from "../settings-types";
import { isValidIsoDate, normalizeIsoDate } from "../settings-shared/date";
import {
  calculateStatePensionDrawAge,
  calculateStatePensionDrawDate,
  calculateStatePensionDrawDateFromAge,
} from "../settings-shared/state";

export const statePensionDefaults = {
  showStatePension: true,
  currentStatePension: 12547.6,
  statePensionForecastConfirmed: false,
  statePensionDrawDate: DEFAULT_STATE_PENSION_DRAW_DATE,
  statePensionApplyFutureGrowth: false,
  statePensionCpiPercent: 0,
  statePensionWageGrowthPercent: 0,
} as const;

export const statePensionNumericSettingRules = {
  currentStatePension: { min: 0, max: 15000, step: 0.01 },
  statePensionCpiPercent: { min: 0, max: 10, step: 0.1 },
  statePensionWageGrowthPercent: { min: 0, max: 10, step: 0.1 },
} as const;

export function normalizeStatePensionBooleanSetting(value: unknown) {
  return Boolean(value);
}

export function normalizeStatePensionDrawDate(
  value: string,
  dateOfBirth: string
) {
  const defaultDrawDate = calculateStatePensionDrawDate(dateOfBirth);
  const normalizedDrawDate = normalizeIsoDate(value, defaultDrawDate);
  const normalizedDrawAge = calculateStatePensionDrawAge(
    dateOfBirth,
    normalizedDrawDate
  );

  return calculateStatePensionDrawDateFromAge(dateOfBirth, normalizedDrawAge);
}

export type StatePensionValidationContext = {
  settings: Pick<PensionSettings, "showStatePension" | "statePensionDrawDate">;
  lifeExpectancyDate: string;
  defaultStatePensionDrawDate: string;
};

export function validateStatePensionRules({
  settings,
  lifeExpectancyDate,
  defaultStatePensionDrawDate,
}: StatePensionValidationContext): PensionValidationIssue[] {
  const issues: PensionValidationIssue[] = [];

  if (
    settings.showStatePension &&
    isValidIsoDate(lifeExpectancyDate) &&
    settings.statePensionDrawDate > lifeExpectancyDate
  ) {
    issues.push({
      field: "lifeExpectancy",
      message: "Life expectancy must be after the State Pension start date.",
    });
  }

  if (
    settings.showStatePension &&
    settings.statePensionDrawDate < defaultStatePensionDrawDate
  ) {
    issues.push({
      field: "statePensionDrawDate",
      message: "State Pension start date cannot be before State Pension age.",
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

export function coerceStatePensionSettings(
  input: Partial<StoredPensionSettings>
): Partial<StoredPensionSettings> {
  return {
    showStatePension: coerceBoolean(input.showStatePension),
    statePensionForecastConfirmed: coerceBoolean(
      input.statePensionForecastConfirmed
    ),
    currentStatePension: coerceNumber(input.currentStatePension),
    statePensionDrawDate: coerceString(input.statePensionDrawDate),
    statePensionApplyFutureGrowth: coerceBoolean(
      input.statePensionApplyFutureGrowth
    ),
    statePensionCpiPercent: coerceNumber(input.statePensionCpiPercent),
    statePensionWageGrowthPercent: coerceNumber(
      input.statePensionWageGrowthPercent
    ),
  };
}
