export const SETTINGS_STORAGE_KEY = "cs-pension-calculator.settings";

export type AddedPensionLumpSumCadence = "once" | "yearly";

export type AddedPensionLumpSum = {
  id: string;
  amount: number;
  startDate: string;
  cadence: AddedPensionLumpSumCadence;
  endDate: string;
};

export type SippWithdrawalStrategy = "zero_at_death" | "percentage";
export type IsaWithdrawalStrategy = "zero_at_death" | "percentage";

export type PensionSettings = {
  startDate: string;
  dateOfBirth: string;
  lifeExpectancy: number;
  normalPensionAge: number;
  showStatePension: boolean;
  showSipp: boolean;
  showIsa: boolean;
  currentStatePension: number;
  statePensionDrawDate: string;
  statePensionApplyFutureGrowth: boolean;
  statePensionCpiPercent: number;
  statePensionWageGrowthPercent: number;
  applyPensionIncreases: boolean;
  assumedCpiPercent: number;
  alphaPensionAbsDate: string;
  alphaAddedPensionMonthly: number;
  alphaPensionLeaveAge: number;
  accruedPensionAtLastAbs: number;
  pensionableEarnings: number;
  alphaPensionDrawAge: number;
  alphaEpaEnabled: boolean;
  alphaEpaYearsBeforeNpa: number;
  alphaEpaStartDate: string;
  alphaEpaEndDate: string;
  alphaAddedPensionLumpSums: AddedPensionLumpSum[];
  sippCurrentPot: number;
  sippMonthlyContribution: number;
  sippLumpSums: AddedPensionLumpSum[];
  sippApplyRealInterest: boolean;
  sippRealInterestPercent: number;
  sippApplyTaxRelief: boolean;
  sippWithdrawalStrategy: SippWithdrawalStrategy;
  sippWithdrawalPercent: number;
  isaCurrentPot: number;
  isaMonthlyContribution: number;
  isaLumpSums: AddedPensionLumpSum[];
  isaApplyRealInterest: boolean;
  isaRealInterestPercent: number;
  isaWithdrawalStrategy: IsaWithdrawalStrategy;
  isaWithdrawalPercent: number;
};

export type PensionValidationIssue = {
  field: keyof PensionSettings;
  message: string;
};

type StoredPensionSettings = Omit<
  PensionSettings,
  "startDate" | "statePensionDrawDate" | "normalPensionAge"
>;

const numericSettingRules = {
  lifeExpectancy: { min: 75, max: 100, step: 1 },
  currentStatePension: { min: 0, max: 15000, step: 0.01 },
  statePensionCpiPercent: { min: 0, max: 10, step: 0.1 },
  statePensionWageGrowthPercent: { min: 0, max: 10, step: 0.1 },
  assumedCpiPercent: { min: 0, max: 10, step: 0.1 },
  alphaAddedPensionMonthly: { min: 0, max: 1000, step: 25 },
  alphaPensionLeaveAge: { min: 40, max: 70, step: 1 },
  accruedPensionAtLastAbs: { min: 0, max: 50000, step: 1 },
  pensionableEarnings: { min: 10000, max: 150000, step: 500 },
  alphaPensionDrawAge: { min: 55, max: 70, step: 1 },
  alphaEpaYearsBeforeNpa: { min: 1, max: 3, step: 1 },
  sippCurrentPot: { min: 0, max: 2_000_000, step: 1 },
  sippMonthlyContribution: { min: 0, max: 5000, step: 25 },
  sippRealInterestPercent: { min: -10, max: 10, step: 0.1 },
  sippWithdrawalPercent: { min: 0, max: 15, step: 0.1 },
  isaCurrentPot: { min: 0, max: 2_000_000, step: 1 },
  isaMonthlyContribution: { min: 0, max: 5000, step: 25 },
  isaRealInterestPercent: { min: -10, max: 10, step: 0.1 },
  isaWithdrawalPercent: { min: 0, max: 15, step: 0.1 },
} as const;

type NumericSettingKey = keyof typeof numericSettingRules;

