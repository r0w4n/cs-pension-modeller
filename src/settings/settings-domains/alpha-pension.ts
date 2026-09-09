import {
  DEFAULT_ALPHA_ABS_YEAR,
  FIRST_UNSUPPORTED_ADDED_PENSION_PURCHASE_AGE,
  NORMAL_MINIMUM_PENSION_AGE_INCREASE_DATE,
  type AddedPensionFactorType,
  type AddedPensionLumpSum,
  type AlphaEpaPeriod,
  type AlphaEpaYearsBeforeNpa,
  type PensionSettings,
  type PensionValidationIssue,
} from "../settings-types";
import {
  addMonthsToIsoDate,
  addDaysToIsoDate,
  addYearsToIsoDate,
  isValidIsoDate,
} from "../settings-shared/date";
import { calculateNormalPensionAge } from "../settings-shared/state";

const DEFAULT_REPAIRED_LUMP_SUM_START_DATE = "2026-04-01";
const DEFAULT_REPAIRED_EPA_START_DATE = "2026-04-01";

type AddedPensionNormalizationOptions = {
  includeFactorType?: boolean;
  fallbackStartDate?: string;
};

type AlphaEpaNormalizationOptions = {
  fallbackStartDate?: string;
};

export function normalizeAddedPensionFactorType(
  value: unknown
): AddedPensionFactorType {
  return value === "self_plus_beneficiaries" || value === "self"
    ? value
    : "self";
}

export function normalizeAlphaPensionBooleanSetting(value: unknown) {
  return Boolean(value);
}

export function createAlphaAbsDateFromYear(year: number) {
  return `${year.toString().padStart(4, "0")}-04-01`;
}

function normalizeAlphaAbsYear(value: string, fallback: string) {
  if (/^\d{4}$/.test(value)) {
    return value;
  }

  if (isValidIsoDate(value)) {
    const [year] = value.split("-");
    return year;
  }

  return fallback;
}

export function getAlphaAbsYear(value: string) {
  const normalized = normalizeAlphaAbsYear(value, DEFAULT_ALPHA_ABS_YEAR);
  return Number(normalized);
}

export function resolveAlphaAbsDate(value: string) {
  return createAlphaAbsDateFromYear(getAlphaAbsYear(value));
}

export function normalizeAlphaAbsYearValue(value: string, fallback: string) {
  return normalizeAlphaAbsYear(value, fallback);
}

export function getLatestAlphaAddedPensionPurchaseDate(dateOfBirth: string) {
  const firstUnsupportedPurchaseDate = addYearsToIsoDate(
    dateOfBirth,
    FIRST_UNSUPPORTED_ADDED_PENSION_PURCHASE_AGE
  );

  // Birth month/year entries are stored as the first of the month. For this
  // upper-age boundary, keep the whole selected month available so we do not
  // reject valid scenarios just because the exact birthday is unknown.
  if (dateOfBirth.endsWith("-01")) {
    return addDaysToIsoDate(
      addMonthsToIsoDate(firstUnsupportedPurchaseDate, 1),
      -1
    );
  }

  return addDaysToIsoDate(firstUnsupportedPurchaseDate, -1);
}

function createRepairedAddedPensionLumpSumId(index: number) {
  return `lump-sum-${index + 1}`;
}

function normalizeWholeCurrency(value: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  const clamped = Math.min(1_000_000, Math.max(0, parsed));
  return Math.round(clamped);
}

export function normalizeAddedPensionLumpSum(
  value: AddedPensionLumpSum,
  options: AddedPensionNormalizationOptions = {},
  index = 0
) {
  const startDate = isValidIsoDate(value.startDate)
    ? value.startDate
    : (options.fallbackStartDate ?? DEFAULT_REPAIRED_LUMP_SUM_START_DATE);
  const amount = normalizeWholeCurrency(value.amount);
  const cadence = value.cadence === "yearly" ? "yearly" : "once";
  const normalizedEndDate = isValidIsoDate(value.endDate)
    ? value.endDate
    : startDate;
  const endDate = cadence === "once" ? startDate : normalizedEndDate;

  return {
    id: value.id || createRepairedAddedPensionLumpSumId(index),
    amount,
    startDate,
    cadence,
    endDate,
    ...(options.includeFactorType
      ? { factorType: normalizeAddedPensionFactorType(value.factorType) }
      : {}),
  } satisfies AddedPensionLumpSum;
}

export function normalizeAddedPensionLumpSums(
  value: AddedPensionLumpSum[],
  options: AddedPensionNormalizationOptions = {}
) {
  return value.map((entry, index) =>
    normalizeAddedPensionLumpSum(entry, options, index)
  );
}

function coerceNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function coerceString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function coerceAddedPensionLumpSum(
  value: unknown,
  options: AddedPensionNormalizationOptions = {},
  index = 0
) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const input = value as Partial<AddedPensionLumpSum>;

  return {
    id: coerceString(input.id) ?? createRepairedAddedPensionLumpSumId(index),
    amount: coerceNumber(input.amount) ?? 0,
    startDate:
      coerceString(input.startDate) ??
      options.fallbackStartDate ??
      DEFAULT_REPAIRED_LUMP_SUM_START_DATE,
    cadence: input.cadence === "yearly" ? "yearly" : "once",
    endDate:
      coerceString(input.endDate) ??
      coerceString(input.startDate) ??
      options.fallbackStartDate ??
      DEFAULT_REPAIRED_LUMP_SUM_START_DATE,
    ...(options.includeFactorType
      ? { factorType: normalizeAddedPensionFactorType(input.factorType) }
      : {}),
  } satisfies AddedPensionLumpSum;
}

export function coerceAddedPensionLumpSums(
  value: unknown,
  options: AddedPensionNormalizationOptions = {}
) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const coerced = value
    .map((entry, index) => coerceAddedPensionLumpSum(entry, options, index))
    .filter((entry): entry is AddedPensionLumpSum => entry !== undefined);

  return coerced;
}

export function coerceLegacySippLumpSum(value: number | undefined) {
  if (!value || value <= 0) {
    return undefined;
  }

  return [
    {
      id: "legacy-sipp-lump-sum-1",
      amount: value,
      startDate: DEFAULT_REPAIRED_LUMP_SUM_START_DATE,
      cadence: "once",
      endDate: DEFAULT_REPAIRED_LUMP_SUM_START_DATE,
    },
  ] satisfies AddedPensionLumpSum[];
}

export function createDefaultAddedPensionLumpSum(
  id: string,
  startDate: string,
  factorType?: AddedPensionFactorType
): AddedPensionLumpSum {
  return {
    id,
    amount: 5000,
    startDate,
    cadence: "once",
    endDate: startDate,
    ...(factorType ? { factorType } : {}),
  };
}

function createRepairedAlphaEpaPeriodId(index: number) {
  return `epa-period-${index + 1}`;
}

export function normalizeAlphaEpaYearsBeforeNpa(
  value: unknown
): AlphaEpaYearsBeforeNpa {
  return value === 1 || value === 2 || value === 3 ? value : 1;
}

export function createDefaultAlphaEpaPeriod(
  id: string,
  startDate: string
): AlphaEpaPeriod {
  return {
    id,
    yearsBeforeNpa: 1,
    startDate,
    endDate: startDate,
  };
}

function coerceAlphaEpaPeriod(
  value: unknown,
  index: number
): AlphaEpaPeriod | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const input = value as Partial<AlphaEpaPeriod>;
  const startDate =
    coerceString(input.startDate) ?? DEFAULT_REPAIRED_EPA_START_DATE;

  return {
    id: coerceString(input.id) ?? createRepairedAlphaEpaPeriodId(index),
    yearsBeforeNpa: normalizeAlphaEpaYearsBeforeNpa(input.yearsBeforeNpa),
    startDate,
    endDate: coerceString(input.endDate) ?? startDate,
  };
}

export function coerceAlphaEpaPeriods(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .map(coerceAlphaEpaPeriod)
    .filter((period): period is AlphaEpaPeriod => period !== undefined);
}

export function normalizeAlphaEpaPeriods(
  value: AlphaEpaPeriod[],
  options: AlphaEpaNormalizationOptions = {}
) {
  return value.map((period, index) => {
    const startDate = isValidIsoDate(period.startDate)
      ? period.startDate
      : (options.fallbackStartDate ?? DEFAULT_REPAIRED_EPA_START_DATE);

    return {
      id: period.id || createRepairedAlphaEpaPeriodId(index),
      yearsBeforeNpa: normalizeAlphaEpaYearsBeforeNpa(period.yearsBeforeNpa),
      startDate,
      endDate: isValidIsoDate(period.endDate) ? period.endDate : startDate,
    } satisfies AlphaEpaPeriod;
  });
}

export function getAlphaEpaPeriods(settings: PensionSettings) {
  return settings.alphaEpaEnabled ? settings.alphaEpaPeriods : [];
}

export function isAlphaEpaOptionAvailable(
  normalPensionAge: number,
  yearsBeforeNpa: AlphaEpaYearsBeforeNpa
) {
  return normalPensionAge - yearsBeforeNpa >= 65;
}

