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
  if (!settings.showAdditionalGuaranteedIncome) {
    return [];
  }

  return settings.additionalGuaranteedIncomes.flatMap((income) =>
    validateAdditionalGuaranteedIncomeRule(settings, income)
  );
}

type AdditionalGuaranteedIncomeIssueBase = Pick<
  PensionValidationIssue,
  "field" | "itemId"
>;

function validateAdditionalGuaranteedIncomeRule(
  settings: PensionSettings,
  income: AdditionalGuaranteedIncome
): PensionValidationIssue[] {
  const annualAmount = income.annualAmount;
  const hasAnnualAmount =
    typeof annualAmount === "number" && Number.isFinite(annualAmount);
  const hasPositiveAnnualAmount = hasAnnualAmount && annualAmount > 0;
  const issueBase = {
    field: "additionalGuaranteedIncomes" as const,
    itemId: income.id,
  };

  return [
    ...validateAdditionalGuaranteedIncomeAmount(income, issueBase),
    ...validateAdditionalGuaranteedIncomeAges({
      hasPositiveAnnualAmount,
      income,
      issueBase,
      lifeExpectancy: settings.lifeExpectancy,
    }),
    ...validateAdditionalGuaranteedIncomeFixedIncrease({
      hasPositiveAnnualAmount,
      income,
      issueBase,
    }),
  ];
}

function validateAdditionalGuaranteedIncomeAmount(
  income: AdditionalGuaranteedIncome,
  issueBase: AdditionalGuaranteedIncomeIssueBase
): PensionValidationIssue[] {
  if (income.annualAmount === null || income.annualAmount >= 0) {
    return [];
  }

  return [
    {
      ...issueBase,
      message: "Annual amount must be zero or more.",
    },
  ];
}

function validateAdditionalGuaranteedIncomeAges({
  hasPositiveAnnualAmount,
  income,
  issueBase,
  lifeExpectancy,
}: {
  hasPositiveAnnualAmount: boolean;
  income: AdditionalGuaranteedIncome;
  issueBase: AdditionalGuaranteedIncomeIssueBase;
  lifeExpectancy: number;
}): PensionValidationIssue[] {
  const issues: PensionValidationIssue[] = [];

  if (
    hasPositiveAnnualAmount &&
    (income.startAge === null || !Number.isFinite(income.startAge))
  ) {
    issues.push({
      ...issueBase,
      message: "Enter a start age.",
    });
  } else if (isAgeOutsideProjection(income.startAge, lifeExpectancy)) {
    issues.push({
      ...issueBase,
      message: "Start age must be within the projection range.",
    });
  }

  if (hasInvalidAdditionalGuaranteedIncomeEndAge(income)) {
    issues.push({
      ...issueBase,
      message: "End age must be the same as or later than the start age.",
    });
  }

  return issues;
}

function validateAdditionalGuaranteedIncomeFixedIncrease({
  hasPositiveAnnualAmount,
  income,
  issueBase,
}: {
  hasPositiveAnnualAmount: boolean;
  income: AdditionalGuaranteedIncome;
  issueBase: AdditionalGuaranteedIncomeIssueBase;
}): PensionValidationIssue[] {
  if (!hasPositiveAnnualAmount || income.indexation !== "fixed") {
    return [];
  }

  if (
    income.fixedIncreasePercent === null ||
    income.fixedIncreasePercent === undefined ||
    !Number.isFinite(income.fixedIncreasePercent)
  ) {
    return [
      {
        ...issueBase,
        message: "Enter a fixed annual increase percentage.",
      },
    ];
  }

  if (
    income.fixedIncreasePercent <
      ADDITIONAL_GUARANTEED_INCOME_FIXED_INCREASE_MIN ||
    income.fixedIncreasePercent >
      ADDITIONAL_GUARANTEED_INCOME_FIXED_INCREASE_MAX
  ) {
    return [
      {
        ...issueBase,
        message: `Fixed annual increase must be between ${ADDITIONAL_GUARANTEED_INCOME_FIXED_INCREASE_MIN}% and ${ADDITIONAL_GUARANTEED_INCOME_FIXED_INCREASE_MAX}%.`,
      },
    ];
  }

  return [];
}

function isAgeOutsideProjection(
  age: number | null | undefined,
  lifeExpectancy: number
) {
  return (
    age !== null &&
    age !== undefined &&
    Number.isFinite(age) &&
    (age < 0 || age > lifeExpectancy)
  );
}

function hasInvalidAdditionalGuaranteedIncomeEndAge(
  income: AdditionalGuaranteedIncome
) {
  return (
    income.endAge !== null &&
    income.endAge !== undefined &&
    Number.isFinite(income.endAge) &&
    income.startAge !== null &&
    Number.isFinite(income.startAge) &&
    income.endAge < income.startAge
  );
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