export const defaultSettings: PensionSettings = {
  startDate: getTodayIsoDate(),
  dateOfBirth: "1987-06-15",
  lifeExpectancy: 88,
  normalPensionAge: 68,
  showStatePension: true,
  showSipp: true,
  showIsa: true,
  currentStatePension: 12547.6,
  statePensionDrawDate: "2055-06-15",
  statePensionApplyFutureGrowth: false,
  statePensionCpiPercent: 2,
  statePensionWageGrowthPercent: 3,
  applyPensionIncreases: false,
  assumedCpiPercent: 2,
  alphaPensionAbsDate: "2025",
  alphaAddedPensionMonthly: 150,
  alphaPensionLeaveAge: 60,
  accruedPensionAtLastAbs: 8250,
  pensionableEarnings: 42000,
  alphaPensionDrawAge: 60,
  alphaEpaEnabled: false,
  alphaEpaYearsBeforeNpa: 3,
  alphaEpaStartDate: "2026-04-01",
  alphaEpaEndDate: "2047-03-31",
  alphaAddedPensionLumpSums: [],
  sippCurrentPot: 0,
  sippMonthlyContribution: 0,
  sippLumpSums: [],
  sippApplyRealInterest: false,
  sippRealInterestPercent: 3,
  sippApplyTaxRelief: true,
  sippWithdrawalStrategy: "zero_at_death",
  sippWithdrawalPercent: 4,
  isaCurrentPot: 0,
  isaMonthlyContribution: 0,
  isaLumpSums: [],
  isaApplyRealInterest: false,
  isaRealInterestPercent: 3,
  isaWithdrawalStrategy: "zero_at_death",
  isaWithdrawalPercent: 4,
};

export function loadStoredSettings(): PensionSettings {
  const defaults = createDefaultSettings();

  if (typeof window === "undefined") {
    return defaults;
  }

  const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

  if (!stored) {
    return defaults;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<StoredPensionSettings>;

    return normalizeSettings({
      ...defaults,
      ...removeUndefinedValues(coerceSettings(parsed)),
    });
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: PensionSettings) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedSettings = normalizeSettings(settings);
  const {
    startDate: _startDate,
    normalPensionAge: _normalPensionAge,
    statePensionDrawDate: _statePensionDrawDate,
    ...storedSettings
  } = normalizedSettings;

  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(storedSettings));
}

export function normalizeSetting<K extends keyof PensionSettings>(
  key: K,
  value: PensionSettings[K],
): PensionSettings[K] {
  switch (key) {
    case "startDate":
      return normalizeDate(value as string, getTodayIsoDate()) as PensionSettings[K];
    case "dateOfBirth":
      return normalizeDate(value as string, defaultSettings.dateOfBirth) as PensionSettings[K];
    case "statePensionDrawDate":
      return normalizeDate(
        value as string,
        defaultSettings.statePensionDrawDate,
      ) as PensionSettings[K];
    case "applyPensionIncreases":
    case "showStatePension":
    case "showSipp":
    case "showIsa":
    case "statePensionApplyFutureGrowth":
    case "alphaEpaEnabled":
    case "isaApplyRealInterest":
    case "sippApplyRealInterest":
      return Boolean(value) as PensionSettings[K];
    case "sippApplyTaxRelief":
      return (typeof value === "boolean"
        ? value
        : defaultSettings.sippApplyTaxRelief) as PensionSettings[K];
    case "sippWithdrawalStrategy":
      return normalizeSippWithdrawalStrategy(value) as PensionSettings[K];
    case "isaWithdrawalStrategy":
      return normalizeIsaWithdrawalStrategy(value) as PensionSettings[K];
    case "alphaEpaStartDate":
    case "alphaEpaEndDate":
      return normalizeDate(value as string, defaultSettings[key] as string) as PensionSettings[K];
    case "alphaPensionAbsDate":
      return normalizeAlphaAbsYear(
        value as string,
        defaultSettings.alphaPensionAbsDate,
      ) as PensionSettings[K];
    case "alphaAddedPensionLumpSums":
    case "isaLumpSums":
    case "sippLumpSums":
      return normalizeAddedPensionLumpSums(
        value as AddedPensionLumpSum[],
      ) as PensionSettings[K];
    default:
      return normalizeNumericSetting(key as NumericSettingKey, value) as PensionSettings[K];
  }
}

