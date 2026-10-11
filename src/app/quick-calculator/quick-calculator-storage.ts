import {
  isLocalStorageEnabled,
  isModelAge,
  isValidIsoDate,
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
  type AlphaEpaPeriod,
  type PensionSettings,
} from "../../settings";

export const QUICK_CALCULATOR_STORAGE_KEY = "cs-pension-quick-calculator";
const QUICK_CALCULATOR_STORAGE_VERSION = 2;

export type QuickCalculatorCompletion = {
  dateOfBirth: boolean;
  accruedPensionAtLastAbs: boolean;
  pensionableEarnings: boolean;
  retirementAgeInitialised: boolean;
  partialRetirementAgeInitialised: boolean;
};

export type QuickCalculatorStoredInputs = Pick<
  PensionSettings,
  | "dateOfBirth"
  | "alphaPensionAbsDate"
  | "accruedPensionAtLastAbs"
  | "pensionableEarnings"
  | "alphaPensionDrawAge"
  | "alphaHasProtectedPensionAge"
  | "alphaAddedPensionMonthly"
  | "alphaAddedPensionFactorType"
  | "partialRetirementStartAge"
  | "partialRetirementWorkPercent"
  | "showStatePension"
  | "currentStatePension"
  | "statePensionForecastConfirmed"
  | "alphaEpaEnabled"
  | "alphaEpaPeriods"
>;

export type QuickCalculatorStoredState = {
  inputs: QuickCalculatorStoredInputs;
  completion: QuickCalculatorCompletion;
};

type StoredEnvelope = {
  version: number;
  data: QuickCalculatorStoredState;
};

export function saveQuickCalculatorState(state: QuickCalculatorStoredState) {
  if (!isLocalStorageEnabled()) {
    return false;
  }

  const persistableState = getPersistableQuickCalculatorState(state);
  if (!persistableState) {
    return false;
  }

  const envelope: StoredEnvelope = {
    version: QUICK_CALCULATOR_STORAGE_VERSION,
    data: persistableState,
  };
  return writeStorageItem(
    QUICK_CALCULATOR_STORAGE_KEY,
    JSON.stringify(envelope)
  );
}

export function isQuickCalculatorStatePersistable(
  state: QuickCalculatorStoredState
) {
  return getPersistableQuickCalculatorState(state) !== null;
}

function getPersistableQuickCalculatorState(state: QuickCalculatorStoredState) {
  return parseQuickCalculatorState({
    version: QUICK_CALCULATOR_STORAGE_VERSION,
    data: state,
  });
}

export function loadQuickCalculatorState():
  | { status: "empty" }
  | { status: "invalid" }
  | { status: "loaded"; state: QuickCalculatorStoredState } {
  if (!isLocalStorageEnabled()) {
    return { status: "empty" };
  }

  const raw = readStorageItem(QUICK_CALCULATOR_STORAGE_KEY);
  if (raw === null) {
    return { status: "empty" };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const state = parseQuickCalculatorState(parsed);
    return state ? { status: "loaded", state } : { status: "invalid" };
  } catch {
    return { status: "invalid" };
  }
}

export function clearStoredQuickCalculatorState() {
  return removeStorageItem(QUICK_CALCULATOR_STORAGE_KEY);
}