export function getAlphaEpaPeriodForDate(
  settings: PensionSettings,
  rowDate: string
) {
  return getAlphaEpaPeriods(settings).find(
    (period) => rowDate >= period.startDate && rowDate <= period.endDate
  );
}

export function getAlphaEpaDate(
  settings: PensionSettings,
  yearsBeforeNpa = normalizeAlphaEpaYearsBeforeNpa(
    settings.alphaEpaYearsBeforeNpa
  )
) {
  return addYearsToIsoDate(
    settings.dateOfBirth,
    calculateNormalPensionAge(settings.dateOfBirth) - yearsBeforeNpa
  );
}

export type AlphaPensionValidationContext = {
  settings: PensionSettings;
  lifeExpectancyDate: string;
  alphaDrawDate: string;
  alphaLeaveDate: string;
  alphaAccrualStopDate: string;
  alphaAbsDate: string;
  alphaEpaAgeDate: string;
  latestAlphaAddedPensionPurchaseDate: string;
};

// eslint-disable-next-line sonarjs/cyclomatic-complexity
export function validateAlphaPensionRules({
  settings,
  lifeExpectancyDate,
  alphaDrawDate,
  alphaLeaveDate,
  alphaAccrualStopDate,
  alphaAbsDate,
}: AlphaPensionValidationContext): PensionValidationIssue[] {
  const issues: PensionValidationIssue[] = [];

  if (settings.showAlpha && alphaDrawDate > lifeExpectancyDate) {
    issues.push({
      field: "alphaPensionDrawAge",
      message: "Alpha pension draw age must be within life expectancy.",
    });
  }

  if (
    settings.showAlpha &&
    settings.requirementAge > settings.alphaPensionDrawAge
  ) {
    issues.push({
      field: "requirementAge",
      message:
        "Retirement age must be on or before the Alpha pension draw age.",
    });
  }

  if (
    alphaDrawDate >= NORMAL_MINIMUM_PENSION_AGE_INCREASE_DATE &&
    settings.alphaPensionDrawAge < 57
  ) {
    issues.push({
      field: "alphaPensionDrawAge",
      message:
        "Alpha pension draw age must be at least 57 for access dates on or after 6 April 2028.",
    });
  }

  if (settings.showAlpha && alphaLeaveDate > lifeExpectancyDate) {
    issues.push({
      field: "alphaPensionLeaveAge",
      message:
        "Alpha pensionable service leave age must be within life expectancy.",
    });
  }

  if (settings.showAlpha && alphaAbsDate > settings.startDate) {
    issues.push({
      field: "alphaPensionAbsDate",
      message:
        "Last Annual Benefits Statement must be on or before the current date.",
    });
  }

  const epaPeriods = getAlphaEpaPeriods(settings);
  if (
    settings.showAlpha &&
    settings.alphaEpaEnabled &&
    epaPeriods.length === 0
  ) {
    issues.push({
      field: "alphaEpaPeriods",
      message: "Add at least one EPA purchase period or turn off EPA.",
    });
  }
  for (const period of epaPeriods) {
    if (period.startDate > period.endDate) {
      issues.push({
        field: "alphaEpaPeriods",
        itemId: period.id,
        message: "EPA period start date must be on or before its end date.",
      });
    }

    const periodEpaAgeDate = getAlphaEpaDate(settings, period.yearsBeforeNpa);
    if (periodEpaAgeDate < addYearsToIsoDate(settings.dateOfBirth, 65)) {
      issues.push({
        field: "alphaEpaPeriods",
        itemId: period.id,
        message: "EPA age cannot be earlier than age 65.",
      });
    }

    if (
      period.endDate < alphaAbsDate ||
      period.startDate > alphaAccrualStopDate
    ) {
      issues.push({
        field: "alphaEpaPeriods",
        itemId: period.id,
        message: "EPA dates must overlap the Alpha accrual period.",
      });
    }
  }

  const sortedEpaPeriods = [...epaPeriods].sort((first, second) =>
    first.startDate.localeCompare(second.startDate)
  );
  for (let index = 1; index < sortedEpaPeriods.length; index += 1) {
    const previous = sortedEpaPeriods[index - 1];
    const current = sortedEpaPeriods[index];
    if (previous && current && current.startDate <= previous.endDate) {
      issues.push({
        field: "alphaEpaPeriods",
        itemId: current.id,
        message:
          "EPA periods cannot overlap because only one option can be bought at a time.",
      });
    }
  }

  return issues;
}
