export const SETTINGS_STORAGE_KEY = "cs-pension-modeller.settings";
export const FIRST_UNSUPPORTED_ADDED_PENSION_PURCHASE_AGE = 68;
export const MAX_ADDED_PENSION_PURCHASE_INPUT_AGE = 67.9;

export type AddedPensionLumpSumCadence = "once" | "yearly";
export type AddedPensionFactorType = "self" | "self_plus_beneficiaries";

export type AddedPensionLumpSum = {
  id: string;
  amount: number;
  startDate: string;
  cadence: AddedPensionLumpSumCadence;
  endDate: string;
  factorType?: AddedPensionFactorType;
};

export type SippWithdrawalStrategy = "zero_at_death" | "percentage";
export type IsaWithdrawalStrategy = "zero_at_death" | "percentage";
export type SippTaxReliefRate = "none" | "20" | "40";
export type ProjectionBasis = "real" | "nominal";

export type PensionSettings = {
  startDate: string;
  dateOfBirth: string;
  lifeExpectancy: number;
  normalPensionAge: number;
  projectionBasis: ProjectionBasis;
  inflationRateAnnual: number;
  showNuvos: boolean;
  showStatePension: boolean;
  showSipp: boolean;
  showIsa: boolean;
  taxationEnabled: boolean;
  partialRetirementEnabled: boolean;
  partialRetirementStartAge: number;
  partialRetirementWorkPercent: number;
  currentStatePension: number;
  desiredRetirementIncome: number;
  statePensionDrawDate: string;
  statePensionApplyFutureGrowth: boolean;
  statePensionCpiPercent: number;
  statePensionWageGrowthPercent: number;
  applyPensionIncreases: boolean;
  assumedCpiPercent: number;
  alphaPensionAbsDate: string;
  alphaAddedPensionMonthly: number;
  alphaAddedPensionFactorType: AddedPensionFactorType;
  alphaPensionLeaveAge: number;
  accruedPensionAtLastAbs: number;
  pensionableEarnings: number;
  alphaPensionDrawAge: number;
  alphaEpaEnabled: boolean;
  alphaEpaYearsBeforeNpa: number;
  alphaEpaStartDate: string;
  alphaEpaEndDate: string;
  alphaAddedPensionLumpSums: AddedPensionLumpSum[];
  nuvosPensionAbsDate: string;
  nuvosAccruedPensionAtLastAbs: number;
  nuvosPensionableEarnings: number;
  nuvosPensionLeaveAge: number;
  nuvosPensionDrawAge: number;
  nuvosApplyPensionIncreases: boolean;
  nuvosAssumedCpiPercent: number;
  sippCurrentPot: number;
  sippMonthlyContribution: number;
  sippDrawAge: number;
  sippLumpSums: AddedPensionLumpSum[];
  sippApplyRealInterest: boolean;
  sippRealInterestPercent: number;
  sippTaxReliefRate: SippTaxReliefRate;
  sippWithdrawalStrategy: SippWithdrawalStrategy;
  sippWithdrawalPercent: number;
  isaCurrentPot: number;
  isaMonthlyContribution: number;
  isaDrawAge: number;
  isaLumpSums: AddedPensionLumpSum[];
  isaApplyRealInterest: boolean;
  isaRealInterestPercent: number;
  isaWithdrawalStrategy: IsaWithdrawalStrategy;
  isaWithdrawalPercent: number;
  taxPersonalAllowance: number;
  taxPersonalAllowanceTaperThreshold: number;
  taxBasicRateLimit: number;
  taxAdditionalRateThreshold: number;
  taxBasicRatePercent: number;
  taxHigherRatePercent: number;
  taxAdditionalRatePercent: number;
  taxSippTaxFreeWithdrawalPercent: number;
};

export type PensionValidationIssue = {
  field: keyof PensionSettings;
  message: string;
  itemId?: string;
};

type StoredPensionSettings = Omit<
  PensionSettings,
  "startDate" | "normalPensionAge"
>;