function coerceSettings(
  input: Partial<StoredPensionSettings>,
): Partial<StoredPensionSettings> {
  const legacySippLumpSumContribution = coerceNumber(
    (input as { sippLumpSumContribution?: unknown }).sippLumpSumContribution,
  );

  return {
    dateOfBirth: coerceString(input.dateOfBirth),
    lifeExpectancy: coerceNumber(input.lifeExpectancy),
    showStatePension: coerceBoolean(input.showStatePension),
    showSipp: coerceBoolean(input.showSipp),
    showIsa: coerceBoolean(input.showIsa),
    currentStatePension: coerceNumber(input.currentStatePension),
    statePensionApplyFutureGrowth: coerceBoolean(
      input.statePensionApplyFutureGrowth,
    ),
    statePensionCpiPercent: coerceNumber(input.statePensionCpiPercent),
    statePensionWageGrowthPercent: coerceNumber(
      input.statePensionWageGrowthPercent,
    ),
    applyPensionIncreases: coerceBoolean(input.applyPensionIncreases),
    assumedCpiPercent: coerceNumber(input.assumedCpiPercent),
    alphaPensionAbsDate: coerceString(input.alphaPensionAbsDate),
    alphaAddedPensionMonthly: coerceNumber(input.alphaAddedPensionMonthly),
    alphaPensionLeaveAge: coerceNumber(input.alphaPensionLeaveAge),
    accruedPensionAtLastAbs: coerceNumber(input.accruedPensionAtLastAbs),
    pensionableEarnings: coerceNumber(input.pensionableEarnings),
    alphaPensionDrawAge: coerceNumber(input.alphaPensionDrawAge),
    alphaEpaEnabled: coerceBoolean(input.alphaEpaEnabled),
    alphaEpaYearsBeforeNpa: coerceNumber(input.alphaEpaYearsBeforeNpa),
    alphaEpaStartDate: coerceString(input.alphaEpaStartDate),
    alphaEpaEndDate: coerceString(input.alphaEpaEndDate),
    alphaAddedPensionLumpSums: coerceAddedPensionLumpSums(
      input.alphaAddedPensionLumpSums,
    ),
    sippCurrentPot: coerceNumber(input.sippCurrentPot),
    sippMonthlyContribution: coerceNumber(input.sippMonthlyContribution),
    sippLumpSums:
      coerceAddedPensionLumpSums(input.sippLumpSums) ??
      coerceLegacySippLumpSum(legacySippLumpSumContribution),
    sippApplyRealInterest: coerceBoolean(input.sippApplyRealInterest),
    sippRealInterestPercent: coerceNumber(input.sippRealInterestPercent),
    sippApplyTaxRelief: coerceBoolean(input.sippApplyTaxRelief),
    sippWithdrawalStrategy: coerceString(input.sippWithdrawalStrategy) as
      | SippWithdrawalStrategy
      | undefined,
    sippWithdrawalPercent: coerceNumber(input.sippWithdrawalPercent),
    isaCurrentPot: coerceNumber(input.isaCurrentPot),
    isaMonthlyContribution: coerceNumber(input.isaMonthlyContribution),
    isaLumpSums: coerceAddedPensionLumpSums(input.isaLumpSums),
    isaApplyRealInterest: coerceBoolean(input.isaApplyRealInterest),
    isaRealInterestPercent: coerceNumber(input.isaRealInterestPercent),
    isaWithdrawalStrategy: coerceString(input.isaWithdrawalStrategy) as
      | IsaWithdrawalStrategy
      | undefined,
    isaWithdrawalPercent: coerceNumber(input.isaWithdrawalPercent),
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
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

function removeUndefinedValues<T extends object>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export function createDefaultSettings(): PensionSettings {
  const normalPensionAge = calculateNormalPensionAge(defaultSettings.dateOfBirth);

  return {
    ...defaultSettings,
    normalPensionAge,
    startDate: getTodayIsoDate(),
    statePensionDrawDate: calculateStatePensionDrawDate(defaultSettings.dateOfBirth),
  };
}

export function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function isValidIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  if (month < 1 || month > 12) {
    return false;
  }

  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= maxDay;
}

export function validateSettings(settings: PensionSettings): PensionValidationIssue[] {
  const issues: PensionValidationIssue[] = [];
  const lifeExpectancyDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.lifeExpectancy,
  );
  const alphaDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.alphaPensionDrawAge,
  );
  const alphaLeaveDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.alphaPensionLeaveAge,
  );
  const alphaEpaAgeDate = getAlphaEpaDate(settings);

  if (settings.startDate > lifeExpectancyDate) {
    issues.push({
      field: "startDate",
      message: "Calculation start date must be on or before the life expectancy date.",
    });
  }

  if (settings.statePensionDrawDate < alphaDrawDate) {
    issues.push({
      field: "statePensionDrawDate",
      message: "State pension start date cannot be earlier than Alpha pension draw date.",
    });
  }

  if (alphaLeaveDate > lifeExpectancyDate) {
    issues.push({
      field: "alphaPensionLeaveAge",
      message: "Alpha pensionable service leave age must be within life expectancy.",
    });
  }

  if (settings.alphaEpaEnabled && settings.alphaEpaStartDate > settings.alphaEpaEndDate) {
    issues.push({
      field: "alphaEpaStartDate",
      message: "EPA start date must be on or before EPA end date.",
    });
  }

  if (settings.alphaEpaEnabled && alphaEpaAgeDate < addYearsToIsoDate(settings.dateOfBirth, 65)) {
    issues.push({
      field: "alphaEpaYearsBeforeNpa",
      message: "EPA age cannot be earlier than age 65.",
    });
  }

  return issues;
}