// The parser deliberately checks every persisted financial input before use.
// eslint-disable-next-line sonarjs/cyclomatic-complexity
export function parseQuickCalculatorState(
  value: unknown
): QuickCalculatorStoredState | null {
  if (
    !isRecord(value) ||
    (value.version !== 1 && value.version !== QUICK_CALCULATOR_STORAGE_VERSION)
  ) {
    return null;
  }
  if (!isRecord(value.data) || !isRecord(value.data.inputs)) {
    return null;
  }

  const inputs = value.data.inputs;
  const completion = value.data.completion;
  if (!isRecord(completion)) {
    return null;
  }

  const factorType = inputs.alphaAddedPensionFactorType;
  if (factorType !== "self" && factorType !== "self_plus_beneficiaries") {
    return null;
  }
  if (!Array.isArray(inputs.alphaEpaPeriods)) {
    return null;
  }
  const periods = inputs.alphaEpaPeriods.filter(isAlphaEpaPeriod);
  if (periods.length !== inputs.alphaEpaPeriods.length) {
    return null;
  }

  const numericKeys = [
    "accruedPensionAtLastAbs",
    "pensionableEarnings",
    "alphaPensionDrawAge",
    "alphaAddedPensionMonthly",
    "partialRetirementStartAge",
    "partialRetirementWorkPercent",
    "currentStatePension",
  ] as const;
  if (numericKeys.some((key) => !isFiniteNumber(inputs[key]))) {
    return null;
  }
  const accruedPensionAtLastAbs = inputs.accruedPensionAtLastAbs as number;
  const pensionableEarnings = inputs.pensionableEarnings as number;
  const alphaPensionDrawAge = inputs.alphaPensionDrawAge as number;
  const alphaAddedPensionMonthly = inputs.alphaAddedPensionMonthly as number;
  const partialRetirementStartAge = inputs.partialRetirementStartAge as number;
  const partialRetirementWorkPercent =
    inputs.partialRetirementWorkPercent as number;
  const currentStatePension = inputs.currentStatePension as number;
  if (
    !isWithin(accruedPensionAtLastAbs, 0, 50_000) ||
    !isWithin(pensionableEarnings, 0, 150_000) ||
    !isWithin(alphaPensionDrawAge, 55, 70) ||
    !isModelAge(alphaPensionDrawAge) ||
    !isWithin(alphaAddedPensionMonthly, 0, 2_000) ||
    !isWithin(partialRetirementStartAge, 40, 70) ||
    !isModelAge(partialRetirementStartAge) ||
    !isWithin(partialRetirementWorkPercent, 0, 100) ||
    !isWithin(currentStatePension, 0, 15_000)
  ) {
    return null;
  }
  const stringKeys = ["dateOfBirth", "alphaPensionAbsDate"] as const;
  if (stringKeys.some((key) => typeof inputs[key] !== "string")) {
    return null;
  }
  const dateOfBirth = inputs.dateOfBirth as string;
  const alphaPensionAbsDate = inputs.alphaPensionAbsDate as string;
  const statementYear = Number(alphaPensionAbsDate);
  const completionKeys = [
    "dateOfBirth",
    "accruedPensionAtLastAbs",
    "pensionableEarnings",
    "retirementAgeInitialised",
    "partialRetirementAgeInitialised",
  ] as const;
  if (completionKeys.some((key) => typeof completion[key] !== "boolean")) {
    return null;
  }
  const hasUsableBirthDate =
    isValidIsoDate(dateOfBirth) && dateOfBirth.slice(8) === "01";
  if (
    (completion.dateOfBirth === true && !hasUsableBirthDate) ||
    (completion.dateOfBirth === false &&
      dateOfBirth !== "" &&
      !hasUsableBirthDate) ||
    !/^\d{4}$/.test(alphaPensionAbsDate) ||
    statementYear < 2015 ||
    statementYear > new Date().getUTCFullYear()
  ) {
    return null;
  }
  const booleanInputKeys = [
    "showStatePension",
    "statePensionForecastConfirmed",
    "alphaEpaEnabled",
  ] as const;
  if (booleanInputKeys.some((key) => typeof inputs[key] !== "boolean")) {
    return null;
  }
  if (
    value.version === QUICK_CALCULATOR_STORAGE_VERSION &&
    typeof inputs.alphaHasProtectedPensionAge !== "boolean"
  ) {
    return null;
  }
  return {
    inputs: {
      dateOfBirth,
      alphaPensionAbsDate,
      accruedPensionAtLastAbs,
      pensionableEarnings,
      alphaPensionDrawAge,
      alphaHasProtectedPensionAge:
        value.version === 1
          ? false
          : (inputs.alphaHasProtectedPensionAge as boolean),
      alphaAddedPensionMonthly,
      alphaAddedPensionFactorType: factorType,
      partialRetirementStartAge,
      partialRetirementWorkPercent,
      showStatePension: inputs.showStatePension as boolean,
      currentStatePension,
      statePensionForecastConfirmed:
        inputs.statePensionForecastConfirmed as boolean,
      alphaEpaEnabled: inputs.alphaEpaEnabled as boolean,
      alphaEpaPeriods: periods,
    },
    completion: {
      dateOfBirth: completion.dateOfBirth as boolean,
      accruedPensionAtLastAbs: completion.accruedPensionAtLastAbs as boolean,
      pensionableEarnings: completion.pensionableEarnings as boolean,
      retirementAgeInitialised: completion.retirementAgeInitialised as boolean,
      partialRetirementAgeInitialised:
        completion.partialRetirementAgeInitialised as boolean,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isWithin(value: unknown, minimum: number, maximum: number) {
  return isFiniteNumber(value) && value >= minimum && value <= maximum;
}

function isAlphaEpaPeriod(value: unknown): value is AlphaEpaPeriod {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.yearsBeforeNpa === 1 ||
      value.yearsBeforeNpa === 2 ||
      value.yearsBeforeNpa === 3) &&
    typeof value.startDate === "string" &&
    isValidIsoDate(value.startDate) &&
    typeof value.endDate === "string" &&
    isValidIsoDate(value.endDate)
  );
}