const numericSettingRules = {
  lifeExpectancy: { min: 75, max: 100, step: 1 },
  inflationRateAnnual: { min: 0, max: 10, step: 0.1 },
  currentStatePension: { min: 0, max: 15000, step: 0.01 },
  desiredRetirementIncome: { min: 0, max: 200000, step: 1 },
  statePensionCpiPercent: { min: 0, max: 10, step: 0.1 },
  statePensionWageGrowthPercent: { min: 0, max: 10, step: 0.1 },
  partialRetirementStartAge: { min: 40, max: 70, step: 1 },
  partialRetirementWorkPercent: { min: 0, max: 100, step: 1 },
  assumedCpiPercent: { min: 0, max: 10, step: 0.1 },
  alphaAddedPensionMonthly: { min: 0, max: 1000, step: 25 },
  alphaPensionLeaveAge: { min: 40, max: 70, step: 1 },
  accruedPensionAtLastAbs: { min: 0, max: 50000, step: 1 },
  pensionableEarnings: { min: 10000, max: 150000, step: 500 },
  alphaPensionDrawAge: { min: 55, max: 70, step: 1 },
  alphaEpaYearsBeforeNpa: { min: 1, max: 3, step: 1 },
  nuvosAccruedPensionAtLastAbs: { min: 0, max: 50000, step: 1 },
  nuvosPensionableEarnings: { min: 10000, max: 150000, step: 500 },
  nuvosPensionLeaveAge: { min: 40, max: 70, step: 1 },
  nuvosPensionDrawAge: { min: 55, max: 70, step: 1 },
  nuvosAssumedCpiPercent: { min: 0, max: 10, step: 0.1 },
  sippCurrentPot: { min: 0, max: 2_000_000, step: 1 },
  sippMonthlyContribution: { min: 0, max: 5000, step: 25 },
  sippDrawAge: { min: 55, max: 70, step: 1 },
  sippRealInterestPercent: { min: -10, max: 10, step: 0.1 },
  sippWithdrawalPercent: { min: 0, max: 15, step: 0.1 },
  isaCurrentPot: { min: 0, max: 2_000_000, step: 1 },
  isaMonthlyContribution: { min: 0, max: 5000, step: 25 },
  isaDrawAge: { min: 55, max: 70, step: 1 },
  isaRealInterestPercent: { min: -10, max: 10, step: 0.1 },
  isaWithdrawalPercent: { min: 0, max: 15, step: 0.1 },
  taxPersonalAllowance: { min: 0, max: 50000, step: 1 },
  taxPersonalAllowanceTaperThreshold: { min: 0, max: 200000, step: 1 },
  taxBasicRateLimit: { min: 0, max: 100000, step: 1 },
  taxAdditionalRateThreshold: { min: 0, max: 300000, step: 1 },
  taxBasicRatePercent: { min: 0, max: 100, step: 0.1 },
  taxHigherRatePercent: { min: 0, max: 100, step: 0.1 },
  taxAdditionalRatePercent: { min: 0, max: 100, step: 0.1 },
  taxSippTaxFreeWithdrawalPercent: { min: 0, max: 25, step: 0.1 },
} as const;

type NumericSettingKey = keyof typeof numericSettingRules;

const decimalAgeSettingKeys: readonly NumericSettingKey[] = [
  "lifeExpectancy",
  "partialRetirementStartAge",
  "alphaPensionLeaveAge",
  "alphaPensionDrawAge",
  "nuvosPensionLeaveAge",
  "nuvosPensionDrawAge",
  "sippDrawAge",
  "isaDrawAge",
];

