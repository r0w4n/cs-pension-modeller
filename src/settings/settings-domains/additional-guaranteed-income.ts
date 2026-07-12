import type {
  AdditionalGuaranteedIncome,
  AdditionalGuaranteedIncomeIndexation,
  PensionSettings,
  PensionValidationIssue,
} from "../settings-types";

export const ADDITIONAL_GUARANTEED_INCOME_DEFAULT_NAME = "Additional income";
export const ADDITIONAL_GUARANTEED_INCOME_FIXED_INCREASE_MIN = -10;
export const ADDITIONAL_GUARANTEED_INCOME_FIXED_INCREASE_MAX = 20;

export function createDefaultAdditionalGuaranteedIncome(
  startAge: number
): AdditionalGuaranteedIncome {
  return {
    id: createAdditionalGuaranteedIncomeId(),
    name: "",
    annualAmount: null,
    startAge,
    endAge: null,
    indexation: "cpi",
    fixedIncreasePercent: null,
    taxable: true,
  };
}

export function getAdditionalGuaranteedIncomeDisplayName(
  income: Pick<AdditionalGuaranteedIncome, "name">
) {
  const trimmed = income.name.trim();

  return trimmed.length > 0
    ? trimmed
    : ADDITIONAL_GUARANTEED_INCOME_DEFAULT_NAME;
}

export function normalizeAdditionalGuaranteedIncomeName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeAdditionalGuaranteedIncomeIndexation(
  value: unknown
): AdditionalGuaranteedIncomeIndexation {
  return value === "none" || value === "fixed" || value === "cpi"
    ? value
    : "cpi";
}

export function normalizeAdditionalGuaranteedIncomes(
  value: unknown
): AdditionalGuaranteedIncome[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((income) => income && typeof income === "object")
    .map((income, index) =>
      normalizeAdditionalGuaranteedIncome(
        income as Partial<Record<keyof AdditionalGuaranteedIncome, unknown>>,
        index
      )
    );
}

export function validateAdditionalGuaranteedIncomeRules(
  settings: PensionSettings
): PensionValidationIssue[] {
  return settings.additionalGuaranteedIncomes.flatMap((income) => {
    const issues: PensionValidationIssue[] = [];
    const issueBase = {
      field: "additionalGuaranteedIncomes" as const,
      itemId: income.id,
    };

    if (income.annualAmount === null || !Number.isFinite(income.annualAmount)) {
      issues.push({
        ...issueBase,
        message: "Enter an annual amount.",
      });
    } else if (income.annualAmount < 0) {
      issues.push({
        ...issueBase,
        message: "Annual amount must be zero or more.",
      });
    }

    if (income.startAge === null || !Number.isFinite(income.startAge)) {
      issues.push({
        ...issueBase,
        message: "Enter a start age.",
      });
    } else if (
      income.startAge < 0 ||
      income.startAge > settings.lifeExpectancy
    ) {
      issues.push({
        ...issueBase,
        message: "Start age must be within the projection range.",
      });
    }

    if (
      income.endAge !== null &&
      income.endAge !== undefined &&
      Number.isFinite(income.endAge) &&
      income.startAge !== null &&
      Number.isFinite(income.startAge) &&
      income.endAge < income.startAge
    ) {
      issues.push({
        ...issueBase,
        message: "End age must be the same as or later than the start age.",
      });
    }

    if (income.indexation === "fixed") {
      if (
        income.fixedIncreasePercent === null ||
        income.fixedIncreasePercent === undefined ||
        !Number.isFinite(income.fixedIncreasePercent)
      ) {
        issues.push({
          ...issueBase,
          message: "Enter a fixed annual increase percentage.",
        });
      } else if (
        income.fixedIncreasePercent <
          ADDITIONAL_GUARANTEED_INCOME_FIXED_INCREASE_MIN ||
        income.fixedIncreasePercent >
          ADDITIONAL_GUARANTEED_INCOME_FIXED_INCREASE_MAX
      ) {
        issues.push({
          ...issueBase,
          message: `Fixed annual increase must be between ${ADDITIONAL_GUARANTEED_INCOME_FIXED_INCREASE_MIN}% and ${ADDITIONAL_GUARANTEED_INCOME_FIXED_INCREASE_MAX}%.`,
        });
      }
    }

    return issues;
  });
}

function normalizeAdditionalGuaranteedIncome(
  income: Partial<Record<keyof AdditionalGuaranteedIncome, unknown>>,
  index: number
): AdditionalGuaranteedIncome {
  const indexation = normalizeAdditionalGuaranteedIncomeIndexation(
    income.indexation
  );

  return {
    id:
      typeof income.id === "string" && income.id.trim().length > 0
        ? income.id
        : `additional-income-${index + 1}`,
    name: normalizeAdditionalGuaranteedIncomeName(income.name),
    annualAmount: normalizeOptionalNumber(income.annualAmount),
    startAge: normalizeOptionalNumber(income.startAge),
    endAge: normalizeOptionalNumber(income.endAge),
    indexation,
    fixedIncreasePercent:
      indexation === "fixed"
        ? normalizeOptionalNumber(income.fixedIncreasePercent)
        : null,
    taxable: income.taxable !== false,
  };
}

function normalizeOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function createAdditionalGuaranteedIncomeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `additional-income-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}
