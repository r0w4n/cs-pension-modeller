export const SETTINGS_STORAGE_KEY = "cs-pension-calculator.settings";

export type AddedPensionLumpSumCadence = "once" | "yearly";

export type AddedPensionLumpSum = {
  id: string;
  amount: number;
  startDate: string;
  cadence: AddedPensionLumpSumCadence;
  endDate: string;
};

export type PensionSettings = {
  startDate: string;
  dateOfBirth: string;
  lifeExpectancy: number;
  normalPensionAge: number;
  currentStatePension: number;
  statePensionDrawDate: string;
  alphaPensionAbsDate: string;
  alphaAddedPensionMonthly: number;
  alphaPensionLeaveAge: number;
  accruedPensionAtLastAbs: number;
  pensionableEarnings: number;
  alphaPensionDrawAge: number;
  alphaAddedPensionLumpSums: AddedPensionLumpSum[];
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
  alphaAddedPensionMonthly: { min: 0, max: 1000, step: 25 },
  alphaPensionLeaveAge: { min: 40, max: 70, step: 1 },
  accruedPensionAtLastAbs: { min: 0, max: 50000, step: 250 },
  pensionableEarnings: { min: 10000, max: 150000, step: 500 },
  alphaPensionDrawAge: { min: 55, max: 70, step: 1 },
} as const;

type NumericSettingKey = keyof typeof numericSettingRules;

export const defaultSettings: PensionSettings = {
  startDate: getTodayIsoDate(),
  dateOfBirth: "1987-06-15",
  lifeExpectancy: 88,
  normalPensionAge: 68,
  currentStatePension: 12547.6,
  statePensionDrawDate: "2055-06-15",
  alphaPensionAbsDate: "2025",
  alphaAddedPensionMonthly: 150,
  alphaPensionLeaveAge: 60,
  accruedPensionAtLastAbs: 8250,
  pensionableEarnings: 42000,
  alphaPensionDrawAge: 60,
  alphaAddedPensionLumpSums: [],
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
      ...coerceSettings(parsed),
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
    case "alphaPensionAbsDate":
      return normalizeAlphaAbsYear(
        value as string,
        defaultSettings.alphaPensionAbsDate,
      ) as PensionSettings[K];
    case "alphaAddedPensionLumpSums":
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
  return {
    dateOfBirth: coerceString(input.dateOfBirth),
    lifeExpectancy: coerceNumber(input.lifeExpectancy),
    currentStatePension: coerceNumber(input.currentStatePension),
    alphaPensionAbsDate: coerceString(input.alphaPensionAbsDate),
    alphaAddedPensionMonthly: coerceNumber(input.alphaAddedPensionMonthly),
    alphaPensionLeaveAge: coerceNumber(input.alphaPensionLeaveAge),
    accruedPensionAtLastAbs: coerceNumber(input.accruedPensionAtLastAbs),
    pensionableEarnings: coerceNumber(input.pensionableEarnings),
    alphaPensionDrawAge: coerceNumber(input.alphaPensionDrawAge),
    alphaAddedPensionLumpSums: coerceAddedPensionLumpSums(
      input.alphaAddedPensionLumpSums,
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

  return issues;
}

function normalizeSettings(settings: PensionSettings): PensionSettings {
  const dateOfBirth = normalizeSetting("dateOfBirth", settings.dateOfBirth);

  return {
    startDate: normalizeSetting("startDate", settings.startDate),
    dateOfBirth,
    lifeExpectancy: normalizeSetting("lifeExpectancy", settings.lifeExpectancy),
    normalPensionAge: calculateNormalPensionAge(dateOfBirth),
    currentStatePension: normalizeSetting(
      "currentStatePension",
      settings.currentStatePension,
    ),
    statePensionDrawDate: calculateStatePensionDrawDate(dateOfBirth),
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
    alphaAddedPensionLumpSums: normalizeSetting(
      "alphaAddedPensionLumpSums",
      settings.alphaAddedPensionLumpSums,
    ),
  };
}

function normalizeNumericSetting(key: NumericSettingKey, value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return defaultSettings[key];
  }

  const { min, max, step } = numericSettingRules[key];
  const clamped = Math.min(max, Math.max(min, parsed));
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