export const defaultSettings: PensionSettings = {
  startDate: getTodayIsoDate(),
  dateOfBirth: "1987-06-15",
  lifeExpectancy: 88,
  normalPensionAge: 68,
  projectionBasis: "real",
  inflationRateAnnual: 2.5,
  showNuvos: false,
  showStatePension: true,
  showSipp: true,
  showIsa: true,
  taxationEnabled: false,
  partialRetirementEnabled: false,
  partialRetirementStartAge: 55,
  partialRetirementWorkPercent: 60,
  currentStatePension: 12547.6,
  desiredRetirementIncome: 31700,
  statePensionDrawDate: "2055-06-15",
  statePensionApplyFutureGrowth: false,
  statePensionCpiPercent: 0,
  statePensionWageGrowthPercent: 0,
  applyPensionIncreases: false,
  assumedCpiPercent: 0,
  alphaPensionAbsDate: "2025",
  alphaAddedPensionMonthly: 150,
  alphaAddedPensionFactorType: "self",
  alphaPensionLeaveAge: 60,
  accruedPensionAtLastAbs: 8250,
  pensionableEarnings: 42000,
  alphaPensionDrawAge: 60,
  alphaEpaEnabled: false,
  alphaEpaYearsBeforeNpa: 3,
  alphaEpaStartDate: "2026-04-01",
  alphaEpaEndDate: "2047-03-31",
  alphaAddedPensionLumpSums: [],
  nuvosPensionAbsDate: "2025",
  nuvosAccruedPensionAtLastAbs: 0,
  nuvosPensionableEarnings: 42000,
  nuvosPensionLeaveAge: 65,
  nuvosPensionDrawAge: 65,
  nuvosApplyPensionIncreases: false,
  nuvosAssumedCpiPercent: 2,
  sippCurrentPot: 0,
  sippMonthlyContribution: 0,
  sippDrawAge: 60,
  sippLumpSums: [],
  sippApplyRealInterest: false,
  sippRealInterestPercent: 3,
  sippTaxReliefRate: "20",
  sippWithdrawalStrategy: "zero_at_death",
  sippWithdrawalPercent: 4,
  isaCurrentPot: 0,
  isaMonthlyContribution: 0,
  isaDrawAge: 60,
  isaLumpSums: [],
  isaApplyRealInterest: false,
  isaRealInterestPercent: 3,
  isaWithdrawalStrategy: "zero_at_death",
  isaWithdrawalPercent: 4,
  taxPersonalAllowance: 12570,
  taxPersonalAllowanceTaperThreshold: 100000,
  taxBasicRateLimit: 37700,
  taxAdditionalRateThreshold: 125140,
  taxBasicRatePercent: 20,
  taxHigherRatePercent: 40,
  taxAdditionalRatePercent: 45,
  taxSippTaxFreeWithdrawalPercent: 25,
};

export function loadStoredSettings(): PensionSettings {
  const defaults = createDefaultSettings();
  const stored = readStorageItem(SETTINGS_STORAGE_KEY);

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
  const normalizedSettings = normalizeSettings(settings);
  const {
    startDate: _startDate,
    normalPensionAge: _normalPensionAge,
    ...storedSettings
  } = normalizedSettings;

  writeStorageItem(SETTINGS_STORAGE_KEY, JSON.stringify(storedSettings));
}

