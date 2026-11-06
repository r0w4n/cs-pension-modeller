import type { RetirementIncomeDisplay } from "../projection";
import type { ComparisonResult } from "./comparison-result";
import { formatDecimalAge } from "./formatting";

export function projectSimpleIncomeSummary(
  result: ComparisonResult,
  display: RetirementIncomeDisplay
) {
  const divisor = display === "monthly" ? 12 : 1;
  const assessment = result.assessment;
  return {
    income: assessment.retirementAnnualIncome / divisor,
    target: assessment.retirementAnnualTarget / divisor,
    difference: assessment.retirementAnnualGap / divisor,
    retirementAge: formatDecimalAge(result.scenario.settings.requirementAge),
    secureIncome: assessment.allSecureAnnualIncome / divisor,
    secureStartAge:
      assessment.allSecureIncomeStartAge === null
        ? null
        : formatDecimalAge(
            assessment.allSecureIncomeStartAge +
              (assessment.allSecureIncomeStartAgeMonths ?? 0) / 12
          ),
    period: display === "monthly" ? "a month" : "a year",
    moneyBasis:
      result.scenario.settings.projectionBasis === "real"
        ? "in today’s money"
        : "in future cash terms",
  };
}
