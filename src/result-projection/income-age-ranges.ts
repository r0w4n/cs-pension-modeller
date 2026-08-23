import type { PensionSummary, RetirementIncomeDisplay } from "../projection";
import type { RetirementIncomeTargetBasis } from "../settings";
import {
  formatCurrencyDetailed,
  formatDecimalAge,
  formatShortfallOrSurplus,
} from "./formatting";

export type IncomeAgeRangeItem = {
  ageRange: string;
  sources: string;
  income: string;
  target: string;
  difference: string;
};

export function buildIncomeAgeRangeItems(
  summary: PensionSummary,
  display: RetirementIncomeDisplay,
  targetBasis: RetirementIncomeTargetBasis
): IncomeAgeRangeItem[] {
  return summary.retirementIncome.ageRanges.map((range) => {
    const income =
      display === "monthly"
        ? targetBasis === "after_tax"
          ? range.monthlyIncomeAfterTax
          : range.monthlyIncomeBeforeTax
        : targetBasis === "after_tax"
          ? range.annualIncomeAfterTax
          : range.annualIncomeBeforeTax;
    const target =
      display === "monthly"
        ? range.annualTargetIncome / 12
        : range.annualTargetIncome;
    const difference =
      display === "monthly"
        ? {
            shortfall: range.annualShortfall / 12,
            surplus: range.annualSurplus / 12,
          }
        : {
            shortfall: range.annualShortfall,
            surplus: range.annualSurplus,
          };

    return {
      ageRange: `Age ${formatDecimalAge(range.startAge)} to ${formatDecimalAge(
        range.endAge
      )}`,
      sources: range.sourceLabels.join(", "),
      income: formatCurrencyDetailed(income),
      target: formatCurrencyDetailed(target),
      difference: formatShortfallOrSurplus(
        difference.shortfall,
        difference.surplus
      ),
    };
  });
}
