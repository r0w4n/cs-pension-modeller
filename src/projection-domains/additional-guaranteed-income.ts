import type { AdditionalGuaranteedIncome, PensionSettings } from "../settings";
import { addYears, calculateWholeMonthDifference } from "../derive-inputs";
import { calculateRealAnnualRate } from "./inflation";

export function calculateAdditionalGuaranteedIncomeForDate(input: {
  settings: PensionSettings;
  rowDate: string;
}) {
  const { settings, rowDate } = input;

  return settings.additionalGuaranteedIncomes.reduce(
    (totals, income) => {
      const annualGross = calculateAdditionalGuaranteedIncomeStreamForDate({
        settings,
        income,
        rowDate,
      });

      totals.annualGross += annualGross;

      if (income.taxable) {
        totals.annualTaxable += annualGross;
      }

      return totals;
    },
    { annualGross: 0, annualTaxable: 0 }
  );
}

export function calculateAdditionalGuaranteedIncomeStreamForDate(input: {
  settings: PensionSettings;
  income: AdditionalGuaranteedIncome;
  rowDate: string;
}) {
  const { settings, income, rowDate } = input;

  if (
    income.annualAmount === null ||
    income.startAge === null ||
    income.annualAmount <= 0
  ) {
    return 0;
  }

  const startDate = addYears(settings.dateOfBirth, income.startAge);
  const endExclusiveDate =
    income.endAge === null || income.endAge === undefined
      ? null
      : addYears(settings.dateOfBirth, income.endAge + 1);

  if (
    rowDate < startDate ||
    (endExclusiveDate !== null && rowDate >= endExclusiveDate)
  ) {
    return 0;
  }

  if (income.indexation === "none") {
    return income.annualAmount;
  }

  if (income.indexation === "cpi") {
    if (settings.projectionBasis === "real") {
      return income.annualAmount;
    }

    return applyMonthlyGrowth(
      income.annualAmount,
      settings.inflationRateAnnual / 100,
      settings.startDate,
      rowDate
    );
  }

  const fixedIncreasePercent = income.fixedIncreasePercent ?? 0;
  const fixedRate =
    settings.projectionBasis === "real"
      ? calculateRealAnnualRate(
          fixedIncreasePercent / 100,
          settings.inflationRateAnnual / 100
        )
      : fixedIncreasePercent / 100;

  return applyWholeYearGrowth(
    income.annualAmount,
    fixedRate,
    startDate,
    rowDate
  );
}

function applyMonthlyGrowth(
  amount: number,
  annualRate: number,
  startDate: string,
  rowDate: string
) {
  const monthlyRate = (1 + annualRate) ** (1 / 12) - 1;
  const months = Math.max(0, calculateWholeMonthDifference(startDate, rowDate));

  return amount * (1 + monthlyRate) ** months;
}

function applyWholeYearGrowth(
  amount: number,
  annualRate: number,
  startDate: string,
  rowDate: string
) {
  const years = Math.floor(
    Math.max(0, calculateWholeMonthDifference(startDate, rowDate)) / 12
  );

  return amount * (1 + annualRate) ** years;
}