export function readStorageItem(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorageItem(key: string, value: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
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
    case "showNuvos":
    case "showStatePension":
    case "showSipp":
    case "showIsa":
    case "taxationEnabled":
    case "partialRetirementEnabled":
    case "statePensionApplyFutureGrowth":
    case "alphaEpaEnabled":
    case "nuvosApplyPensionIncreases":
    case "isaApplyRealInterest":
    case "sippApplyRealInterest":
      return Boolean(value) as PensionSettings[K];
    case "projectionBasis":
      return normalizeProjectionBasis(value) as PensionSettings[K];
    case "sippTaxReliefRate":
      return normalizeSippTaxReliefRate(value) as PensionSettings[K];
    case "alphaAddedPensionFactorType":
      return normalizeAddedPensionFactorType(value) as PensionSettings[K];
    case "sippWithdrawalStrategy":
      return normalizeSippWithdrawalStrategy(value) as PensionSettings[K];
    case "isaWithdrawalStrategy":
      return normalizeIsaWithdrawalStrategy(value) as PensionSettings[K];
    case "alphaEpaStartDate":
    case "alphaEpaEndDate":
      return normalizeDate(value as string, defaultSettings[key] as string) as PensionSettings[K];
    case "alphaPensionAbsDate":
    case "nuvosPensionAbsDate":
      return normalizeAlphaAbsYear(
        value as string,
        defaultSettings[key] as string,
      ) as PensionSettings[K];
    case "alphaAddedPensionLumpSums":
      return normalizeAddedPensionLumpSums(
        value as AddedPensionLumpSum[],
        { includeFactorType: true },
      ) as PensionSettings[K];
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
    projectionBasis: coerceString(input.projectionBasis) as
      | ProjectionBasis
      | undefined,
    inflationRateAnnual: coerceNumber(input.inflationRateAnnual),
    showNuvos: coerceBoolean(input.showNuvos),
    showStatePension: coerceBoolean(input.showStatePension),
    showSipp: coerceBoolean(input.showSipp),
    showIsa: coerceBoolean(input.showIsa),
    taxationEnabled: coerceBoolean(input.taxationEnabled),
    partialRetirementEnabled: coerceBoolean(input.partialRetirementEnabled),
    partialRetirementStartAge: coerceNumber(input.partialRetirementStartAge),
    partialRetirementWorkPercent: coerceNumber(input.partialRetirementWorkPercent),
    currentStatePension: coerceNumber(input.currentStatePension),
    desiredRetirementIncome: coerceNumber(input.desiredRetirementIncome),
    statePensionDrawDate: coerceString(input.statePensionDrawDate),
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
    alphaAddedPensionFactorType: coerceString(input.alphaAddedPensionFactorType) as
      | AddedPensionFactorType
      | undefined,
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
      { includeFactorType: true },
    ),
    nuvosPensionAbsDate: coerceString(input.nuvosPensionAbsDate),
    nuvosAccruedPensionAtLastAbs: coerceNumber(
      input.nuvosAccruedPensionAtLastAbs,
    ),
    nuvosPensionableEarnings: coerceNumber(input.nuvosPensionableEarnings),
    nuvosPensionLeaveAge: coerceNumber(input.nuvosPensionLeaveAge),
    nuvosPensionDrawAge: coerceNumber(input.nuvosPensionDrawAge),
    nuvosApplyPensionIncreases: coerceBoolean(input.nuvosApplyPensionIncreases),
    nuvosAssumedCpiPercent: coerceNumber(input.nuvosAssumedCpiPercent),
    sippCurrentPot: coerceNumber(input.sippCurrentPot),
    sippMonthlyContribution: coerceNumber(input.sippMonthlyContribution),
    sippDrawAge: coerceNumber(input.sippDrawAge),
    sippLumpSums:
      coerceAddedPensionLumpSums(input.sippLumpSums) ??
      coerceLegacySippLumpSum(legacySippLumpSumContribution),
    sippApplyRealInterest: coerceBoolean(input.sippApplyRealInterest),
    sippRealInterestPercent: coerceNumber(input.sippRealInterestPercent),
    sippTaxReliefRate: coerceSippTaxReliefRate(
      (input as { sippTaxReliefRate?: unknown }).sippTaxReliefRate,
      (input as { sippApplyTaxRelief?: unknown }).sippApplyTaxRelief,
    ),
    sippWithdrawalStrategy: coerceString(input.sippWithdrawalStrategy) as
      | SippWithdrawalStrategy
      | undefined,
    sippWithdrawalPercent: coerceNumber(input.sippWithdrawalPercent),
    isaCurrentPot: coerceNumber(input.isaCurrentPot),
    isaMonthlyContribution: coerceNumber(input.isaMonthlyContribution),
    isaDrawAge: coerceNumber(input.isaDrawAge),
    isaLumpSums: coerceAddedPensionLumpSums(input.isaLumpSums),
    isaApplyRealInterest: coerceBoolean(input.isaApplyRealInterest),
    isaRealInterestPercent: coerceNumber(input.isaRealInterestPercent),
    isaWithdrawalStrategy: coerceString(input.isaWithdrawalStrategy) as
      | IsaWithdrawalStrategy
      | undefined,
    isaWithdrawalPercent: coerceNumber(input.isaWithdrawalPercent),
    taxPersonalAllowance: coerceNumber(input.taxPersonalAllowance),
    taxPersonalAllowanceTaperThreshold: coerceNumber(
      input.taxPersonalAllowanceTaperThreshold,
    ),
    taxBasicRateLimit: coerceNumber(input.taxBasicRateLimit),
    taxAdditionalRateThreshold: coerceNumber(input.taxAdditionalRateThreshold),
    taxBasicRatePercent: coerceNumber(input.taxBasicRatePercent),
    taxHigherRatePercent: coerceNumber(input.taxHigherRatePercent),
    taxAdditionalRatePercent: coerceNumber(input.taxAdditionalRatePercent),
    taxSippTaxFreeWithdrawalPercent: coerceNumber(
      input.taxSippTaxFreeWithdrawalPercent,
    ),
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
  return formatLocalIsoDate(new Date());
}