function normalizeSettings(settings: PensionSettings): PensionSettings {
  const dateOfBirth = normalizeSetting("dateOfBirth", settings.dateOfBirth);

  return {
    startDate: normalizeSetting("startDate", settings.startDate),
    dateOfBirth,
    lifeExpectancy: normalizeSetting("lifeExpectancy", settings.lifeExpectancy),
    normalPensionAge: calculateNormalPensionAge(dateOfBirth),
    showStatePension: Boolean(settings.showStatePension),
    showSipp: Boolean(settings.showSipp),
    showIsa: Boolean(settings.showIsa),
    currentStatePension: normalizeSetting(
      "currentStatePension",
      settings.currentStatePension,
    ),
    statePensionDrawDate: calculateStatePensionDrawDate(dateOfBirth),
    statePensionApplyFutureGrowth: Boolean(settings.statePensionApplyFutureGrowth),
    statePensionCpiPercent: normalizeSetting(
      "statePensionCpiPercent",
      settings.statePensionCpiPercent,
    ),
    statePensionWageGrowthPercent: normalizeSetting(
      "statePensionWageGrowthPercent",
      settings.statePensionWageGrowthPercent,
    ),
    applyPensionIncreases: Boolean(settings.applyPensionIncreases),
    assumedCpiPercent: normalizeSetting(
      "assumedCpiPercent",
      settings.assumedCpiPercent,
    ),
    alphaPensionAbsDate: normalizeSetting(
      "alphaPensionAbsDate",
      settings.alphaPensionAbsDate,
    ),
    alphaAddedPensionMonthly: normalizeSetting(
      "alphaAddedPensionMonthly",
      settings.alphaAddedPensionMonthly,
    ),
    alphaPensionLeaveAge: normalizeSetting(
      "alphaPensionLeaveAge",
      settings.alphaPensionLeaveAge,
    ),
    accruedPensionAtLastAbs: normalizeSetting(
      "accruedPensionAtLastAbs",
      settings.accruedPensionAtLastAbs,
    ),
    pensionableEarnings: normalizeSetting(
      "pensionableEarnings",
      settings.pensionableEarnings,
    ),
    alphaPensionDrawAge: normalizeSetting(
      "alphaPensionDrawAge",
      settings.alphaPensionDrawAge,
    ),
    alphaEpaEnabled: Boolean(settings.alphaEpaEnabled),
    alphaEpaYearsBeforeNpa: normalizeSetting(
      "alphaEpaYearsBeforeNpa",
      settings.alphaEpaYearsBeforeNpa,
    ),
    alphaEpaStartDate: normalizeSetting(
      "alphaEpaStartDate",
      settings.alphaEpaStartDate,
    ),
    alphaEpaEndDate: normalizeSetting("alphaEpaEndDate", settings.alphaEpaEndDate),
    alphaAddedPensionLumpSums: normalizeSetting(
      "alphaAddedPensionLumpSums",
      settings.alphaAddedPensionLumpSums,
    ),
    sippCurrentPot: normalizeSetting("sippCurrentPot", settings.sippCurrentPot),
    sippMonthlyContribution: normalizeSetting(
      "sippMonthlyContribution",
      settings.sippMonthlyContribution,
    ),
    sippLumpSums: normalizeSetting("sippLumpSums", settings.sippLumpSums),
    sippApplyRealInterest: Boolean(settings.sippApplyRealInterest),
    sippRealInterestPercent: normalizeSetting(
      "sippRealInterestPercent",
      settings.sippRealInterestPercent,
    ),
    sippApplyTaxRelief: normalizeSetting(
      "sippApplyTaxRelief",
      settings.sippApplyTaxRelief,
    ),
    sippWithdrawalStrategy: normalizeSetting(
      "sippWithdrawalStrategy",
      settings.sippWithdrawalStrategy,
    ),
    sippWithdrawalPercent: normalizeSetting(
      "sippWithdrawalPercent",
      settings.sippWithdrawalPercent,
    ),
    isaCurrentPot: normalizeSetting("isaCurrentPot", settings.isaCurrentPot),
    isaMonthlyContribution: normalizeSetting(
      "isaMonthlyContribution",
      settings.isaMonthlyContribution,
    ),
    isaLumpSums: normalizeSetting("isaLumpSums", settings.isaLumpSums),
    isaApplyRealInterest: Boolean(settings.isaApplyRealInterest),
    isaRealInterestPercent: normalizeSetting(
      "isaRealInterestPercent",
      settings.isaRealInterestPercent,
    ),
    isaWithdrawalStrategy: normalizeSetting(
      "isaWithdrawalStrategy",
      settings.isaWithdrawalStrategy,
    ),
    isaWithdrawalPercent: normalizeSetting(
      "isaWithdrawalPercent",
      settings.isaWithdrawalPercent,
    ),
  };
}

export function getAlphaEpaDate(settings: PensionSettings) {
  return addYearsToIsoDate(
    settings.dateOfBirth,
    settings.normalPensionAge - settings.alphaEpaYearsBeforeNpa,
  );
}

function normalizeNumericSetting(key: NumericSettingKey, value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return defaultSettings[key];
  }

  const { min, max, step } = numericSettingRules[key];
  const clamped = Math.min(max, Math.max(min, parsed));

  if (step !== 1) {
    return clamped;
  }

  const snapped = Math.round((clamped - min) / step) * step + min;

  return Math.min(max, Math.max(min, snapped));
}

function normalizeDate(value: string, fallback: string) {
  return isValidIsoDate(value) ? value : fallback;
}

export function createAlphaAbsDateFromYear(year: number) {
  return `${year.toString().padStart(4, "0")}-04-01`;
}

export function getAlphaAbsYear(value: string) {
  const normalized = normalizeAlphaAbsYear(value, defaultSettings.alphaPensionAbsDate);
  return Number(normalized);
}

export function resolveAlphaAbsDate(value: string) {
  return createAlphaAbsDateFromYear(getAlphaAbsYear(value));
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

function normalizeSippWithdrawalStrategy(value: unknown): SippWithdrawalStrategy {
  return value === "percentage" || value === "zero_at_death"
    ? value
    : defaultSettings.sippWithdrawalStrategy;
}

function normalizeIsaWithdrawalStrategy(value: unknown): IsaWithdrawalStrategy {
  return value === "percentage" || value === "zero_at_death"
    ? value
    : defaultSettings.isaWithdrawalStrategy;
}

function coerceAddedPensionLumpSums(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const coerced = value
    .map((entry) => coerceAddedPensionLumpSum(entry))
    .filter((entry): entry is AddedPensionLumpSum => entry !== undefined);

  return coerced;
}

function coerceAddedPensionLumpSum(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const input = value as Partial<AddedPensionLumpSum>;

  return {
    id: coerceString(input.id) ?? createAddedPensionLumpSumId(),
    amount: coerceNumber(input.amount) ?? 0,
    startDate: coerceString(input.startDate) ?? getTodayIsoDate(),
    cadence: input.cadence === "yearly" ? "yearly" : "once",
    endDate: coerceString(input.endDate) ?? coerceString(input.startDate) ?? getTodayIsoDate(),
  } satisfies AddedPensionLumpSum;
}

function coerceLegacySippLumpSum(value: number | undefined) {
  if (!value || value <= 0) {
    return undefined;
  }

  return [
    {
      id: createAddedPensionLumpSumId(),
      amount: value,
      startDate: getTodayIsoDate(),
      cadence: "once",
      endDate: getTodayIsoDate(),
    },
  ] satisfies AddedPensionLumpSum[];
}

function normalizeAddedPensionLumpSums(value: AddedPensionLumpSum[]) {
  return value.map((entry) => normalizeAddedPensionLumpSum(entry));
}

function normalizeAddedPensionLumpSum(value: AddedPensionLumpSum) {
  const startDate = normalizeDate(value.startDate, getTodayIsoDate());
  const amount = normalizeWholeCurrency(value.amount);
  const cadence = value.cadence === "yearly" ? "yearly" : "once";
  const normalizedEndDate = normalizeDate(value.endDate, startDate);
  const endDate = cadence === "once" ? startDate : maxIsoDate(startDate, normalizedEndDate);

  return {
    id: value.id || createAddedPensionLumpSumId(),
    amount,
    startDate,
    cadence,
    endDate,
  } satisfies AddedPensionLumpSum;
}

export function createDefaultAddedPensionLumpSum(
  startDate = getTodayIsoDate(),
): AddedPensionLumpSum {
  return {
    id: createAddedPensionLumpSumId(),
    amount: 5000,
    startDate,
    cadence: "once",
    endDate: startDate,
  };
}

function createAddedPensionLumpSumId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `lump-sum-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeWholeCurrency(value: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  const clamped = Math.min(1_000_000, Math.max(0, parsed));
  return Math.round(clamped);
}

function maxIsoDate(firstDate: string, secondDate: string) {
  return firstDate >= secondDate ? firstDate : secondDate;
}

export function calculateStatePensionDrawDate(dateOfBirth: string) {
  const normalizedDateOfBirth = normalizeDate(dateOfBirth, defaultSettings.dateOfBirth);
  const fixedDateRule = fixedStatePensionDateRules.find((rule) =>
    isIsoDateInRange(normalizedDateOfBirth, rule.from, rule.to),
  );

  if (fixedDateRule) {
    return fixedDateRule.statePensionDate;
  }

  if (normalizedDateOfBirth <= "1960-04-05") {
    return addYearsToIsoDate(normalizedDateOfBirth, 66);
  }

  const ageInMonthsRule = statePensionAgeInMonthsRules.find((rule) =>
    isIsoDateInRange(normalizedDateOfBirth, rule.from, rule.to),
  );

  if (ageInMonthsRule) {
    return addMonthsToIsoDate(normalizedDateOfBirth, ageInMonthsRule.ageInMonths);
  }

  if (normalizedDateOfBirth <= "1977-04-05") {
    return addYearsToIsoDate(normalizedDateOfBirth, 67);
  }

  if (normalizedDateOfBirth >= "1978-04-06") {
    return addYearsToIsoDate(normalizedDateOfBirth, 68);
  }

  return addYearsToIsoDate(normalizedDateOfBirth, 68);
}

export function calculateNormalPensionAge(dateOfBirth: string) {
  const normalizedDateOfBirth = normalizeDate(dateOfBirth, defaultSettings.dateOfBirth);
  const statePensionDrawDate = calculateStatePensionDrawDate(normalizedDateOfBirth);
  const [birthYear, birthMonth, birthDay] = normalizedDateOfBirth.split("-").map(Number);
  const [drawYear, drawMonth, drawDay] = statePensionDrawDate.split("-").map(Number);
  const hasReachedBirthday =
    drawMonth > birthMonth || (drawMonth === birthMonth && drawDay >= birthDay);

  return drawYear - birthYear - (hasReachedBirthday ? 0 : 1);
}

const fixedStatePensionDateRules = [
  { from: "1953-12-06", to: "1954-01-05", statePensionDate: "2019-03-06" },
  { from: "1954-01-06", to: "1954-02-05", statePensionDate: "2019-05-06" },
  { from: "1954-02-06", to: "1954-03-05", statePensionDate: "2019-07-06" },
  { from: "1954-03-06", to: "1954-04-05", statePensionDate: "2019-09-06" },
  { from: "1954-04-06", to: "1954-05-05", statePensionDate: "2019-11-06" },
  { from: "1954-05-06", to: "1954-06-05", statePensionDate: "2020-01-06" },
  { from: "1954-06-06", to: "1954-07-05", statePensionDate: "2020-03-06" },
  { from: "1954-07-06", to: "1954-08-05", statePensionDate: "2020-05-06" },
  { from: "1954-08-06", to: "1954-09-05", statePensionDate: "2020-07-06" },
  { from: "1954-09-06", to: "1954-10-05", statePensionDate: "2020-09-06" },
  { from: "1977-04-06", to: "1977-05-05", statePensionDate: "2044-05-06" },
  { from: "1977-05-06", to: "1977-06-05", statePensionDate: "2044-07-06" },
  { from: "1977-06-06", to: "1977-07-05", statePensionDate: "2044-09-06" },
  { from: "1977-07-06", to: "1977-08-05", statePensionDate: "2044-11-06" },
  { from: "1977-08-06", to: "1977-09-05", statePensionDate: "2045-01-06" },
  { from: "1977-09-06", to: "1977-10-05", statePensionDate: "2045-03-06" },
  { from: "1977-10-06", to: "1977-11-05", statePensionDate: "2045-05-06" },
  { from: "1977-11-06", to: "1977-12-05", statePensionDate: "2045-07-06" },
  { from: "1977-12-06", to: "1978-01-05", statePensionDate: "2045-09-06" },
  { from: "1978-01-06", to: "1978-02-05", statePensionDate: "2045-11-06" },
  { from: "1978-02-06", to: "1978-03-05", statePensionDate: "2046-01-06" },
  { from: "1978-03-06", to: "1978-04-05", statePensionDate: "2046-03-06" },
] as const;

const statePensionAgeInMonthsRules = [
  { from: "1960-04-06", to: "1960-05-05", ageInMonths: 793 },
  { from: "1960-05-06", to: "1960-06-05", ageInMonths: 794 },
  { from: "1960-06-06", to: "1960-07-05", ageInMonths: 795 },
  { from: "1960-07-06", to: "1960-08-05", ageInMonths: 796 },
  { from: "1960-08-06", to: "1960-09-05", ageInMonths: 797 },
  { from: "1960-09-06", to: "1960-10-05", ageInMonths: 798 },
  { from: "1960-10-06", to: "1960-11-05", ageInMonths: 799 },
  { from: "1960-11-06", to: "1960-12-05", ageInMonths: 800 },
  { from: "1960-12-06", to: "1961-01-05", ageInMonths: 801 },
  { from: "1961-01-06", to: "1961-02-05", ageInMonths: 802 },
  { from: "1961-02-06", to: "1961-03-05", ageInMonths: 803 },
] as const;

function isIsoDateInRange(value: string, startDate: string, endDate: string) {
  return value >= startDate && value <= endDate;
}

function addMonthsToIsoDate(value: string, monthsToAdd: number) {
  const [year, month, day] = value.split("-").map(Number);
  const monthIndex = month - 1 + monthsToAdd;
  const nextYear = year + Math.floor(monthIndex / 12);
  const nextMonthIndex = ((monthIndex % 12) + 12) % 12;
  const maxDay = new Date(Date.UTC(nextYear, nextMonthIndex + 1, 0)).getUTCDate();
  const safeDay = Math.min(day, maxDay);

  return new Date(Date.UTC(nextYear, nextMonthIndex, safeDay))
    .toISOString()
    .slice(0, 10);
}

function addYearsToIsoDate(value: string, years: number) {
  const [year, month, day] = value.split("-").map(Number);
  const nextYear = year + years;
  const maxDay = new Date(Date.UTC(nextYear, month, 0)).getUTCDate();
  const safeDay = Math.min(day, maxDay);

  return new Date(Date.UTC(nextYear, month - 1, safeDay)).toISOString().slice(0, 10);
}