export function formatLocalIsoDate(
  date: Pick<Date, "getFullYear" | "getMonth" | "getDate">,
) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
  const alphaAccrualStopDate =
    alphaDrawDate <= alphaLeaveDate ? alphaDrawDate : alphaLeaveDate;
  const alphaAbsDate = resolveAlphaAbsDate(settings.alphaPensionAbsDate);
  const alphaEpaAgeDate = getAlphaEpaDate(settings);
  const latestAlphaAddedPensionPurchaseDate = getLatestAlphaAddedPensionPurchaseDate(
    settings.dateOfBirth,
  );
  const nuvosDrawDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.nuvosPensionDrawAge,
  );
  const nuvosLeaveDate = addYearsToIsoDate(
    settings.dateOfBirth,
    settings.nuvosPensionLeaveAge,
  );
  const nuvosAbsDate = resolveAlphaAbsDate(settings.nuvosPensionAbsDate);
  const sippDrawDate = addYearsToIsoDate(settings.dateOfBirth, settings.sippDrawAge);
  const isaDrawDate = addYearsToIsoDate(settings.dateOfBirth, settings.isaDrawAge);
  const partialRetirementStartDate = getPartialRetirementStartDate(settings);
  const defaultStatePensionDrawDate = calculateStatePensionDrawDate(
    settings.dateOfBirth,
  );

  if (settings.dateOfBirth >= settings.startDate) {
    issues.push({
      field: "dateOfBirth",
      message: "Date of birth must be before the calculation start date.",
    });
  }

  if (settings.startDate > lifeExpectancyDate) {
    issues.push({
      field: "startDate",
      message: "Calculation start date must be on or before the life expectancy date.",
    });
  }

  if (alphaDrawDate > lifeExpectancyDate) {
    issues.push({
      field: "alphaPensionDrawAge",
      message: "Alpha pension draw age must be within life expectancy.",
    });
  }

  if (settings.showStatePension && settings.statePensionDrawDate > lifeExpectancyDate) {
    issues.push({
      field: "lifeExpectancy",
      message: "Life expectancy must be after the State Pension start date.",
    });
  }

  if (settings.showNuvos && nuvosDrawDate > lifeExpectancyDate) {
    issues.push({
      field: "nuvosPensionDrawAge",
      message: "nuvos pension draw age must be within life expectancy.",
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

  if (settings.showSipp && sippDrawDate > lifeExpectancyDate) {
    issues.push({
      field: "sippDrawAge",
      message: "SIPP draw start age must be within life expectancy.",
    });
  }

  if (settings.showIsa && isaDrawDate > lifeExpectancyDate) {
    issues.push({
      field: "isaDrawAge",
      message: "ISA draw start age must be within life expectancy.",
    });
  }

  if (
    settings.partialRetirementEnabled &&
    partialRetirementStartDate <= settings.dateOfBirth
  ) {
    issues.push({
      field: "partialRetirementStartAge",
      message: "Partial retirement must start after date of birth.",
    });
  }

  if (
    settings.partialRetirementEnabled &&
    partialRetirementStartDate > lifeExpectancyDate
  ) {
    issues.push({
      field: "partialRetirementStartAge",
      message: "Partial retirement start must be within life expectancy.",
    });
  }

  if (alphaLeaveDate > lifeExpectancyDate) {
    issues.push({
      field: "alphaPensionLeaveAge",
      message: "Alpha pensionable service leave age must be within life expectancy.",
    });
  }

  if (settings.showNuvos && nuvosLeaveDate > lifeExpectancyDate) {
    issues.push({
      field: "nuvosPensionLeaveAge",
      message: "nuvos pensionable service leave age must be within life expectancy.",
    });
  }

  if (alphaAbsDate > settings.startDate) {
    issues.push({
      field: "alphaPensionAbsDate",
      message: "Last Annual Benefits Statement must be on or before the calculation start date.",
    });
  }

  if (
    settings.alphaAddedPensionMonthly > 0 &&
    alphaAccrualStopDate > latestAlphaAddedPensionPurchaseDate
  ) {
    issues.push({
      field: "alphaAddedPensionMonthly",
      message:
        "Monthly added pension purchases must stop before age 68 because the factor table does not include age 68 or later.",
    });
  }

  if (settings.showNuvos && nuvosAbsDate > settings.startDate) {
    issues.push({
      field: "nuvosPensionAbsDate",
      message: "nuvos Annual Benefit Statement must be on or before the calculation start date.",
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

  if (
    settings.alphaEpaEnabled &&
    (settings.alphaEpaEndDate < alphaAbsDate ||
      settings.alphaEpaStartDate > alphaAccrualStopDate)
  ) {
    issues.push({
      field: "alphaEpaStartDate",
      message: "EPA dates must overlap the Alpha accrual period.",
    });
  }

  if (settings.showSipp && sippDrawDate <= settings.startDate) {
    issues.push({
      field: "sippDrawAge",
      message: "SIPP draw start age must be after the calculation start date.",
    });
  }

  if (settings.showIsa && isaDrawDate <= settings.startDate) {
    issues.push({
      field: "isaDrawAge",
      message: "ISA draw start age must be after the calculation start date.",
    });
  }

  issues.push(
    ...validateLumpSums(settings.alphaAddedPensionLumpSums, {
      field: "alphaAddedPensionLumpSums",
      label: "Alpha lump sum",
      earliestDate: alphaAbsDate,
      latestDate:
        alphaAccrualStopDate < latestAlphaAddedPensionPurchaseDate
          ? alphaAccrualStopDate
          : latestAlphaAddedPensionPurchaseDate,
      rangeMessage:
        "Alpha lump sums must fall between the last Annual Benefits Statement and the supported added pension factor ages.",
    }),
    ...(settings.showSipp
      ? validateLumpSums(settings.sippLumpSums, {
          field: "sippLumpSums",
          label: "SIPP lump sum",
          earliestDate: settings.startDate,
          latestDate: sippDrawDate,
          rangeMessage:
            "SIPP lump sums must fall between the calculation start date and SIPP draw start.",
        })
      : []),
    ...(settings.showIsa
      ? validateLumpSums(settings.isaLumpSums, {
          field: "isaLumpSums",
          label: "ISA lump sum",
          earliestDate: settings.startDate,
          latestDate: isaDrawDate,
          rangeMessage:
            "ISA lump sums must fall between the calculation start date and ISA draw start.",
        })
      : []),
  );

  return issues;
}

function validateLumpSums(
  lumpSums: AddedPensionLumpSum[],
  options: {
    field: "alphaAddedPensionLumpSums" | "sippLumpSums" | "isaLumpSums";
    label: string;
    earliestDate: string;
    latestDate: string;
    rangeMessage: string;
  },
) {
  return lumpSums.flatMap((lumpSum) => {
    const issues: PensionValidationIssue[] = [];
    const scheduleEndDate =
      lumpSum.cadence === "yearly" ? lumpSum.endDate : lumpSum.startDate;

    if (lumpSum.cadence === "yearly" && lumpSum.endDate < lumpSum.startDate) {
      issues.push({
        field: options.field,
        itemId: lumpSum.id,
        message: `${options.label} repeat-until date must be on or after its start date.`,
      });
    }

    if (lumpSum.startDate < options.earliestDate || scheduleEndDate > options.latestDate) {
      issues.push({
        field: options.field,
        itemId: lumpSum.id,
        message: options.rangeMessage,
      });
    }

    return issues;
  });
}

function normalizeSettings(settings: PensionSettings): PensionSettings {
  const dateOfBirth = normalizeSetting("dateOfBirth", settings.dateOfBirth);

  return {
    startDate: normalizeSetting("startDate", settings.startDate),
    dateOfBirth,
    lifeExpectancy: normalizeSetting("lifeExpectancy", settings.lifeExpectancy),
    normalPensionAge: calculateNormalPensionAge(dateOfBirth),
    projectionBasis: normalizeSetting("projectionBasis", settings.projectionBasis),
    inflationRateAnnual: normalizeSetting(
      "inflationRateAnnual",
      settings.inflationRateAnnual,
    ),
    showNuvos: Boolean(settings.showNuvos),
    showStatePension: Boolean(settings.showStatePension),
    showSipp: Boolean(settings.showSipp),
    showIsa: Boolean(settings.showIsa),
    taxationEnabled: Boolean(settings.taxationEnabled),
    partialRetirementEnabled: Boolean(settings.partialRetirementEnabled),
    partialRetirementStartAge: normalizeSetting(
      "partialRetirementStartAge",
      settings.partialRetirementStartAge,
    ),
    partialRetirementWorkPercent: normalizeSetting(
      "partialRetirementWorkPercent",
      settings.partialRetirementWorkPercent,
    ),
    currentStatePension: normalizeSetting(
      "currentStatePension",
      settings.currentStatePension,
    ),
    desiredRetirementIncome: normalizeSetting(
      "desiredRetirementIncome",
      settings.desiredRetirementIncome,
    ),
    statePensionDrawDate: normalizeStatePensionDrawDate(
      settings.statePensionDrawDate,
      dateOfBirth,
    ),
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
    alphaAddedPensionFactorType: normalizeSetting(
      "alphaAddedPensionFactorType",
      settings.alphaAddedPensionFactorType,
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
    nuvosPensionAbsDate: normalizeSetting(
      "nuvosPensionAbsDate",
      settings.nuvosPensionAbsDate,
    ),
    nuvosAccruedPensionAtLastAbs: normalizeSetting(
      "nuvosAccruedPensionAtLastAbs",
      settings.nuvosAccruedPensionAtLastAbs,
    ),
    nuvosPensionableEarnings: normalizeSetting(
      "nuvosPensionableEarnings",
      settings.nuvosPensionableEarnings,
    ),
    nuvosPensionLeaveAge: normalizeSetting(
      "nuvosPensionLeaveAge",
      settings.nuvosPensionLeaveAge,
    ),
    nuvosPensionDrawAge: normalizeSetting(
      "nuvosPensionDrawAge",
      settings.nuvosPensionDrawAge,
    ),
    nuvosApplyPensionIncreases: Boolean(settings.nuvosApplyPensionIncreases),
    nuvosAssumedCpiPercent: normalizeSetting(
      "nuvosAssumedCpiPercent",
      settings.nuvosAssumedCpiPercent,
    ),
    sippCurrentPot: normalizeSetting("sippCurrentPot", settings.sippCurrentPot),
    sippMonthlyContribution: normalizeSetting(
      "sippMonthlyContribution",
      settings.sippMonthlyContribution,
    ),
    sippDrawAge: normalizeSetting("sippDrawAge", settings.sippDrawAge),
    sippLumpSums: normalizeSetting("sippLumpSums", settings.sippLumpSums),
    sippApplyRealInterest: Boolean(settings.sippApplyRealInterest),
    sippRealInterestPercent: normalizeSetting(
      "sippRealInterestPercent",
      settings.sippRealInterestPercent,
    ),
    sippTaxReliefRate: normalizeSetting("sippTaxReliefRate", settings.sippTaxReliefRate),
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
    isaDrawAge: normalizeSetting("isaDrawAge", settings.isaDrawAge),
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
    taxPersonalAllowance: normalizeSetting(
      "taxPersonalAllowance",
      settings.taxPersonalAllowance,
    ),
    taxPersonalAllowanceTaperThreshold: normalizeSetting(
      "taxPersonalAllowanceTaperThreshold",
      settings.taxPersonalAllowanceTaperThreshold,
    ),
    taxBasicRateLimit: normalizeSetting(
      "taxBasicRateLimit",
      settings.taxBasicRateLimit,
    ),
    taxAdditionalRateThreshold: normalizeSetting(
      "taxAdditionalRateThreshold",
      settings.taxAdditionalRateThreshold,
    ),
    taxBasicRatePercent: normalizeSetting(
      "taxBasicRatePercent",
      settings.taxBasicRatePercent,
    ),
    taxHigherRatePercent: normalizeSetting(
      "taxHigherRatePercent",
      settings.taxHigherRatePercent,
    ),
    taxAdditionalRatePercent: normalizeSetting(
      "taxAdditionalRatePercent",
      settings.taxAdditionalRatePercent,
    ),
    taxSippTaxFreeWithdrawalPercent: normalizeSetting(
      "taxSippTaxFreeWithdrawalPercent",
      settings.taxSippTaxFreeWithdrawalPercent,
    ),
  };
}

export function normalizeStatePensionDrawDate(
  value: string,
  dateOfBirth: string,
) {
  const defaultDrawDate = calculateStatePensionDrawDate(dateOfBirth);
  const normalizedDrawDate = normalizeDate(value, defaultDrawDate);

  return normalizedDrawDate < defaultDrawDate ? defaultDrawDate : normalizedDrawDate;
}

export function getAlphaEpaDate(settings: PensionSettings) {
  return addYearsToIsoDate(
    settings.dateOfBirth,
    calculateNormalPensionAge(settings.dateOfBirth) -
      settings.alphaEpaYearsBeforeNpa,
  );
}

function normalizeNumericSetting(key: NumericSettingKey, value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return defaultSettings[key];
  }

  const { min, max, step } = numericSettingRules[key];
  const clamped = Math.min(max, Math.max(min, parsed));

  if (step !== 1 || decimalAgeSettingKeys.includes(key)) {
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

function normalizeProjectionBasis(value: unknown): ProjectionBasis {
  return value === "nominal" || value === "real"
    ? value
    : defaultSettings.projectionBasis;
}

function normalizeSippTaxReliefRate(value: unknown): SippTaxReliefRate {
  return value === "none" || value === "20" || value === "40"
    ? value
    : defaultSettings.sippTaxReliefRate;
}

function normalizeAddedPensionFactorType(value: unknown): AddedPensionFactorType {
  return value === "self_plus_beneficiaries" || value === "self"
    ? value
    : defaultSettings.alphaAddedPensionFactorType;
}

function normalizeIsaWithdrawalStrategy(value: unknown): IsaWithdrawalStrategy {
  return value === "percentage" || value === "zero_at_death"
    ? value
    : defaultSettings.isaWithdrawalStrategy;
}

function coerceSippTaxReliefRate(value: unknown, legacyBooleanValue: unknown) {
  if (value === "none" || value === "20" || value === "40") {
    return value;
  }

  if (legacyBooleanValue === true) {
    return "20";
  }

  if (legacyBooleanValue === false) {
    return "none";
  }

  return undefined;
}

function coerceAddedPensionLumpSums(
  value: unknown,
  options: { includeFactorType?: boolean } = {},
) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const coerced = value
    .map((entry) => coerceAddedPensionLumpSum(entry, options))
    .filter((entry): entry is AddedPensionLumpSum => entry !== undefined);

  return coerced;
}

function coerceAddedPensionLumpSum(
  value: unknown,
  options: { includeFactorType?: boolean } = {},
) {
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
    ...(options.includeFactorType
      ? { factorType: normalizeAddedPensionFactorType(input.factorType) }
      : {}),
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

function normalizeAddedPensionLumpSums(
  value: AddedPensionLumpSum[],
  options: { includeFactorType?: boolean } = {},
) {
  return value.map((entry) => normalizeAddedPensionLumpSum(entry, options));
}

function normalizeAddedPensionLumpSum(
  value: AddedPensionLumpSum,
  options: { includeFactorType?: boolean } = {},
) {
  const startDate = normalizeDate(value.startDate, getTodayIsoDate());
  const amount = normalizeWholeCurrency(value.amount);
  const cadence = value.cadence === "yearly" ? "yearly" : "once";
  const normalizedEndDate = normalizeDate(value.endDate, startDate);
  const endDate = cadence === "once" ? startDate : normalizedEndDate;

  return {
    id: value.id || createAddedPensionLumpSumId(),
    amount,
    startDate,
    cadence,
    endDate,
    ...(options.includeFactorType
      ? { factorType: normalizeAddedPensionFactorType(value.factorType) }
      : {}),
  } satisfies AddedPensionLumpSum;
}

export function createDefaultAddedPensionLumpSum(
  startDate = getTodayIsoDate(),
  factorType?: AddedPensionFactorType,
): AddedPensionLumpSum {
  return {
    id: createAddedPensionLumpSumId(),
    amount: 5000,
    startDate,
    cadence: "once",
    endDate: startDate,
    ...(factorType ? { factorType } : {}),
  };
}

export function getPartialRetirementStartDate(settings: PensionSettings) {
  return addYearsToIsoDate(settings.dateOfBirth, settings.partialRetirementStartAge);
}

export function getPartialRetirementContributionMultiplier(
  settings: PensionSettings,
  rowDate: string,
) {
  if (!settings.partialRetirementEnabled) {
    return 1;
  }

  return rowDate >= getPartialRetirementStartDate(settings)
    ? settings.partialRetirementWorkPercent / 100
    : 1;
}

export function getLatestAlphaAddedPensionPurchaseDate(dateOfBirth: string) {
  return addDaysToIsoDate(
    addYearsToIsoDate(dateOfBirth, FIRST_UNSUPPORTED_ADDED_PENSION_PURCHASE_AGE),
    -1,
  );
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

  return calculateNormalPensionAgeMonths(
    normalizedDateOfBirth,
    statePensionDrawDate,
  ) / 12;
}

function calculateNormalPensionAgeMonths(dateOfBirth: string, statePensionDrawDate: string) {
  const [birthYear, birthMonth] = dateOfBirth.split("-").map(Number);
  const [drawYear, drawMonth] = statePensionDrawDate.split("-").map(Number);
  const monthDifference = (drawYear - birthYear) * 12 + (drawMonth - birthMonth);
  const dateAtMonthDifference = addMonthsToIsoDate(dateOfBirth, monthDifference);

  return dateAtMonthDifference >= statePensionDrawDate
    ? monthDifference
    : monthDifference + 1;
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
  return addMonthsToIsoDate(value, Math.round(years * 12));
}

function addDaysToIsoDate(value: string, daysToAdd: number) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day + daysToAdd))
    .toISOString()
    .slice(0, 10);
}
